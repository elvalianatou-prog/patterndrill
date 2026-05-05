/**
 * scoring.js
 * Scoring logic for pattern identification attempts.
 * Compares user mark (startIdx, endIdx) against answer zone.
 *
 * Usage:
 *   const result = scoreAttempt(userMark, answerZone, patternLabel);
 *   // result: { grade, iou, message, color }
 */

/**
 * Score a user's mark against the correct zone.
 *
 * @param {{ startIdx: number, endIdx: number }} userMark
 * @param {{ startIdx: number, endIdx: number }} answerZone
 * @param {string} patternLabel  - e.g. "Order Block"
 * @returns {{ grade: string, iou: number, message: string, color: string, correct: boolean }}
 */
function scoreAttempt(userMark, answerZone, patternLabel) {
  if (!userMark) {
    return {
      grade:   'no-mark',
      iou:     0,
      correct: false,
      color:   '#888780',
      message: `No mark placed. The correct zone is highlighted in blue. Study the structure there before trying again.`,
    };
  }

  const iou = calcIoU(userMark, answerZone);
  const pct = Math.round(iou * 100);

  if (iou >= 0.6) {
    return {
      grade:   'excellent',
      iou,
      correct: true,
      color:   '#1D9E75',
      message: `Excellent — ${pct}% overlap. You nailed the ${patternLabel}. That's the precision you need in a live chart.`,
    };
  }

  if (iou >= 0.35) {
    return {
      grade:   'good',
      iou,
      correct: true,
      color:   '#1D9E75',
      message: `Good — ${pct}% overlap. You identified the right zone for the ${patternLabel}. Tighten your selection for higher precision.`,
    };
  }

  if (iou >= 0.15) {
    return {
      grade:   'partial',
      iou,
      correct: false,
      color:   '#BA7517',
      message: `Close — ${pct}% overlap. You found nearby structure but the ${patternLabel} zone is slightly different. Check the blue box carefully.`,
    };
  }

  if (iou > 0) {
    return {
      grade:   'miss',
      iou,
      correct: false,
      color:   '#D85A30',
      message: `Near miss — only ${pct}% overlap. Your mark was in the wrong area. The ${patternLabel} is shown in blue — study that candle structure.`,
    };
  }

  return {
    grade:   'wrong',
    iou:     0,
    correct: false,
    color:   '#D85A30',
    message: `Missed. Your mark didn't overlap the ${patternLabel} zone at all. Review the blue zone and try another chart.`,
  };
}

/**
 * Intersection over Union for two candle index ranges.
 * Both ranges are inclusive [startIdx, endIdx].
 */
function calcIoU(a, b) {
  const interStart = Math.max(a.startIdx, b.startIdx);
  const interEnd   = Math.min(a.endIdx,   b.endIdx);
  const inter      = Math.max(0, interEnd - interStart + 1);

  if (inter === 0) return 0;

  const aLen    = a.endIdx - a.startIdx + 1;
  const bLen    = b.endIdx - b.startIdx + 1;
  const union   = aLen + bLen - inter;

  return inter / union;
}

/**
 * Aggregate session stats across all attempts.
 *
 * @param {Array<{ patternKey, correct, iou, difficulty, timestamp }>} attempts
 * @returns {{ total, correct, accuracy, byPattern, byDifficulty, streak, bestStreak }}
 */
function calcStats(attempts) {
  if (!attempts.length) {
    return { total: 0, correct: 0, accuracy: 0, byPattern: {}, byDifficulty: {}, streak: 0, bestStreak: 0 };
  }

  let streak     = 0;
  let bestStreak = 0;
  let cur        = 0;

  const byPattern    = {};
  const byDifficulty = { 1: { total: 0, correct: 0 }, 2: { total: 0, correct: 0 }, 3: { total: 0, correct: 0 } };

  for (let i = attempts.length - 1; i >= 0; i--) {
    const a = attempts[i];
    if (a.correct) { cur++; bestStreak = Math.max(bestStreak, cur); }
    else cur = 0;
    if (i === attempts.length - 1) streak = cur;
  }
  // Recalc streak from end correctly
  streak = 0;
  for (let i = attempts.length - 1; i >= 0; i--) {
    if (attempts[i].correct) streak++;
    else break;
  }

  attempts.forEach(a => {
    // By pattern
    if (!byPattern[a.patternKey]) byPattern[a.patternKey] = { total: 0, correct: 0, label: a.patternLabel || a.patternKey };
    byPattern[a.patternKey].total++;
    if (a.correct) byPattern[a.patternKey].correct++;

    // By difficulty
    const d = a.difficulty || 1;
    if (byDifficulty[d]) {
      byDifficulty[d].total++;
      if (a.correct) byDifficulty[d].correct++;
    }
  });

  const correct  = attempts.filter(a => a.correct).length;
  const accuracy = Math.round((correct / attempts.length) * 100);

  return { total: attempts.length, correct, accuracy, byPattern, byDifficulty, streak, bestStreak };
}

/**
 * Returns an array of { patternKey, label, accuracy } sorted worst-first.
 * Useful for surfacing weak spots.
 */
function weakSpots(byPattern) {
  return Object.entries(byPattern)
    .filter(([, v]) => v.total >= 3)
    .map(([key, v]) => ({
      patternKey: key,
      label:      v.label,
      accuracy:   Math.round((v.correct / v.total) * 100),
      total:      v.total,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);
}
