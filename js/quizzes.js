/**
 * quizzes.js
 * Quiz-style drills for ICT concepts people confuse most.
 * Two drill formats:
 *   1. IDENTIFY — chart shown, user picks the correct label from buttons
 *   2. LOCATE   — chart shown, user marks a zone AND picks a label
 *
 * Each quiz returns:
 * { candles, correctAnswer, wrongAnswers, question, zone, explanation, format, hint }
 */

// ─── Shared utils (mirrors patterns.js) ──────────────────────────────────────
function qRand(min, max) { return min + Math.random() * (max - min); }
function qRp(n, d = 5)   { return parseFloat(n.toFixed(d)); }

function qBaseline(count, startPrice, direction, difficulty = 1) {
  const candles = [];
  let price = startPrice;
  const trendStrength = difficulty === 1 ? 0.0004 : difficulty === 2 ? 0.0003 : 0.0002;
  const bodySize      = difficulty === 1 ? 0.0010 : difficulty === 2 ? 0.0014 : 0.0018;
  const wickSize      = difficulty === 1 ? 0.0003 : difficulty === 2 ? 0.0009 : 0.0018;
  const counterProb   = difficulty === 1 ? 0.25   : difficulty === 2 ? 0.38   : 0.48;
  for (let i = 0; i < count; i++) {
    const drift  = direction * qRand(trendStrength * 0.3, trendStrength);
    const isBull = Math.random() > (direction === 1 ? counterProb : 1 - counterProb);
    const body   = qRand(bodySize * 0.3, bodySize);
    const o      = price;
    const c      = o + (isBull ? 1 : -1) * body + drift;
    const h      = Math.max(o, c) + qRand(0, wickSize);
    const l      = Math.min(o, c) - qRand(0, wickSize);
    candles.push({ o: qRp(o), h: qRp(h), l: qRp(l), c: qRp(c) });
    price = c;
  }
  return candles;
}

function qImpulse(candles, startIdx, direction, bars = 4, strength = 0.002) {
  let price = candles[startIdx - 1]?.c ?? candles[startIdx]?.o ?? 1.085;
  for (let i = startIdx; i < startIdx + bars && i < candles.length; i++) {
    const body = qRand(strength * 0.8, strength * 1.2);
    const o = price;
    const c = o + direction * body;
    const h = Math.max(o, c) + qRand(0, 0.0003);
    const l = Math.min(o, c) - qRand(0, 0.0003);
    candles[i] = { o: qRp(o), h: qRp(h), l: qRp(l), c: qRp(c) };
    price = c;
  }
}

// ─── Quiz Registry ────────────────────────────────────────────────────────────

const QUIZZES = {
  'bos-vs-choch':       { label: 'BOS vs CHoCH',             fn: quizBOSvsCHoCH,      format: 'identify' },
  'premium-discount':   { label: 'Premium vs Discount',      fn: quizPremiumDiscount, format: 'identify' },
  'ob-type':            { label: 'Bullish vs Bearish OB',    fn: quizOBType,          format: 'identify' },
  'fvg-direction':      { label: 'FVG Direction',            fn: quizFVGDirection,    format: 'identify' },
  'session-id':         { label: 'Identify the Session',     fn: quizSessionID,       format: 'identify' },
  'judas-swing':        { label: 'Judas Swing',              fn: quizJudasSwing,      format: 'locate'   },
  'mss':                { label: 'Market Structure Shift',   fn: quizMSS,             format: 'locate'   },
  'silver-bullet':      { label: 'Silver Bullet Setup',      fn: quizSilverBullet,    format: 'locate'   },
  'turtle-soup':        { label: 'Turtle Soup',              fn: quizTurtleSoup,      format: 'locate'   },
  'pd-array':           { label: 'Identify the PD Array',    fn: quizPDArray,         format: 'identify' },
  'equal-highs-lows':   { label: 'Equal Highs / Equal Lows', fn: quizEqualHL,        format: 'locate'   },
  'ifvg':               { label: 'Inverse FVG',              fn: quizIFVG,            format: 'locate'   },
};

