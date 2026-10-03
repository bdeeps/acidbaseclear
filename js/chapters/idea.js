// Chapter 1: acids, bases and the pH scale as a live experiment.
// A beaker holds one of four solutions at a concentration you choose. The pH is not looked up: it is
// solved from the charge balance with the real constants (see acid.js): hydrochloric acid and sodium
// hydroxide fully ionised, acetic acid Ka = 10^−4.756, the ammonium ion Ka = 10^−9.25, water
// Kw = 1.0 × 10⁻¹⁴ at 25 °C. pH = −log₁₀[H₃O⁺] (Sørensen 1909), with concentrations standing in for
// activities, which is the school-book form and is good for dilute solutions.
// What is drawn: grey balls are whole molecules, red dots are H₃O⁺, blue dots are OH⁻, pale dots are
// the other ion. The share of the drawn molecules that has split is the real degree of ionisation
// (rounded to whole molecules), but the number of molecules drawn only grows with the logarithm of
// the concentration: a real millilitre holds about 10¹⁹ of them. Water's own ions (2 in every
// 1.1 billion molecules) are far too few to draw.
import { THREE, M, box, clamp } from '../kit.js';
import {
  SUBS, TAU, solution, uniColor, conc, sci, times, pct, fpH, COL, HEX, VIEW, REEL_VIEW,
  board, panelBg, title, axes, curve, dot, text, hline, dots, makeDisplay, beaker, ruler, bench, fitNarrow, placeBoard, fit, rng,
} from '../acid.js';

const BX = -0.9, BR = 1.35, BH = 2.9, LV = 2.3, BY = 0.1;
const NM = 40;
const fmtC = (v) => (v >= 0.1 ? `${+v.toPrecision(2)} mol/L` : v >= 1e-3 ? `${+(v * 1e3).toPrecision(2)} mmol/L` : `${sci(v)} mol/L`);

