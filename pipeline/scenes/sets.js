// sets.js — reusable locations for the Rio Animation auto-templates. Each set(g, t, cam, o) draws the background
// layers and returns { GY, CX, M }. Characters are drawn by the caller at depth 1.
import { E, V, mood, layer, backdrop, rr, seg, circle, ring, poly, linGrad, radGrad, glow, alpha, shade, mix, rng, text, FONTS } from '/engine/core.js';
import * as FX from '/engine/fx2d.js';

const ground = () => E.H * V(0.8, 0.7);

function floor(g, cam, M, GY, lines = true, poolC = null) {
  layer(g, cam, 0.92, (g) => {
    g.fillStyle = linGrad(g, 0, GY, 0, GY + 600, [shade(M.floor, 0.05), shade(M.dark, -0.2)]); g.fillRect(-E.W, GY, E.W * 3, E.H * 2);
    if (lines) FX.floorLines(g, GY, GY + 700, 'rgba(0,0,0,.22)', 0.07);
    if (poolC) FX.pool(g, E.W / 2, GY + 16, V(520, 420), 70, poolC, 0.22);
  });
}

export function street(g, t, cam, o = {}) {
  const M = mood(o.mood || 'night'), GY = ground(), CX = E.W / 2;
  layer(g, cam, 0.1, (g) => { backdrop(g, M.sky); FX.stars(g, 0, { count: 90, area: [-E.W, -E.H, E.W * 3, GY], color: '#dfe6ff' }); FX.moon(g, CX + V(600, 280), GY - V(700, 1150), 46); });
  layer(g, cam, 0.3, (g) => FX.skyline(g, { x: -E.W, y: GY - V(140, 260), w: E.W * 3, minH: 120, maxH: V(520, 820), color: mix(M.sky[0], '#000', 0.35), windowColor: alpha(M.practical, 0.7), lit: 0.25, seed: 11 }));
  layer(g, cam, 0.6, (g) => {
    FX.skyline(g, { x: -E.W, y: GY, w: E.W * 3, minH: 200, maxH: V(460, 760), minW: 120, maxW: 260, color: shade(M.wall, -0.45), windowColor: alpha(M.practical, 0.9), lit: 0.35, seed: 4 });
    for (const x of [-700, -100, 500, 1100, 1700, 2300]) FX.lampPost(g, x, GY, V(360, 420), { light: M.practical });
  });
  layer(g, cam, 0.92, (g) => {
    g.fillStyle = linGrad(g, 0, GY, 0, GY + 500, [shade(M.road, 0.1), shade(M.dark, -0.3)]); g.fillRect(-E.W, GY, E.W * 3, E.H * 2);
    for (let x = -E.W; x < E.W * 2; x += 220) { g.fillStyle = alpha('#f2e6c8', 0.35); g.fillRect(x, GY + V(150, 260), 110, 8); }
    for (const x of [-700, -100, 500, 1100, 1700]) FX.pool(g, x + 34, GY + 20, 220, 36, M.practical, 0.2);
  });
  return { GY, CX, M, fx: (g, t) => FX.dust(g, t, { count: 30, color: '#c9d4ff', a: 0.25 }) };
}

