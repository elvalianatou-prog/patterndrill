/**
 * combos.js
 * Preset ICT combination pattern generators.
 * Each combo returns: { candles, zones: [{ key, label, zone, color, hint }], title, description }
 */

const COMBO_COLORS = {
  0: { fill: 'rgba(55,138,221,0.15)',  stroke: '#378ADD', light: '#91c4f2' },  // blue
  1: { fill: 'rgba(245,158,11,0.15)',  stroke: '#f59e0b', light: '#fcd34d' },  // amber
  2: { fill: 'rgba(29,158,117,0.15)', stroke: '#1D9E75', light: '#6ee7c0' },  // green
  3: { fill: 'rgba(216,90,48,0.15)',  stroke: '#D85A30', light: '#fca07a' },  // red
};

const COMBOS = {
  'ob-fvg': {
    label: 'OB + Fair Value Gap',
    description: 'An Order Block with an FVG embedded in the displacement move. The FVG is the imbalance left by the same impulse that validated the OB.',
    difficulty: 'intermediate',
    fn: generateComboOBFVG,
  },
  'sweep-choch': {
    label: 'Liquidity Sweep + CHoCH',
    description: 'Price sweeps liquidity above a swing high, then a CHoCH confirms the reversal. Classic smart money reversal sequence.',
    difficulty: 'intermediate',
    fn: generateComboSweepCHoCH,
  },
  'bos-ob': {
    label: 'BOS + Order Block',
    description: 'A Break of Structure is followed by a pullback into the Order Block that caused it. The OB is your entry on the retracement.',
    difficulty: 'intermediate',
    fn: generateComboBOSOB,
  },
  'inducement-fvg-ob': {
    label: 'Inducement + FVG + OB',
    description: 'The full ICT entry model: inducement traps breakout traders, displacement leaves an FVG, and the OB is the origin of the move.',
    difficulty: 'advanced',
    fn: generateComboInducementFVGOB,
  },
  'sweep-ob-fvg': {
    label: 'Sweep + OB + FVG',
    description: 'Liquidity sweep raids stops, the reversal candle forms the OB, and the displacement leaves an FVG. Three-confluence entry.',
    difficulty: 'advanced',
    fn: generateComboSweepOBFVG,
  },
  'po3': {
    label: 'Power of 3 (Accumulation → Manipulation → Distribution)',
    description: 'The full Power of 3 sequence: price accumulates in a range, manipulates above/below it to trap traders, then distributes in the true direction.',
    difficulty: 'advanced',
    fn: generateComboPO3,
  },
};

// ─── Utility (duplicated from patterns.js for independence) ──────────────────
function cRand(min, max) { return min + Math.random() * (max - min); }
function cRp(n, d = 5)   { return parseFloat(n.toFixed(d)); }

function cBaseline(count, startPrice, direction, volatility = 1) {
  const candles = [];
  let price = startPrice;
  const trendStrength = 0.0003 * volatility;
  const bodySize      = 0.0008 * volatility;
  const wickSize      = 0.0004 * volatility;
  const noise         = 0.0002 * (volatility - 1);
  for (let i = 0; i < count; i++) {
    const drift  = direction * cRand(0, trendStrength);
    const isBull = Math.random() > (direction === 1 ? 0.4 : 0.6);
    const body   = cRand(bodySize * 0.3, bodySize);
    const o = price + cRand(-noise, noise);
    const c = o + (isBull ? 1 : -1) * body + drift;
    const h = Math.max(o, c) + cRand(0, wickSize);
    const l = Math.min(o, c) - cRand(0, wickSize);
    candles.push({ o: cRp(o), h: cRp(h), l: cRp(l), c: cRp(c) });
    price = c;
  }
  return candles;
}

function cImpulse(candles, startIdx, direction, bars = 4, strength = 0.002) {
  let price = candles[startIdx - 1]?.c ?? candles[startIdx]?.o ?? 1.085;
  for (let i = startIdx; i < startIdx + bars && i < candles.length; i++) {
    const body = cRand(strength * 0.8, strength * 1.2);
    const o = price;
    const c = o + direction * body;
    const h = Math.max(o, c) + cRand(0, 0.0003);
    const l = Math.min(o, c) - cRand(0, 0.0003);
    candles[i] = { o: cRp(o), h: cRp(h), l: cRp(l), c: cRp(c) };
    price = c;
  }
}

// ─── Combo Generators ────────────────────────────────────────────────────────

