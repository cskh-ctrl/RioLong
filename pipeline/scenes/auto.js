// auto.js — registers every shot in story/shots.json with an automatic template chosen by pipeline/build.py.
// Templates: hero, duo, face, number, science, compare, question, title, end.
import { E, V, S, registerShot, mood, layer, blurLayer, veil, backdrop, ease, prog, clamp, lerp, key, talkAmount, seg, circle, ring, rr, poly, glow, alpha, shade, mix, text, measure, FONTS, rng } from '/engine/core.js';
import { drawFigure, POSES, posesAt, breathe, walkPose, bigFace } from '/engine/rig2d.js';
import * as FX from '/engine/fx2d.js';
import * as UI from '/engine/ui2d.js';
import { drawSet } from './sets.js';

export const RIO = { top: 'hoodie', color: '#2d7fe0', head: 'curly', headColor: '#0e0b12' };
const PALETTE = ['#e0532f', '#f2c21a', '#3aa876', '#9a5ad6', '#e06aa0', '#d98a3a'];
function outfitFor(name, role, k) {
  const color = PALETTE[k % PALETTE.length];
  if (role === 'doctor') return { top: 'labcoat', face: 'glasses', head: 'none' };
  if (role === 'kid') return { top: 'tshirt', color, head: k % 2 ? 'ponytail' : 'cap', headColor: shade(color, -0.3), kid: true };
  if (role === 'elder') return { top: 'suit', color: '#6a5a4a', head: 'fedora', headColor: '#4a3a2a', face: 'glasses' };
  if (role === 'boss') return { top: 'suit', color: '#2a2a3a', head: k % 2 ? 'bun' : 'none' };
  return { top: ['tshirt', 'jersey', 'tracksuit', 'dress'][k % 4], color, head: ['cap', 'ponytail', 'beanie', 'bun'][k % 4], headColor: shade(color, -0.35) };
}
let CASTMAP = null;
function castOf(name) {
  if (!CASTMAP) { CASTMAP = {}; (E.cfg.cast || []).forEach((c, k) => { CASTMAP[c.name] = outfitFor(c.name, c.role, k); }); }
  return CASTMAP[name] || outfitFor(name || 'x', 'friend', 1);
}
const allCast = () => [RIO, ...(E.cfg.cast || []).map(c => castOf(c.name))].slice(0, 5);

// deterministic per-shot camera
function camFor(info, kind = 'mid') {
  const r = rng(info.seed || 1), m = Math.floor(r() * 4), p = ease.inOut(info.p), d = V(1, 0.8);
  const base = kind === 'wide' ? 1.0 : kind === 'close' ? 1.35 : 1.12;
  const cam = [
    { z: base + 0.08 * p, x: 0, y: 0 },
    { z: base + 0.04, x: lerp(-60, 60, p) * d, y: 0 },
    { z: base + 0.1 - 0.08 * p, x: 0, y: -10 * p },
    { z: base + 0.05 * p, x: lerp(40, -40, p) * d, y: 0 },
  ][m];
  if (kind === 'close') cam.y = -E.H * V(0.16, 0.12);
  return cam;
}
function rimOf(M) { return { color: M.rim, dir: [0, -1], w: 4 }; }
function rioPose(info, t) {
  const p = info.pose;
  if (p === 'run' || p === 'walk') return null;
  const target = POSES[p] || [POSES.relaxed, POSES.talk, POSES.explain, POSES.crossArms, POSES.think][(info.seed || 0) % 5];
  return breathe(posesAt(t, [[0, POSES.relaxed], [0.25, target]]), t);
}
function wrap(g, str, size, maxW, font = FONTS.title, weight = 700) {
  const words = str.split(/\s+/), lines = []; let cur = '';
  for (const w of words) { const nx = cur ? cur + ' ' + w : w; if (measure(g, nx, size, font, weight) > maxW && cur) { lines.push(cur); cur = w; } else cur = nx; }
  if (cur) lines.push(cur); return lines;
}
function blockText(g, str, cx, cy, o = {}) {
  const { size = V(68, 76), maxW = E.W * 0.82, color = S().ui.cream, font = FONTS.title, weight = 700, a = 1, maxLines = 3, italic = false } = o;
  let sz = size, lines = wrap(g, str, sz, maxW, font, weight);
  while (lines.length > maxLines && sz > 30) { sz *= 0.88; lines = wrap(g, str, sz, maxW, font, weight); }
  const lh = sz * 1.18, y0 = cy - (lines.length - 1) * lh / 2;
  lines.forEach((ln, i) => text(g, ln, cx, y0 + i * lh, { size: sz, color, font, weight, alpha: a, italic, stroke: sz * 0.12, strokeColor: 'rgba(0,0,0,.55)', glow: 16, glowColor: 'rgba(0,0,0,.6)' }));
}
const showText = () => !E.cfg.captions;   // long videos: short on-screen text; shorts already have captions