export function home(g, t, cam, o = {}) {
  const M = mood(o.mood || 'interiorWarm'), GY = ground(), CX = E.W / 2;
  layer(g, cam, 0.35, (g) => {
    g.fillStyle = linGrad(g, 0, -E.H, 0, GY, [M.dark, M.wall]); g.fillRect(-E.W, -E.H, E.W * 3, GY + E.H);
    for (let x = -E.W; x < E.W * 2; x += 90) { g.fillStyle = alpha(shade(M.wall, 0.15), 0.25); g.fillRect(x, -E.H, 3, GY + E.H); }
    const wx = CX + V(180, -230), wy = GY - V(600, 900), ww = V(440, 460), wh = V(340, 420);
    FX.windowFrame(g, { x: wx, y: wy, w: ww, h: wh, cols: 2, frame: shade(M.wall, -0.55), bar: 10 }, (g, x, y, w, h) => {
      g.fillStyle = linGrad(g, 0, y, 0, y + h, mood('dusk').sky); g.fillRect(x, y, w, h);
      FX.skyline(g, { x, y: y + h, w, maxH: h * 0.5, color: alpha('#2a2036', 0.9), windowColor: alpha(M.practical, 0.8), seed: 9 });
    });
    // picture frames + shelf
    const fx0 = CX - V(640, 380), fy0 = GY - V(560, 1000);
    for (let k = 0; k < 3; k++) { rr(g, fx0 + k * 130, fy0 + (k % 2) * 30, 100, 80, 6); g.fillStyle = shade(M.wall, -0.5); g.fill(); rr(g, fx0 + k * 130 + 8, fy0 + 8 + (k % 2) * 30, 84, 64, 4); g.fillStyle = ['#c98a6a', '#6a8ac9', '#8ac96a'][k]; g.fill(); }
    // lamp
    const lx = CX - V(520, 330); seg(g, [[lx, GY - 40], [lx, GY - 330]], 6, shade(M.wall, -0.6)); poly(g, [[lx - 60, GY - 330], [lx + 60, GY - 330], [lx + 38, GY - 400], [lx - 38, GY - 400]], '#f2d9a8');
    glow(g, lx, GY - 340, 260, M.practical, 0.45);
  });
  layer(g, cam, 0.75, (g) => {   // sofa
    const sx = CX + V(380, 250), sw = V(520, 380);
    rr(g, sx - sw / 2, GY - 190, sw, 120, 26); g.fillStyle = shade('#6a4a6a', -0.2); g.fill();
    rr(g, sx - sw / 2 - 20, GY - 110, sw + 40, 70, 22); g.fillStyle = '#6a4a6a'; g.fill();
    seg(g, [[sx - sw / 2, GY - 40], [sx - sw / 2, GY]], 10, '#1a1218'); seg(g, [[sx + sw / 2, GY - 40], [sx + sw / 2, GY]], 10, '#1a1218');
  });
  floor(g, cam, M, GY, true, M.key);
  return { GY, CX, M, fx: (g, t) => FX.dust(g, t, { count: 40, color: '#ffe2bd', a: 0.3 }) };
}

export function hospital(g, t, cam, o = {}) {
  const M = mood(o.mood || 'interiorCool'), GY = ground(), CX = E.W / 2;
  const wall = mix(M.wall, '#9fb4c8', 0.35);
  layer(g, cam, 0.35, (g) => {
    g.fillStyle = linGrad(g, 0, -E.H, 0, GY, [shade(wall, -0.4), wall]); g.fillRect(-E.W, -E.H, E.W * 3, GY + E.H);
    g.fillStyle = shade(wall, -0.25); g.fillRect(-E.W, GY - 150, E.W * 3, 14);
    for (const x of [-600, 0, 600, 1200, 1800]) { rr(g, x, -E.H * 0.2 + V(0, 300), 320, 26, 10); g.fillStyle = '#e8f6ff'; g.fill(); glow(g, x + 160, V(-200, 120), 360, '#cfefff', 0.25); }
    // red cross sign
    const cx = CX - V(620, 340), cy = GY - V(560, 1000); rr(g, cx - 60, cy - 60, 120, 120, 14); g.fillStyle = '#f4f7fa'; g.fill(); g.fillStyle = '#e0443a'; g.fillRect(cx - 14, cy - 44, 28, 88); g.fillRect(cx - 44, cy - 14, 88, 28);
    // heart monitor
    FX.screen(g, { x: CX + V(420, 160), y: GY - V(520, 820), w: 200, h: 130, glowC: '#5fd39a', a: 0.25 }, (g, x, y, w, h) => {
      g.strokeStyle = '#5fd39a'; g.lineWidth = 3; g.beginPath();
      for (let i = 0; i <= 40; i++) { const u = (i / 40 + t * 0.5) % 1, beat = Math.abs(u - 0.5) < 0.03 ? -40 * Math.sin((u - 0.47) * 52) : 0; const px = x + 8 + i * (w - 16) / 40; i ? g.lineTo(px, y + h / 2 + beat) : g.moveTo(px, y + h / 2 + beat); }
      g.stroke();
    });
  });
  layer(g, cam, 0.75, (g) => FX.bed(g, { x: CX + V(160, -120), y: GY, w: V(460, 380), color: '#a8c8e8', frame: '#3a4a5a', pillow: '#f2f6fa' }));
  floor(g, cam, M, GY, true, '#cfefff');
  return { GY, CX, M };
}

