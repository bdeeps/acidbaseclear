// Chapter 5: where the simple rules stop, and a myth. Three scenes, all from the solver in acid.js.
// "dilute": hydrochloric acid from 10 mol/L down to 10⁻¹⁰ mol/L. The school rule pH = −log C works
//   until water's own ions matter: the charge balance [H₃O⁺] = C + Kw ÷ [H₃O⁺] gives pH 6.98 at
//   10⁻⁸ mol/L, not 8, and it can never cross 7. At the other end, above 1 mol/L the same rule gives
//   a pH below zero. That is real (the scale has no floor: mine water at Iron Mountain, California,
//   has been measured at pH −3.6, Wikipedia "pH"), but in such strong solutions pH is defined by
//   activity, not concentration (IUPAC), so the simple figure is only a rough guide there.
// "hot": pure water from 0 to 100 °C. Kw rises with temperature (Bandura and Lvov 2006, table in
//   acid.js), so the neutral point, where [H₃O⁺] = [OH⁻] = √Kw, moves: pH 7.47 at 0 °C, 7.00 at
//   25 °C, 6.81 at 37 °C, 6.13 at 100 °C. The water is neutral throughout.
// "myth": does alkaline water neutralise stomach acid? A beaker holds 100 mL of hydrochloric acid
//   at pH 1.5 (3.16 mmol of acid). Three drinks are poured in:
//     plain water, pH 7;
//     alkaline "ionised" water, pH 9.5, taken as water with just enough alkali to reach that pH,
//       3.2 × 10⁻⁵ mol/L of hydroxide (it carries no buffer);
//     a quarter teaspoon (1.2 g) of baking soda in a 250 mL glass, 0.057 mol/L, pH 8.3.
//   The pH 9.5 water changes the mixture exactly as plain water does, by dilution, because pH says
//   how many OH⁻ ions are loose at this moment, not how much acid a liquid can use up. Bottled
//   mineral waters that also carry bicarbonate behave like a weak version of the third drink.
//   On the health claim: blood is held at 7.35 to 7.45 by buffers, lungs and kidneys, and Harvard
//   Health ("Is alkaline water better?") finds no evidence for choosing alkaline water over plain.
import { THREE, M, box, clamp, approach } from '../kit.js';
import {
  solve, solution, pKwAt, PKA, MM, uniColor, conc, sci, times, fpH, COL, HEX, VIEW, REEL_VIEW,
  board, panelBg, title, axes, curve, dot, text, hline, vline, dots, makeDisplay, beaker, ruler, bench, fitNarrow, placeBoard, fit, showLabels, rng,
} from '../acid.js';

const C0 = Math.pow(10, -1.5), VA = 0.1;
const SODA = 1.2 / 0.25 / MM.nahco3;                              // mol/L: 1.2 g in a 250 mL glass
export const DRINKS = {
  plain: { name: 'Plain water', pH: 7.0, desc: 'pH 7', base: 0 },
  alk: { name: 'Alkaline water', pH: 9.5, desc: 'pH 9.5, no buffer', base: Math.pow(10, -4.5) },
  soda: { name: 'Baking soda water', pH: 8.3, desc: 'pH 8.3, ¼ teaspoon in a glass', base: SODA },
};
// The beaker of acid after v mL of a drink has been poured in.
export function mixPH(drink, v) {
  const V = VA + v / 1000, cl = (C0 * VA) / V, b = (DRINKS[drink].base * v) / 1000 / V;
  if (drink === 'soda') return solve({ species: [{ C: b, pKa: PKA.carbonic, z: 0 }], strong: b - cl }).pH;
  return solve({ strong: b - cl }).pH;
}
const neutralAt = (T) => pKwAt(T) / 2;
const fmtC = (v) => (v >= 0.1 ? `${+v.toPrecision(2)} mol/L` : `${sci(v)} mol/L`);

