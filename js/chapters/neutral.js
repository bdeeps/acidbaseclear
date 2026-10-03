// Chapter 3: neutralisation. Two scenes, both solved from the charge balance in acid.js.
// "tit": a titration. The flask holds 25.00 mL of a 0.100 mol/L solution; the burette adds a
//   0.100 mol/L solution of its opposite. At each added volume v the mixture is
//     strong acid + strong base:  spectator charge (0.1 v − 2.5) ÷ (25 + v) mmol/mL
//     acetic acid + NaOH:         acetic acid 2.5 ÷ (25 + v), Na⁺ 0.1 v ÷ (25 + v)
//     ammonia + HCl:              ammonia 2.5 ÷ (25 + v), Cl⁻ 0.1 v ÷ (25 + v)
//   and the solver returns the pH. Results: the end point is at 25.00 mL in every case, at pH 7.00
//   (strong + strong), 8.73 (acetic acid, because acetate is a weak base) and 5.28 (ammonia). One drop
//   is taken as 0.05 mL, the usual figure for a burette. Indicator ranges: see acid.js.
// "antacid": 100 mL of hydrochloric acid at pH 1.5, the acid end of the range for stomach contents
//   (1.5 to 3.5, MedlinePlus), in a beaker, and an antacid stirred in. Antacids are salts of
//   aluminium, calcium, magnesium or sodium that neutralise the acid (Wikipedia "Antacid").
//     NaHCO₃ + HCl → NaCl + H₂O + CO₂        1 g neutralises 11.9 mmol of acid
//     CaCO₃ + 2 HCl → CaCl₂ + H₂O + CO₂      1 g neutralises 20.0 mmol
//     Mg(OH)₂ + 2 HCl → MgCl₂ + 2 H₂O        1 g neutralises 34.3 mmol
//   Chalk and magnesium hydroxide barely dissolve in water: the solver lets only as much dissolve as
//   their solubility products allow (Ksp in acid.js), so their pH levels off once the acid is used up.
//   The model keeps the CO₂ in the liquid; in an open glass some fizzes away and the pH ends a
//   little higher. This is a beaker, not a body: a real stomach keeps making acid and empties.
import { THREE, M, box, clamp } from '../kit.js';
import {
  solve, fractions, PKA, KSP, KW, MM, INDICATORS, indColor, indName, indOpacity, uniColor, css, fpH, COL, HEX, VIEW, REEL_VIEW,
  board, panelBg, title, axes, curve, dot, text, vline, hline, dots, makeDisplay, beaker, flask, bench, fitNarrow, placeBoard, fit, focusSwitch, showLabels, rng, inReel,
} from '../acid.js';