// ---------- templates ----------
function hero(g, t, info) {
  const cam = camFor(info, (info.seed % 3) === 0 ? 'wide' : 'mid');
  const st = drawSet(info.loc, g, t, cam); const { GY, M } = st;
  const s = V(1.7, 2.1);
  layer(g, cam, 1, (g) => {
    if (info.pose === 'run' || info.pose === 'walk') {
      const run = info.pose === 'run', sp = run ? 520 : 200, x = E.W / 2 + lerp(-1, 1, info.p) * sp * Math.min(3, info.dur) / 2;
      drawFigure(g, { x, y: GY, s, facing: 1, outfit: RIO, pose: walkPose(t * (run ? 9 : 5), { run }), expr: info.expr, rim: rimOf(M), trail: run ? { count: 3, dx: -50 } : null });
    } else {
      const x = E.W / 2 + V((info.seed % 2 ? -1 : 1) * 160, 0);
      if (info.pose === 'sit') FX.chair(g, x - 18 * s, GY, s, '#24181e');
      if (info.pose === 'fall') drawFigure(g, { x, y: GY, s, facing: 1, outfit: RIO, pose: POSES.fall, rot: -0.4 * ease.out(info.p), expr: 'scared', rim: rimOf(M) });
      else drawFigure(g, { x, y: GY, s, facing: info.seed % 2 ? 1 : -1, outfit: RIO, pose: rioPose(info, t), expr: info.expr, blink: (t % 3.1) > 3.0, rim: rimOf(M), prop: info.pose === 'phone' ? 'phone' : undefined });
    }
  });
  st.fx?.(g, t);
  if (info.numAny && showText()) UI.readout(g, { value: info.numAny[0] + (info.numAny[1] === '%' ? '%' : info.numAny[1] ? ' ' + info.numAny[1] : ''), x: E.W / 2, y: V(150, 300), align: 'center', size: V(64, 72), a: ease.out(prog(t, 0.2, 0.6)) });
}

function duo(g, t, info) {
  const cam = camFor(info, 'mid');
  const st = drawSet(info.loc, g, t, cam); const { GY, M } = st;
  const s = V(1.6, 1.75), gap = V(230, 200), fr = castOf(info.friend);
  const friendTalks = info.speaker === 'friend';
  const tk = talkAmount(info.globalT);
  layer(g, cam, 1, (g) => {
    drawFigure(g, { x: E.W / 2 - gap, y: GY, s, facing: 1, outfit: RIO, pose: breathe(friendTalks ? POSES.relaxed : posesAt(t, [[0, POSES.relaxed], [0.3, POSES.talk]]), t), expr: friendTalks ? (info.expr === 'neutral' ? 'surprised' : 'smile') : info.expr, rim: rimOf(M), look: [1, 0] });
    drawFigure(g, { x: E.W / 2 + gap, y: GY, s, facing: -1, outfit: fr, pose: breathe(friendTalks ? posesAt(t, [[0, POSES.relaxed], [0.25, [POSES.talk, POSES.explain, POSES.point, POSES.shrug][info.seed % 4]]]) : POSES.crossArms, t, 1, 2), expr: friendTalks ? info.expr : 'neutral', talk: friendTalks ? tk : 0, rim: rimOf(M), look: [-1, 0] });
  });
  st.fx?.(g, t);
  if (friendTalks && info.friend && showText()) text(g, info.friend.toUpperCase(), E.W / 2 + gap, GY - 300 * s * 0.85, { size: V(30, 40), color: S().ui.gold, font: FONTS.ui, weight: 900, alpha: ease.out(prog(t, 0.1, 0.4)) * 0.85 });
}