// ─── 1. BOS vs CHoCH — most confused pair ────────────────────────────────────
function quizBOSvsCHoCH(difficulty = 1) {
  const isBOS = Math.random() > 0.5;
  const n = 60;
  const start = 1.0830 + qRand(0, 0.008);

  if (isBOS) {
    // BOS: price is in an uptrend, breaks above a prior swing high (continuation)
    const candles = qBaseline(n, start, 1, difficulty);
    const swingIdx = Math.floor(qRand(14, 20));
    const swingHigh = qRp(candles[swingIdx].h + qRand(0.001, 0.002));
    candles[swingIdx].h = swingHigh;
    // Pullback
    qImpulse(candles, swingIdx + 1, -1, 3, 0.001);
    // BOS — close above swing high, trend continues
    const bosIdx = swingIdx + 5;
    const bosBase = candles[bosIdx - 1]?.c ?? swingHigh - 0.001;
    candles[bosIdx] = { o: qRp(bosBase), c: qRp(swingHigh + 0.002), h: qRp(swingHigh + 0.003), l: qRp(bosBase - 0.0002) };
    qImpulse(candles, bosIdx + 1, 1, 5, 0.0015);

    return {
      candles,
      correctAnswer: 'BOS — Break of Structure',
      wrongAnswers:  ['CHoCH — Change of Character', 'MSS — Market Structure Shift', 'Inducement'],
      question: 'What is this market event called?',
      zone: { startIdx: bosIdx, endIdx: bosIdx },
      hint: 'Look at the trend direction before this candle. Is price continuing or reversing?',
      explanation: 'This is a BOS (Break of Structure). Price was already in an uptrend and broke above a prior swing high — confirming trend continuation. A CHoCH would be the FIRST break AGAINST the prevailing trend.',
    };
  } else {
    // CHoCH: price is in a downtrend, first break upward = change of character
    const candles = qBaseline(n, start, -1, difficulty);
    const chochIdx = Math.floor(qRand(24, 32));
    const priorSwingHigh = qRp(candles[chochIdx - 6]?.h ?? start - 0.002);
    const chBase = candles[chochIdx - 1]?.c ?? start - 0.005;
    candles[chochIdx] = { o: qRp(chBase), c: qRp(priorSwingHigh + 0.0015), h: qRp(priorSwingHigh + 0.002), l: qRp(chBase - 0.0002) };
    qImpulse(candles, chochIdx + 1, 1, 4, 0.0015);

    return {
      candles,
      correctAnswer: 'CHoCH — Change of Character',
      wrongAnswers:  ['BOS — Break of Structure', 'Liquidity Sweep', 'Inducement'],
      question: 'What is this market event called?',
      zone: { startIdx: chochIdx, endIdx: chochIdx },
      hint: 'What was the trend BEFORE this candle? Is this move WITH the trend or against it?',
      explanation: 'This is a CHoCH (Change of Character). Price was in a downtrend and this is the FIRST candle to break above a prior swing high — signaling a potential reversal. A BOS would occur after the CHoCH, once the new uptrend is established.',
    };
  }
}

// ─── 2. Premium vs Discount ───────────────────────────────────────────────────
function quizPremiumDiscount(difficulty = 1) {
  const isPremium = Math.random() > 0.5;
  const n = 60;
  const start = 1.0830 + qRand(0, 0.008);
  const candles = qBaseline(n, start, isPremium ? 1 : -1, difficulty);

  // Mark a clear swing range (dealing range)
  const rangeLow  = Math.min(...candles.slice(5, 20).map(c => c.l));
  const rangeHigh = Math.max(...candles.slice(5, 20).map(c => c.h));
  const mid       = qRp((rangeLow + rangeHigh) / 2);

  // Current price — in premium (above mid) or discount (below mid)
  const currentIdx = 45;
  const targetPrice = isPremium
    ? qRp(mid + (rangeHigh - mid) * qRand(0.55, 0.85))
    : qRp(mid - (mid - rangeLow) * qRand(0.55, 0.85));

  // Force candle at currentIdx to be at target price
  const prev = candles[currentIdx - 1]?.c ?? mid;
  candles[currentIdx] = {
    o: qRp(prev),
    c: targetPrice,
    h: qRp(Math.max(prev, targetPrice) + qRand(0.0003, 0.0008)),
    l: qRp(Math.min(prev, targetPrice) - qRand(0.0003, 0.0008)),
  };

  return {
    candles,
    correctAnswer: isPremium ? 'Premium — price is above equilibrium' : 'Discount — price is below equilibrium',
    wrongAnswers:  isPremium
      ? ['Discount — price is below equilibrium', 'At equilibrium (50%)', 'OTE zone (61.8–79%)']
      : ['Premium — price is above equilibrium', 'At equilibrium (50%)', 'OTE zone (61.8–79%)'],
    question: 'Where is price relative to the dealing range? Premium or Discount?',
    zone: { startIdx: 5, endIdx: 19 }, // highlight the dealing range
    hint: 'Find the most recent swing high and low. Where is price now relative to the 50% midpoint?',
    explanation: isPremium
      ? 'Price is in PREMIUM (above the 50% equilibrium of the dealing range). In ICT, you look to SELL in premium — never buy here unless you have a strong higher-timeframe reason.'
      : 'Price is in DISCOUNT (below the 50% equilibrium of the dealing range). In ICT, you look to BUY in discount — this is where smart money accumulates longs.',
    dealingRange: { low: rangeLow, high: rangeHigh, mid },
  };
}