export default {
  id: 'idea',
  short: 'The pH scale',
  title: 'Acids give H⁺, bases take it',
  subtitle: 'Choose what is dissolved and how much, and watch the pH follow: pH = −log[H⁺].',
  view: VIEW,
  learn: `<p>Lemon juice is sour. Soap feels slippery and tastes bitter. For centuries that was the whole definition of an <b>acid</b> and a <b>base</b>. In 1884 a Swedish student, Svante Arrhenius, gave the first modern answer: in water, an <b>acid</b> releases <b>hydrogen ions (H⁺)</b>, and a <b>base</b> releases <b>hydroxide ions (OH⁻)</b>.</p>
    <p>A bare H⁺ is just a proton, and it never floats free. It sticks to a water molecule at once and makes <b>H₃O⁺</b>. So in 1923 Johannes Brønsted and Martin Lowry put it more simply: an <b>acid gives away a proton</b>, and a <b>base takes one</b>. That explains ammonia, a base with no OH in it: it takes a proton from water and leaves OH⁻ behind.</p>
    <p>Even pure water does this to itself, very slightly. Multiply the two ion concentrations and you always get the same tiny number: <b>[H₃O⁺] × [OH⁻] = 1.0 × 10⁻¹⁴</b> at 25 °C. More of one means less of the other. In pure water they are equal, at 10⁻⁷ mol/L each.</p>
    <p>Those numbers span a huge range, so in 1909 Søren Sørensen, working at the Carlsberg brewery's laboratory in Copenhagen, invented <b>pH</b>: take the power of ten and drop the minus sign. <b>pH = −log[H⁺]</b>. Pure water is pH 7. Below 7 is acidic, above 7 is basic (alkaline). <b>Each step of one pH means ten times</b> more or fewer H₃O⁺ ions, so pH 3 is not "a bit" more acidic than pH 5. It is 100 times more.</p>
    <p>A <b>strong</b> acid such as hydrochloric acid splits completely: every molecule gives up its proton. A <b>weak</b> acid such as the acetic acid in vinegar holds on: at 0.1 mol/L only about 1 molecule in 76 has split. Same concentration, very different pH. <b>Strong does not mean concentrated</b>: it means fully ionised.</p>
    <p class="tip"><b>Try it:</b> set hydrochloric acid to 0.1 mol/L, then switch to acetic acid without touching the slider: the pH jumps from 1.0 to 2.9. Now dilute each one ten times and see which pH moves by a full step. Then try ammonia against sodium hydroxide.</p>`,
  terms: [
    { t: 'Acid', d: 'A substance that gives a proton (H⁺) to another. In water it raises the amount of H₃O⁺.' },
    { t: 'Base', d: 'A substance that takes a proton. In water it raises the amount of OH⁻. A base that dissolves in water is called an alkali.' },
    { t: 'pH', d: 'Minus the logarithm of the hydrogen ion concentration in mol/L. Each step of 1 is a factor of 10.' },
    { t: 'Hydronium (H₃O⁺)', d: 'A water molecule carrying an extra proton. It is what "H⁺ in water" really is.' },
    { t: 'Kw', d: 'The product [H₃O⁺] × [OH⁻] in any water solution: 1.0 × 10⁻¹⁴ at 25 °C.' },
    { t: 'Strong and weak', d: 'A strong acid or base ionises completely in water. A weak one ionises only partly, and its Ka says how much.' },
  ],
  defaults: { sub: 'hcl', c: 0.1, chart: 'conc' },
  controls: [
    { key: 'sub', type: 'seg', label: 'What is dissolved', options: Object.entries(SUBS).map(([v, m]) => ({ v, label: m.short })), fmt: (v) => `${SUBS[v].strong ? 'strong' : 'weak'} ${SUBS[v].kind}, ${SUBS[v].where}` },
    { key: 'c', type: 'log', label: 'Concentration', min: 1e-7, max: 1, ends: ['10⁻⁷ mol/L, almost water', '1 mol/L'], fmt: fmtC },
    { key: 'act', type: 'buttons', label: 'Dilute or concentrate', items: [
      { label: '÷ 10', act: (s) => { s.c = clamp(s.c / 10, 1e-7, 1); } },
      { label: '× 10', act: (s) => { s.c = clamp(s.c * 10, 1e-7, 1); } },
    ] },
    { key: 'chart', type: 'seg', label: 'Chart', options: [{ v: 'conc', label: 'pH against concentration' }, { v: 'ions', label: 'The two ions' }] },
  ],
  quiz: [
    { q: 'A solution has pH 3. Another has pH 5. How do their hydrogen ion concentrations compare?', options: ['The pH 3 one has 2 times more', 'The pH 3 one has 100 times more', 'The pH 5 one has 100 times more', 'They are almost the same'], answer: 1, why: 'Each pH step is a factor of ten. Two steps is 10 × 10 = 100, and the lower pH has more hydrogen ions.' },
    { q: 'Hydrochloric acid and acetic acid are both at 0.1 mol/L. Why is the hydrochloric acid at pH 1.0 and the acetic acid at pH 2.9?', options: ['Acetic acid molecules are heavier', 'Hydrochloric acid ionises completely, acetic acid only about 1.3%', 'Acetic acid is more dilute', 'Vinegar contains a base as well'], answer: 1, why: 'Hydrochloric acid is strong: every molecule gives up its proton. Acetic acid is weak: most molecules stay whole, so there are about 76 times fewer H₃O⁺ ions.' },
    { q: 'Ammonia (NH₃) has no OH in its formula. Why is its solution basic?', options: ['It takes a proton from water, leaving OH⁻ behind', 'It contains hidden oxygen', 'It is not really a base', 'It releases H⁺'], answer: 0, why: 'This is the Brønsted–Lowry idea: a base accepts a proton. NH₃ + H₂O gives NH₄⁺ and OH⁻.' },
  ],
  reel: [
    { ms: 5400, caption: 'An acid gives hydrogen ions to water. Each step down the pH scale means ten times more of them.', set: { sub: 'hcl', chart: 'conc' }, anim: { c: [1e-6, 1, true] }, view: REEL_VIEW, spin: 0 },
    { ms: 5200, caption: 'Vinegar’s acid is weak: at 0.1 mol/L only 1 molecule in 76 lets go, so its pH is 2.9, not 1.', set: { sub: 'acetic', chart: 'conc' }, anim: { c: [1e-5, 0.1, true] }, view: REEL_VIEW, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    root.add(bench(7.2, 3.2));
    const bk = beaker(BR, BH, LV); bk.position.set(BX, BY, 0); root.add(bk);

    // the pH meter: a probe in the liquid, a wire, a display
    const meter = makeDisplay(1.5, 0.9, '#8ef0ff'); meter.position.set(2.25, 1.55, 0.3); root.add(meter);
    const stand = box(0.5, 1.0, 0.4, M.plastic(0x2a2e37)); stand.position.set(2.25, 0.6, 0.2); root.add(stand);
    const probe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.3, 16), M.plastic(0x2a2e37)); probe.position.set(BX + 0.85, BY + 2.35, -0.3); root.add(probe);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), M.clear(0xe8f4ff, 0.6)); bulb.position.set(BX + 0.85, BY + 1.15, -0.3); root.add(bulb);
    const wm = M.plastic(0x15171c);
    const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[BX + 0.85, BY + 3.5, -0.3], [BX + 1.6, BY + 3.9, -0.3], [2.0, 3.0, 0], [2.25, 2.0, 0.2]].map((p) => new THREE.Vector3(...p))), 40, 0.025, 8), wm); root.add(cable);

    // the ruler along the front of the bench
    const rl = ruler(6.4, 0, 14, 0.46); rl.position.set(0, 0.5, 1.75); rl.rotation.x = -0.35; root.add(rl);

    // molecules and ions
    const rnd = rng(11);
    const mol = dots(NM, 0.11, HEX.mol, 14), ionH = dots(NM, 0.075, HEX.h), ionOH = dots(NM, 0.075, HEX.oh), other = dots(NM, 0.085, HEX.ion); root.add(mol, ionH, ionOH, other);
    const P = Array.from({ length: NM }, () => {
      const a = rnd() * TAU, r = Math.sqrt(rnd()) * (BR - 0.22);
      return { x: r * Math.cos(a), z: r * Math.sin(a), y: 0.22 + rnd() * (LV - 0.45), ph: rnd() * TAU, f: 0.5 + rnd(), split: 0, dx: rnd() - 0.5, dy: rnd() - 0.5, dz: rnd() - 0.5 };
    });

    let S = null, key = '';
    const bd = board(root, 3.3, 2.31, 640, 448, (g, w, h) => {
      panelBg(g, w, h); if (!S) return;
      const R = solution(S.sub, S.c);
      if (S.chart === 'ions') {
        title(g, 'Two ions, one product', 'mol/L');
        const { X, Y } = axes(g, w, h, { xMin: 0, xMax: 14, yMin: -14, yMax: 0, xTicks: [0, 2, 4, 6, 8, 10, 12, 14], yTicks: [-14, -10.5, -7, -3.5, 0], yFmt: (v) => (v === 0 ? '1' : Number.isInteger(v) ? `10${'⁻'}${v === -7 ? '⁷' : '¹⁴'}` : ''), xLabel: 'pH →' });
        curve(g, (p) => -p, 0, 14, X, Y, COL.h, 5);
        curve(g, (p) => p - 14, 0, 14, X, Y, COL.oh, 5);
        const p = clamp(R.pH, 0, 14);
        dot(g, X(p), Y(-p), COL.h, 10); dot(g, X(p), Y(p - 14), COL.oh, 10);
        text(g, 'H₃O⁺', X(2.4), Y(-1.2), COL.h, 'bold 24px sans-serif'); text(g, 'OH⁻', X(10.2), Y(-1.2), COL.oh, 'bold 24px sans-serif');
        text(g, '[H₃O⁺] × [OH⁻] = 10⁻¹⁴, always', 104, 82, COL.text, 'bold 23px sans-serif');
      } else {
        title(g, 'pH against concentration', '');
        const { X, Y } = axes(g, w, h, { xMin: 1e-7, xMax: 1, xLog: true, yMin: 0, yMax: 14, xTicks: [1e-7, 1e-5, 1e-3, 0.1], yTicks: [0, 2, 4, 6, 8, 10, 12, 14], xFmt: (v) => (v === 0.1 ? '0.1' : `10${v === 1e-7 ? '⁻⁷' : v === 1e-5 ? '⁻⁵' : '⁻³'}`), xLabel: 'concentration (mol/L) →' });
        hline(g, X, Y, 1e-7, 1, 7, COL.faint);
        Object.keys(SUBS).forEach((k) => { if (k !== S.sub) curve(g, (c) => solution(k, c).pH, 1e-7, 1, X, Y, COL.faint, 2, null, 60, true); });
        curve(g, (c) => solution(S.sub, c).pH, 1e-7, 1, X, Y, SUBS[S.sub].kind === 'acid' ? COL.h : COL.oh, 6, null, 80, true);
        dot(g, X(S.c), Y(clamp(R.pH, 0, 14)), COL.light, 10);
        const m = SUBS[S.sub];
        text(g, m.strong ? 'strong: one pH step for every ×10' : 'weak: half a step for every ×10', 104, 82, COL.text, 'bold 22px sans-serif');
      }
    }, [3.25, 5.7, 0]);

    const lSub = stage.label('', [BX, BY + BH + 0.35, 0], root, 'hot');
    const lLeg = stage.label('', [BX - 2.2, 1.2, 0.8], root);
    const lMeter = stage.label('pH meter', [2.25, 2.3, 0.3], root);
    const lRule = stage.label('acidic ← 7 is neutral → basic', [0, 1.15, 1.9], root);
    const c3 = new THREE.Color();

    return {
      update(dt, s, time) {
        dt = Math.max(0, dt); S = s;
        fitNarrow(stage, [lLeg, lMeter, lRule]);
        placeBoard(bd);
        const R = solution(s.sub, s.c), m = SUBS[s.sub], acid = m.kind === 'acid';
        bk.liquid.tint(uniColor(R.pH), 0.5);
        rl.set(R.pH);
        meter.set(fpH(R.pH), 'pH');

        // how many molecules to draw, and how many of them have split
        const n = Math.round(clamp(4 + 6 * (Math.log10(s.c) + 7), 4, NM));
        let nSplit = Math.round(R.ion * n); if (!nSplit && R.ion * n > 0.3) nSplit = 1;
        const big = acid ? ionH : ionOH, idle = acid ? ionOH : ionH;
        for (let i = 0; i < NM; i++) {
          idle.hide(i);
          const p = P[i];
          if (i >= n) { mol.hide(i); big.hide(i); other.hide(i); continue; }
          p.split += ((i < nSplit ? 1 : 0) - p.split) * Math.min(1, dt * 5);
          const t = time * p.f, x = BX + p.x + 0.07 * Math.sin(t + p.ph), y = BY + p.y + 0.07 * Math.sin(t * 1.3 + p.ph * 2), z = p.z + 0.07 * Math.cos(t * 0.9 + p.ph);
          const k = p.split, d = 0.28 * k;
          if (k < 0.5) { mol.place(i, x, y, z, 1 - k); big.hide(i); other.hide(i); }
          else { mol.hide(i); big.place(i, x + p.dx * d, y + p.dy * d + 0.1 * k, z + p.dz * d, 1); other.place(i, x - p.dx * d, y - p.dy * d - 0.1 * k, z - p.dz * d, 1); }
        }
        mol.done(); ionH.done(); ionOH.done(); other.done();
        other.material.color.set(c3.setHex(acid ? 0xd9c98a : 0xc9b6ff));

        lSub.element.style.setProperty('--c', acid ? COL.h : COL.oh);
        lSub.element.innerHTML = `${m.name.toLowerCase()} (${m.formula}), <b>${pct(R.ion)}</b> ionised`;
        lLeg.element.innerHTML = acid ? `<span style="color:${COL.h}">●</span> H₃O⁺ &nbsp; <span style="color:#d9c98a">●</span> ${m.ion} &nbsp; <span style="color:#b9c0cc">●</span> whole molecule`
          : `<span style="color:${COL.oh}">●</span> OH⁻ &nbsp; <span style="color:#c9b6ff">●</span> ${m.ion} &nbsp; <span style="color:#b9c0cc">●</span> whole molecule`;
        const k = `${s.sub}|${s.c}|${s.chart}`;
        if (k !== key) { key = k; bd.redraw(); }
      },
      readout: (s) => fit(((s) => {
        const R = solution(s.sub, s.c), m = SUBS[s.sub], ratio = R.H / 1e-7;
        return `<div class="big">pH = −log(${sci(R.H)}) = ${fpH(R.pH)}</div>
          <div class="row"><span>${m.name}</span><b>${fmtC(s.c)}, ${m.strong ? 'strong' : 'weak'} ${m.kind}</b></div>
          <div class="row"><span>[H₃O⁺]</span><b>${conc(R.H)}</b></div>
          <div class="row x"><span>[OH⁻]</span><b>${conc(R.OH)}</b></div>
          <div class="row"><span>Molecules ionised</span><b>${pct(R.ion)}${R.ion < 0.995 && R.ion > 1e-4 ? ` (1 in ${times(1 / R.ion)})` : ''}</b></div>
          <div class="row x"><span>Compared with pure water</span><b>${ratio >= 1 ? `${times(ratio)}× the H₃O⁺` : `${times(1 / ratio)}× the OH⁻`}</b></div>
          ${s.c < 3e-7 ? '<small>This dilute, water’s own ions matter. See the last chapter.</small>' : ''}`;
      })(s)),
    };
  },
};
