/**
 * patterns.js
 * OHLC data generators for each ICT pattern.
 * Each generator returns: { candles: [...], zone: { startIdx, endIdx }, hint, explanation }
 * Candles: array of { o, h, l, c } — forex-style prices around 1.08xx
 */

const PATTERNS = {
  'order-block':        { label: 'Order Block',          fn: generateOrderBlock },
  'fair-value-gap':     { label: 'Fair Value Gap',       fn: generateFVG },
  'breaker-block':      { label: 'Breaker Block',        fn: generateBreaker },
  'bos':                { label: 'Break of Structure',   fn: generateBOS },
  'choch':              { label: 'Change of Character',  fn: generateCHoCH },
  'liquidity-sweep':    { label: 'Liquidity Sweep',      fn: generateLiquiditySweep },
  'inducement':         { label: 'Inducement',           fn: generateInducement },
  'rejection-block':    { label: 'Rejection Block',      fn: generateRejectionBlock },
  'ote':                { label: 'OTE Zone',             fn: generateOTE },
  'mitigation-block':   { label: 'Mitigation Block',     fn: generateMitigationBlock },
  'propulsion-block':   { label: 'Propulsion Block',     fn: generatePropulsionBlock },
  'reclaimed-block':    { label: 'Reclaimed Block',      fn: generateReclaimedBlock },
  'vacuum-block':       { label: 'Vacuum Block',         fn: generateVacuumBlock },
  'trendline-phantom':  { label: 'Trendline Phantom',    fn: generateTrendlinePhantom },
  'cisd':               { label: 'CISD',                 fn: generateCISD },
  'false-flag':         { label: 'False Flag',           fn: generateFalseFlag },
  'false-hs':           { label: 'False Head & Shoulders', fn: generateFalseHS },
};

// ─── Utility ────────────────────────────────────────────────────────────────

function rand(min, max) { return min + Math.random() * (max - min); }
function rp(n, d = 5)   { return parseFloat(n.toFixed(d)); }

/**
 * Build a baseline of candles with a directional trend.
 * direction: 1 = up, -1 = down
 * difficulty: 1=clean, 2=realistic, 3=live/noisy
 */
function baseline(count, startPrice, direction, difficulty = 1) {
  const candles = [];
  let price = startPrice;

  // Level 1: clean, obvious trend, small wicks
  // Level 2: choppier, bigger wicks, occasional counter-trend candles
  // Level 3: very noisy, large wicks, frequent counter-trend moves, hard to read
  const trendStrength = difficulty === 1 ? 0.0004 : difficulty === 2 ? 0.0003 : 0.0002;
  const bodySize      = difficulty === 1 ? 0.0010 : difficulty === 2 ? 0.0014 : 0.0018;
  const wickSize      = difficulty === 1 ? 0.0003 : difficulty === 2 ? 0.0009 : 0.0018;
  const counterProb   = difficulty === 1 ? 0.25   : difficulty === 2 ? 0.38   : 0.48;

  for (let i = 0; i < count; i++) {
    const drift  = direction * rand(trendStrength * 0.3, trendStrength);
    const isBull = Math.random() > (direction === 1 ? counterProb : 1 - counterProb);
    const body   = rand(bodySize * 0.3, bodySize);
    const o      = price;
    const c      = o + (isBull ? 1 : -1) * body + drift;

    // Level 3: occasionally throw in a spike wick for confusion
    const extraWick = difficulty === 3 && Math.random() < 0.12 ? rand(0.001, 0.003) : 0;
    const h = Math.max(o, c) + rand(0, wickSize) + extraWick;
    const l = Math.min(o, c) - rand(0, wickSize) - (difficulty === 3 && Math.random() < 0.12 ? rand(0.001, 0.003) : 0);

    candles.push({ o: rp(o), h: rp(h), l: rp(l), c: rp(c) });
    price = c;
  }
  return candles;
}

/**
 * Inject a strong impulsive move starting at index i
 */
function impulse(candles, startIdx, direction, bars = 4, strength = 0.002) {
  let price = candles[startIdx - 1]?.c ?? candles[startIdx].o;
  for (let i = startIdx; i < startIdx + bars && i < candles.length; i++) {
    const body = rand(strength * 0.8, strength * 1.2);
    const o = price;
    const c = o + direction * body;
    const h = Math.max(o, c) + rand(0, 0.0003);
    const l = Math.min(o, c) - rand(0, 0.0003);
    candles[i] = { o: rp(o), h: rp(h), l: rp(l), c: rp(c) };
    price = c;
  }
}

/**
 * Apply noise to candles outside the pattern zone for higher difficulties.
 * Level 2: adds bigger wicks and chop around the pattern.
 * Level 3: injects decoy patterns (fake OB-looking candles) to confuse.
 */
function applyNoise(candles, zone, level) {
  if (level < 2) return;

  candles.forEach((c, i) => {
    if (i >= zone.startIdx - 1 && i <= zone.endIdx + 1) return;

    if (level === 2) {
      // Bigger wicks, slightly choppier bodies
      const extraWick = rand(0.0003, 0.0009);
      candles[i] = {
        o: rp(c.o),
        h: rp(c.h + extraWick),
        l: rp(c.l - extraWick),
        c: rp(c.c + rand(-0.0003, 0.0003)),
      };
    } else {
      // Level 3: large random wicks + occasional decoy candles
      const extraWick = rand(0.0006, 0.002);
      const isDecoy   = Math.random() < 0.15; // fake strong candle to mislead
      if (isDecoy) {
        const dir  = Math.random() > 0.5 ? 1 : -1;
        const body = rand(0.001, 0.0025);
        candles[i] = {
          o: rp(c.o),
          c: rp(c.o + dir * body),
          h: rp(c.o + Math.max(0, dir * body) + rand(0.0004, 0.001)),
          l: rp(c.o + Math.min(0, dir * body) - rand(0.0004, 0.001)),
        };
      } else {
        candles[i] = {
          o: rp(c.o),
          h: rp(c.h + extraWick),
          l: rp(c.l - extraWick),
          c: rp(c.c + rand(-0.0005, 0.0005)),
        };
      }
    }
  });
}