// ─── 3. Bullish vs Bearish OB ─────────────────────────────────────────────────
function quizOBType(difficulty = 1) {
  const isBullish = Math.random() > 0.5;
  const n = 60;
  const start = 1.0830 + qRand(0, 0.008);
  const candles = qBaseline(n, start, isBullish ? 1 : -1, difficulty);

  const obIdx = Math.floor(qRand(22, 30));
  const base  = candles[obIdx - 1]?.c ?? start;

  if (isBullish) {
    // Bullish OB: last bearish candle before bullish impulse
    candles[obIdx] = { o: qRp(base), c: qRp(base - 0.0025), h: qRp(base + 0.0003), l: qRp(base - 0.003) };
    qImpulse(candles, obIdx + 1, 1, 5, 0.002);
  } else {
    // Bearish OB: last bullish candle before bearish impulse
    candles[obIdx] = { o: qRp(base), c: qRp(base + 0.0025), h: qRp(base + 0.003), l: qRp(base - 0.0003) };
    qImpulse(candles, obIdx + 1, -1, 5, 0.002);
  }

  return {
    candles,
    correctAnswer: isBullish ? 'Bullish Order Block' : 'Bearish Order Block',
    wrongAnswers:  isBullish
      ? ['Bearish Order Block', 'Fair Value Gap', 'Breaker Block']
      : ['Bullish Order Block', 'Fair Value Gap', 'Rejection Block'],
    question: 'What type of Order Block is highlighted?',
    zone: { startIdx: obIdx, endIdx: obIdx },
    hint: 'What direction does price move AFTER the highlighted candle?',
    explanation: isBullish
      ? 'This is a BULLISH Order Block — the last bearish (down-close) candle before a strong bullish impulse. When price returns to this zone, it is a buy opportunity.'
      : 'This is a BEARISH Order Block — the last bullish (up-close) candle before a strong bearish impulse. When price returns to this zone, it is a sell opportunity.',
  };
}