export default {
  id: 'limits',
  short: 'Limits and a myth',
  title: 'Where the simple rules run out',
  subtitle: 'pH below zero, neutral water that is not 7, and what alkaline water really does to acid.',
  view: VIEW,
  learn: `<p><b>The scale does not stop at 0 and 14.</b> Those are just the values for 1 mol/L of strong acid and strong base. Make hydrochloric acid ten times stronger and the pH is about −1. Acid water draining from an old mine in California has been measured at pH −3.6.</p>
    <p><b>You cannot dilute an acid into a base.</b> The rule "pH = −log of the concentration" says 10⁻⁸ mol/L of hydrochloric acid should be pH 8, which is basic. Nonsense: by then the acid adds fewer H₃O⁺ ions than water already has. The real answer is 6.98, and it creeps up to 7 but never passes it.</p>
    <p><b>Neutral is not always 7.</b> Water ionises more when it is hot. At 100 °C pure water has pH 6.1, and at body temperature 6.8. It is still exactly neutral, because H₃O⁺ and OH⁻ are still equal. "Neutral" means equal, and pH 7 is only where that falls at 25 °C.</p>
    <p><b>Acids do not even need hydrogen.</b> In 1923, the same year as Brønsted and Lowry, the American chemist Gilbert Lewis gave a wider definition: an acid is anything that <b>accepts a pair of electrons</b>, and a base is anything that donates one. That covers reactions with no water and no H⁺ at all. And at the far end are <b>superacids</b>, stronger than pure sulphuric acid: fluoroantimonic acid is over a billion times stronger. George Olah won the 1994 Nobel Prize for the chemistry they opened up.</p>
    <p><b>Myth: alkaline water neutralises your stomach acid and makes your body alkaline.</b> Test the first half here. Water at pH 9.5 sounds strongly basic, but pH counts the OH⁻ ions loose at this moment, not how much acid the liquid can use up. A whole glass of it carries about 0.008 mmol of base. A hundred millilitres of stomach-strength acid holds about 3 mmol. The glass changes the pH exactly as plain water does, by dilution. A quarter teaspoon of baking soda has a <b>lower</b> pH, 8.3, yet neutralises about 1,800 times more, because it carries a real <b>amount</b> of base. As for the body: blood is held between 7.35 and 7.45 by its buffers, the lungs and the kidneys whatever you drink, and Harvard Health reports no evidence for choosing alkaline water over plain water.</p>
    <p class="tip"><b>Try it:</b> dilute the acid down past 10⁻⁷ mol/L and watch the two lines part. Heat pure water to 100 °C and read the meter. Then pour 250 mL of each drink into the acid and compare.</p>`,
  terms: [
    { t: 'Activity', d: 'The "effective" concentration of an ion. pH is properly defined with it, which matters in strong solutions.' },
    { t: 'Autoionisation', d: 'Water reacting with itself: 2 H₂O ⇌ H₃O⁺ + OH⁻. It sets a floor of ions in every solution.' },
    { t: 'Lewis acid', d: 'Anything that accepts a pair of electrons, whether or not it contains hydrogen.' },
    { t: 'Superacid', d: 'An acid stronger than pure sulphuric acid.' },
    { t: 'Neutralising capacity', d: 'How much acid a base can use up: an amount in moles, which pH alone does not tell you.' },
  ],
  defaults: { focus: 'dilute', c: 1e-3, temp: 25, drink: 'alk', pour: 0 },
  controls: [
    { key: 'focus', type: 'seg', label: 'Look at', options: [{ v: 'dilute', label: 'Very strong, very dilute' }, { v: 'hot', label: 'Hot water' }, { v: 'myth', label: 'Alkaline water' }] },
    { key: 'c', type: 'log', label: 'Dilute: concentration of hydrochloric acid', min: 1e-10, max: 10, ends: ['10⁻¹⁰ mol/L', '10 mol/L'], fmt: fmtC },
    { key: 'temp', type: 'range', label: 'Hot water: temperature of pure water', min: 0, max: 100, step: 1, ends: ['0 °C', '100 °C'], fmt: (v) => `${v} °C${v === 25 ? ' (room)' : v === 37 ? ' (body)' : ''}` },
    { key: 'drink', type: 'seg', label: 'Alkaline water: what to pour in', options: Object.entries(DRINKS).map(([v, m]) => ({ v, label: m.name })), fmt: (v) => DRINKS[v].desc },
    { key: 'pour', type: 'range', label: 'Alkaline water: amount poured into the acid', min: 0, max: 500, step: 5, ends: ['none', '500 mL'], fmt: (v) => `${Math.round(v)} mL` },
  ],
  onChange(s, key) { if (key === 'c') s.focus = 'dilute'; if (key === 'temp') s.focus = 'hot'; if (key === 'drink' || key === 'pour') s.focus = 'myth'; },
  quiz: [
    { q: 'Hydrochloric acid is diluted to 10⁻⁸ mol/L. What is its pH at 25 °C?', options: ['8, because −log(10⁻⁸) = 8', 'Just under 7', 'Exactly 0', '14'], answer: 1, why: 'The acid now adds fewer H₃O⁺ ions than water’s own 10⁻⁷ mol/L, so the pH is 6.98. An acid can be diluted towards neutral, never past it.' },
    { q: 'Pure water at 100 °C has pH 6.1. Is it acidic?', options: ['Yes, anything below 7 is acidic', 'No: it has equal H₃O⁺ and OH⁻, so it is neutral', 'Yes, hot water is always an acid', 'It depends on the kettle'], answer: 1, why: 'Hot water ionises more, so both ions rise together. Neutral means equal amounts, and pH 7 is only where that falls at 25 °C.' },
    { q: 'Which glass uses up more stomach-strength acid: water at pH 9.5, or baking soda water at pH 8.3?', options: ['The pH 9.5 water, because its pH is higher', 'The baking soda water, because it carries far more base', 'Both the same', 'Neither reacts with acid'], answer: 1, why: 'pH tells you how many OH⁻ ions are loose right now, not how much acid a liquid can neutralise. The baking soda glass holds about 1,800 times more base.' },
  ],
  reel: [
    { ms: 5200, caption: 'Myth check: a glass of pH 9.5 alkaline water into stomach-strength acid. It only dilutes, exactly like plain water.', set: { focus: 'myth', drink: 'alk' }, anim: { pour: [0, 500] }, view: REEL_VIEW, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    root.add(bench(7.2, 3.2));
    const rnd = rng(5);
    const BX = -0.9, BY = 0.3;
    const plate = box(3.0, 0.2, 2.6, M.plastic(0x23272f)); plate.position.set(BX, 0.2, 0); root.add(plate);
    const hotMat = new THREE.MeshBasicMaterial({ color: 0x331511, toneMapped: false });
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.02, 40), hotMat); ring.position.set(BX, 0.31, 0); root.add(ring);
    const bk = beaker(1.3, 2.9, 1.2); bk.position.set(BX, BY, 0); root.add(bk);
    const meter = makeDisplay(1.5, 0.9, '#8ef0ff'); meter.position.set(2.3, 1.55, 0.3); root.add(meter);
    const mst = box(0.5, 1.0, 0.4, M.plastic(0x2a2e37)); mst.position.set(2.3, 0.6, 0.2); root.add(mst);
    const probe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 16), M.plastic(0x2a2e37)); probe.position.set(BX + 0.95, BY + 2.0, -0.3); root.add(probe);
    const rl = ruler(6.4, -1, 15, 0.46); rl.position.set(0, 0.5, 1.85); rl.rotation.x = -0.35; root.add(rl);
    const ND = 40, ionH = dots(ND, 0.07, HEX.h), ionOH = dots(ND, 0.07, HEX.oh); root.add(ionH, ionOH);
    const P = Array.from({ length: ND }, () => ({ a: rnd() * 6.283, r: Math.sqrt(rnd()) * 1.1, y: rnd(), ph: rnd() * 6.283, f: 0.5 + rnd() }));

    // hot: a thermometer and steam
    const Hh = new THREE.Group(); root.add(Hh);
    const thGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.9, 12), M.clear(0xe8f4ff, 0.35)); thGlass.position.set(BX - 0.85, BY + 1.75, -0.3); Hh.add(thGlass);
    const thCol = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 8), new THREE.MeshBasicMaterial({ color: 0xff4a3a, toneMapped: false })); Hh.add(thCol);
    const steam = dots(24, 0.12, 0xdfe8f2); steam.material.transparent = true; steam.material.opacity = 0.35; Hh.add(steam);
    const lHot = stage.label('', [BX, BY + 3.4, 0], Hh, 'hot');

    // myth: a glass pouring
    const Mg = new THREE.Group(); root.add(Mg);
    const glass = new THREE.Group(); glass.position.set(BX + 1.95, 3.55, 0); Mg.add(glass);
    const gw = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.95, 28, 1, true), M.clear(0xcfe8ff, 0.3)); glass.add(gw);
    const drinkMat = new THREE.MeshStandardMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.7, roughness: 0.2 });
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.32, 0.7, 28), drinkMat); gl.position.y = -0.1; glass.add(gl);
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 10), drinkMat); Mg.add(stream);
    const lDrink = stage.label('', [BX + 3.3, 3.75, 0], Mg, 'hot');
    const lAcid = stage.label('100 mL of acid at pH 1.5 (3.16 mmol)', [BX - 0.2, 0.95, 1.5], Mg);

    const lDil = stage.label('', [BX, BY + 3.25, 0], root, 'hot');

    let S = null, key = '';
    const bd = board(root, 3.3, 2.31, 640, 448, (g, w, h) => {
      panelBg(g, w, h); if (!S) return;
      if (S.focus === 'hot') {
        title(g, 'Neutral pH against temperature');
        const { X, Y } = axes(g, w, h, { xMax: 100, yMin: 6, yMax: 7.6, xTicks: [0, 25, 50, 75, 100], yTicks: [6, 6.5, 7, 7.5], yFmt: (v) => v.toFixed(1), xLabel: 'temperature (°C) →' });
        hline(g, X, Y, 0, 100, 7, COL.faint); vline(g, X, Y, 25, 6, 7.6, COL.faint);
        curve(g, neutralAt, 0, 100, X, Y, COL.ok, 6, null, 100);
        dot(g, X(S.temp), Y(neutralAt(S.temp)), COL.light, 10);
        text(g, `neutral at ${S.temp} °C: pH ${neutralAt(S.temp).toFixed(2)}`, 104, 82, COL.text, 'bold 23px sans-serif');
      } else if (S.focus === 'myth') {
        title(g, 'pH of the acid as you pour');
        const { X, Y } = axes(g, w, h, { xMax: 500, yMax: 8, xTicks: [0, 125, 250, 375, 500], yTicks: [0, 2, 4, 6, 8], xLabel: 'mL of drink poured into 100 mL of acid →' });
        hline(g, X, Y, 0, 500, 7, COL.faint);
        curve(g, (v) => mixPH('soda', v), 0, 500, X, Y, S.drink === 'soda' ? COL.oh : COL.faint, S.drink === 'soda' ? 6 : 3, null, 250);
        curve(g, (v) => mixPH('plain', v), 0, 500, X, Y, S.drink === 'plain' ? '#fff' : 'rgba(255,255,255,.5)', S.drink === 'plain' ? 6 : 3, null, 100);
        curve(g, (v) => mixPH('alk', v), 0, 500, X, Y, COL.volt, S.drink === 'alk' ? 6 : 3, [10, 8], 100);
        dot(g, X(S.pour), Y(mixPH(S.drink, S.pour)), COL.light, 10);
        text(g, `${DRINKS[S.drink].name}: pH 1.50 → ${mixPH(S.drink, S.pour).toFixed(2)}`, 104, 82, COL.light, 'bold 23px sans-serif');
        text(g, 'baking soda', X(300), Y(mixPH('soda', 300)) - 14, COL.oh, '20px sans-serif');
        text(g, 'plain water, and alkaline water (dashed)', X(110), Y(mixPH('plain', 300)) + 36, COL.volt, '20px sans-serif');
      } else {
        title(g, 'Hydrochloric acid, any strength');
        const { X, Y } = axes(g, w, h, { xMin: 1e-10, xMax: 10, xLog: true, yMin: -1, yMax: 10, xTicks: [1e-10, 1e-8, 1e-6, 1e-4, 1e-2, 1], yTicks: [0, 2, 4, 6, 8, 10], xFmt: (v) => (v === 1 ? '1' : `10${v === 1e-10 ? '⁻¹⁰' : v === 1e-8 ? '⁻⁸' : v === 1e-6 ? '⁻⁶' : v === 1e-4 ? '⁻⁴' : '⁻²'}`), xLabel: 'concentration (mol/L) →' });
        hline(g, X, Y, 1e-10, 10, 7, COL.faint); hline(g, X, Y, 1e-10, 10, 0, COL.faint);
        curve(g, (c) => -Math.log10(c), 1e-10, 10, X, Y, COL.bad, 3, [8, 6], 40, true);
        curve(g, (c) => solution('hcl', c).pH, 1e-10, 10, X, Y, COL.h, 6, null, 120, true);
        dot(g, X(S.c), Y(solution('hcl', S.c).pH), COL.light, 10);
        text(g, '−log C (dashed) fails here', X(1e-10) + 12, Y(3.6), COL.bad, '20px sans-serif');
        text(g, 'below zero', X(0.02), Y(-0.9) - 4, COL.soft, '19px sans-serif');
      }
    }, [2.85, 5.62, 0]);

    let level = 1.2;
    return {
      update(dt, s, time) {
        dt = Math.max(0, dt); S = s;
        const f = s.focus, narrow = fitNarrow(stage, []);
        Hh.visible = f === 'hot'; Mg.visible = f === 'myth'; ring.visible = plate.visible = true;
        showLabels([lHot], f === 'hot'); showLabels([lDrink], f === 'myth'); showLabels([lAcid], f === 'myth' && !narrow); showLabels([lDil], f === 'dilute');
        placeBoard(bd);
        let pH, nH = 0, nOH = 0, target = 2.0;
        if (f === 'hot') {
          pH = neutralAt(s.temp);
          const k = s.temp / 100; hotMat.color.setRGB(0.2 + 1.6 * k, 0.08 + 0.25 * k, 0.07);
          const hgt = 0.25 + 2.3 * k; thCol.scale.y = hgt; thCol.position.set(BX - 0.85, BY + 0.35 + hgt / 2, -0.3);
          const ns = Math.round(24 * clamp((s.temp - 55) / 45, 0, 1));
          for (let i = 0; i < 24; i++) { if (i >= ns) { steam.hide(i); continue; } const t = (time * 0.25 + i / 24) % 1; steam.place(i, BX + 0.9 * Math.sin(i * 2.4) * (0.5 + t * 0.5), BY + 2.3 + t * 1.4, 0.7 * Math.cos(i * 1.7), 0.6 + t * 1.2); }
          steam.done();
          // equal numbers of the two ions, more of both as the water heats: still neutral
          nH = nOH = Math.round(4 + 14 * Math.pow(10, (14 - pKwAt(s.temp)) / 2) / Math.pow(10, 0.875));
          bk.liquid.tint([79, 184, 74], 0.45);
          lHot.element.style.setProperty('--c', COL.ok);
          lHot.element.innerHTML = `pure water at ${s.temp} °C: <b>pH ${pH.toFixed(2)}, still neutral</b>`;
        } else {
          hotMat.color.setHex(0x1a1c22);
          if (f === 'myth') {
            pH = mixPH(s.drink, s.pour); target = 0.55 + 2.1 * ((100 + s.pour) / 600);
            const d = DRINKS[s.drink], pouring = Math.abs(level - target) > 0.01;
            drinkMat.color.setHex(s.drink === 'soda' ? 0xe8f0f4 : s.drink === 'alk' ? 0xa8c8ff : 0x9fd0ff);
            glass.rotation.z = approach(glass.rotation.z, pouring ? 1.15 : 0.25, 6, dt);
            gl.scale.y = clamp(1 - s.pour / 600, 0.1, 1); gl.position.y = -0.1 - 0.35 * (1 - gl.scale.y);
            stream.visible = pouring; const top = 3.35, bot = BY + level; stream.scale.y = top - bot; stream.position.set(BX + 1.3, (top + bot) / 2, 0);
            lDrink.element.style.setProperty('--c', s.drink === 'soda' ? COL.oh : COL.volt);
            lDrink.element.innerHTML = `${d.name.toLowerCase()}: <b>${Math.round(s.pour)} mL</b>`;
            bk.liquid.tint(uniColor(pH), 0.5);
            nH = Math.round(clamp((7.2 - pH) / 6, 0, 1) * ND);
          } else {
            pH = solution('hcl', s.c).pH;
            bk.liquid.tint(uniColor(clamp(pH, 0, 14)), 0.5);
            nH = Math.round(clamp((7.4 - pH) / 8.4, 0, 1) * (ND - 3)) + 3; nOH = pH > 6.5 ? 3 : 0;
            const naive = -Math.log10(s.c);
            lDil.element.style.setProperty('--c', Math.abs(naive - pH) > 0.05 ? COL.bad : pH < 0 ? COL.light : COL.h);
            lDil.element.innerHTML = Math.abs(naive - pH) > 0.05 ? `−log C says ${fpH(naive)}, the real pH is <b>${fpH(pH)}</b>` : pH < 0 ? `<b>pH ${fpH(pH)}</b>: below zero` : `hydrochloric acid: <b>pH ${fpH(pH)}</b>`;
          }
        }
        level = approach(level, target, 5, dt); bk.setLevel(level);
        rl.set(pH); meter.set(fpH(pH), 'pH');
        // dots only show which ion is ahead; real numbers span fourteen powers of ten
        P.forEach((p, i) => {
          const t = time * p.f, x = BX + p.r * Math.cos(p.a) + 0.07 * Math.sin(t + p.ph), y = BY + 0.2 + p.y * (level - 0.4) + 0.06 * Math.sin(t * 1.3 + p.ph), z = p.r * Math.sin(p.a) + 0.07 * Math.cos(t);
          if (i < nH) ionH.place(i, x, y, z, 1); else ionH.hide(i);
          if (i >= ND - nOH) ionOH.place(i, x, y, z, 1); else ionOH.hide(i);
        });
        ionH.done(); ionOH.done();
        const k = f === 'hot' ? `h|${s.temp}` : f === 'myth' ? `m|${s.drink}|${s.pour}` : `d|${s.c}`;
        if (k !== key) { key = k; bd.redraw(); }
      },
      readout: (s) => fit(((s) => {
        if (s.focus === 'hot') {
          const pk = pKwAt(s.temp), p = pk / 2, ion = Math.pow(10, -p);
          return `<div class="big">Neutral at ${s.temp} °C: pH ${p.toFixed(2)}</div>
            <div class="row"><span>Kw = [H₃O⁺] × [OH⁻]</span><b>${sci(Math.pow(10, -pk))}</b></div>
            <div class="row"><span>[H₃O⁺] = [OH⁻]</span><b>${sci(ion)} mol/L each</b></div>
            <div class="row x"><span>Ions compared with 25 °C</span><b>${times(ion / Math.pow(10, -pKwAt(25) / 2))}×</b></div>
            <div class="ok">Equal H₃O⁺ and OH⁻: still neutral.</div>
            ${s.temp === 37 ? '<small>Body temperature: neutral is pH 6.8 here, so blood at 7.4 is a little more basic than it looks.</small>' : ''}`;
        }
        if (s.focus === 'myth') {
          const d = DRINKS[s.drink], p = mixPH(s.drink, s.pour), pw = mixPH('plain', s.pour), acid = C0 * VA * 1000, base = (d.base * s.pour), share = Math.min(1, base / acid);
          return `<div class="big">pH 1.50 → ${fpH(p)}</div>
            <div class="row"><span>Poured in</span><b>${Math.round(s.pour)} mL of ${d.name.toLowerCase()}</b></div>
            <div class="row"><span>Base the drink carries</span><b>${base === 0 ? 'none' : base < 0.1 ? `${base.toPrecision(2)} mmol` : `${base.toFixed(1)} mmol`}</b></div>
            <div class="row"><span>Acid neutralised</span><b>${share === 0 ? '0%' : share < 0.01 ? `${(share * 100).toPrecision(2)}%` : `${Math.round(share * 100)}%`}</b></div>
            <div class="row x"><span>Plain water would give</span><b>pH ${fpH(pw)}</b></div>
            <small>${s.drink === 'alk' ? 'The rise is dilution: this water has almost no base to give.' : s.drink === 'soda' ? 'Lower pH than the alkaline water, but 1,800 times more base.' : 'Dilution alone: ten times weaker is one pH step.'}</small>`;
        }
        const R = solution('hcl', s.c), naive = -Math.log10(s.c), own = R.OH;
        return `<div class="big">pH ${fpH(R.pH)}${Math.abs(naive - R.pH) > 0.05 ? `, not ${fpH(naive, 0)}` : ''}</div>
          <div class="row"><span>Hydrochloric acid</span><b>${fmtC(s.c)}</b></div>
          <div class="row"><span>The rule −log C says</span><b>${fpH(naive)}</b></div>
          <div class="row"><span>H₃O⁺ from the acid</span><b>${conc(s.c)}</b></div>
          <div class="row x"><span>H₃O⁺ from water itself</span><b>${conc(own)}</b></div>
          ${R.pH < 0 ? '<small>Below zero. Acid this strong needs activity, not concentration.</small>' : s.c < 1e-6 ? '<small>Water’s own ions now matter more than the acid’s.</small>' : '<small>In this range the simple rule is right.</small>'}`;
      })(s)),
    };
  },
};