const N0 = 2.5, CT = 0.1, V0 = 25, DROP = 0.05;                 // mmol in the flask, mol/L in the burette, mL, mL
export const COMBOS = {
  sa: { short: 'HCl + NaOH', flask: 'hydrochloric acid', tit: 'sodium hydroxide', salt: 'sodium chloride (table salt)', acid: true },
  wa: { short: 'Acetic + NaOH', flask: 'acetic acid', tit: 'sodium hydroxide', salt: 'sodium acetate', acid: true },
  wb: { short: 'Ammonia + HCl', flask: 'ammonia', tit: 'hydrochloric acid', salt: 'ammonium chloride', acid: false },
};
export function titrate(combo, v) {
  const V = V0 + v, nt = CT * v;
  if (combo === 'sa') return solve({ strong: (nt - N0) / V }).pH;
  if (combo === 'wa') return solve({ species: [{ C: N0 / V, pKa: PKA.acetic, z: 0 }], strong: nt / V }).pH;
  return solve({ species: [{ C: N0 / V, pKa: PKA.ammonium, z: 1 }], strong: -nt / V }).pH;
}
// The volume at which the mixture reaches a given pH (the curve only ever goes one way).
export function volAt(combo, pH) {
  const up = COMBOS[combo].acid;
  let lo = 0, hi = 50;
  if ((titrate(combo, 0) > pH) === up) return 0;
  if ((titrate(combo, 50) < pH) === up) return 50;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if ((titrate(combo, mid) < pH) === up) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
const TIT_INDS = ['pp', 'mo', 'btb', 'uni'];

const C0 = Math.pow(10, -1.5), VA = 0.1;                         // mol/L of HCl and litres in the beaker
export const ANTACIDS = {
  nahco3: { name: 'Baking soda', chem: 'sodium bicarbonate, NaHCO₃', eq: 1, mm: MM.nahco3, gas: true },
  caco3: { name: 'Chalk', chem: 'calcium carbonate, CaCO₃', eq: 2, mm: MM.caco3, gas: true },
  mgoh2: { name: 'Milk of magnesia', chem: 'magnesium hydroxide, Mg(OH)₂', eq: 2, mm: MM.mgoh2, gas: false },
};
export function antacid(kind, mg) {
  const n = mg / 1000 / ANTACIDS[kind].mm / VA;                  // mol/L if it all dissolved
  let r, dis = n;
  if (kind === 'nahco3') r = solve({ species: [{ C: n, pKa: PKA.carbonic, z: 0 }], strong: n - C0 });
  else if (kind === 'caco3') {
    const sOf = (H) => { const a = fractions(H, PKA.carbonic); return Math.min(n, Math.sqrt(KSP.caco3 / a[2])); };
    r = solve({ strong: -C0, extra: (H) => { const a = fractions(H, PKA.carbonic); return sOf(H) * (2 - a[1] - 2 * a[2]); } });
    dis = sOf(r.H);
  } else {
    const sOf = (H) => Math.min(n, KSP.mgoh2 / Math.pow(KW / H, 2));
    r = solve({ strong: -C0, extra: (H) => 2 * sOf(H) });
    dis = sOf(r.H);
  }
  return { ...r, n, dis, left: clamp(r.H / C0, 0, 1), solid: n > 0 ? Math.max(0, 1 - dis / n) : 0 };
}
const needMg = (kind) => (C0 * VA * 1000 * ANTACIDS[kind].mm) / ANTACIDS[kind].eq;   // mg that exactly matches the acid

export default {
  id: 'neutral',
  short: 'Neutralisation',
  title: 'Acid + base → salt + water',
  subtitle: 'Add one to the other drop by drop and the pH does not creep. It jumps.',
  view: VIEW,
  learn: `<p>Mix an acid with a base and they cancel. The acid's H₃O⁺ meets the base's OH⁻ and they join to make water: <b>H₃O⁺ + OH⁻ → 2 H₂O</b>. The ions left over make a <b>salt</b>. Hydrochloric acid and sodium hydroxide leave sodium and chloride ions: ordinary table salt, in water. This is <b>neutralisation</b>, and it gives out heat.</p>
    <p>Chemists use it to measure. In a <b>titration</b>, a flask holds a measured amount of acid with a few drops of indicator. A <b>burette</b> adds base of known strength until the colour flips. The volume used tells you how much acid there was.</p>
    <p>The surprise is the <b>shape of the curve</b>. For most of the way the pH hardly moves, because pH is a logarithm: using up 90% of the acid only raises it one step. Then, right at the <b>end point</b>, a single drop swings the pH by six units. That steep jump is why titrations are so sharp, and why an indicator that changes anywhere on the cliff will do.</p>
    <p>A <b>weak acid</b> changes the picture. It starts at a higher pH, it has a flat stretch in the middle where it resists change (a buffer, next chapter), and its end point is <b>above 7</b>, because the salt it leaves behind is itself a weak base. So phenolphthalein suits it and methyl orange does not.</p>
    <p><b>Antacids</b> are neutralisation you can swallow. They are mild bases, such as sodium bicarbonate, calcium carbonate or magnesium hydroxide, that react with the hydrochloric acid of the stomach. The carbonates give off carbon dioxide gas as they do it. The same reaction makes a cake rise when curd or lemon juice meets baking soda (see CakeClear).</p>
    <p><b>Safety, as taught in school labs:</b> concentrated acids and alkalis burn skin and eyes, and alkali in the eye is the more dangerous of the two. Chemists wear eye protection, and when diluting they always add <b>acid to water</b>, never water to acid, because the mixing releases heat that can make it boil and spit.</p>
    <p class="tip"><b>Try it:</b> run the burette slowly past 25 mL and watch the colour flip in one drop. Switch to acetic acid and change the indicator to methyl orange: it turns far too early. Then drop baking soda, chalk and milk of magnesia into the acid and compare how much each one needs.</p>`,
  terms: [
    { t: 'Neutralisation', d: 'An acid and a base reacting to make a salt and water: H₃O⁺ + OH⁻ → 2 H₂O.' },
    { t: 'Salt', d: 'The compound left when an acid’s hydrogen is replaced by a metal or other positive ion. Table salt is one of thousands.' },
    { t: 'Titration', d: 'Measuring an unknown amount of acid or base by adding a known solution until it is just used up.' },
    { t: 'End point', d: 'The moment in a titration when the acid and base exactly match, shown by the indicator changing colour.' },
    { t: 'Burette', d: 'A long marked glass tube with a tap, for adding liquid a drop at a time and reading the volume.' },
    { t: 'Antacid', d: 'A mild base taken to neutralise some of the stomach’s hydrochloric acid.' },
  ],
  defaults: { focus: 'tit', combo: 'sa', vol: 12, ind: 'pp', kind: 'nahco3', dose: 0 },
  controls: [
    { key: 'focus', type: 'seg', label: 'Look at', options: [{ v: 'tit', label: 'Titration' }, { v: 'antacid', label: 'Antacid in acid' }] },
    { key: 'combo', type: 'seg', label: 'Titration: flask + burette', options: Object.entries(COMBOS).map(([v, m]) => ({ v, label: m.short })), fmt: (v) => `25 mL of 0.1 mol/L ${COMBOS[v].flask}` },
    { key: 'vol', type: 'range', label: 'Titration: volume added from the burette', min: 0, max: 50, step: 0.05, ends: ['0 mL', '50 mL'], fmt: (v) => `${v.toFixed(2)} mL` },
    { key: 'step', type: 'buttons', label: 'Titration: one drop at a time', items: [
      { label: '− 1 drop', act: (s) => { s.vol = clamp(+(s.vol - DROP).toFixed(2), 0, 50); s.focus = 'tit'; } },
      { label: '+ 1 drop', act: (s) => { s.vol = clamp(+(s.vol + DROP).toFixed(2), 0, 50); s.focus = 'tit'; } },
      { label: 'Go to 24.90 mL', act: (s) => { s.vol = 24.9; s.focus = 'tit'; } },
    ] },
    { key: 'ind', type: 'seg', label: 'Titration: indicator in the flask', options: TIT_INDS.map((v) => ({ v, label: v === 'uni' ? 'Universal' : v === 'btb' ? 'Bromothymol' : INDICATORS[v].name })), fmt: (v) => (INDICATORS[v].multi ? 'a mixture of dyes' : `changes from pH ${INDICATORS[v].lo} to ${INDICATORS[v].hi}`) },
    { key: 'kind', type: 'seg', label: 'Antacid', options: Object.entries(ANTACIDS).map(([v, m]) => ({ v, label: m.name })), fmt: (v) => ANTACIDS[v].chem },
    { key: 'dose', type: 'range', label: 'Antacid: amount stirred in', min: 0, max: 600, step: 5, ends: ['none', '600 mg'], fmt: (v) => `${Math.round(v)} mg` },
  ],
  onChange(s, key) { if (key === 'combo' || key === 'vol' || key === 'ind') s.focus = 'tit'; if (key === 'kind' || key === 'dose') s.focus = 'antacid'; },
  quiz: [
    { q: 'In a titration of hydrochloric acid with sodium hydroxide, 90% of the acid has been neutralised. Roughly how far has the pH risen?', options: ['About one pH step', '90% of the way to 7', 'It is already 7', 'It has not changed at all'], answer: 0, why: 'One tenth of the acid is left, so [H₃O⁺] has fallen ten times (a little more, with dilution). That is about one step. The big jump waits for the last drop.' },
    { q: 'Acetic acid is titrated with sodium hydroxide. Why is the end point above pH 7?', options: ['Too much base was added', 'The salt left behind, sodium acetate, is a weak base', 'Acetic acid is really a base', 'Water is basic'], answer: 1, why: 'At the end point the flask holds only sodium acetate. Acetate ions take a few protons back from water, leaving OH⁻, so the pH is about 8.7.' },
    { q: 'Chalk (calcium carbonate) reacts with hydrochloric acid. What are the products?', options: ['Calcium chloride, water and carbon dioxide', 'Calcium metal and chlorine gas', 'Only water', 'Calcium hydroxide and hydrogen'], answer: 0, why: 'CaCO₃ + 2 HCl → CaCl₂ + H₂O + CO₂. A carbonate with an acid always gives a salt, water and carbon dioxide gas.' },
  ],
  reel: [
    { ms: 5600, caption: 'Add base to acid drop by drop. For 24 millilitres almost nothing happens. Then one drop flips it.', set: { focus: 'tit', combo: 'sa', ind: 'pp' }, anim: { vol: [0, 30] }, view: REEL_VIEW, spin: 0 },
    { ms: 5400, caption: 'An antacid is a mild base. Baking soda meets stomach-strength acid: salt, water and fizzing carbon dioxide.', set: { focus: 'antacid', kind: 'nahco3' }, anim: { dose: [0, 400] }, view: REEL_VIEW, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    root.add(bench(7.2, 3.2));
    const rnd = rng(3);

    // ================================================================ TITRATION
    const T = new THREE.Group(); root.add(T);
    const FX = 1.0;
    const tile = box(1.9, 0.06, 1.9, M.plastic(0xf2f2ee)); tile.position.set(FX, 0.13, 0); T.add(tile);
    const fl = flask(0.85, 1.75, 0.5); fl.position.set(FX, 0.16, 0); T.add(fl);
    const steel = M.metal(0x9aa0aa, { roughness: 0.4 });
    const sbase = box(1.5, 0.1, 1.1, M.plastic(0x2a2e37)); sbase.position.set(FX + 1.75, 0.15, 0); T.add(sbase);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 3.7, 12), steel); rod.position.set(FX + 2.0, 2.0, -0.2); T.add(rod);
    const clampBar = box(2.05, 0.07, 0.1, steel); clampBar.position.set(FX + 1.0, 3.1, -0.1); T.add(clampBar);
    const BT = 3.85, BB = 2.3, tubeH = BT - BB;
    const bur = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, tubeH, 20, 1, true), M.clear(0xcfe8ff, 0.22)); bur.position.set(FX, (BT + BB) / 2, 0); T.add(bur);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.025, 0.3, 16), M.clear(0xcfe8ff, 0.3)); tip.position.set(FX, BB - 0.15, 0); T.add(tip);
    const tap = box(0.34, 0.07, 0.07, M.plastic(0x2f6fd6)); tap.position.set(FX, BB - 0.02, 0.06); T.add(tap);
    const burLiq = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 1, 16), new THREE.MeshStandardMaterial({ color: 0xbfd8f0, transparent: true, opacity: 0.75, roughness: 0.2 })); T.add(burLiq);
    const drops = dots(4, 0.045, 0xcfe6ff); T.add(drops);
    const lBur = stage.label('', [FX - 1.9, 2.9, 0], T), lFlask = stage.label('', [FX - 1.9, 1.3, 0.6], T, 'hot'), lEnd = stage.label('', [FX - 2.2, 2.1, 0], T, 'hot');
    const titLabels = [lBur, lFlask, lEnd];
    let drip = 0, lastVol = -1;

    // ================================================================ ANTACID
    const A = new THREE.Group(); root.add(A);
    const AX = -0.9;
    const bk = beaker(1.25, 2.6, 1.9); bk.position.set(AX, 0.1, 0); A.add(bk);
    const meter = makeDisplay(1.5, 0.9, '#8ef0ff'); meter.position.set(2.2, 1.55, 0.3); A.add(meter);
    const mst = box(0.5, 1.0, 0.4, M.plastic(0x2a2e37)); mst.position.set(2.2, 0.6, 0.2); A.add(mst);
    const probe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.2, 16), M.plastic(0x2a2e37)); probe.position.set(AX + 0.85, 2.2, -0.3); A.add(probe);
    const NB = 46, bub = dots(NB, 0.055, 0xf4fbff), sed = dots(60, 0.06, 0xf4f4f0); A.add(bub, sed);
    const B = Array.from({ length: NB }, () => ({ a: rnd() * 6.283, r: Math.sqrt(rnd()) * 1.0, t: rnd(), f: 0.5 + rnd() * 0.7 }));
    const SD = Array.from({ length: 60 }, () => ({ a: rnd() * 6.283, r: Math.sqrt(rnd()) * 1.05, h: rnd() * 0.16 }));
    const spoon = new THREE.Group(); spoon.position.set(AX + 0.5, 3.05, 0.2); spoon.rotation.z = -0.5; A.add(spoon);
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10, 0, 6.283, Math.PI / 2, Math.PI / 2), steel); bowl.scale.set(1.3, 0.5, 1); spoon.add(bowl);
    const handle = box(1.1, 0.04, 0.09, steel); handle.position.x = -0.7; spoon.add(handle);
    const heap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 8, 0, 6.283, 0, Math.PI / 2), M.matte(0xf7f7f2)); heap.scale.set(1.2, 0.6, 0.9); spoon.add(heap);
    const lAnt = stage.label('', [AX + 2.4, 3.1, 0.2], A, 'hot'), lAcid = stage.label('100 mL of acid at pH 1.5, like stomach juice', [AX - 0.4, 0.75, 1.5], A), lSolid = stage.label('', [AX + 2.1, 0.55, 1.0], A);
    const antLabels = [lAnt, lAcid, lSolid];

    // ================================================================ board
    let S = null, key = '';
    const bd = board(root, 3.3, 2.31, 640, 448, (g, w, h) => {
      panelBg(g, w, h); if (!S) return;
      if (S.focus === 'antacid') {
        title(g, 'pH against antacid added');
        const { X, Y } = axes(g, w, h, { xMax: 600, yMax: 12, xTicks: [0, 150, 300, 450, 600], yTicks: [0, 2, 4, 6, 8, 10, 12], xLabel: 'milligrams in 100 mL of acid →' });
        hline(g, X, Y, 0, 600, 7, COL.faint);
        Object.keys(ANTACIDS).forEach((k) => { if (k !== S.kind) curve(g, (mg) => antacid(k, mg).pH, 0, 600, X, Y, COL.faint, 2, null, 150); });
        curve(g, (mg) => antacid(S.kind, mg).pH, 0, 600, X, Y, COL.oh, 6, null, 300);
        const R = antacid(S.kind, S.dose);
        dot(g, X(S.dose), Y(R.pH), COL.light, 10);
        text(g, `${ANTACIDS[S.kind].name}: acid matched at ${Math.round(needMg(S.kind))} mg`, 104, 82, COL.text, 'bold 22px sans-serif');
      } else {
        const c = COMBOS[S.combo];
        title(g, 'Titration curve', c.short);
        const { X, Y } = axes(g, w, h, { xMax: 50, yMax: 14, xTicks: [0, 10, 20, 30, 40, 50], yTicks: [0, 2, 4, 6, 8, 10, 12, 14], xLabel: `mL of ${c.tit} added →` });
        const ind = INDICATORS[S.ind];
        if (!ind.multi) { const gr = g.createLinearGradient(0, Y(ind.lo), 0, Y(ind.hi)); gr.addColorStop(0, css(ind.a, 0.45)); gr.addColorStop(1, css(ind.b, 0.45)); g.fillStyle = gr; g.fillRect(X(0), Y(ind.hi), X(50) - X(0), Y(ind.lo) - Y(ind.hi)); }
        vline(g, X, Y, 25, 0, 14, COL.faint);
        Object.keys(COMBOS).forEach((k) => { if (k !== S.combo) curve(g, (v) => titrate(k, v), 0, 50, X, Y, COL.faint, 2, null, 250); });
        curve(g, (v) => titrate(S.combo, v), 0, 50, X, Y, '#fff', 5, null, 1000);
        const p = titrate(S.combo, S.vol);
        dot(g, X(S.vol), Y(p), css(indColor(S.ind === 'pp' && p < 8.3 ? 'uni' : S.ind, p)), 11);
        text(g, `end point 25.00 mL, pH ${titrate(S.combo, 25).toFixed(2)}`, 104, 82, COL.light, 'bold 22px sans-serif');
        if (!ind.multi) text(g, ind.name.toLowerCase(), X(50) - 8 - g.measureText(ind.name).width, Y((ind.lo + ind.hi) / 2) + (ind.hi > 9 ? -26 : 34), COL.soft, '19px sans-serif');
      }
    }, [2.85, 5.62, 0]);

    const setFocus = focusSwitch({ tit: T, antacid: A });
    let doseShow = 0;
    const verdict = (s) => {
      const ind = INDICATORS[s.ind]; if (ind.multi) return null;
      const v = volAt(s.combo, (ind.lo + ind.hi) / 2), err = v - 25;
      return { v, err, ok: Math.abs(err) <= 0.1 };
    };
    return {
      update(dt, s, time) {
        dt = Math.max(0, dt); S = s;
        const isA = s.focus === 'antacid';
        setFocus(isA ? 'antacid' : 'tit');
        const narrow = fitNarrow(stage, []);
        showLabels(titLabels, !isA); showLabels(antLabels, isA);
        if (narrow) showLabels([lBur, lAcid, lSolid, lEnd], false);
        placeBoard(bd);
        T.position.x = inReel() ? -1.3 : narrow ? -1.0 : 0;
        if (!isA) {
          const c = COMBOS[s.combo], p = titrate(s.combo, s.vol);
          fl.setLevel(0.42 + 0.4 * (s.vol / 50));
          fl.liquid.tint(indColor(s.ind, p), indOpacity(s.ind, p));
          const lv = (tubeH - 0.05) * (1 - s.vol / 50) + 0.02; burLiq.scale.y = lv; burLiq.position.set(FX, BB + lv / 2, 0);
          if (lastVol >= 0 && Math.abs(s.vol - lastVol) > 1e-6) drip = 0.7; lastVol = s.vol; drip = Math.max(0, drip - dt);
          for (let i = 0; i < 4; i++) {
            const k = (time * 1.6 + i / 4) % 1, y0 = BB - 0.32, y1 = 0.16 + fl.level;
            if (drip <= 0 || s.vol >= 50) drops.hide(i); else drops.place(i, FX, y0 - (y0 - y1) * k * k, 0, 1);
          }
          drops.done();
          lBur.element.innerHTML = `burette: 0.1 mol/L ${c.tit}`;
          lFlask.position.set(narrow ? FX : FX - 1.9, narrow ? -0.35 : 1.3, narrow ? 1.6 : 0.6);
          lFlask.element.style.setProperty('--c', css(indColor(s.ind === 'pp' && p < 8.3 ? 'uni' : s.ind, p).map((v) => Math.min(255, v + 40))));
          lFlask.element.innerHTML = `${c.flask}: <b>pH ${fpH(p)}</b>, ${indName(s.ind, p)}`;
          const d = s.vol - 25;
          lEnd.element.style.setProperty('--c', Math.abs(d) < 0.026 ? COL.ok : COL.soft);
          lEnd.element.textContent = Math.abs(d) < 0.026 ? 'end point: exactly matched' : d < 0 ? `${(-d).toFixed(2)} mL to go` : `${d.toFixed(2)} mL past the end point`;
        } else {
          const R = antacid(s.kind, s.dose), m = ANTACIDS[s.kind];
          doseShow += (s.dose - doseShow) * Math.min(1, dt * 6);
          bk.liquid.tint(uniColor(R.pH), 0.5);
          meter.set(fpH(R.pH), 'pH');
          // bubbles while a carbonate is meeting acid; they fade as the acid runs out
          const fizz = m.gas && s.dose > 0 ? clamp(Math.min(s.dose / needMg(s.kind), 1) * (R.left > 0.002 || Math.abs(s.dose - doseShow) > 2 ? 1 : 0.15), 0, 1) : 0;
          const nb = Math.round(NB * fizz);
          B.forEach((b, i) => { if (i >= nb) return bub.hide(i); b.t = (b.t + dt * b.f * 0.6) % 1; bub.place(i, AX + b.r * Math.cos(b.a), 0.25 + b.t * 1.7, b.r * Math.sin(b.a), 0.5 + b.t * 0.8); });
          bub.done();
          const ns = Math.round(60 * clamp((R.solid * s.dose) / 300, 0, 1));
          SD.forEach((q, i) => { if (i >= ns) return sed.hide(i); sed.place(i, AX + q.r * Math.cos(q.a), 0.2 + q.h, q.r * Math.sin(q.a), 1); });
          sed.done();
          heap.visible = s.dose < 600; spoon.rotation.z = -0.5 - 0.5 * clamp(s.dose / 600, 0, 1);
          lAnt.element.style.setProperty('--c', COL.oh);
          lAnt.element.innerHTML = `${m.name.toLowerCase()}: <b>${Math.round(s.dose)} mg</b>`;
          lSolid.visible = !narrow && R.solid > 0.02;
          lSolid.element.textContent = `${Math.round(R.solid * s.dose)} mg stays undissolved`;
        }
        const k = isA ? `a|${s.kind}|${s.dose}` : `t|${s.combo}|${s.vol}|${s.ind}`;
        if (k !== key) { key = k; bd.redraw(); }
      },
      readout: (s) => fit(((s) => {
        if (s.focus === 'antacid') {
          const R = antacid(s.kind, s.dose), m = ANTACIDS[s.kind], need = needMg(s.kind), mmol = (s.dose / m.mm) * m.eq, acid = C0 * VA * 1000;
          return `<div class="big">pH ${fpH(1.5)} → ${fpH(R.pH)}</div>
            <div class="row"><span>${m.name}</span><b>${Math.round(s.dose)} mg of ${m.chem.split(',')[0]}</b></div>
            <div class="row"><span>Acid in the beaker</span><b>${acid.toFixed(2)} mmol HCl</b></div>
            <div class="row"><span>The dose can neutralise</span><b>${mmol.toFixed(2)} mmol (${Math.round(Math.min(1, mmol / acid) * 100)}%)</b></div>
            <div class="row x"><span>1 g neutralises</span><b>${((1000 / m.mm) * m.eq).toFixed(1)} mmol of acid</b></div>
            <small>${s.dose <= 0 ? 'Stir some in.' : R.solid > 0.02 ? `The extra ${m.name.toLowerCase()} stays solid, so the pH levels off.` : s.kind === 'nahco3' && s.dose > need ? 'Extra soda and dissolved CO₂ make a buffer: the pH settles.' : m.gas ? 'Carbonate + acid → salt + water + carbon dioxide gas.' : 'No gas here: only a salt and water.'}</small>`;
        }
        const c = COMBOS[s.combo], p = titrate(s.combo, s.vol), a = titrate(s.combo, 25 - DROP), b = titrate(s.combo, 25 + DROP), V = verdict(s);
        return `<div class="big">pH ${fpH(p)} at ${s.vol.toFixed(2)} mL</div>
          <div class="row x"><span>${c.acid ? 'Acid' : 'Base'} neutralised</span><b>${Math.round(clamp(s.vol / 25, 0, 1) * 100)}%</b></div>
          <div class="row"><span>End point</span><b>25.00 mL, pH ${titrate(s.combo, 25).toFixed(2)}</b></div>
          <div class="row"><span>One drop before, one after</span><b>pH ${a.toFixed(1)} → ${b.toFixed(1)}</b></div>
          <div class="row x"><span>Salt formed</span><b>${c.salt}</b></div>
          ${V ? `<div class="${V.ok ? 'ok' : 'no'}">${INDICATORS[s.ind].name} changes at ${V.v.toFixed(2)} mL: ${V.ok ? 'on the jump.' : `${Math.abs(V.err).toFixed(1)} mL too ${V.err < 0 ? 'early' : 'late'}.`}</div>` : '<small>Universal indicator changes too gradually to mark an end point.</small>'}`;
      })(s)),
    };
  },
};