// ─── 4. FVG Direction ─────────────────────────────────────────────────────────
function quizFVGDirection(difficulty = 1) {
  const isBullish = Math.random() > 0.5;
  const n = 60;
  const start = 1.0830 + qRand(0, 0.008);
  const candles = qBaseline(n, start, isBullish ? 1 : -1, difficulty);

  const midIdx = Math.floor(qRand(24, 32));
  const base   = candles[midIdx - 1]?.c ?? start;

  if (isBullish) {
    candles[midIdx - 1] = { o: qRp(base - 0.001), c: qRp(base), h: qRp(base + 0.0005), l: qRp(base - 0.0015) };
    candles[midIdx]     = { o: qRp(base - 0.0003), c: qRp(base + 0.004), h: qRp(base + 0.0045), l: qRp(base - 0.0005) };
    candles[midIdx + 1] = { o: qRp(base + 0.003), c: qRp(base + 0.005), h: qRp(base + 0.006), l: qRp(base + 0.0028) };
  } else {
    candles[midIdx - 1] = { o: qRp(base + 0.001), c: qRp(base), h: qRp(base + 0.0015), l: qRp(base - 0.0005) };
    candles[midIdx]     = { o: qRp(base + 0.0003), c: qRp(base - 0.004), h: qRp(base + 0.0005), l: qRp(base - 0.0045) };
    candles[midIdx + 1] = { o: qRp(base - 0.003), c: qRp(base - 0.005), h: qRp(base - 0.0028), l: qRp(base - 0.006) };
  }

  return {
    candles,
    correctAnswer: isBullish ? 'Bullish FVG — expect price to return and bounce up' : 'Bearish FVG — expect price to return and reject down',
    wrongAnswers:  isBullish
      ? ['Bearish FVG — expect price to return and reject down', 'Order Block', 'Balanced Price Range']
      : ['Bullish FVG — expect price to return and bounce up', 'Order Block', 'Rejection Block'],
    question: 'What type of Fair Value Gap is this, and what do you expect when price returns to it?',
    zone: { startIdx: midIdx - 1, endIdx: midIdx + 1 },
    hint: 'Which direction did the impulse candle move? That tells you the FVG type.',
    explanation: isBullish
      ? 'BULLISH FVG: the gap was created by upward displacement. The zone between candle 1\'s high and candle 3\'s low is unfilled. When price returns, expect a bullish reaction.'
      : 'BEARISH FVG: the gap was created by downward displacement. The zone between candle 1\'s low and candle 3\'s high is unfilled. When price returns, expect a bearish reaction.',
  };
}

// ─── 5. Session Identification ────────────────────────────────────────────────
function quizSessionID(difficulty = 1) {
  const sessions = [
    {
      name: 'Asian Session',
      desc: 'Low volatility, tight range, price consolidates. Often sets up the high/low that London will sweep.',
      pattern: 'range',
    },
    {
      name: 'London Kill Zone',
      desc: 'High volatility open. Often sweeps Asian session highs or lows (Judas Swing) before the true direction.',
      pattern: 'sweep-then-trend',
    },
    {
      name: 'New York Kill Zone',
      desc: 'Second major volatility spike. Often continues London\'s direction or reverses it with a NY open manipulation.',
      pattern: 'impulse',
    },
    {
      name: 'London Close',
      desc: 'Lower volume. Price often retraces some of the London/NY move. Fewer setups, avoid overtrading here.',
      pattern: 'retrace',
    },
  ];

  const picked = sessions[Math.floor(Math.random() * sessions.length)];
  const n = 50;
  const start = 1.0830 + qRand(0, 0.008);
  let candles;

  if (picked.pattern === 'range') {
    candles = qBaseline(n, start, 0, difficulty);
    // Make it tight / sideways
    for (let i = 10; i < 40; i++) {
      const o = qRp(start + qRand(-0.0008, 0.0008));
      const c = qRp(start + qRand(-0.0008, 0.0008));
      candles[i] = { o, c, h: qRp(Math.max(o,c) + qRand(0.0001, 0.0004)), l: qRp(Math.min(o,c) - qRand(0.0001, 0.0004)) };
    }
  } else if (picked.pattern === 'sweep-then-trend') {
    candles = qBaseline(n, start, 0, difficulty);
    // Range then spike up (Judas) then real move down
    const sweepIdx = 20;
    candles[sweepIdx] = { o: qRp(start), h: qRp(start + 0.003), c: qRp(start - 0.001), l: qRp(start - 0.0015) };
    qImpulse(candles, sweepIdx + 1, -1, 8, 0.002);
  } else if (picked.pattern === 'impulse') {
    candles = qBaseline(n, start, 1, difficulty);
    qImpulse(candles, 15, 1, 10, 0.002);
  } else {
    candles = qBaseline(n, start, -1, difficulty);
    qImpulse(candles, 10, 1, 6, 0.001); // retrace
  }

  const wrongSessions = sessions.filter(s => s.name !== picked.name).map(s => s.name);

  return {
    candles,
    correctAnswer: picked.name,
    wrongAnswers:  wrongSessions,
    question: 'Based on the price behaviour, which trading session does this chart most likely represent?',
    zone: null,
    hint: 'Look at the volatility and structure of the move. Is price ranging, sweeping then reversing, or in a strong directional push?',
    explanation: `This is the ${picked.name}. ${picked.desc}`,
  };
}