function generateComboOBFVG(difficulty = 1) {
  const n = 70;
  const start = 1.0820 + cRand(0, 0.008);
  const candles = cBaseline(n, start, -1, difficulty);

  // OB: last bullish candle before bearish impulse
  const obIdx = 24;
  const base = candles[obIdx - 1].c;
  candles[obIdx] = {
    o: cRp(base),
    c: cRp(base + 0.0025),
    h: cRp(base + 0.003),
    l: cRp(base - 0.0003),
  };

  // Bearish impulse — fast enough to leave an FVG
  // FVG: gap between candle[obIdx].l and candles[obIdx+2].h
  const impulseBase = candles[obIdx].c;
  candles[obIdx + 1] = {
    o: cRp(impulseBase),
    c: cRp(impulseBase - 0.004),
    h: cRp(impulseBase + 0.0004),
    l: cRp(impulseBase - 0.0045),
  };
  // FVG gap: candles[obIdx+1].l to candles[obIdx+3].h must not overlap
  candles[obIdx + 2] = {
    o: cRp(impulseBase - 0.005),
    c: cRp(impulseBase - 0.007),
    h: cRp(impulseBase - 0.0045),  // top of FVG zone
    l: cRp(impulseBase - 0.0075),
  };
  candles[obIdx + 3] = {
    o: cRp(impulseBase - 0.007),
    c: cRp(impulseBase - 0.009),
    h: cRp(impulseBase - 0.0068),
    l: cRp(impulseBase - 0.0095),
  };

  // Continue bear
  cImpulse(candles, obIdx + 4, -1, 4, 0.0012);

  const fvgTop = candles[obIdx + 1].l;
  const fvgBot = candles[obIdx + 2].h;

  return {
    candles,
    zones: [
      {
        key:   'order-block',
        label: 'Order Block',
        zone:  { startIdx: obIdx, endIdx: obIdx },
        colorIdx: 0,
        hint:  'The last bullish candle before the drop',
      },
      {
        key:   'fair-value-gap',
        label: 'Fair Value Gap',
        zone:  { startIdx: obIdx + 1, endIdx: obIdx + 2 },
        colorIdx: 1,
        hint:  'The imbalance gap left by the impulse move',
      },
    ],
  };
}

function generateComboSweepCHoCH(difficulty = 1) {
  const n = 70;
  const start = 1.0840 + cRand(0, 0.006);
  const candles = cBaseline(n, start, 1, difficulty);

  // Build equal highs (liquidity)
  const eqIdx = 18;
  const eqHigh = cRp(candles[eqIdx].h + 0.001);
  candles[eqIdx].h = eqHigh;
  candles[eqIdx + 3].h = cRp(eqHigh + cRand(-0.0001, 0.0001));

  // Sweep above equal highs
  const sweepIdx = 26;
  const sweepBase = candles[sweepIdx - 1].c;
  candles[sweepIdx] = {
    o: cRp(sweepBase),
    h: cRp(eqHigh + 0.0018),   // wick above liquidity
    c: cRp(sweepBase - 0.002), // closes back below
    l: cRp(sweepBase - 0.0025),
  };

  // CHoCH: first bullish close that breaks above a prior bearish swing high — 
  // but we're in a downtrend after sweep, so CHoCH = first candle to close above prior swing
  // Make a small down move first
  cImpulse(candles, sweepIdx + 1, -1, 3, 0.0015);

  const chochIdx = sweepIdx + 5;
  const priorSwing = candles[sweepIdx + 2]?.h ?? sweepBase;
  const chBase = candles[chochIdx - 1]?.c ?? sweepBase - 0.003;
  candles[chochIdx] = {
    o: cRp(chBase),
    c: cRp(priorSwing + 0.0015),
    h: cRp(priorSwing + 0.002),
    l: cRp(chBase - 0.0003),
  };
  cImpulse(candles, chochIdx + 1, 1, 5, 0.0015);

  return {
    candles,
    zones: [
      {
        key:   'liquidity-sweep',
        label: 'Liquidity Sweep',
        zone:  { startIdx: sweepIdx, endIdx: sweepIdx },
        colorIdx: 0,
        hint:  'The candle that spiked above prior highs then reversed',
      },
      {
        key:   'choch',
        label: 'CHoCH',
        zone:  { startIdx: chochIdx, endIdx: chochIdx },
        colorIdx: 1,
        hint:  'First candle to close above a prior swing — confirms reversal',
      },
    ],
  };
}