// ─── Pattern Generators ─────────────────────────────────────────────────────

function generateOrderBlock(difficulty = 1) {
  const n = 60;
  const start = 1.0820 + rand(0, 0.008);
  const candles = baseline(n, start, -1, difficulty);

  // The OB: last bullish candle before bearish impulse
  const obIdx = Math.floor(rand(22, 30));
  const prevC = candles[obIdx - 1]?.c ?? start;

  // Bullish OB candle
  candles[obIdx] = {
    o: rp(prevC),
    c: rp(prevC + rand(0.002, 0.003)),
    h: rp(prevC + rand(0.003, 0.004)),
    l: rp(prevC - rand(0.0002, 0.0005)),
  };
  candles[obIdx].h = rp(Math.max(candles[obIdx].h, candles[obIdx].c + 0.0003));

  // Bearish impulse after
  impulse(candles, obIdx + 1, -1, 5, 0.002);

  const zone = { startIdx: obIdx, endIdx: obIdx };
  applyNoise(candles, zone, difficulty);

  return {
    candles,
    zone,
    hint: 'Find the last bullish candle before the strong move down.',
    explanation: 'An Order Block is the last opposing candle before an impulsive move. Price often returns to this zone as institutional supply/demand.',
    patternType: 'bearish-ob',
  };
}

function generateFVG(difficulty = 1) {
  const n = 60;
  const start = 1.0820 + rand(0, 0.008);
  const candles = baseline(n, start, 1, difficulty);

  // FVG: candle[i].l > candle[i-2].h — a gap price skipped through
  const midIdx = Math.floor(rand(23, 32));
  const base = candles[midIdx - 1].c;

  // Candle before gap
  candles[midIdx - 1] = {
    o: rp(base - rand(0.001, 0.0015)),
    c: rp(base),
    h: rp(base + rand(0.0003, 0.0006)),
    l: rp(base - rand(0.0015, 0.002)),
  };

  const gapBot = candles[midIdx - 1].h;
  const gapTop = rp(gapBot + rand(0.0015, 0.003));

  // Impulse candle — body spans the gap
  candles[midIdx] = {
    o: rp(gapBot - rand(0.0005, 0.001)),
    c: rp(gapTop + rand(0.0005, 0.001)),
    h: rp(gapTop + rand(0.001, 0.002)),
    l: rp(gapBot - rand(0.001, 0.0015)),
  };

  // Candle after gap — opens above the gap
  candles[midIdx + 1] = {
    o: rp(gapTop + rand(0.0002, 0.0005)),
    c: rp(gapTop + rand(0.001, 0.002)),
    h: rp(gapTop + rand(0.0015, 0.003)),
    l: rp(gapTop - rand(0.0001, 0.0003)),
  };

  // FVG zone is between candle[midIdx-1].h and candle[midIdx+1].l
  const zone = { startIdx: midIdx - 1, endIdx: midIdx + 1 };
  applyNoise(candles, zone, difficulty);

  return {
    candles,
    zone,
    hint: 'Look for three candles where a price gap exists between the first candle\'s high and the third candle\'s low.',
    explanation: 'A Fair Value Gap (FVG) is a 3-candle imbalance where price moved so fast it left an unfilled gap. The zone between candle 1\'s high and candle 3\'s low is the imbalance.',
    patternType: 'bullish-fvg',
  };
}

function generateBreaker(difficulty = 1) {
  const n = 60;
  const start = 1.0840 + rand(0, 0.006);
  const candles = baseline(n, start, 1, difficulty);

  const obIdx = Math.floor(rand(18, 24));
  const base = candles[obIdx - 1]?.c ?? start;

  // Original bullish OB
  candles[obIdx] = {
    o: rp(base),
    c: rp(base + 0.002),
    h: rp(base + 0.0025),
    l: rp(base - 0.0003),
  };

  // Small rally, then price breaks BELOW the OB (OB fails → becomes Breaker)
  let price = candles[obIdx].c;
  for (let i = obIdx + 1; i <= obIdx + 3; i++) {
    price += rand(0.0005, 0.001);
    candles[i] = { o: rp(price - 0.0005), c: rp(price), h: rp(price + 0.0004), l: rp(price - 0.0008) };
  }

  // Bearish break through the OB low
  const breakIdx = obIdx + 4;
  impulse(candles, breakIdx, -1, 5, 0.0025);

  // Price returns to the broken OB zone (now resistance = breaker)
  let retPrice = candles[breakIdx + 4]?.c ?? base;
  for (let i = breakIdx + 5; i <= breakIdx + 8 && i < n; i++) {
    retPrice += rand(0.0005, 0.001);
    candles[i] = { o: rp(retPrice - 0.0005), c: rp(retPrice), h: rp(retPrice + 0.0004), l: rp(retPrice - 0.0008) };
  }

  const zone = { startIdx: obIdx, endIdx: obIdx + 1 };
  applyNoise(candles, zone, difficulty);

  return {
    candles,
    zone,
    hint: 'Find the original support level that was broken and later acted as resistance.',
    explanation: 'A Breaker Block is a failed Order Block. When price breaks through an OB rather than bouncing, that OB flips polarity — it becomes a supply/resistance zone.',
    patternType: 'breaker',
  };
}

