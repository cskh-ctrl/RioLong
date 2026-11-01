"""pipeline/package.py — assemble the delivery folder for one rendered video and zip it.

  python pipeline/package.py --kind long --n 1 --dest dist
Writes dist/<NN_Title>/ with the MP4, voice MP3, SRT subtitles, script, thumbnail and YouTube info, and dist/<NN_Title>.zip.
"""
import argparse, json, os, re, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "pipeline"))
from build import slugify  # noqa: E402

HASH_LONG = "#WhatIf #RioAnimation #Science #Animation #Hypothetical"
HASH_SHORT = "#shorts #WhatIf #RioAnimation #Science"


def ts(t):
    h, r = divmod(max(0.0, t), 3600); m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s - int(s)) * 1000)):03d}"


def srt(sents):
    out = []
    for i, s in enumerate(sents, 1):
        words = s["text"].split(); chunks = [words[k:k + 12] for k in range(0, len(words), 12)]
        d = (s["end"] - s["start"]) / len(chunks)
        for k, c in enumerate(chunks):
            out.append(f"{len(out) + 1}\n{ts(s['start'] + k * d)} --> {ts(s['start'] + (k + 1) * d)}\n{' '.join(c)}\n")
    return "\n".join(out)


def chapters(shots, sents, total):
    marks = [(0, "Intro")]
    for sh in shots:
        tpl = sh["params"]["tpl"]
        if tpl == "title" and sh["start"] > 5: marks.append((sh["start"], "The question"))
        if re.search(r"\b(real or not|is (any of )?this real|could this happen)\b", sh["line"], re.I) and all(abs(m[0] - sh["start"]) > 20 for m in marks): marks.append((sh["start"], "Is it real?"))
    q = [0.3, 0.55, 0.75]
    names = ["What changes first", "The hidden cost", "The big choice"]
    for f, nm in zip(q, names):
        t = total * f; s = min(sents, key=lambda x: abs(x["start"] - t)); marks.append((s["start"], nm))
    end = next((sh["start"] for sh in shots if sh["params"]["tpl"] == "end"), None)
    if end: marks.append((end, "Your turn"))
    marks = sorted(set(marks)); clean = []
    for m in marks:
        if not clean or m[0] - clean[-1][0] >= 15: clean.append(m)
    return "\n".join(f"{int(t // 60)}:{int(t % 60):02d} {nm}" for t, nm in clean)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--kind", required=True); ap.add_argument("--n", type=int, required=True); ap.add_argument("--dest", default="dist")
    a = ap.parse_args()
    data = json.load(open(os.path.join(ROOT, "data", "scripts.json"), encoding="utf-8"))
    item = next(x for x in data["long" if a.kind == "long" else "shorts"] if x["stt"] == a.n)
    P = os.path.join(ROOT, "studio", "projects", f"{a.kind}_{a.n:02d}")
    name = f"{a.n:02d}_{slugify(item['title'])}"
    D = os.path.join(a.dest, name); os.makedirs(D, exist_ok=True)
    mp4 = os.path.join(P, "out", "final.mp4")
    shutil.copy(mp4, os.path.join(D, f"{name}.mp4"))
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", os.path.join(P, "input", "voice.wav"), "-codec:a", "libmp3lame", "-b:a", "160k", os.path.join(D, "giong_doc.mp3")], check=True)
    sents = json.load(open(os.path.join(P, "timeline", "sentences.json")))
    story = json.load(open(os.path.join(P, "story", "shots.json")))
    open(os.path.join(D, "phu_de.srt"), "w", encoding="utf-8").write(srt(sents))
    open(os.path.join(D, "kich_ban.txt"), "w", encoding="utf-8").write(item["title"] + "\n\n" + item["script"] + "\n")
    thumb = os.path.join(P, "build", "thumb.jpg")
    if os.path.exists(thumb): shutil.copy(thumb, os.path.join(D, "anh_bia.jpg"))
    total = story["duration"]
    first = " ".join(s["text"] for s in sents[:3])
    if a.kind == "long":
        info = (f"TIEU DE:\n{item['title']}\n\nMO TA:\n{first}\n\n{item['title']} In this animated story, Rio gets one extreme ability and finds out what it really costs, step by step, with real science and real numbers.\n\n"
                f"CHAPTERS:\n{chapters(story['shots'], sents, total)}\n\nWhich power should Rio try next? Tell us in the comments!\nSubscribe to Rio Animation for more fascinating videos.\n\n{HASH_LONG}\n\n"
                f"TAGS:\nwhat if, {item['title'].lower().replace('?', '')}, rio animation, what if animation, science animation, hypothetical, {item.get('knob', '')}, human body, superpower, animated story\n")
    else:
        info = (f"TIEU DE:\n{item['title']} #shorts\n\nMO TA:\n{first}\n\nSubscribe to Rio Animation for more fascinating videos!\n\n{HASH_SHORT}\n\n"
                f"TAGS:\nwhat if, shorts, rio animation, {item.get('topic', '')}, science facts, animation\n")
    info += f"\nTHOI LUONG: {int(total // 60)} phut {int(total % 60)} giay\n"
    open(os.path.join(D, "thong_tin_dang_youtube.txt"), "w", encoding="utf-8").write(info)
    shutil.make_archive(os.path.join(a.dest, name), "zip", a.dest, name)
    print("packaged", D)


if __name__ == "__main__":
    main()