// ─── 6. Judas Swing — locate ──────────────────────────────────────────────────
function quizJudasSwing(difficulty = 1) {
  const n = 60;
  const start = 1.0840 + qRand(0, 0.006);
  const candles = qBaseline(n, start, 0, difficulty);

  // Range first (Asian session simulation)
  for (let i = 5; i <= 20; i++) {
    const o = qRp(start + qRand(-0.001, 0.001));
    const c = qRp(start + qRand(-0.001, 0.001));
    candles[i] = { o, c, h: qRp(Math.max(o,c) + qRand(0.0001, 0.0005)), l: qRp(Math.min(o,c) - qRand(0.0001, 0.0005)) };
  }

  // Asian high
  const asianHigh = Math.max(...candles.slice(5, 21).map(c => c.h));

  // Judas swing — fake spike ABOVE asian high, then reversal
  const judasIdx = 22;
  candles[judasIdx] = {
    o: qRp(start),
    h: qRp(asianHigh + qRand(0.0015, 0.003)), // above asian high
    c: qRp(start - qRand(0.001, 0.002)),
    l: qRp(start - qRand(0.002, 0.003)),
  };

  // Real move down after Judas
  qImpulse(candles, judasIdx + 1, -1, 8, 0.002);

  return {
    candles,
    correctAnswer: 'Judas Swing',
    wrongAnswers: ['Break of Structure', 'Liquidity Sweep', 'CHoCH'],
    question: 'Mark the Judas Swing candle.',
    zone: { startIdx: judasIdx, endIdx: judasIdx },
    hint: 'Find where price made a false move above the Asian session range before reversing hard.',
    explanation: 'The Judas Swing is the false directional move at the start of the London session that traps breakout traders. It sweeps the Asian session high (or low), triggers stop orders, then reverses into the true session direction.',
  };
}

// ─── 7. Market Structure Shift (MSS) ─────────────────────────────────────────
function quizMSS(difficulty = 1) {
  const n = 60;
  const start = 1.0850 + qRand(0, 0.006);
  const candles = qBaseline(n, start, -1, difficulty);

  // Downtrend with lower highs and lower lows
  qImpulse(candles, 8,  -1, 4, 0.002);
  qImpulse(candles, 15, -1, 4, 0.002);

  // MSS: candle that breaks above the most recent lower high on a LOWER timeframe
  const mssIdx = 28;
  const priorLH = qRp(candles[22]?.h ?? start - 0.003);
  const mssBase = candles[mssIdx - 1]?.c ?? priorLH - 0.002;
  candles[mssIdx] = {
    o: qRp(mssBase),
    c: qRp(priorLH + qRand(0.001, 0.002)),
    h: qRp(priorLH + qRand(0.002, 0.003)),
    l: qRp(mssBase - 0.0003),
  };
  qImpulse(candles, mssIdx + 1, 1, 5, 0.0018);

  return {
    candles,
    correctAnswer: 'Market Structure Shift (MSS)',
    wrongAnswers: ['Break of Structure (BOS)', 'CHoCH', 'Inducement'],
    question: 'Mark the candle that represents a Market Structure Shift.',
    zone: { startIdx: mssIdx, endIdx: mssIdx },
    hint: 'In a downtrend, find the first candle to break above a prior lower high — but on a smaller scale than a full CHoCH.',
    explanation: 'An MSS (Market Structure Shift) is a lower-timeframe version of CHoCH. It\'s the first candle that breaks the most recent swing high in a downtrend (or swing low in an uptrend), signaling a potential shift. It\'s often the trigger candle traders use for entry.',
  };
}