function generateBOS(difficulty = 1) {
  const n = 60;
  const start = 1.0820 + rand(0, 0.008);
  const candles = baseline(n, start, 1, difficulty);

  // Build a swing high, then a BOS above it
  const swingIdx = Math.floor(rand(18, 25));
  const swingHigh = rp(candles[swingIdx].h);
  candles[swingIdx].h = swingHigh;

  // Pullback
  let price = candles[swingIdx].c;
  for (let i = swingIdx + 1; i <= swingIdx + 4; i++) {
    price -= rand(0.0005, 0.001);
    candles[i] = { o: rp(price + 0.0005), c: rp(price), h: rp(price + 0.001), l: rp(price - 0.0005) };
  }

  // BOS candle — closes decisively above the swing high
  const bosIdx = swingIdx + 5;
  const bosOpen = candles[bosIdx - 1]?.c ?? price;
  candles[bosIdx] = {
    o: rp(bosOpen),
    c: rp(swingHigh + rand(0.002, 0.003)),
    h: rp(swingHigh + rand(0.003, 0.004)),
    l: rp(bosOpen - rand(0.0002, 0.0004)),
  };

  impulse(candles, bosIdx + 1, 1, 3, 0.0015);

  const zone = { startIdx: bosIdx, endIdx: bosIdx };
  applyNoise(candles, zone, difficulty);

  return {
    candles,
    zone,
    hint: 'Find the candle that closed decisively beyond a previous swing high.',
    explanation: 'A Break of Structure (BOS) is when price closes beyond a prior swing point, confirming continuation of the trend. It signals smart money has pushed through a key level.',
    patternType: 'bos',
  };
}

function generateCHoCH(difficulty = 1) {
  const n = 60;
  const start = 1.0860 + rand(0, 0.006);
  // Start bearish, then CHoCH signals bullish shift
  const candles = baseline(n, start, -1, difficulty);

  const chochIdx = Math.floor(rand(24, 32));

  // Prior bearish swing low to break above
  const swingLow = candles[chochIdx - 3]?.l ?? rp(start - 0.005);

  // CHoCH candle — first bullish close above a prior swing high in a downtrend
  const priorSwingHigh = rp(candles[chochIdx - 5]?.h ?? start - 0.002);
  const chBase = candles[chochIdx - 1]?.c ?? start - 0.003;

  candles[chochIdx] = {
    o: rp(chBase),
    c: rp(priorSwingHigh + rand(0.001, 0.002)),
    h: rp(priorSwingHigh + rand(0.002, 0.003)),
    l: rp(chBase - rand(0.0002, 0.0004)),
  };

  impulse(candles, chochIdx + 1, 1, 4, 0.0018);

  const zone = { startIdx: chochIdx, endIdx: chochIdx };
  applyNoise(candles, zone, difficulty);

  return {
    candles,
    zone,
    hint: 'In a downtrend, find the first candle that broke above a prior swing high — signaling the shift.',
    explanation: 'A Change of Character (CHoCH) is the first sign that trend direction is shifting. Unlike a BOS (which confirms continuation), a CHoCH is the initial break against the prevailing trend.',
    patternType: 'choch',
  };
}

function generateLiquiditySweep(difficulty = 1) {
  const n = 60;
  const start = 1.0830 + rand(0, 0.008);
  const candles = baseline(n, start, 1, difficulty);

  // Establish equal highs (liquidity pool)
  const eqIdx = Math.floor(rand(15, 22));
  const eqHigh = rp(candles[eqIdx].h);
  candles[eqIdx].h = eqHigh;
  // Second equal high nearby
  const eq2 = eqIdx + Math.floor(rand(2, 5));
  candles[eq2].h = rp(eqHigh + rand(-0.0001, 0.0002));

  // Sweep candle — wick above equal highs, closes back below
  const sweepIdx = Math.floor(rand(eq2 + 2, eq2 + 5));
  const sweepBase = candles[sweepIdx - 1]?.c ?? eqHigh - 0.001;
  candles[sweepIdx] = {
    o: rp(sweepBase),
    h: rp(eqHigh + rand(0.001, 0.002)),   // wick above liquidity
    c: rp(sweepBase - rand(0.001, 0.002)), // closes below — reversal
    l: rp(sweepBase - rand(0.002, 0.003)),
  };

  impulse(candles, sweepIdx + 1, -1, 4, 0.002);

  const zone = { startIdx: sweepIdx, endIdx: sweepIdx };
  applyNoise(candles, zone, difficulty);

  return {
    candles,
    zone,
    hint: 'Look for a wick that spiked above prior swing highs then closed back below them.',
    explanation: 'A Liquidity Sweep is when price briefly raids a pool of stop orders (above swing highs or below swing lows) before reversing. The long wick and immediate close back through is the signature.',
    patternType: 'sweep',
  };
}