export function stadium(g, t, cam, o = {}) {
  const M = mood(o.mood || 'night'), GY = ground(), CX = E.W / 2;
  layer(g, cam, 0.1, (g) => { backdrop(g, M.sky); FX.stars(g, 0, { count: 60, area: [-E.W, -E.H, E.W * 3, GY * 0.6] }); });
  layer(g, cam, 0.3, (g) => {
    for (const x of [CX - V(700, 380), CX + V(700, 380)]) { seg(g, [[x, GY - V(260, 400)], [x, GY - V(760, 1300)]], 10, '#1a1a28'); rr(g, x - 70, GY - V(820, 1360), 140, 70, 8); g.fillStyle = '#f6f8ff'; g.fill(); glow(g, x, GY - V(785, 1325), 420, '#eaf2ff', 0.55); FX.lightCone(g, x, GY - V(760, 1300), { angle: Math.PI / 2 + (x < CX ? -0.35 : 0.35), spread: 0.45, len: 1400, color: '#eaf2ff', a: 0.08 }); }
  });
  layer(g, cam, 0.5, (g) => {
    g.fillStyle = shade(M.wall, -0.5); g.fillRect(-E.W, GY - V(420, 640), E.W * 3, V(420, 640));
    FX.crowd(g, t, { y: GY - V(400, 610), x: -E.W, w: E.W * 3, rows: V(13, 20), rowH: 28, colors: ['#3a3358', '#5a3a4a', '#2a4a6a', '#6a5a3a', '#4a2a3a'], flags: 0.03, cheer: 0.6, size: 1.1 });
    g.fillStyle = '#1a1424'; g.fillRect(-E.W, GY - 40, E.W * 3, 40);
  });
  layer(g, cam, 0.92, (g) => {
    g.fillStyle = linGrad(g, 0, GY, 0, GY + 500, ['#3f7a4a', '#1d3a26']); g.fillRect(-E.W, GY, E.W * 3, E.H * 2);
    for (let x = -E.W; x < E.W * 2; x += 180) { g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(x, GY, 90, E.H); }
    FX.pool(g, CX, GY + 30, 600, 80, '#eaf2ff', 0.18);
  });
  return { GY, CX, M };
}

export function park(g, t, cam, o = {}) {
  const M = mood(o.mood || 'day'), GY = ground(), CX = E.W / 2;
  layer(g, cam, 0.08, (g) => { backdrop(g, M.sky); FX.sun(g, CX - V(560, 260), GY - V(640, 1100), 60, '#fffbe8', M.key, 4); FX.clouds(g, { y: GY - V(680, 1200), h: 220, color: '#ffffff', a: 0.35, seed: 5 }); });
  layer(g, cam, 0.25, (g) => FX.hills(g, { y: GY - V(140, 260), amp: 160, color: mix(M.grass, M.sky[0], 0.55), seed: 3 }));
  layer(g, cam, 0.5, (g) => { FX.hills(g, { y: GY - 30, amp: 90, color: shade(M.grass, -0.15), seed: 7 }); for (const [x, s] of [[-300, 1.3], [180, 1.6], [CX + V(560, 300), 1.9], [1500, 1.4], [2100, 1.7]]) FX.tree(g, x, GY - 20, s, shade(M.grass, -0.55)); });
  layer(g, cam, 0.92, (g) => {
    g.fillStyle = linGrad(g, 0, GY, 0, GY + 500, [M.grass, shade(M.grass, -0.5)]); g.fillRect(-E.W, GY, E.W * 3, E.H * 2);
    g.fillStyle = alpha('#d8c49a', 0.55); g.beginPath(); g.moveTo(-E.W, GY + V(120, 200)); g.quadraticCurveTo(CX, GY + V(40, 80), E.W * 2, GY + V(160, 260)); g.lineTo(E.W * 2, GY + V(200, 320)); g.quadraticCurveTo(CX, GY + V(90, 150), -E.W, GY + V(170, 280)); g.fill();
  });
  return { GY, CX, M, fx: (g, t) => FX.dust(g, t, { count: 24, color: '#fffbe0', a: 0.35 }) };
}

