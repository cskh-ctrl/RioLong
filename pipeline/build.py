"""pipeline/build.py — turn one script from data/scripts.json into a ready-to-render 2D Studio project.

  python pipeline/build.py --kind long --n 1      (long video #1, 16:9)
  python pipeline/build.py --kind short --n 7     (short #7, 9:16)

Steps: male English voice (Kokoro am_michael) sentence by sentence -> voice.wav + words.json,
then one or more shots per sentence with an automatic template (hero, duo, face, number, science,
compare, question, title, end), sets chosen from the script's keywords, music plan, SFX.
"""
import argparse, json, os, re, shutil, sys, unicodedata
import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STUDIO = os.path.join(ROOT, "studio")
SR = 24000
VOICE = os.environ.get("RIO_VOICE", "am_michael")


def slugify(s, n=60):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^A-Za-z0-9]+", "_", s).strip("_")
    return s[:n].rstrip("_")


def folder_name(kind, n, title):
    return f"{n:02d}_{slugify(title)}"


# ---------------------------------------------------------------- text analysis
def split_sentences(text):
    t = re.sub(r"\s+", " ", text.strip())
    t = t.replace("...", "…")
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9\"'])", t)
    out = []
    for p in parts:
        p = p.replace("…", "...").strip()
        if not p: continue
        if out and len(p.split()) <= 1: out[-1] += " " + p
        else: out.append(p)
    return out