function generateInducement(difficulty = 1) {
  const n = 60;
  const start = 1.0830 + rand(0, 0.008);
  const candles = baseline(n, start, -1, difficulty);

  // Downtrend → minor "BOS" up that looks like reversal but is inducement
  const indIdx = Math.floor(rand(22, 30));
  const priorHigh = candles[indIdx - 4]?.h ?? rp(start - 0.001);

  // Inducement candle — closes just above prior swing high (false CHoCH)
  const indBase = candles[indIdx - 1]?.c ?? rp(start - 0.004);
  candles[indIdx] = {
    o: rp(indBase),
    c: rp(priorHigh + rand(0.0005, 0.001)),
    h: rp(priorHigh + rand(0.001, 0.0015)),
    l: rp(indBase - rand(0.0002, 0.0004)),
  };

  // Then price drops hard — the real move
  impulse(candles, indIdx + 1, -1, 5, 0.0025);

  const zone = { startIdx: indIdx, endIdx: indIdx };
  applyNoise(candles, zone, difficulty);

  return {
    candles,
    zone,
    hint: 'Find a minor break of structure that immediately failed and reversed hard in the original direction.',
    explanation: 'Inducement is a deliberate false move to trigger retail stop orders and breakout traders before the real institutional move. It looks like a CHoCH but quickly fails.',
    patternType: 'inducement',
  };
}

function generateRejectionBlock(difficulty = 1) {
  const n = 60;
  const start = 1.0850 + rand(0, 0.006);
  const candles = baseline(n, start, 1, difficulty);

  // Rejection block: candle with very long upper wick at a key level
  const rejIdx = Math.floor(rand(23, 32));
  const base = candles[rejIdx - 1]?.c ?? start;

  candles[rejIdx] = {
    o: rp(base),
    c: rp(base - rand(0.0005, 0.001)),  // closes near open (bearish rejection)
    h: rp(base + rand(0.003, 0.005)),   // long wick up
    l: rp(base - rand(0.001, 0.0015)),
  };

  impulse(candles, rejIdx + 1, -1, 4, 0.002);

  const zone = { startIdx: rejIdx, endIdx: rejIdx };
  applyNoise(candles, zone, difficulty);

  return {
    candles,
    zone,
    hint: 'Find the candle with a disproportionately long wick — price reached up but was strongly rejected.',
    explanation: 'A Rejection Block is a candle with a very long wick showing strong rejection at a level. The wick represents price testing supply/demand and being pushed back — often marks key institutional interest.',
    patternType: 'rejection',
  };
}

function generateOTE(difficulty = 1) {
  const n = 60;
  const start = 1.0820 + rand(0, 0.008);
  const candles = baseline(n, start, 1, difficulty);

  // OTE: swing low → swing high → 61.8–79% retracement entry
  const swingLowIdx = Math.floor(rand(10, 16));
  const swingHighIdx = Math.floor(rand(20, 26));

  const swingLow = rp(candles[swingLowIdx].l - rand(0.001, 0.002));
  const swingHigh = rp(swingLow + rand(0.012, 0.018));

  candles[swingLowIdx].l = swingLow;
  candles[swingLowIdx].o = rp(swingLow + rand(0.001, 0.002));
  candles[swingLowIdx].c = rp(swingLow + rand(0.002, 0.003));

  // Rally to swing high
  impulse(candles, swingLowIdx + 1, 1, swingHighIdx - swingLowIdx - 1, 0.002);
  candles[swingHighIdx].h = swingHigh;
  candles[swingHighIdx].c = rp(swingHigh - rand(0.001, 0.002));

  // Retrace 61.8–79%
  const range = swingHigh - swingLow;
  const oteBot = rp(swingHigh - range * 0.79);
  const oteTop = rp(swingHigh - range * 0.618);
  const oteIdx = Math.floor(rand(swingHighIdx + 3, swingHighIdx + 7));

  impulse(candles, swingHighIdx + 1, -1, oteIdx - swingHighIdx - 1, 0.0018);

  // OTE candle — touches the zone and holds
  const oteBase = candles[oteIdx - 1]?.c ?? oteTop;
  candles[oteIdx] = {
    o: rp(oteBase),
    l: rp(oteBot - rand(0.0001, 0.0003)),
    c: rp(oteTop + rand(0.0005, 0.001)),
    h: rp(oteTop + rand(0.001, 0.002)),
  };

  impulse(candles, oteIdx + 1, 1, 5, 0.002);

  const zone = { startIdx: oteIdx, endIdx: oteIdx };
  applyNoise(candles, zone, difficulty);

  return {
    candles,
    zone,
    hint: 'Identify the swing low and swing high, then find where price retraced to the 61.8–79% fib level.',
    explanation: 'The OTE (Optimal Trade Entry) zone sits between the 61.8% and 79% Fibonacci retracement of a swing. ICT uses this as the primary entry area after a displacement move.',
    patternType: 'ote',
  };
}

// ─── New Pattern Generators ──────────────────────────────────────────────────

/**
 * Mitigation Block:
 * Short-term low forms → price rallies (creating a swing high = the OB) →
 * price breaks below the short-term low (MSS) → retraces back up to that swing high.
 * That swing high = mitigation block = sell there.
 */