// ─── 8. Silver Bullet Setup ───────────────────────────────────────────────────
function quizSilverBullet(difficulty = 1) {
  const n = 60;
  const start = 1.0830 + qRand(0, 0.008);
  const candles = qBaseline(n, start, 1, difficulty);

  // Silver Bullet: 10:00–11:00 NY — FVG forms after a sweep, then price fills it
  // Simulate: sweep of a low, then FVG up, then entry on FVG fill
  const sweepIdx = 20;
  const priorLow = Math.min(...candles.slice(5, 20).map(c => c.l));
  candles[sweepIdx] = {
    o: qRp(candles[sweepIdx - 1].c),
    l: qRp(priorLow - qRand(0.001, 0.002)),
    c: qRp(candles[sweepIdx - 1].c + qRand(0.001, 0.002)),
    h: qRp(candles[sweepIdx - 1].c + qRand(0.002, 0.003)),
  };

  // FVG up
  const fvgIdx = sweepIdx + 1;
  candles[fvgIdx]     = { o: qRp(candles[sweepIdx].c), c: qRp(candles[sweepIdx].c + 0.003), h: qRp(candles[sweepIdx].c + 0.0035), l: qRp(candles[sweepIdx].c - 0.0003) };
  candles[fvgIdx + 1] = { o: qRp(candles[fvgIdx].c + 0.001), c: qRp(candles[fvgIdx].c + 0.003), h: qRp(candles[fvgIdx].c + 0.004), l: qRp(candles[fvgIdx].c + 0.0008) };
  candles[fvgIdx + 2] = { o: qRp(candles[fvgIdx+1].c), c: qRp(candles[fvgIdx+1].c + 0.002), h: qRp(candles[fvgIdx+1].c + 0.003), l: qRp(candles[fvgIdx+1].c - 0.0002) };

  qImpulse(candles, fvgIdx + 3, 1, 6, 0.002);

  return {
    candles,
    correctAnswer: 'Silver Bullet Setup',
    wrongAnswers: ['OTE Entry', 'Breaker Block Entry', 'Judas Swing'],
    question: 'Mark the Silver Bullet entry zone (the FVG created after the liquidity sweep).',
    zone: { startIdx: fvgIdx, endIdx: fvgIdx + 1 },
    hint: 'Find the FVG created immediately after the liquidity sweep during the NY morning window (10:00–11:00).',
    explanation: 'The Silver Bullet is ICT\'s time-based setup: between 10:00–11:00 NY time, look for a liquidity sweep followed by a displacement that leaves an FVG. Enter on the FVG retracement. It\'s one of ICT\'s highest-probability intraday setups.',
  };
}

// ─── 9. Turtle Soup ───────────────────────────────────────────────────────────
function quizTurtleSoup(difficulty = 1) {
  const n = 60;
  const start = 1.0840 + qRand(0, 0.006);
  const candles = qBaseline(n, start, -1, difficulty);

  // Equal lows as the turtle soup target
  const eqLow = qRp(Math.min(...candles.slice(8, 20).map(c => c.l)) - 0.001);
  candles[12].l = eqLow;
  candles[17].l = qRp(eqLow + qRand(-0.0001, 0.0001));

  // Turtle Soup: price breaks below equal lows (triggering breakout sellers)
  // then immediately reverses — trapping the breakout traders
  const tsIdx = 28;
  candles[tsIdx] = {
    o: qRp(candles[tsIdx - 1].c),
    l: qRp(eqLow - qRand(0.001, 0.002)), // breaks below equal lows
    c: qRp(candles[tsIdx - 1].c + qRand(0.001, 0.002)), // closes back ABOVE
    h: qRp(candles[tsIdx - 1].c + qRand(0.002, 0.003)),
  };
  qImpulse(candles, tsIdx + 1, 1, 6, 0.002);

  return {
    candles,
    correctAnswer: 'Turtle Soup — false breakdown reversal',
    wrongAnswers: ['Genuine Bearish BOS', 'CHoCH', 'Liquidity Sweep Entry'],
    question: 'What does this candle represent?',
    zone: { startIdx: tsIdx, endIdx: tsIdx },
    hint: 'Look at the prior equal lows. Did this candle break them — and then what happened next?',
    explanation: 'Turtle Soup is a stop-hunt reversal. Price breaks below well-established equal lows (triggering breakout sellers and stop losses), then immediately closes back above, leaving a long wick. This traps sellers and signals a bullish reversal. The "turtle" traders who shorted the breakdown are now trapped.',
  };
}

// ─── 10. PD Array Identification ─────────────────────────────────────────────
function quizPDArray(difficulty = 1) {
  const arrays = [
    { name: 'Order Block', gen: () => genPDOrderBlock() },
    { name: 'Fair Value Gap', gen: () => genPDFVG() },
    { name: 'Breaker Block', gen: () => genPDBreaker() },
    { name: 'Rejection Block', gen: () => genPDRejection() },
  ];

  const picked = arrays[Math.floor(Math.random() * arrays.length)];
  const { candles, zone } = picked.gen();
  const wrongArrays = arrays.filter(a => a.name !== picked.name).map(a => a.name);

  return {
    candles,
    correctAnswer: picked.name,
    wrongAnswers: wrongArrays,
    question: 'What PD Array is highlighted?',
    zone,
    hint: 'Study the candle structure inside the highlighted zone. What makes this zone significant?',
    explanation: getPDExplanation(picked.name),
  };
}