function face(g, t, info) {
  const M = mood('dusk');
  blurLayer(g, 14, (g) => drawSet(info.loc, g, t * 0.3, { z: 1.5, x: (info.seed % 2 ? 1 : -1) * 120, y: -E.H * 0.1 }));
  veil(g, '#100a14', 0.3);
  const friend = info.speaker === 'friend' && info.friend;
  const r = V(280, 300) * (1 + 0.04 * t / Math.max(1, info.dur));
  const cx = E.W / 2 + V(friend ? 140 : -140, 0), cy = E.H * V(0.6, 0.5);
  bigFace(g, cx, cy, r, { outfit: friend ? castOf(info.friend) : RIO, expr: info.expr === 'neutral' ? ['surprised', 'smirk', 'determined', 'thinking'][info.seed % 4] : info.expr, talk: friend ? talkAmount(info.globalT) : 0, blink: (t % 2.7) > 2.6, rimColor: M.rim, rimSide: friend ? 1 : -1, look: [friend ? -0.4 : 0.4, -0.1] });
  if (info.expr === 'shocked' || info.expr === 'scared') FX.rings(g, cx, cy, t, { count: 3, r0: r * 1.1, r1: r * 1.7, color: '#fff3e0', a: 0.3 });
  if (showText() && info.text && info.text.split(' ').length <= 7) blockText(g, info.text.toUpperCase(), E.W / 2, E.H * 0.16, { size: 64, a: ease.out(prog(t, 0.05, 0.35)) });
}

function parseNum(s) { const v = parseFloat(String(s).replace(/,/g, '')); return isNaN(v) ? null : v; }
function number(g, t, info) {
  blurLayer(g, 12, (g) => drawSet(info.loc, g, t * 0.3, { z: 1.3, x: 0, y: 0 }));
  veil(g, '#08060e', 0.55);
  const ui = S().ui, v = parseNum(info.num), p = ease.out(prog(t, 0.1, Math.min(1.4, info.dur * 0.5)));
  let str = info.num;
  if (v != null) { const dec = (String(info.num).split('.')[1] || '').length; const cur = v * p; str = dec ? cur.toFixed(dec) : Math.round(cur).toLocaleString('en-US'); }
  const unit = info.unit === '%' ? '%' : '';
  const sc = 1 + 0.06 * ease.outBack(prog(t, 0, 0.4));
  g.save(); g.translate(E.W / 2, E.H * V(0.42, 0.4)); g.scale(sc, sc);
  const size = Math.min(V(240, 230), (E.W * 0.85) / Math.max(1, measure(g, str + unit, 100) / 100));
  text(g, str + unit, 0, 0, { size, color: ui.gold, font: FONTS.ui, weight: 900, glow: 40, glowColor: alpha(ui.gold, 0.6) });
  if (info.unit && info.unit !== '%') text(g, info.unit, 0, size * 0.75, { size: V(64, 70), color: ui.cream, font: FONTS.ui, weight: 900, spacing: 4, alpha: ease.out(prog(t, 0.5, 0.9)) });
  g.restore();
  FX.rings(g, E.W / 2, E.H * V(0.42, 0.4), t, { count: 3, r0: 200, r1: 700, speed: 0.5, color: ui.gold, a: 0.12 });
  const M = mood('dusk');
  drawFigure(g, { x: E.W * V(0.15, 0.8), y: E.H * V(0.95, 0.72), s: V(1.2, 1.3), facing: 1, outfit: RIO, pose: breathe(POSES.pointUp, t), expr: 'awe', rim: rimOf(M), look: [0.6, -1] });
}