function generateMitigationBlock(difficulty = 1) {
  const n = 65;
  const start = 1.0850 + rand(0, 0.008);
  const candles = baseline(n, start, -1, difficulty);

  const stLowIdx = Math.floor(rand(14, 18));     // short-term low
  const stLow    = rp(candles[stLowIdx].l - rand(0.001, 0.002));
  candles[stLowIdx].l = stLow;
  candles[stLowIdx].c = rp(stLow + rand(0.001, 0.002));
  candles[stLowIdx].o = rp(stLow + rand(0.0005, 0.001));

  // Rally from ST low → creates swing high (the mitigation block OB)
  impulse(candles, stLowIdx + 1, 1, 4, 0.0022);
  const mbIdx = stLowIdx + 5;                   // last up candle of the rally = mitigation block
  const mbBase = candles[mbIdx - 1]?.c ?? rp(stLow + 0.006);
  candles[mbIdx] = {
    o: rp(mbBase),
    c: rp(mbBase + rand(0.0012, 0.002)),
    h: rp(mbBase + rand(0.002, 0.003)),
    l: rp(mbBase - rand(0.0002, 0.0005)),
  };

  // Price falls back through the ST low = MSS (market structure shift)
  impulse(candles, mbIdx + 1, -1, 6, 0.003);
  const mssIdx = mbIdx + 6;

  // Retrace back up to the mitigation block zone
  impulse(candles, mssIdx + 1, 1, 4, 0.0016);

  const zone = { startIdx: mbIdx, endIdx: mbIdx };
  applyNoise(candles, zone, difficulty);

  return {
    candles,
    zone,
    hint: 'Find the last up-close candle from the rally — the level that preceded the break of structure.',
    explanation: 'A Mitigation Block is the last up candle from a short-term rally that preceded a market structure shift (break below a prior low). Traders who bought at the swing high are underwater. When price returns to that candle, they exit — and smart money adds new shorts. Result: explosive move lower.',
    patternType: 'mitigation-block',
  };
}

/**
 * Propulsion Block:
 * A down candle (bullish OB) is formed → price rallies → a NEW down candle
 * trades back into the first OB → that new candle = propulsion block.
 * Price barely touches the mean threshold then explodes up.
 */
function generatePropulsionBlock(difficulty = 1) {
  const n = 65;
  const start = 1.0820 + rand(0, 0.008);
  const candles = baseline(n, start, 1, difficulty);

  // First bullish OB (down candle before initial up move)
  const ob1Idx = Math.floor(rand(12, 16));
  const ob1Base = candles[ob1Idx - 1]?.c ?? start;
  candles[ob1Idx] = {
    o: rp(ob1Base),
    c: rp(ob1Base - rand(0.0012, 0.0018)),
    h: rp(ob1Base + rand(0.0002, 0.0004)),
    l: rp(ob1Base - rand(0.002, 0.003)),
  };

  // Rally away from OB1
  impulse(candles, ob1Idx + 1, 1, 5, 0.002);

  // Propulsion candle — new down candle that trades INTO OB1's range
  const propIdx = ob1Idx + 7;
  const ob1High = candles[ob1Idx].o;   // top of OB1 body
  const ob1Mid  = rp((candles[ob1Idx].o + candles[ob1Idx].c) / 2);

  candles[propIdx] = {
    o: rp(ob1High + rand(0.001, 0.002)),
    c: rp(ob1Mid + rand(0.0002, 0.0006)),  // closes near mean threshold, not below
    h: rp(ob1High + rand(0.002, 0.003)),
    l: rp(ob1Mid - rand(0.0001, 0.0003)),  // just touches mean threshold
  };

  // Explosive rally from propulsion block
  impulse(candles, propIdx + 1, 1, 6, 0.0025);

  const zone = { startIdx: propIdx, endIdx: propIdx };
  applyNoise(candles, zone, difficulty);

  return {
    candles,
    zone,
    hint: 'Find the down candle that traded INTO a previous order block — it barely touched the midpoint before exploding up.',
    explanation: 'A Propulsion Block is a down candle that trades into a previous bullish order block. Because two institutional levels overlap, the reaction is immediate and violent. The mean threshold (body midpoint) is almost never violated on a true propulsion block.',
    patternType: 'propulsion-block',
  };
}

/**
 * Reclaimed Block:
 * Market sells off (sell side of curve) → small bounces along the way = down candles
 * followed by small rallies. Those down candles = reclaimed blocks.
 * After HTF support is hit and price reverses, price returns to those down candles = buy.
 */
function generateReclaimedBlock(difficulty = 1) {
  const n = 65;
  const start = 1.0870 + rand(0, 0.006);
  const candles = baseline(n, start, -1, difficulty);

  // Sell-side curve: price dropping with small bounces
  const rc1Idx = Math.floor(rand(10, 14));
  const rc2Idx = rc1Idx + Math.floor(rand(4, 7));

  // First reclaimed block (down candle before small bounce during sell-off)
  const rc1Base = candles[rc1Idx - 1]?.c ?? start - 0.003;
  candles[rc1Idx] = {
    o: rp(rc1Base),
    c: rp(rc1Base - rand(0.0012, 0.002)),
    h: rp(rc1Base + rand(0.0002, 0.0004)),
    l: rp(rc1Base - rand(0.002, 0.003)),
  };
  // Small bounce
  impulse(candles, rc1Idx + 1, 1, 2, 0.001);

  // Second reclaimed block (same pattern lower)
  const rc2Base = candles[rc2Idx - 1]?.c ?? rc1Base - 0.004;
  candles[rc2Idx] = {
    o: rp(rc2Base),
    c: rp(rc2Base - rand(0.001, 0.0018)),
    h: rp(rc2Base + rand(0.0002, 0.0003)),
    l: rp(rc2Base - rand(0.0018, 0.0025)),
  };

  // HTF support hit → reversal (buy side of curve begins)
  const reversalIdx = rc2Idx + 5;
  impulse(candles, reversalIdx, 1, 6, 0.002);

  // Price returns to rc2 (the most recent reclaimed block)
  impulse(candles, reversalIdx + 7, -1, 3, 0.0012);

  const zone = { startIdx: rc2Idx, endIdx: rc2Idx };
  applyNoise(candles, zone, difficulty);

  return {
    candles,
    zone,
    hint: 'During the sell-off, find a down candle that preceded a small bounce — those bounces show smart money was scaling into longs early.',
    explanation: 'A Reclaimed Block is a down candle that formed during the sell-side of a market maker curve (the drop). Each small bounce during the decline shows smart money accumulating. After HTF support reverses price, those down candles become buying opportunities as price returns to "reclaim" them.',
    patternType: 'reclaimed-block',
  };
}