function genPDOrderBlock() {
  const n = 60; const start = 1.0830 + qRand(0, 0.008);
  const candles = qBaseline(n, start, -1, 1);
  const idx = 26;
  const base = candles[idx-1].c;
  candles[idx] = { o: qRp(base), c: qRp(base+0.002), h: qRp(base+0.0025), l: qRp(base-0.0002) };
  qImpulse(candles, idx+1, -1, 5, 0.002);
  return { candles, zone: { startIdx: idx, endIdx: idx } };
}
function genPDFVG() {
  const n = 60; const start = 1.0830 + qRand(0, 0.008);
  const candles = qBaseline(n, start, 1, 1);
  const idx = 27;
  const base = candles[idx-1].c;
  candles[idx-1] = { o: qRp(base-0.001), c: qRp(base), h: qRp(base+0.0004), l: qRp(base-0.0014) };
  candles[idx]   = { o: qRp(base-0.0002), c: qRp(base+0.004), h: qRp(base+0.0045), l: qRp(base-0.0004) };
  candles[idx+1] = { o: qRp(base+0.003), c: qRp(base+0.005), h: qRp(base+0.006), l: qRp(base+0.0028) };
  return { candles, zone: { startIdx: idx-1, endIdx: idx+1 } };
}
function genPDBreaker() {
  const n = 60; const start = 1.0840 + qRand(0, 0.006);
  const candles = qBaseline(n, start, 1, 1);
  const idx = 22;
  const base = candles[idx-1].c;
  candles[idx] = { o: qRp(base), c: qRp(base+0.002), h: qRp(base+0.0025), l: qRp(base-0.0002) };
  qImpulse(candles, idx+1, 1, 3, 0.001);
  qImpulse(candles, idx+4, -1, 6, 0.0025); // breaks through OB
  qImpulse(candles, idx+10, 1, 4, 0.001);  // returns to zone as resistance
  return { candles, zone: { startIdx: idx, endIdx: idx+1 } };
}
function genPDRejection() {
  const n = 60; const start = 1.0840 + qRand(0, 0.006);
  const candles = qBaseline(n, start, 1, 1);
  const idx = 28;
  const base = candles[idx-1].c;
  candles[idx] = { o: qRp(base), c: qRp(base-0.0008), h: qRp(base+0.004), l: qRp(base-0.001) };
  qImpulse(candles, idx+1, -1, 5, 0.002);
  return { candles, zone: { startIdx: idx, endIdx: idx } };
}
function getPDExplanation(name) {
  const e = {
    'Order Block': 'An Order Block is the last opposing candle before an impulsive move. The highlighted candle is the last bullish close before bearish displacement — institutional supply zone.',
    'Fair Value Gap': 'A Fair Value Gap (3-candle imbalance) is highlighted. The gap between candle 1\'s high and candle 3\'s low was never filled — price moved too fast, leaving an imbalance.',
    'Breaker Block': 'A Breaker Block is a failed Order Block that flipped polarity. The original OB failed when price broke through it; now that same zone acts as resistance.',
    'Rejection Block': 'A Rejection Block is identified by the long upper wick — price was aggressively rejected at this level. The wick shows sellers overwhelmed buyers at this zone.',
  };
  return e[name] || '';
}