function icon(g, kind, x, y, r, t, col) {
  g.save(); g.strokeStyle = col; g.lineWidth = r * 0.06; g.lineCap = 'round'; g.lineJoin = 'round';
  const L = (pts) => { g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(x + a * r, y + b * r) : g.moveTo(x + a * r, y + b * r)); g.stroke(); };
  if (kind === 'eye') { g.beginPath(); g.moveTo(x - r, y); g.quadraticCurveTo(x, y - r * 0.9, x + r, y); g.quadraticCurveTo(x, y + r * 0.9, x - r, y); g.stroke(); ring(g, x, y, r * 0.36, r * 0.06, col); circle(g, x, y, r * 0.16, col); }
  else if (kind === 'brain') { for (const [dx, dy, rr2] of [[-0.35, -0.2, 0.45], [0.3, -0.25, 0.5], [-0.1, 0.25, 0.45], [0.4, 0.2, 0.38]]) { g.beginPath(); g.arc(x + dx * r, y + dy * r, rr2 * r, 0, 7); g.stroke(); } L([[0, -0.7], [0, 0.65]]); }
  else if (kind === 'heart') { const b = 1 + 0.08 * Math.max(0, Math.sin(t * 7)); g.beginPath(); g.moveTo(x, y + 0.75 * r * b); g.bezierCurveTo(x - 1.2 * r * b, y - 0.1 * r, x - 0.6 * r * b, y - 1.0 * r * b, x, y - 0.4 * r); g.bezierCurveTo(x + 0.6 * r * b, y - 1.0 * r * b, x + 1.2 * r * b, y - 0.1 * r, x, y + 0.75 * r * b); g.stroke(); L([[-1.4, 0.1], [-0.5, 0.1], [-0.3, -0.3], [-0.1, 0.4], [0.1, 0.1], [1.4, 0.1]]); }
  else if (kind === 'ear') { g.beginPath(); g.arc(x, y - 0.1 * r, 0.6 * r, Math.PI * 0.9, Math.PI * 2.3); g.quadraticCurveTo(x + 0.2 * r, y + 0.8 * r, x - 0.2 * r, y + 0.8 * r); g.stroke(); for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(x + 0.5 * r, y, r * (0.4 + k * 0.3), -0.5, 0.5); g.stroke(); } }
  else if (kind === 'lungs') { for (const s of [-1, 1]) { g.beginPath(); g.ellipse(x + s * 0.42 * r, y + 0.1 * r, 0.32 * r, 0.62 * r * (1 + 0.05 * Math.sin(t * 2)), s * 0.15, 0, 7); g.stroke(); } L([[0, -0.9], [0, -0.3], [-0.3, -0.1]]); L([[0, -0.3], [0.3, -0.1]]); }
  else if (kind === 'cell') { ring(g, x, y, r * 0.8, r * 0.06, col); circle(g, x + 0.15 * r, y - 0.1 * r, r * 0.25, alpha(col, 0.5)); for (let k = 0; k < 6; k++) circle(g, x + Math.cos(k + t) * r * 0.5, y + Math.sin(k * 1.7 + t) * r * 0.45, r * 0.06, col); }
  else if (kind === 'bone') { L([[-0.6, 0.6], [0.6, -0.6]]); for (const [a, b] of [[-0.7, 0.5], [-0.5, 0.7], [0.7, -0.5], [0.5, -0.7]]) ring(g, x + a * r, y + b * r, r * 0.16, r * 0.06, col); }
  else if (kind === 'bolt') L([[0.1, -1], [-0.4, 0.1], [0.05, 0.1], [-0.1, 1], [0.45, -0.15], [0, -0.15], [0.1, -1]]);
  else if (kind === 'moon') { g.beginPath(); g.arc(x, y, r * 0.8, 0.6, Math.PI * 2 - 0.6 + 0.6); g.stroke(); circle(g, x + r * 0.35, y - r * 0.25, r * 0.6, S().ui.bpBg); text(g, 'z', x + r * 0.8, y - r * 0.8, { size: r * 0.5, color: col }); }
  else if (kind === 'clock') { ring(g, x, y, r * 0.85, r * 0.06, col); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; seg(g, [[x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7], [x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8]], r * 0.04, col); } seg(g, [[x, y], [x + Math.cos(t * 3 - 1.57) * r * 0.65, y + Math.sin(t * 3 - 1.57) * r * 0.65]], r * 0.05, col); seg(g, [[x, y], [x + Math.cos(t * 0.3) * r * 0.4, y + Math.sin(t * 0.3) * r * 0.4]], r * 0.07, col); }
  else if (kind === 'therm') { rr(g, x - 0.15 * r, y - 0.9 * r, 0.3 * r, 1.4 * r, 0.15 * r); g.stroke(); circle(g, x, y + 0.65 * r, 0.3 * r, col); seg(g, [[x, y + 0.5 * r], [x, y - (0.2 + 0.4 * Math.sin(t)) * r]], r * 0.12, col); }
  else { ring(g, x, y, r * 0.15, r * 0.08, col); for (let k = 0; k < 3; k++) { g.save(); g.translate(x, y); g.rotate(k * Math.PI / 3 + t * 0.6); g.beginPath(); g.ellipse(0, 0, r, r * 0.35, 0, 0, 7); g.stroke(); g.restore(); } }
  g.restore();
}
function science(g, t, info) {
  UI.blueprint(g); const ui = S().ui, col = UI.bpStroke();
  const cam = { z: 1 + 0.05 * ease.inOut(info.p) };
  layer(g, cam, 1, (g) => {
    const ix = E.W * V(0.36, 0.5), iy = E.H * V(0.48, 0.3), r = V(230, 250) * ease.outBack(prog(t, 0, 0.5));
    glow(g, ix, iy, r * 2.2, col, 0.15);
    icon(g, info.icon, ix, iy, r, t, col);
    ring(g, ix, iy, r * 1.35, 2, alpha(col, 0.35));
    const lx = E.W * V(0.66, 0.5), ly = E.H * V(0.42, 0.5);
    text(g, info.sci || '', lx, ly, { size: V(96, 96), color: ui.gold, font: FONTS.ui, weight: 900, spacing: 6, glow: 24, glowColor: alpha(ui.gold, 0.5), alpha: ease.out(prog(t, 0.3, 0.7)) });
    UI.callout(g, t, { at: [ix + r * 0.6, iy - r * 0.6], to: [lx - V(160, 0), ly - V(60, 120)], str: '', start: 0.4 });
    UI.lineFigure(g, { x: E.W * V(0.66, 0.82), y: E.H * V(0.82, 0.72), s: V(1.1, 0.9), pose: [POSES.think, POSES.point, POSES.explain][info.seed % 3], color: alpha('#e8f0ff', 0.9) });
    if (info.numAny) text(g, info.numAny[0] + (info.numAny[1] === '%' ? '%' : ' ' + (info.numAny[1] || '')), lx, ly + V(110, 110), { size: V(56, 60), color: ui.cream, font: FONTS.ui, weight: 900, alpha: ease.out(prog(t, 0.6, 1.0)) });
  });
}