/**
 * Vacuum Block (gap fill):
 * A volatility event creates a price gap. Price eventually returns to fill the gap.
 * The gap zone = vacuum block. Partial or full fill expected.
 */
function generateVacuumBlock(difficulty = 1) {
  const n = 65;
  const start = 1.0830 + rand(0, 0.008);
  const candles = baseline(n, start, 1, difficulty);

  const gapIdx = Math.floor(rand(20, 27));
  const prevClose = candles[gapIdx - 1].c;

  // Gap candle — opens well above previous close
  const gapSize = rand(0.003, 0.006);
  const gapOpen = rp(prevClose + gapSize);
  candles[gapIdx] = {
    o: gapOpen,
    c: rp(gapOpen + rand(0.001, 0.002)),
    h: rp(gapOpen + rand(0.002, 0.0035)),
    l: rp(gapOpen - rand(0.0002, 0.0005)),
  };

  // Price continues up briefly
  impulse(candles, gapIdx + 1, 1, 3, 0.0012);

  // Then retraces back to fill the gap
  impulse(candles, gapIdx + 4, -1, 6, 0.002);

  // The zone is the gap itself — between prevClose and gapOpen
  const zone = { startIdx: gapIdx - 1, endIdx: gapIdx };
  applyNoise(candles, zone, difficulty);

  return {
    candles,
    zone,
    hint: 'Find where price gapped — there is a range with no price delivery. That unfilled zone is your vacuum block.',
    explanation: 'A Vacuum Block is a gap in price delivery created by a volatility event (news, session open). Price left a "vacuum" of liquidity — one side was never offered. Price will return to fill that zone. The zone between the previous candle\'s close and the gap candle\'s open is the vacuum.',
    patternType: 'vacuum-block',
  };
}

/**
 * Trendline Phantom:
 * 3-touch bullish trendline visible. The key level is the swing high between point 2 and point 3.
 * Price briefly pops above that high (turtle soup), then collapses.
 * Zone = swing high between points 2 and 3 (the bearish OB / entry area).
 */
function generateTrendlinePhantom(difficulty = 1) {
  const n = 70;
  const start = 1.0840 + rand(0, 0.007);
  const candles = baseline(n, start, 1, difficulty);

  // Point 1 — first trendline touch (low)
  const pt1 = Math.floor(rand(8, 12));
  candles[pt1].l = rp(candles[pt1].l - rand(0.001, 0.002));

  // Rally from pt1 to swing high between 1 and 2
  impulse(candles, pt1 + 1, 1, 4, 0.002);

  // Point 2 — second trendline touch (higher low)
  const pt2 = pt1 + 6;
  impulse(candles, pt2 - 2, -1, 2, 0.0015);
  candles[pt2].l = rp(candles[pt2 - 1].l - rand(0.0005, 0.001));

  // Rally between pt2 and pt3 — creates the KEY SWING HIGH (red box)
  impulse(candles, pt2 + 1, 1, 4, 0.002);
  const swingHighIdx = pt2 + 5;
  const swingHigh = rp(candles[swingHighIdx - 1].c + rand(0.0008, 0.0014));
  candles[swingHighIdx] = {
    o: rp(candles[swingHighIdx - 1].c),
    c: rp(swingHigh - rand(0.0004, 0.0008)),
    h: swingHigh,
    l: rp(candles[swingHighIdx - 1].c - rand(0.0002, 0.0004)),
  };

  // Point 3 — third trendline touch (even higher low, retail buys here)
  const pt3 = swingHighIdx + 4;
  impulse(candles, swingHighIdx + 1, -1, 3, 0.0015);
  candles[pt3].l = rp(candles[pt3 - 1].l - rand(0.0005, 0.001));

  // Turtle soup — brief pop above swing high, then collapse
  const tsIdx = pt3 + 3;
  impulse(candles, pt3 + 1, 1, 2, 0.0012);
  candles[tsIdx] = {
    o: rp(swingHigh - rand(0.0003, 0.0006)),
    h: rp(swingHigh + rand(0.001, 0.002)),   // pops above swing high
    c: rp(swingHigh - rand(0.001, 0.002)),   // closes back below
    l: rp(swingHigh - rand(0.002, 0.003)),
  };

  // Collapse
  impulse(candles, tsIdx + 1, -1, 6, 0.0025);

  // Zone = swing high between pt2 and pt3 (the bearish OB)
  const zone = { startIdx: swingHighIdx, endIdx: swingHighIdx };
  applyNoise(candles, zone, difficulty);

  return {
    candles,
    zone,
    hint: 'An obvious upward trendline is visible. Find the swing high between point 2 and point 3 — the bearish order block retail traders missed.',
    explanation: 'A Trendline Phantom is a false trendline setup. Retail buys the third touch of the trendline. ICT ignores the trendline and focuses on the swing high between points 2 and 3 — where a bearish order block sits. Price briefly pops above that high (turtle soup, running buy stops) before collapsing. The trendline is just retail fingerprints — smart money uses it as a liquidity source.',
    patternType: 'trendline-phantom',
  };
}

/**
 * CISD — Change in State of Delivery:
 * Price was in bearish delivery (LH + LL). A single candle closes above
 * a prior swing high WITH conviction — that's the CISD candle.
 * After CISD, delivery flips to bullish (HH + HL).
 */