export function classroom(g, t, cam, o = {}) {
  const M = mood(o.mood || 'interiorWarm'), GY = ground(), CX = E.W / 2;
  layer(g, cam, 0.35, (g) => {
    g.fillStyle = linGrad(g, 0, -E.H, 0, GY, [M.dark, mix(M.wall, '#6a7a5a', 0.3)]); g.fillRect(-E.W, -E.H, E.W * 3, GY + E.H);
    const bw = V(900, 760), bh = V(380, 420), bx = CX - bw / 2, by = GY - V(640, 1050);
    rr(g, bx - 14, by - 14, bw + 28, bh + 28, 10); g.fillStyle = '#5a4030'; g.fill(); g.fillStyle = '#1f3a2e'; g.fillRect(bx, by, bw, bh);
    g.strokeStyle = alpha('#f2f2e8', 0.6); g.lineWidth = 4; g.beginPath(); g.moveTo(bx + 60, by + 90); g.lineTo(bx + 300, by + 90); g.moveTo(bx + 60, by + 150); g.lineTo(bx + 420, by + 150); g.stroke();
    ring(g, bx + bw - 180, by + bh / 2, 80, 4, alpha('#f2f2e8', 0.55)); seg(g, [[bx + bw - 260, by + bh / 2], [bx + bw - 100, by + bh / 2]], 3, alpha('#f2f2e8', 0.4));
    FX.clock(g, CX + V(640, 360), GY - V(700, 1150), 40, 10 * 3600 + t * 2);
    for (const x of [-500, CX - V(820, 470), CX + V(820, 470), 2400]) { FX.windowFrame(g, { x: x - 90, y: GY - V(560, 760), w: 180, h: V(300, 360), cols: 1, frame: shade(M.wall, -0.5), bar: 8 }, (g, x, y, w, h) => { g.fillStyle = linGrad(g, 0, y, 0, y + h, mood('day').sky); g.fillRect(x, y, w, h); }); }
  });
  layer(g, cam, 0.8, (g) => { for (const x of [CX - V(560, 320), CX + V(560, 320)]) { rr(g, x - 120, GY - 110, 240, 18, 6); g.fillStyle = '#7a5a40'; g.fill(); seg(g, [[x - 100, GY - 100], [x - 100, GY]], 8, '#3a2a20'); seg(g, [[x + 100, GY - 100], [x + 100, GY]], 8, '#3a2a20'); } });
  floor(g, cam, M, GY, true, M.key);
  return { GY, CX, M, fx: (g, t) => FX.dust(g, t, { count: 30, color: '#ffe8c8', a: 0.3 }) };
}