function generateComboBOSOB(difficulty = 1) {
  const n = 70;
  const start = 1.0820 + cRand(0, 0.008);
  const candles = cBaseline(n, start, 1, difficulty);

  // Swing high
  const swingIdx = 20;
  candles[swingIdx].h = cRp(candles[swingIdx].h + 0.001);
  const swingHigh = candles[swingIdx].h;

  // Pullback
  cImpulse(candles, swingIdx + 1, -1, 3, 0.001);

  // BOS candle — closes above swing high
  const bosIdx = swingIdx + 5;
  const bosBase = candles[bosIdx - 1]?.c ?? swingHigh - 0.001;
  candles[bosIdx] = {
    o: cRp(bosBase),
    c: cRp(swingHigh + 0.002),
    h: cRp(swingHigh + 0.003),
    l: cRp(bosBase - 0.0003),
  };

  // The OB is the last bearish candle before the BOS impulse
  const obIdx = bosIdx - 1;
  candles[obIdx] = {
    o: cRp(bosBase + 0.001),
    c: cRp(bosBase),
    h: cRp(bosBase + 0.0015),
    l: cRp(bosBase - 0.0005),
  };

  // Continue up after BOS
  cImpulse(candles, bosIdx + 1, 1, 4, 0.0015);

  // Pullback into OB
  cImpulse(candles, bosIdx + 6, -1, 3, 0.001);

  return {
    candles,
    zones: [
      {
        key:   'bos',
        label: 'Break of Structure',
        zone:  { startIdx: bosIdx, endIdx: bosIdx },
        colorIdx: 0,
        hint:  'The candle that closed beyond the prior swing high',
      },
      {
        key:   'order-block',
        label: 'Order Block',
        zone:  { startIdx: obIdx, endIdx: obIdx },
        colorIdx: 1,
        hint:  'The last opposing candle before the BOS impulse — your entry on pullback',
      },
    ],
  };
}

function generateComboInducementFVGOB(difficulty = 1) {
  const n = 75;
  const start = 1.0850 + cRand(0, 0.006);
  const candles = cBaseline(n, start, -1, difficulty);

  // Prior swing high (inducement target)
  const priorHighIdx = 16;
  const priorHigh = cRp(candles[priorHighIdx].h + 0.001);
  candles[priorHighIdx].h = priorHigh;

  // Inducement: minor break above prior high (false CHoCH)
  const indIdx = 24;
  const indBase = candles[indIdx - 1].c;
  candles[indIdx] = {
    o: cRp(indBase),
    c: cRp(priorHigh + 0.0008),
    h: cRp(priorHigh + 0.0012),
    l: cRp(indBase - 0.0003),
  };

  // OB: last bullish candle before real bearish displacement
  const obIdx = indIdx + 1;
  const obBase = candles[indIdx].c;
  candles[obIdx] = {
    o: cRp(obBase),
    c: cRp(obBase + 0.001),
    h: cRp(obBase + 0.0014),
    l: cRp(obBase - 0.0002),
  };

  // Displacement — fast bearish move leaving FVG
  const dispIdx = obIdx + 1;
  candles[dispIdx] = {
    o: cRp(obBase + 0.001),
    c: cRp(obBase - 0.005),
    h: cRp(obBase + 0.0013),
    l: cRp(obBase - 0.0055),
  };
  candles[dispIdx + 1] = {
    o: cRp(obBase - 0.005),
    c: cRp(obBase - 0.008),
    h: cRp(obBase - 0.0048),
    l: cRp(obBase - 0.0085),
  };
  // FVG is between candles[obIdx].l and candles[dispIdx+1].h
  candles[dispIdx + 2] = {
    o: cRp(obBase - 0.008),
    c: cRp(obBase - 0.010),
    h: cRp(obBase - 0.0078),
    l: cRp(obBase - 0.0105),
  };

  cImpulse(candles, dispIdx + 3, -1, 4, 0.0012);

  return {
    candles,
    zones: [
      {
        key:   'inducement',
        label: 'Inducement',
        zone:  { startIdx: indIdx, endIdx: indIdx },
        colorIdx: 0,
        hint:  'The false break that trapped breakout buyers',
      },
      {
        key:   'order-block',
        label: 'Order Block',
        zone:  { startIdx: obIdx, endIdx: obIdx },
        colorIdx: 1,
        hint:  'Last bullish candle before the real displacement',
      },
      {
        key:   'fair-value-gap',
        label: 'Fair Value Gap',
        zone:  { startIdx: dispIdx, endIdx: dispIdx + 1 },
        colorIdx: 2,
        hint:  'The imbalance left by the fast displacement move',
      },
    ],
  };
}