function generateCISD(difficulty = 1) {
  const n = 65;
  const start = 1.0870 + rand(0, 0.006);
  // Start bearish delivery
  const candles = baseline(n, start, -1, difficulty);

  const priorSwingHighIdx = Math.floor(rand(14, 20));
  const priorSwingHigh = rp(candles[priorSwingHighIdx].h + rand(0.001, 0.002));
  candles[priorSwingHighIdx].h = priorSwingHigh;

  // Continue bearish after prior swing high — lower lows and lower highs
  impulse(candles, priorSwingHighIdx + 1, -1, 5, 0.0018);

  // CISD candle — explosive close ABOVE the prior swing high = delivery flips
  const cisdIdx = priorSwingHighIdx + 8;
  const cisdBase = candles[cisdIdx - 1]?.c ?? rp(start - 0.006);
  candles[cisdIdx] = {
    o: rp(cisdBase),
    c: rp(priorSwingHigh + rand(0.0015, 0.0025)),  // closes clearly above
    h: rp(priorSwingHigh + rand(0.0025, 0.004)),
    l: rp(cisdBase - rand(0.0002, 0.0005)),
  };

  // Bullish delivery begins after CISD
  impulse(candles, cisdIdx + 1, 1, 6, 0.002);

  const zone = { startIdx: cisdIdx, endIdx: cisdIdx };
  applyNoise(candles, zone, difficulty);

  return {
    candles,
    zone,
    hint: 'In a bearish delivery sequence, find the single candle that closed convincingly above a prior swing high — the moment delivery flipped.',
    explanation: 'CISD (Change in State of Delivery) is when price shifts from bearish delivery (lower highs, lower lows) to bullish delivery (higher highs, higher lows), confirmed by a single candle closing above a key prior swing high. Everything after this candle should be viewed as bullish delivery — buy pullbacks, not sells.',
    patternType: 'cisd',
  };
}

/**
 * False Flag (bullish or bearish):
 * A classic-looking flag pattern forms in the wrong HTF context.
 * Bullish false flag: appears at premium — retail buys the breakout, then price collapses.
 * Bearish false flag: appears at discount — retail sells the breakdown, then price rallies.
 */
function generateFalseFlag(difficulty = 1) {
  const isBullishFlag = Math.random() > 0.5;
  const n = 65;
  const start = 1.0840 + rand(0, 0.007);

  if (isBullishFlag) {
    // Bull flag at PREMIUM → trap
    const candles = baseline(n, start, 1, difficulty);
    const poleIdx = Math.floor(rand(12, 18));

    // Flagpole — strong up move
    impulse(candles, poleIdx, 1, 5, 0.003);

    // Flag — slight pullback (looks like continuation consolidation)
    impulse(candles, poleIdx + 5, -1, 6, 0.001);

    // Retail buys the breakout above flag high — turtle soup
    const brkIdx = poleIdx + 12;
    const flagHigh = Math.max(...candles.slice(poleIdx, brkIdx).map(c => c.h));
    candles[brkIdx] = {
      o: rp(flagHigh - rand(0.0003, 0.0006)),
      h: rp(flagHigh + rand(0.0008, 0.0015)),   // brief pop above — turtle soup
      c: rp(flagHigh - rand(0.001, 0.002)),      // closes back below
      l: rp(flagHigh - rand(0.002, 0.003)),
    };

    // Collapse
    impulse(candles, brkIdx + 1, -1, 7, 0.0025);

    const zone = { startIdx: brkIdx, endIdx: brkIdx };
    applyNoise(candles, zone, difficulty);

    return {
      candles,
      zone,
      hint: 'A textbook bull flag is visible. But look at the HTF context — is price already in premium? Find the moment the breakout failed.',
      explanation: 'A False Bull Flag forms when a classic bull flag pattern appears in a premium zone. Retail buys the breakout above the flag high. ICT fades this — price makes a brief turtle soup above the flag high (running buy stops) before collapsing. The higher-timeframe context (premium, bearish OB) reveals the trap.',
      patternType: 'false-bull-flag',
    };
  } else {
    // Bear flag at DISCOUNT → trap
    const candles = baseline(n, start, -1, difficulty);
    const poleIdx = Math.floor(rand(12, 18));

    // Flagpole — strong down move
    impulse(candles, poleIdx, -1, 5, 0.003);

    // Flag — slight rally (looks like continuation consolidation)
    impulse(candles, poleIdx + 5, 1, 6, 0.001);

    // Retail sells the breakdown below flag low — turtle soup
    const brkIdx = poleIdx + 12;
    const flagLow = Math.min(...candles.slice(poleIdx, brkIdx).map(c => c.l));
    candles[brkIdx] = {
      o: rp(flagLow + rand(0.0003, 0.0006)),
      l: rp(flagLow - rand(0.0008, 0.0015)),   // brief dip below — turtle soup
      c: rp(flagLow + rand(0.001, 0.002)),      // closes back above
      h: rp(flagLow + rand(0.002, 0.003)),
    };

    // Rally
    impulse(candles, brkIdx + 1, 1, 7, 0.0025);

    const zone = { startIdx: brkIdx, endIdx: brkIdx };
    applyNoise(candles, zone, difficulty);

    return {
      candles,
      zone,
      hint: 'A textbook bear flag is visible. But price is in a discount zone. Find the moment the breakdown failed — that turtle soup is the actual buy signal.',
      explanation: 'A False Bear Flag forms when a classic bear flag pattern appears in a discount zone. Retail sells the breakdown below the flag low. ICT fades this — price briefly dips below the flag low (turtle soup, running sell stops) before reversing strongly. The discount context and bullish OB below reveal this as a smart money trap.',
      patternType: 'false-bear-flag',
    };
  }
}