function compare(g, t, info) {
  UI.blueprint(g); const ui = S().ui, col = UI.bpStroke();
  const x0 = V(560, 140), x1 = E.W - V(220, 120), rows = [E.H * V(0.38, 0.4), E.H * V(0.64, 0.6)];
  const row = (y, label, val, frac, c, pose, k) => {
    if (!E.vertical) UI.lineFigure(g, { x: 300, y: y + 110, s: 1.0, pose, color: alpha(c, 0.9) });
    text(g, label, x0, y - 62, { size: V(42, 46), color: c, font: FONTS.ui, weight: 900, align: 'left', spacing: 2 });
    rr(g, x0, y - 26, x1 - x0, 52, 26); g.fillStyle = alpha(c, 0.12); g.fill();
    const w = Math.max(52, (x1 - x0) * frac); rr(g, x0, y - 26, w, 52, 26); g.fillStyle = c; g.fill(); glow(g, x0 + w, y, 60, c, 0.5);
    if (val) text(g, val, Math.min(x0 + w + 24, x1 - 200), y + 66, { size: V(48, 52), color: c, font: FONTS.ui, weight: 900, align: 'left', alpha: clamp(frac * 4) });
  };
  row(rows[0], 'AVERAGE PERSON', info.avg || '', 0.3 * ease.inOut(prog(t, 0.2, 1.2)), col, POSES.stand);
  row(rows[1], 'YOU (RIO)', info.you || '', 0.95 * ease.out(prog(t, 0.8, 1.8)), ui.gold, POSES.cheer);
}

