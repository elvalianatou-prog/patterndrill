/**
 * patterns.js
 * OHLC data generators for each ICT pattern.
 * Each generator returns: { candles: [...], zone: { startIdx, endIdx }, hint, explanation }
 * Candles: array of { o, h, l, c } — forex-style prices around 1.08xx
 */

const PATTERNS = {
  'order-block':      { label: 'Order Block',      fn: generateOrderBlock },
  'fair-value-gap':   { label: 'Fair Value Gap',   fn: generateFVG },
  'breaker-block':    { label: 'Breaker Block',     fn: generateBreaker },
  'bos':              { label: 'Break of Structure',fn: generateBOS },
  'choch':            { label: 'Change of Character', fn: generateCHoCH },
  'liquidity-sweep':  { label: 'Liquidity Sweep',  fn: generateLiquiditySweep },
  'inducement':       { label: 'Inducement',        fn: generateInducement },
  'rejection-block':  { label: 'Rejection Block',  fn: generateRejectionBlock },
  'ote':              { label: 'OTE Zone',          fn: generateOTE },
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