// ─── 11. Equal Highs / Equal Lows ────────────────────────────────────────────
function quizEqualHL(difficulty = 1) {
  const isHighs = Math.random() > 0.5;
  const n = 60;
  const start = 1.0830 + qRand(0, 0.008);
  const candles = qBaseline(n, start, isHighs ? 1 : -1, difficulty);

  const level = isHighs
    ? qRp(Math.max(...candles.slice(10,25).map(c=>c.h)) + qRand(0.001, 0.002))
    : qRp(Math.min(...candles.slice(10,25).map(c=>c.l)) - qRand(0.001, 0.002));

  // Place two equal highs/lows
  const idx1 = 18, idx2 = 26;
  if (isHighs) {
    candles[idx1].h = level; candles[idx1].c = qRp(level - qRand(0.001,0.002));
    candles[idx2].h = qRp(level + qRand(-0.0001, 0.0001));
    candles[idx2].c = qRp(level - qRand(0.001,0.002));
  } else {
    candles[idx1].l = level; candles[idx1].c = qRp(level + qRand(0.001,0.002));
    candles[idx2].l = qRp(level + qRand(-0.0001, 0.0001));
    candles[idx2].c = qRp(level + qRand(0.001,0.002));
  }

  return {
    candles,
    correctAnswer: isHighs ? 'Equal Highs — buy-side liquidity resting above' : 'Equal Lows — sell-side liquidity resting below',
    wrongAnswers: isHighs
      ? ['Equal Lows — sell-side liquidity', 'Double Top — reversal signal', 'Resistance Zone']
      : ['Equal Highs — buy-side liquidity', 'Double Bottom — reversal signal', 'Support Zone'],
    question: 'What is the liquidity situation at the highlighted level?',
    zone: { startIdx: idx1, endIdx: idx2 },
    hint: 'Look for two swing points at approximately the same price level. Where are the stop orders sitting?',
    explanation: isHighs
      ? 'Equal Highs represent BUY-SIDE LIQUIDITY. Retail traders place stops above swing highs, and equal highs are even more obvious targets. Smart money will likely sweep above this level before reversing.'
      : 'Equal Lows represent SELL-SIDE LIQUIDITY. Retail stop losses cluster below swing lows — equal lows are a magnet for smart money to sweep before reversing.',
  };
}

// ─── 12. Inverse FVG ──────────────────────────────────────────────────────────
function quizIFVG(difficulty = 1) {
  const n = 60;
  const start = 1.0830 + qRand(0, 0.008);
  const candles = qBaseline(n, start, -1, difficulty);

  // Original bullish FVG
  const fvgIdx = 18;
  const base = candles[fvgIdx-1].c;
  candles[fvgIdx-1] = { o: qRp(base-0.001), c: qRp(base), h: qRp(base+0.0004), l: qRp(base-0.0014) };
  candles[fvgIdx]   = { o: qRp(base-0.0002), c: qRp(base+0.004), h: qRp(base+0.0045), l: qRp(base-0.0004) };
  candles[fvgIdx+1] = { o: qRp(base+0.003), c: qRp(base+0.005), h: qRp(base+0.006), l: qRp(base+0.0028) };

  // Price returns to FVG... and FAILS — breaks through it (FVG becomes IFVG)
  qImpulse(candles, fvgIdx+2, 1, 3, 0.001);
  qImpulse(candles, fvgIdx+5, -1, 6, 0.003); // breaks back through the FVG
  qImpulse(candles, fvgIdx+12, -1, 4, 0.0015);

  return {
    candles,
    correctAnswer: 'Inverse FVG — original FVG failed, now acts as resistance',
    wrongAnswers: ['Bullish FVG — still valid, expect bounce', 'Breaker Block', 'Order Block'],
    question: 'The highlighted zone was originally a Bullish FVG. What has it become after price broke through it?',
    zone: { startIdx: fvgIdx-1, endIdx: fvgIdx+1 },
    hint: 'Did price respect the FVG and bounce — or did it break through the zone completely?',
    explanation: 'An Inverse FVG (IFVG) forms when price breaks through a Fair Value Gap instead of bouncing from it. The failed FVG flips polarity — it now acts as RESISTANCE (if bullish FVG fails) or SUPPORT (if bearish FVG fails). Same concept as a breaker block, applied to FVGs.',
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

function generateQuiz(quizKey, difficulty = 1) {
  const def = QUIZZES[quizKey];
  if (!def) throw new Error(`Unknown quiz: ${quizKey}`);
  const result = def.fn(difficulty);
  // Shuffle answer options
  const allAnswers = [result.correctAnswer, ...result.wrongAnswers].sort(() => Math.random() - 0.5);
  return { ...result, allAnswers, format: def.format, label: def.label };
}

function getQuizList() {
  return Object.entries(QUIZZES).map(([key, val]) => ({ key, label: val.label, format: val.format }));
}