export function cafe(g, t, cam, o = {}) {
  const M = mood(o.mood || 'golden'), GY = ground(), CX = E.W / 2;
  const wall = shade(M.wall, -0.3), wallDark = shade(M.wall, -0.6);
  layer(g, cam, 0.12, (g) => { backdrop(g, M.sky); FX.sun(g, CX + V(620, 300), GY - V(560, 1000), 64, '#fff3dc', M.key, 5); FX.skyline(g, { x: -E.W, y: GY - V(420, 700), w: E.W * 3, minH: 80, maxH: V(260, 420), color: mix(M.sky[1], wallDark, 0.75), windowColor: alpha(M.practical, 0.5), lit: 0.15, seed: 8 }); });
  layer(g, cam, 0.55, (g) => {
    const top = GY - V(560, 860), left = CX - 1500, w = 3000;
    g.fillStyle = linGrad(g, 0, top, 0, GY, [shade(wall, 0.06), wall, wallDark]); g.fillRect(left, top, w, GY - top + 4);
    const ay = GY - V(430, 560), ah = 58;
    for (const i of [-3, -2, -1, 1, 2, 3]) { const ww = 210, wh = V(250, 300), wx = CX + i * 300 - ww / 2 + (i > 0 ? 30 : -30), wy = ay + 46;
      FX.windowFrame(g, { x: wx, y: wy, w: ww, h: wh, cols: 2, rows: 1, frame: wallDark, bar: 9 }, (g, x, y, w, h) => { g.fillStyle = linGrad(g, 0, y, 0, y + h, [M.practical, shade(M.practical, -0.45), shade(M.practical, -0.7)]); g.fillRect(x, y, w, h); circle(g, x + w * 0.5, y + 34, 9, '#fff3d6'); glow(g, x + w * 0.5, y + 34, 70, '#fff3d6', 0.5); });
      glow(g, wx + ww / 2, wy + wh / 2, 230, M.practical, 0.1); }
    FX.door(g, { x: CX - 70, y: GY, w: 140, h: V(330, 380), color: wallDark, open: 0.3, light: M.practical });
    for (let x = left, k = 0; x < left + w; x += 56, k++) { g.fillStyle = k % 2 ? '#c9b8a4' : '#2f6a8f'; g.fillRect(x, ay - ah, 56, ah); g.beginPath(); g.arc(x + 28, ay, 28, 0, Math.PI); g.fill(); }
  });
  layer(g, cam, 0.9, (g) => { g.fillStyle = linGrad(g, 0, GY, 0, GY + 400, [shade(M.floor, -0.1), shade(M.dark, -0.2)]); g.fillRect(-E.W, GY, E.W * 3, E.H * 2); FX.floorLines(g, GY, GY + 600, 'rgba(0,0,0,.25)', 0.08); FX.pool(g, CX, GY + 20, 260, 34, M.practical, 0.25); });
  return { GY, CX, M, fx: (g, t) => FX.dust(g, t, { count: 36, color: '#ffe2bd', a: 0.35 }) };
}

export function lab(g, t, cam, o = {}) {
  const M = mood(o.mood || 'interiorCool'), GY = ground(), CX = E.W / 2;
  layer(g, cam, 0.35, (g) => {
    g.fillStyle = linGrad(g, 0, -E.H, 0, GY, [M.dark, M.wall]); g.fillRect(-E.W, -E.H, E.W * 3, GY + E.H);
    for (let k = -2; k <= 2; k++) FX.screen(g, { x: CX + k * V(330, 250) - 110, y: GY - V(600, 1000) + (k % 2) * 40, w: 220, h: 140, glowC: '#7fd0d6', a: 0.18 }, (g, x, y, w, h) => {
      g.strokeStyle = '#7fd0d6'; g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 24; i++) g.lineTo(x + 8 + i * (w - 16) / 23, y + h / 2 - Math.sin(i * 0.8 + t * 2 + k) * 24); g.stroke(); });
  });
  layer(g, cam, 0.7, (g) => FX.counter(g, { x: CX - V(700, 520), y: GY - 30, w: V(1400, 1040), h: 120, color: shade(M.wall, -0.45), top: shade(M.wall, -0.2), doors: 10 }));
  floor(g, cam, M, GY, true, '#7fd0d6');
  return { GY, CX, M };
}

export const SETS = { street, home, hospital, stadium, park, classroom, cafe, lab };
export function drawSet(name, g, t, cam) { return (SETS[name] || street)(g, t, cam); }