UNITS = {w: i for i, w in enumerate("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split())}
TENS = {w: 10 * i for i, w in enumerate("_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()) if w != "_"}
SCALES = {"hundred": 100, "thousand": 1000, "million": 10**6, "billion": 10**9, "trillion": 10**12}
NUMWORDS = set(UNITS) | set(TENS) | set(SCALES) | {"and", "point", "a"}


def find_number(sentence):
    """first spelled-out number in the sentence -> (digits string, unit label) or None."""
    toks = re.findall(r"[A-Za-z]+(?:['\u2019-][A-Za-z]+)*|\d[\d,]*(?:\.\d+)?|[%]|[,.;:!?]", sentence)
    i = 0
    while i < len(toks):
        w = toks[i].lower()
        parts = w.split("-")
        if re.match(r"^\d", w) and not re.match(r"^(19|20)\d\d$", w):
            val = w; j = i + 1
            return val, unit_after(toks, j)
        if all(p in UNITS or p in TENS for p in parts) or w in SCALES and i > 0 and toks[i - 1].lower() == "a":
            total = cur = 0; j = i; dec = None; seen = False
            while j < len(toks):
                ww = toks[j].lower(); ps = ww.split("-")
                if all(p in UNITS or p in TENS for p in ps):
                    for p in ps: cur += UNITS.get(p, TENS.get(p, 0))
                    seen = True
                elif ww in SCALES and seen:
                    if ww == "hundred": cur *= 100
                    else: total += cur * SCALES[ww]; cur = 0
                elif ww == "and" and seen and j + 1 < len(toks) and toks[j + 1].lower().split("-")[0] in UNITS | TENS: pass
                elif ww == "point" and seen and j + 1 < len(toks) and toks[j + 1].lower() in UNITS:
                    dec = UNITS[toks[j + 1].lower()]; j += 2; break
                else: break
                j += 1
            val = total + cur
            if not seen: i += 1; continue
            if val <= 1 and dec is None and toks[j:j + 1] and toks[j].lower() not in ("percent", "degrees", "second", "minute", "hour", "day"):
                i = j; continue
            s = f"{val:,}" if dec is None else f"{val}.{dec}"
            return s, unit_after(toks, j)
        i += 1
    return None


STOP = set("of the a an in on at to and or but is are was were it its that this for with than from your you every each per by as".split())


def unit_after(toks, j):
    out = []
    while j < len(toks) and len(out) < 2:
        w = toks[j].lower()
        if w in ",.;:!?" : break
        if w == "percent" or w == "%": return "%"
        if w in STOP and out: break
        if w in STOP: j += 1; continue
        if w in NUMWORDS: break
        out.append(toks[j]); j += 1
    lab = " ".join(out).upper()
    return lab if len(lab) <= 18 else lab.split(" ")[0]


SCIENCE = {
    "brain": "brain", "neuron": "brain", "neurons": "brain", "memory": "brain", "mind": "brain", "nerve": "brain", "nerves": "brain", "cortex": "brain", "iq": "brain",
    "eye": "eye", "eyes": "eye", "cornea": "eye", "retina": "eye", "vision": "eye", "pupil": "eye", "blink": "eye",
    "heart": "heart", "heartbeat": "heart", "blood": "heart", "pulse": "heart", "veins": "heart", "arteries": "heart",
    "ear": "ear", "ears": "ear", "hearing": "ear", "sound": "ear", "decibels": "ear", "noise": "ear",
    "lungs": "lungs", "oxygen": "lungs", "breath": "lungs", "breathe": "lungs", "breathing": "lungs", "air": "lungs",
    "cells": "cell", "cell": "cell", "dna": "cell", "bacteria": "cell", "virus": "cell", "protein": "cell", "skin": "cell", "hormone": "cell", "hormones": "cell",
    "bones": "bone", "bone": "bone", "muscle": "bone", "muscles": "bone", "calories": "bolt", "energy": "bolt", "metabolism": "bolt", "sugar": "bolt", "glucose": "bolt",
    "sleep": "moon", "dream": "moon", "dreams": "moon", "asleep": "moon",
    "seconds": "clock", "second": "clock", "milliseconds": "clock", "minutes": "clock", "hours": "clock", "time": "clock",
    "scientists": "atom", "research": "atom", "study": "atom", "studies": "atom", "physics": "atom", "temperature": "therm", "degrees": "therm", "fever": "therm",
}
LOC = [
    ("hospital", r"\b(hospital|nurse|ambulance|clinic|surgery|stretcher|emergency room|ward|icu)\b"),
    ("stadium", r"\b(stadium|ballpark|bleachers|arena|scoreboard|dugout|concert hall)\b"),
    ("street", r"\b(street|subway|traffic|sidewalk|downtown|crosswalk|highway|interstate|taxi|rooftop|alley)\b"),
    ("park", r"\b(park|forest|trail|mountain|lake|river|beach|ocean|camp|woods|garden|farm|backyard|campfire)\b"),
    ("classroom", r"\b(school|classroom|teacher|exam|office|boss|lecture|cubicle)\b"),
    ("cafe", r"\b(coffee shop|cafe|café|diner|restaurant|barista|food truck|pizzeria)\b"),
    ("lab", r"\b(lab|laboratory|scientists?|experiment|startup)\b"),
    ("home", r"\b(home|house|kitchen|bedroom|apartment|couch|sofa|living room|bathroom)\b"),
]
EXPR_RULES = [
    ("cry", r"\b(tears|cry|cries|crying|sob)"), ("sad", r"\b(sad|lonely|alone|miss|lost|sorry|goodbye|grief|hurts?|pain|empty|quiet)"),
    ("scared", r"\b(danger|scream|panic|crash|blackout|emergency|afraid|fear|terrif|collapse|fire|falls?|falling|flatline|bleeding)"),
    ("shocked", r"\b(suddenly|shock|impossible|wait|what\?|how\?)"), ("joy", r"\b(laugh|cheer|love|win|wins|perfect|amazing|incredible|awesome|best|hug)"),
    ("happy", r"\b(smile|smiles|grin|happy|glad|fun|easy)"), ("determined", r"\b(focus|decide|choose|choice|must|have to|need to|push|fight)"),
    ("worried", r"\b(problem|cost|price|catch|but|warning|risk|tired|exhausted)"), ("thinking", r"\b(think|wonder|remember|idea|maybe|why|question|curious)"),
]
POSE_RULES = [
    ("run", r"\b(run|runs|running|sprint|rush|race|races|chase|dash)"), ("walk", r"\b(walk|walks|walking|step|steps|heads? (to|home|out))"),
    ("phone", r"\b(phone|text|texts|scroll|screen|call|calls|app|message)"), ("cheer", r"\b(cheer|win|wins|celebrate|yes!|jump)"),
    ("point", r"\b(look|see|spot|notice|point|there|watch)"), ("think", r"\b(think|wonder|remember|idea|maybe|wonder|calculate|realize)"),
    ("handsOnHead", r"\b(oh no|panic|can't believe|impossible|disaster)"), ("facepalm", r"\b(embarrass|oops|awkward|forgot)"),
    ("shrug", r"\b(maybe|whatever|who knows|not sure|kind of)"), ("sad", r"\b(sad|alone|tired|exhausted|lonely|miss)"),
    ("sit", r"\b(sit|sits|sitting|seat|couch|chair|desk)"), ("kneel", r"\b(kneel|kneels|beside|bedside|kneeling)"), ("fall", r"\b(fall|falls|collapse|trip|slip)"),
]


def first_rule(rules, s, default=None):
    low = s.lower()
    for name, rx in rules:
        if re.search(rx, low): return name
    return default


def detect_cast(script, rel=""):
    words = re.findall(r"(?<![.!?]\s)(?<!^)\b([A-Z][a-z]{2,})\b", script)
    from collections import Counter
    c = Counter(words)
    bad = set("Rio Animation The And But You Your What When Then That This Every One Two Three Four Five Six Seven Eight Nine Ten Hit Real Not Just Like Here There Dr Mr Mrs Ms God Earth Moon Sun Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July August September October November December America American English So Now And Yes No Okay Why How Who Where Is It Its Science Point Plus Minus Grandpa Grandma Mom Dad Doctor Coach POV Daddy Mommy Doc Sir Hey Okay Thanks Please Sorry Wow Oh".split())
    names = [w for w, k in c.most_common() if w not in bad and k >= 2][:4]
    rl = (rel or "") + " " + script
    cast = []
    for nm in names:
        src = rel if re.search(r"\b" + nm + r"\b", rel or "") else script
        ctx = " ".join(re.findall(r"[^.,;()]{0,30}\b" + nm + r"\b[^.,;()]{0,30}", src))[:300].lower()
        role = "friend"
        if re.search(r"\bdr\.?\s*" + nm.lower(), rl.lower()) or re.search(r"doctor|scientist|nurse|surgeon", ctx): role = "doctor"
        elif re.search(r"grand|elder|uncle|aunt|old man|old woman", ctx): role = "elder"
        elif re.search(r"daughter|\bson\b|kid|little|year-old|child|girl|boy|sister|brother", ctx): role = "kid"
        elif re.search(r"coach|boss|manager|founder|producer|scout|agent|ceo|teacher", ctx): role = "boss"
        cast.append({"name": nm, "role": role})
    for t, role in (("Grandpa", "elder"), ("Grandma", "elder"), ("Mom", "friend"), ("Dad", "friend")):
        if len(cast) < 4 and len(re.findall(r"\b" + t + r"\b", script)) >= 2: cast.append({"name": t, "role": role})
    return cast


# ---------------------------------------------------------------- voice
_K = None


def tts(text):
    global _K
    if _K is None:
        from kokoro_onnx import Kokoro
        md = os.environ.get("KOKORO_DIR", os.path.join(ROOT, "models"))
        _K = Kokoro(os.path.join(md, "kokoro-v1.0.onnx"), os.path.join(md, "voices-v1.0.bin"))
    a, sr = _K.create(text, voice=VOICE, speed=float(os.environ.get("RIO_SPEED", "1.0")), lang="en-us")
    assert sr == SR
    a = np.asarray(a, np.float32)
    # trim silence at both ends
    thr = 0.012; idx = np.where(np.abs(a) > thr)[0]
    if len(idx): a = a[max(0, idx[0] - 240): idx[-1] + 600]
    return a


def synth(sentences, cache_dir):
    os.makedirs(cache_dir, exist_ok=True)
    chunks, words, sents, t = [], [], [], 0.25
    chunks.append(np.zeros(int(SR * 0.25), np.float32))
    for i, s in enumerate(sentences):
        cp = os.path.join(cache_dir, f"s{i:03d}.wav")
        if os.path.exists(cp): a, _ = sf.read(cp, dtype="float32")
        else:
            a = tts(s); sf.write(cp, a, SR)
        d = len(a) / SR
        # word timings: weight by letters, plus pause weight after punctuation
        ws = s.split(); wt = [max(2, len(re.sub(r"[^\w]", "", w))) + (4 if re.search(r"[,;:]$|\.\.\.$", w) else 0) for w in ws]
        tot = sum(wt); acc = t
        for w, k in zip(ws, wt):
            dd = d * k / tot
            words.append({"word": w, "start": round(acc, 3), "end": round(acc + dd * 0.85, 3)}); acc += dd
        sents.append({"text": s, "start": round(t, 3), "end": round(t + d, 3)})
        gap = 0.42 if s.endswith("?") else 0.32 if s.endswith((".", "!")) else 0.2
        if s.endswith("..."): gap = 0.5
        chunks.append(a); chunks.append(np.zeros(int(SR * gap), np.float32)); t += d + gap
    chunks.append(np.zeros(int(SR * 0.8), np.float32))
    audio = np.concatenate(chunks)
    peak = np.max(np.abs(audio)) or 1
    audio = audio / peak * 0.9
    return audio, words, sents


# ---------------------------------------------------------------- shot planning
def plan_shots(item, kind, sents, words, cast):
    title = item["title"]
    vertical = kind == "short"
    full = item["script"]
    # base location: most frequent location keyword group in the script
    score = {n: len(re.findall(rx, full.lower())) for n, rx in LOC}
    ranked = sorted(score, key=lambda k: -score[k])
    ROT = ["home", "street", "park", "classroom", "cafe", "lab", "stadium", "hospital"]
    base = ranked[0] if score[ranked[0]] else ROT[item["stt"] % len(ROT)]
    second = ranked[1] if score[ranked[1]] else ROT[(item["stt"] + 3) % len(ROT)]
    loc = base
    names = [c["name"] for c in cast]
    shots = []
    last_tpl = None; title_done = False; last_switch = -10; last_name = names[0] if names else None
    n = len(sents)
    cta_start = n
    for i in range(n - 1, max(-1, n - 5), -1):
        if re.search(r"subscribe|hit like|comments?|let us know|tell us|drop your", sents[i]["text"], re.I): cta_start = i
    for i, s in enumerate(sents):
        txt = s["text"]; low = txt.lower(); wc = len(txt.split())
        # location switch
        for nme, rx in LOC:
            if re.search(rx, low):
                if nme != loc and i - last_switch >= 4: loc = nme; last_switch = i
                break
        num = find_number(txt)
        sci = None
        for w in re.findall(r"[a-z']+", low):
            if w in SCIENCE: sci = (w, SCIENCE[w]); break
        names_in = [nm for nm in names if re.search(r"\b" + nm + r"\b", txt)]
        vocative = bool(re.search(r"(^|[,!?]\s*)Rio[!?,]|,\s*Rio\b", txt)) or (bool(re.search(r"\b(I|I'm|I'll|I've|I'd|me|my|we|we're|us)\b", txt)) and not re.search(r"\byou\b", low[:12]))
        expr = first_rule(EXPR_RULES, txt, "neutral")
        if txt.endswith("!") and expr == "neutral": expr = "happy"
        if txt.endswith("?") and expr == "neutral": expr = "thinking"
        pose = first_rule(POSE_RULES, txt, None)
        # template choice
        if i >= cta_start: tpl = "end"
        elif not vertical and not title_done and (re.search(r"\bwhat if\b", low) or i == min(n - 1, 6)):
            tpl = "title"; title_done = True
        elif re.search(r"\b(average|normal|typical|most) (person|people|human|adult|adults|kid|kids)\b", low) and last_tpl != "compare": tpl = "compare"
        elif num and last_tpl not in ("number",) and (i % 2 == 0 or sci): tpl = "number"
        elif sci and last_tpl not in ("science", "number") and i % 3 != 1: tpl = "science"
        elif (names_in or vocative) and cast: tpl = "duo" if (i % 3 or not vocative) else "face"
        elif txt.endswith("?") and wc <= 9 and last_tpl != "question": tpl = "question"
        elif wc <= 5 and last_tpl not in ("face",): tpl = "face"
        else: tpl = "hero"
        if tpl == last_tpl and tpl in ("hero",) and i % 2: tpl = "face" if wc < 12 else "hero"
        if names_in: last_name = names_in[0]
        friend = last_name
        speaker = "friend" if (vocative or (names_in and re.match(r"^[A-Z][a-z]+[,!]", txt) is None and '"' in txt)) else "rio"
        if vocative: speaker = "friend"
        p = {"tpl": tpl, "loc": loc, "expr": expr, "pose": pose, "seed": i * 7 + 3, "friend": friend, "speaker": speaker}
        if tpl == "number": p["num"], p["unit"] = num
        if num: p["numAny"] = list(num)
        if tpl == "science": p["sci"], p["icon"] = sci[0].upper(), sci[1]
        if tpl in ("question", "face", "title"): p["text"] = txt
        if tpl == "title" or (vertical and i == 0): p["title"] = title
        if vertical and i == 0: p["hook"] = True
        if tpl == "compare":
            val = (num[0] + ("%" if num[1] == "%" else (" " + num[1] if num[1] else ""))) if num else ""
            # the number in an "average person" sentence describes the average, not Rio
            p["avg"] = val; p["you"] = ""
        # split long sentences into 2-3 shots so a cut happens every ~2-4 s
        st, en = s["start"], s["end"]
        nxt = sents[i + 1]["start"] if i + 1 < n else en + 0.8
        dur = nxt - st
        pieces = 1 if tpl in ("title", "end", "number", "compare", "science") and dur < 7 else max(1, int(round(dur / 3.4)))
        pieces = min(pieces, 4)
        for k in range(pieces):
            a = st + dur * k / pieces; b = st + dur * (k + 1) / pieces
            q = dict(p)
            if k > 0:
                alt = ["face", "hero", "duo" if cast else "hero", "hero"][(i + k) % 4]
                if tpl in ("science", "number", "compare") and dur >= 7: alt = "hero"
                q["tpl"] = alt if tpl not in ("end",) else "end"
                q["seed"] = p["seed"] + k * 31
            shots.append({"start": a, "end": b, "line": txt, "params": q})
        last_tpl = tpl
    # contiguous, start at 0
    shots[0]["start"] = 0.0
    for k in range(1, len(shots)): shots[k]["start"] = shots[k - 1]["end"]
    out = []
    for k, sh in enumerate(shots):
        pr = shots[k - 1]["params"] if k else None; q = sh["params"]
        tr = {"type": "cut"}
        if k and q["tpl"] == "title": tr = {"type": "flash", "dur": 0.35}
        elif k and q["tpl"] == "end" and pr["tpl"] != "end": tr = {"type": "dip", "dur": 0.6}
        elif k and pr and pr["loc"] != q["loc"]: tr = {"type": "dip", "dur": 0.5}
        elif k and q["tpl"] in ("number", "science", "compare") and k % 3 == 0: tr = {"type": "whip", "dur": 0.3, "dir": 1 if k % 2 else -1}
        sfx = []
        if q["tpl"] == "title": sfx.append({"at": 0.0, "name": "impact", "gain": -12})
        elif q["tpl"] == "number": sfx.append({"at": 0.15, "name": "counter", "gain": -18})
        elif q["tpl"] == "science": sfx.append({"at": 0.1, "name": "shimmer", "gain": -22})
        elif q["tpl"] == "compare": sfx.append({"at": 0.2, "name": "swish", "gain": -18})
        elif tr["type"] == "whip": sfx.append({"at": 0.0, "name": "whoosh", "gain": -18})
        elif q["tpl"] == "end" and (not pr or pr["tpl"] != "end"): sfx.append({"at": 0.2, "name": "ding", "gain": -16})
        out.append({"id": f"s{k + 1:03d}", "start": round(sh["start"], 3), "end": round(sh["end"], 3), "line": sh["line"], "scene": q["tpl"], "set": q["loc"], "in": tr, "sfx": sfx, "params": q, **({"captions": False} if q["tpl"] == "end" else {})})
    return out, base, second


def music_plan(kind, sents, total):
    if kind == "short":
        txt = " ".join(s["text"] for s in sents).lower()
        mood = "tension" if re.search(r"danger|panic|crash|emergency|scream", txt) else "mystery" if "?" in txt[:200] else "wonder"
        return [{"start": 0, "end": total, "mood": mood, "intensity": 0.55}]
    plan = []; marks = [0, 0.12, 0.35, 0.55, 0.72, 0.86, 1.0]
    moods = [("mystery", 0.45), ("wonder", 0.5), ("playful", 0.45), ("tension", 0.6), ("epic", 0.7), ("hopeful", 0.5)]
    for k in range(len(moods)):
        plan.append({"start": round(total * marks[k], 2), "end": round(total * marks[k + 1], 2), "mood": moods[k][0], "intensity": moods[k][1]})
    return plan


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--kind", choices=["long", "short"], required=True); ap.add_argument("--n", type=int, required=True)
    ap.add_argument("--out"); a = ap.parse_args()
    data = json.load(open(os.path.join(ROOT, "data", "scripts.json"), encoding="utf-8"))
    item = next(x for x in data["long" if a.kind == "long" else "shorts"] if x["stt"] == a.n)
    slug = f"{a.kind}_{a.n:02d}"
    P = a.out or os.path.join(STUDIO, "projects", slug)
    for d in ("input", "timeline", "story", "scenes", "build", "out"): os.makedirs(os.path.join(P, d), exist_ok=True)
    sents = split_sentences(item["script"])
    audio, words, sinfo = synth([s for s in sents], os.path.join(P, "build", "tts"))
    sf.write(os.path.join(P, "input", "voice.wav"), audio, SR)
    total = round(len(audio) / SR, 3)
    json.dump({"words": words}, open(os.path.join(P, "timeline", "words.json"), "w"), indent=0)
    json.dump(sinfo, open(os.path.join(P, "timeline", "sentences.json"), "w"), indent=1)
    cast = detect_cast(item["script"], item.get("rel", ""))
    shots, base, second = plan_shots(item, a.kind, sinfo, words, cast)
    shots[-1]["end"] = total
    vertical = a.kind == "short"
    styles = ["dusk", "golden", "midnight", "storybook"]
    style = styles[a.n % len(styles)] if not vertical else ["dusk", "golden", "midnight", "neon", "storybook"][a.n % 5]
    cfg = {"title": item["title"], "lang": "en", "aspect": "9:16" if vertical else "16:9", "resolution": "1080p", "fps": 24, "style": style,
           "voiceover": "input/voice.wav", "duration": total, "captions": vertical, "captionStyle": {"y": 1480, "size": 70, "max": 3},
           "bars": "none" if vertical else None, "fadeIn": 0.4, "fadeOut": 0.8, "music": {"enabled": True, "gainDb": -2, "seed": a.n}, "sfx": {"enabled": True, "gainDb": 0}, "loudness": -14,
           "cast": cast, "kind": a.kind, "n": a.n}
    json.dump(cfg, open(os.path.join(P, "config.json"), "w"), indent=1, ensure_ascii=False)
    story = {"title": item["title"], "duration": total, "shots": shots, "music": music_plan(a.kind, sinfo, total)}
    json.dump(story, open(os.path.join(P, "story", "shots.json"), "w"), indent=1, ensure_ascii=False)
    # scenes: shared auto templates
    sc = os.path.join(P, "scenes"); shutil.rmtree(sc, ignore_errors=True)
    shutil.copytree(os.path.join(ROOT, "pipeline", "scenes"), sc)
    print(f"{slug}: {len(sents)} sentences, {len(shots)} shots, {total:.1f}s, style {style}, base set {base}, cast {[c['name'] + ':' + c['role'] for c in cast]}")
    from collections import Counter
    print("  templates:", dict(Counter(s['params']['tpl'] for s in shots)))


if __name__ == "__main__":
    main()