function question(g, t, info) {
  blurLayer(g, 12, (g) => drawSet(info.loc, g, t * 0.3, { z: 1.25, x: -60, y: 0 }));
  veil(g, '#0a0812', 0.45);
  const M = mood('dusk');
  drawFigure(g, { x: E.W * V(0.82, 0.5), y: E.H * V(0.95, 0.7), s: V(1.4, 1.5), facing: -1, outfit: RIO, pose: breathe(POSES.think, t), expr: 'thinking', rim: rimOf(M) });
  if (!E.cfg.captions) blockText(g, info.text, E.W * V(0.44, 0.5), E.H * V(0.45, 0.32), { size: V(76, 80), maxW: E.W * V(0.7, 0.85), font: FONTS.serif, weight: 900, italic: true, color: S().ui.cream, a: ease.out(prog(t, 0.05, 0.4)) });
  else { text(g, '?', E.W / 2, E.H * 0.26, { size: 360, color: S().ui.gold, font: FONTS.serif, weight: 900, italic: true, glow: 40, glowColor: alpha(S().ui.gold, 0.5), alpha: ease.out(prog(t, 0, 0.3)) }); }
}

function title(g, t, info) {
  const M = mood('dusk'), cam = { z: 1.06 - 0.06 * ease.inOut(info.p), y: -14 * t };
  layer(g, cam, 0.2, (g) => { backdrop(g, M.sky); FX.sun(g, E.W / 2, E.H * V(0.62, 0.55), V(90, 110), '#fff3dc', M.key, 5); FX.godRays(g, E.W / 2, E.H * V(0.62, 0.55), { count: 14, angle: -Math.PI / 2, spread: Math.PI * 1.6, len: 1800, a: 0.06, t }); });
  layer(g, cam, 0.5, (g) => FX.skyline(g, { x: -200, y: E.H * V(0.74, 0.66), w: E.W + 400, maxH: V(300, 500), color: '#2a1f36', windowColor: alpha(M.practical, 0.8), seed: 21 }));
  layer(g, cam, 0.8, (g) => { g.fillStyle = '#16111e'; g.fillRect(-E.W, E.H * V(0.74, 0.66), E.W * 3, E.H); });
  drawFigure(g, { x: E.W / 2, y: E.H * V(0.74, 0.66), s: V(1.0, 1.4), facing: 1, outfit: RIO, pose: breathe(POSES.pointUp, t), expr: 'awe', rim: rimOf(M) });
  FX.dust(g, t, { count: 30, color: '#ffd9b0', a: 0.4 });
  const tt = (info.title || '').replace(/\?$/, '');
  const m = tt.match(/^(What If)\s+(.*)$/i);
  const rest = m ? m[2] : tt;
  const words = rest.split(' '); const half = Math.ceil(words.length / 2);
  const lines = E.vertical ? [m ? 'WHAT IF' : '', words.slice(0, half).join(' ').toUpperCase(), words.slice(half).join(' ').toUpperCase() + '?'].filter(Boolean) : [m ? 'WHAT IF' : '', rest.toUpperCase() + '?'].filter(Boolean);
  UI.titleCard(g, t, { lines, dur: info.dur + 0.6, y: E.H * V(0.32, 0.3) });
}

function end(g, t, info) {
  UI.endScreen(g, t, { question: E.vertical ? 'Follow for more!' : 'What would YOU do?', cast: allCast() });
  text(g, 'RIO ANIMATION', E.W / 2, E.H * V(0.5, 0.42), { size: V(72, 80), color: S().ui.gold, font: FONTS.title, weight: 700, spacing: 4, glow: 24, glowColor: 'rgba(255,140,60,.7)', alpha: ease.out(prog(t, 0.3, 0.8)) });
  text(g, 'Subscribe for more fascinating videos', E.W / 2, E.H * V(0.58, 0.48), { size: V(40, 44), color: S().ui.cream, font: FONTS.ui, weight: 800, alpha: ease.out(prog(t, 0.5, 1.0)) });
}

const T = { hero, duo, face, number, science, compare, question, title, end };
for (const sh of E.shots) {
  registerShot(sh.id, { draw(g, t, info) {
    (T[info.tpl] || hero)(g, t, info);
    if (info.hook && info.shot.id === 's001' && info.title) {   // Shorts: title band over the hook
      const a = clamp(Math.min(t / 0.3, (info.dur - t) / 0.4));
      g.save(); g.globalAlpha *= a; g.fillStyle = 'rgba(8,6,14,.55)'; rr(g, 60, 190, E.W - 120, 330, 30); g.fill(); g.restore();
      blockText(g, info.title.toUpperCase(), E.W / 2, 355, { size: 84, maxW: E.W - 180, color: S().ui.gold, a, maxLines: 3 });
    }
  } });
}