function generateComboSweepOBFVG(difficulty = 1) {
  const n = 70;
  const start = 1.0840 + cRand(0, 0.006);
  const candles = cBaseline(n, start, 1, difficulty);

  // Equal highs as liquidity
  const eqHigh = cRp(candles[20].h + 0.0008);
  candles[20].h = eqHigh;
  candles[23].h = cRp(eqHigh + cRand(-0.0001, 0.0001));

  // Sweep
  const sweepIdx = 28;
  const sBase = candles[sweepIdx - 1].c;
  candles[sweepIdx] = {
    o: cRp(sBase),
    h: cRp(eqHigh + 0.002),
    c: cRp(sBase - 0.0015),
    l: cRp(sBase - 0.002),
  };

  // OB: the sweep candle itself (or last bull before sweep)
  // Here OB = the sweep candle (bearish reversal OB)
  const obIdx = sweepIdx;

  // Displacement down — leaves FVG
  candles[sweepIdx + 1] = {
    o: cRp(sBase - 0.0015),
    c: cRp(sBase - 0.005),
    h: cRp(sBase - 0.001),
    l: cRp(sBase - 0.0055),
  };
  candles[sweepIdx + 2] = {
    o: cRp(sBase - 0.005),
    c: cRp(sBase - 0.008),
    h: cRp(sBase - 0.0048),
    l: cRp(sBase - 0.0085),
  };
  candles[sweepIdx + 3] = {
    o: cRp(sBase - 0.008),
    c: cRp(sBase - 0.0095),
    h: cRp(sBase - 0.0078),
    l: cRp(sBase - 0.010),
  };

  cImpulse(candles, sweepIdx + 4, -1, 4, 0.001);

  return {
    candles,
    zones: [
      {
        key:   'liquidity-sweep',
        label: 'Liquidity Sweep',
        zone:  { startIdx: sweepIdx, endIdx: sweepIdx },
        colorIdx: 0,
        hint:  'Wick above equal highs that immediately reversed',
      },
      {
        key:   'order-block',
        label: 'Order Block',
        zone:  { startIdx: obIdx, endIdx: obIdx },
        colorIdx: 1,
        hint:  'The reversal candle — where institutions entered short',
      },
      {
        key:   'fair-value-gap',
        label: 'Fair Value Gap',
        zone:  { startIdx: sweepIdx + 1, endIdx: sweepIdx + 2 },
        colorIdx: 2,
        hint:  'Imbalance in the displacement candles after the sweep',
      },
    ],
  };
}

function generateComboPO3(difficulty = 1) {
  const n = 75;
  const start = 1.0830 + cRand(0, 0.006);
  const candles = cBaseline(n, start, 0, difficulty); // flat baseline

  // Phase 1: Accumulation (sideways range, candles 10–25)
  const accStart = 10, accEnd = 25;
  const accMid = cRp(start + 0.002);
  for (let i = accStart; i <= accEnd; i++) {
    const o = cRp(accMid + cRand(-0.001, 0.001));
    const c = cRp(accMid + cRand(-0.001, 0.001));
    candles[i] = { o, c, h: cRp(Math.max(o,c) + cRand(0.0002, 0.0006)), l: cRp(Math.min(o,c) - cRand(0.0002, 0.0006)) };
  }

  // Phase 2: Manipulation — spike below accumulation range (stop hunt)
  const manIdx = 26;
  const accLow = Math.min(...candles.slice(accStart, accEnd+1).map(c => c.l));
  candles[manIdx] = {
    o: cRp(accMid),
    h: cRp(accMid + 0.0004),
    c: cRp(accMid - 0.001),
    l: cRp(accLow - 0.0018),  // false breakdown
  };
  candles[manIdx + 1] = {
    o: cRp(accMid - 0.001),
    h: cRp(accMid + 0.0002),
    c: cRp(accMid + 0.0005),
    l: cRp(accMid - 0.0015),
  };

  // Phase 3: Distribution — strong move up
  cImpulse(candles, manIdx + 2, 1, 8, 0.0022);

  return {
    candles,
    zones: [
      {
        key:   'accumulation',
        label: 'Accumulation',
        zone:  { startIdx: accStart, endIdx: accEnd },
        colorIdx: 0,
        hint:  'The consolidation range where smart money loaded positions',
      },
      {
        key:   'manipulation',
        label: 'Manipulation',
        zone:  { startIdx: manIdx, endIdx: manIdx + 1 },
        colorIdx: 1,
        hint:  'The false move that trapped retail traders in the wrong direction',
      },
      {
        key:   'distribution',
        label: 'Distribution',
        zone:  { startIdx: manIdx + 2, endIdx: manIdx + 9 },
        colorIdx: 2,
        hint:  'The true directional move after liquidity was taken',
      },
    ],
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

function generateCombo(comboKey, difficulty = 1) {
  const def = COMBOS[comboKey];
  if (!def) throw new Error(`Unknown combo: ${comboKey}`);
  const result = def.fn(difficulty);
  return {
    ...result,
    title:       def.label,
    description: def.description,
    difficulty:  def.difficulty,
  };
}

function getComboList() {
  return Object.entries(COMBOS).map(([key, val]) => ({
    key,
    label:      val.label,
    difficulty: val.difficulty,
  }));
}
