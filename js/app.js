/**
 * app.js
 * Main controller for the drill screen.
 * Wires together: pattern selection, chart rendering, mark mode, scoring, storage.
 */

const App = (() => {
  // ─── State ────────────────────────────────────────────────────────────────
  let state = {
    patternKey:  null,
    difficulty:  1,
    candles:     [],
    zone:        null,
    hint:        '',
    explanation: '',
    patternLabel:'',
    userMark:    null,
    markStart:   null,
    markMode:    false,
    revealed:    false,
    sessionStats:{ correct: 0, attempts: 0, streak: 0 },
  };

  // ─── DOM refs ─────────────────────────────────────────────────────────────
  let chart, els;

  function init() {
    els = {
      chartWrap:    document.getElementById('chart-wrap'),
      chartLoader:  document.getElementById('chart-loader'),
      chartEmpty:   document.getElementById('chart-empty'),
      hintText:     document.getElementById('hint-text'),
      feedback:     document.getElementById('feedback'),
      btnMark:      document.getElementById('btn-mark'),
      btnReveal:    document.getElementById('btn-reveal'),
      btnClear:     document.getElementById('btn-clear'),
      btnNext:      document.getElementById('btn-next'),
      scCorrect:    document.getElementById('sc-correct'),
      scAttempts:   document.getElementById('sc-attempts'),
      scAccuracy:   document.getElementById('sc-accuracy'),
      scStreak:     document.getElementById('sc-streak'),
    };

    chart = new CandleChart('chart-canvas', 'overlay-canvas');

    // Restore prefs
    const prefs = Storage.getPrefs();
    if (prefs.patternKey)  selectPattern(prefs.patternKey, false);
    if (prefs.difficulty)  selectDifficulty(prefs.difficulty, false);

    // Bind pattern chips
    document.querySelectorAll('.pattern-chip').forEach(chip => {
      chip.addEventListener('click', () => selectPattern(chip.dataset.key));
    });

    // Bind difficulty chips
    document.querySelectorAll('.diff-chip').forEach(chip => {
      chip.addEventListener('click', () => selectDifficulty(parseInt(chip.dataset.diff)));
    });

    // Bind overlay for marking
    const overlay = document.getElementById('overlay-canvas');
    overlay.addEventListener('mousedown',  onMouseDown);
    overlay.addEventListener('mousemove',  onMouseMove);
    overlay.addEventListener('mouseup',    onMouseUp);
    overlay.addEventListener('mouseleave', onMouseLeave);

    // Touch support
    overlay.addEventListener('touchstart',  e => onMouseDown(e.touches[0]), { passive: true });
    overlay.addEventListener('touchmove',   e => { e.preventDefault(); onMouseMove(e.touches[0]); }, { passive: false });
    overlay.addEventListener('touchend',    e => onMouseUp(e.changedTouches[0]));

    updateScoreRow();
  }

  // ─── Pattern & difficulty selection ───────────────────────────────────────

  function selectPattern(key, generate = true) {
    state.patternKey = key;
    document.querySelectorAll('.pattern-chip').forEach(c => {
      c.classList.toggle('selected', c.dataset.key === key);
    });
    Storage.savePrefs({ patternKey: key });
    if (generate) generateChart();
  }

  function selectDifficulty(diff, generate = false) {
    state.difficulty = diff;
    document.querySelectorAll('.diff-chip').forEach(c => {
      c.classList.toggle('selected', parseInt(c.dataset.diff) === diff);
    });
    Storage.savePrefs({ difficulty: diff });
    if (generate && state.patternKey) generateChart();
  }

  // ─── Chart generation ─────────────────────────────────────────────────────

  async function generateChart() {
    if (!state.patternKey) return;

    // Reset
    state.userMark  = null;
    state.markStart = null;
    state.markMode  = false;
    state.revealed  = false;
    setMarkMode(false);
    hideFeedback();

    // Show loader
    els.chartLoader.classList.add('visible');
    els.chartEmpty  && (els.chartEmpty.style.display = 'none');
    setControlsEnabled(false);

    // Small delay so loader renders before heavy JS
    await new Promise(r => setTimeout(r, 60));

    try {
      const result = generatePattern(state.patternKey, state.difficulty);
      state.candles      = result.candles;
      state.zone         = result.zone;
      state.hint         = result.hint;
      state.explanation  = result.explanation;
      state.patternLabel = result.label;

      chart.load(result.candles);
      els.hintText.textContent = result.hint;
    } catch (e) {
      console.error('Pattern generation failed:', e);
      els.hintText.textContent = 'Error generating chart. Try again.';
    }

    els.chartLoader.classList.remove('visible');
    setControlsEnabled(true);
  }

  // ─── Mark mode ────────────────────────────────────────────────────────────

  function toggleMarkMode() {
    setMarkMode(!state.markMode);
  }

  function setMarkMode(on) {
    state.markMode = on;
    const overlay = document.getElementById('overlay-canvas');
    overlay.style.cursor = on ? 'col-resize' : 'default';
    els.btnMark.textContent = on ? '✕ cancel mark' : '[ mark zone ]';
    els.btnMark.classList.toggle('btn-mark-active', on);
  }

  // ─── Mouse/touch handlers ─────────────────────────────────────────────────

  function onMouseDown(e) {
    if (!state.markMode || !state.candles.length) return;
    state.markStart = chart.xToIndex(e.clientX);
  }

  function onMouseMove(e) {
    if (!state.markMode || state.markStart === null) return;
    const cur = chart.xToIndex(e.clientX);
    chart.clearOverlay();
    if (state.revealed && state.zone) chart.drawZone(state.zone, 'answer');
    chart.drawDragPreview(state.markStart, cur);
  }

  function onMouseUp(e) {
    if (!state.markMode || state.markStart === null) return;
    const cur = chart.xToIndex(e.clientX);
    state.userMark  = { startIdx: Math.min(state.markStart, cur), endIdx: Math.max(state.markStart, cur) };
    state.markStart = null;
    setMarkMode(false);

    chart.clearOverlay();
    if (state.revealed && state.zone) chart.drawZone(state.zone, 'answer');
    chart.drawZone(state.userMark, 'user');
  }

  function onMouseLeave() {
    if (state.markMode && state.markStart !== null) {
      state.markStart = null;
      chart.clearOverlay();
      if (state.revealed && state.zone) chart.drawZone(state.zone, 'answer');
      if (state.userMark) chart.drawZone(state.userMark, 'user');
    }
  }

  // ─── Reveal ───────────────────────────────────────────────────────────────

  function reveal() {
    if (!state.zone || !state.candles.length) return;
    state.revealed = true;
    setMarkMode(false);

    // Score
    const result = scoreAttempt(state.userMark, state.zone, state.patternLabel);

    // Update session stats
    state.sessionStats.attempts++;
    if (result.correct) {
      state.sessionStats.correct++;
      state.sessionStats.streak++;
    } else {
      state.sessionStats.streak = 0;
    }

    // Persist
    Storage.saveAttempt({
      patternKey:   state.patternKey,
      patternLabel: state.patternLabel,
      correct:      result.correct,
      iou:          result.iou,
      grade:        result.grade,
      difficulty:   state.difficulty,
    });

    // Draw zones
    chart.clearOverlay();
    chart.drawZone(state.zone, 'answer');
    if (state.userMark) chart.drawZone(state.userMark, 'user');

    // Show feedback
    showFeedback(result);
    updateScoreRow();
  }

  // ─── Clear mark ───────────────────────────────────────────────────────────

  function clearMark() {
    state.userMark  = null;
    state.markStart = null;
    setMarkMode(false);
    hideFeedback();
    chart.clearOverlay();
    if (state.revealed && state.zone) chart.drawZone(state.zone, 'answer');
  }

  // ─── UI helpers ───────────────────────────────────────────────────────────

  function showFeedback(result) {
    const fb = els.feedback;
    fb.className = `feedback visible grade-${result.grade}`;
    fb.textContent = result.message;
    if (state.explanation && result.grade !== 'no-mark') {
      fb.textContent += ' — ' + state.explanation;
    }
  }

  function hideFeedback() {
    els.feedback.className = 'feedback';
  }

  function setControlsEnabled(on) {
    [els.btnMark, els.btnReveal, els.btnClear, els.btnNext].forEach(b => {
      if (b) b.disabled = !on;
    });
  }

  function updateScoreRow() {
    const { correct, attempts, streak } = state.sessionStats;
    const acc = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;
    els.scCorrect.querySelector('.val').textContent  = correct;
    els.scAttempts.querySelector('.val').textContent = attempts;
    els.scAccuracy.querySelector('.val').textContent = attempts > 0 ? `${acc}%` : '—';
    els.scStreak.querySelector('.val').textContent   = streak;
    els.scStreak.classList.toggle('streak-on', streak >= 3);
  }

  // ─── Public ───────────────────────────────────────────────────────────────
  return { init, selectPattern, selectDifficulty, generateChart, toggleMarkMode, reveal, clearMark };
})();

document.addEventListener('DOMContentLoaded', App.init);