/**
 * False Head & Shoulders:
 * A classic H&S pattern forms but HTF context is bullish (for bearish H&S) —
 * neckline breaks → retail sells → ICT buys the sell stop raid.
 * Or inverted H&S in bearish HTF context — ICT sells the buy stop raid.
 */
function generateFalseHS(difficulty = 1) {
  const isBearishHS = Math.random() > 0.5; // bearish H&S = bullish trap for ICT buy
  const n = 70;
  const start = 1.0845 + rand(0, 0.007);

  if (isBearishHS) {
    // Classic H&S pattern (bearish retail signal) but HTF is BULLISH
    const candles = baseline(n, start, -1, difficulty);

    const neckBase = rp(candles[15]?.c ?? start - 0.003);

    // Left shoulder
    impulse(candles, 10, 1, 3, 0.002);
    impulse(candles, 13, -1, 3, 0.002);

    // Head (higher high than left shoulder)
    const headIdx = 18;
    impulse(candles, 16, 1, 3, 0.003);
    candles[headIdx].h = rp(candles[headIdx - 1].h + rand(0.001, 0.002));

    // Decline from head back to neckline
    impulse(candles, headIdx + 1, -1, 4, 0.0022);

    // Right shoulder (lower high)
    impulse(candles, headIdx + 5, 1, 3, 0.0018);
    impulse(candles, headIdx + 8, -1, 3, 0.0015);

    // Neckline break — retail sells here (the trap)
    const neckBreakIdx = headIdx + 12;
    const neckLevel = Math.min(...candles.slice(13, neckBreakIdx).map(c => c.l));
    candles[neckBreakIdx] = {
      o: rp(neckLevel + rand(0.0002, 0.0005)),
      l: rp(neckLevel - rand(0.001, 0.002)),   // turtle soup below neckline
      c: rp(neckLevel + rand(0.001, 0.0018)),  // closes back above — trap confirmed
      h: rp(neckLevel + rand(0.002, 0.003)),
    };

    // HTF bullish confirmed — rally
    impulse(candles, neckBreakIdx + 1, 1, 7, 0.0025);

    const zone = { startIdx: neckBreakIdx, endIdx: neckBreakIdx };
    applyNoise(candles, zone, difficulty);

    return {
      candles,
      zone,
      hint: 'A classic bearish Head & Shoulders is visible. But the HTF context is bullish. Find the neckline break that failed — the sell stop raid before the real move up.',
      explanation: 'A False Head & Shoulders forms when a classic bearish H&S appears in a bullish HTF context. Retail sells the neckline break expecting a drop. ICT sees the opposite — the neckline break is a sell stop raid (turtle soup). He buys the raid back above the neckline. Target = right shoulder high, then the head high (where buy stops rest).',
      patternType: 'false-hs-bearish',
    };
  } else {
    // Inverted H&S (bullish retail signal) but HTF is BEARISH
    const candles = baseline(n, start, 1, difficulty);

    // Left shoulder (low)
    impulse(candles, 10, -1, 3, 0.002);
    impulse(candles, 13, 1, 3, 0.002);

    // Head (lower low)
    const headIdx = 18;
    impulse(candles, 16, -1, 3, 0.003);
    candles[headIdx].l = rp(candles[headIdx - 1].l - rand(0.001, 0.002));

    // Rally from head back to neckline
    impulse(candles, headIdx + 1, 1, 4, 0.0022);

    // Right shoulder (higher low)
    impulse(candles, headIdx + 5, -1, 3, 0.0018);
    impulse(candles, headIdx + 8, 1, 3, 0.0015);

    // Neckline breakout above — retail buys (the trap)
    const neckBreakIdx = headIdx + 12;
    const neckLevel = Math.max(...candles.slice(13, neckBreakIdx).map(c => c.h));
    candles[neckBreakIdx] = {
      o: rp(neckLevel - rand(0.0002, 0.0005)),
      h: rp(neckLevel + rand(0.001, 0.002)),   // turtle soup above neckline
      c: rp(neckLevel - rand(0.001, 0.0018)),  // closes back below — trap
      l: rp(neckLevel - rand(0.002, 0.003)),
    };

    // HTF bearish confirmed — collapse
    impulse(candles, neckBreakIdx + 1, -1, 7, 0.0025);

    const zone = { startIdx: neckBreakIdx, endIdx: neckBreakIdx };
    applyNoise(candles, zone, difficulty);

    return {
      candles,
      zone,
      hint: 'A classic bullish Inverted Head & Shoulders is visible. But the HTF context is bearish. Find the neckline breakout that immediately failed — the buy stop raid.',
      explanation: 'A False Inverted Head & Shoulders forms when a classic bullish inverted H&S appears in a bearish HTF context. Retail buys the neckline breakout expecting a rally. ICT sells — the breakout is a buy stop raid (turtle soup). Price collapses after running the stops above the neckline. Target = right shoulder low, then the head low.',
      patternType: 'false-hs-inverted',
    };
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a chart for a given pattern key and difficulty level (1, 2, or 3)
 * Returns: { candles, zone, hint, explanation, label, patternType }
 */
function generatePattern(patternKey, difficulty = 1) {
  const def = PATTERNS[patternKey];
  if (!def) throw new Error(`Unknown pattern: ${patternKey}`);
  const result = def.fn(difficulty);
  return { ...result, label: def.label };
}

/**
 * Get all pattern keys and labels
 */
function getPatternList() {
  return Object.entries(PATTERNS).map(([key, val]) => ({ key, label: val.label }));
}
