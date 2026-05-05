/**
 * chart.js
 * Candlestick chart renderer using HTML5 Canvas.
 * Handles: drawing candles, grid, price labels, zone overlays, user marks.
 *
 * Usage:
 *   const chart = new CandleChart('chart-canvas', 'overlay-canvas');
 *   chart.load(candles);
 *   chart.drawZone({ startIdx, endIdx }, 'user');   // 'user' | 'answer'
 *   chart.clear();
 */

class CandleChart {
  constructor(chartCanvasId, overlayCanvasId) {
    this.chart   = document.getElementById(chartCanvasId);
    this.overlay = document.getElementById(overlayCanvasId);
    this.ctx     = this.chart.getContext('2d');
    this.octx    = this.overlay.getContext('2d');

    this.candles = [];
    this.pad     = { l: 8, r: 68, t: 14, b: 28 };

    this._bindResize();
  }

  // ─── Load & Draw ──────────────────────────────────────────────────────────

  load(candles) {
    this.candles = candles;
    this.clearOverlay();
    this.draw();
  }

  draw() {
    if (!this.candles.length) return;
    const { ctx, pad } = this;
    const { W, H, toY, cw, bw, minP, maxP } = this._layout();

    ctx.clearRect(0, 0, W, H);

    this._drawGrid(toY, minP, maxP, W, H, pad);
    this._drawCandles(toY, cw, bw, pad);
  }

  _drawGrid(toY, minP, maxP, W, H, pad) {
    const { ctx } = this;
    const steps   = 5;
    const isDark  = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const gridCol = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const textCol = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';

    for (let i = 0; i <= steps; i++) {
      const p = minP + (maxP - minP) * (i / steps);
      const y = toY(p);

      ctx.beginPath();
      ctx.strokeStyle = gridCol;
      ctx.lineWidth   = 0.5;
      ctx.moveTo(pad.l, y);
      ctx.lineTo(W - pad.r + 4, y);
      ctx.stroke();

      ctx.fillStyle = textCol;
      ctx.font      = '10px monospace';
      ctx.fillText(p.toFixed(4), W - pad.r + 8, y + 3);
    }
  }

  _drawCandles(toY, cw, bw, pad) {
    const { ctx, candles } = this;

    candles.forEach((c, i) => {
      const isBull = c.c >= c.o;
      const col    = isBull ? '#1D9E75' : '#D85A30';
      const cx     = pad.l + i * cw + cw / 2;
      const x0     = pad.l + i * cw + (cw - bw) / 2;

      // Wick
      ctx.strokeStyle = col;
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(cx, toY(c.h));
      ctx.lineTo(cx, toY(c.l));
      ctx.stroke();

      // Body
      const top = toY(Math.max(c.o, c.c));
      const bot = toY(Math.min(c.o, c.c));
      ctx.fillStyle = col;
      ctx.fillRect(x0, top, Math.max(1, bw), Math.max(1, bot - top));
    });
  }

  // ─── Overlay ──────────────────────────────────────────────────────────────

  /**
   * Draw a highlight zone.
   * type: 'user' (amber) | 'answer' (blue) | { fill, stroke, label } for custom
   */
  drawZone(zone, type = 'user') {
    const { octx, pad } = this;
    const { W, H, cw } = this._layout();

    const presets = {
      user:   { fill: 'rgba(186,117,23,0.13)',  stroke: '#BA7517', label: 'YOUR MARK' },
      answer: { fill: 'rgba(55,138,221,0.15)',  stroke: '#378ADD', label: 'PATTERN ZONE' },
    };
    const s  = (typeof type === 'object') ? type : (presets[type] ?? presets.user);
    const x1 = pad.l + zone.startIdx * cw;
    const x2 = pad.l + (zone.endIdx + 1) * cw;
    const h  = H - pad.t - pad.b;

    octx.fillStyle   = s.fill;
    octx.fillRect(x1, pad.t, x2 - x1, h);
    octx.strokeStyle = s.stroke;
    octx.lineWidth   = 1.5;
    octx.strokeRect(x1, pad.t, x2 - x1, h);
    octx.fillStyle   = s.stroke;
    octx.font        = 'bold 10px monospace';
    octx.fillText(s.label || '', x1 + 4, pad.t + 12);
  }

  /**
   * Draw a user drag zone with a specific color (for combo mode)
   */
  drawColorZone(zone, colorDef, label = 'MARK') {
    this.drawZone(zone, { fill: colorDef.fill, stroke: colorDef.stroke, label });
  }

  /**
   * Draw a live drag preview (amber dashed)
   */
  drawDragPreview(startIdx, endIdx) {
    this.clearOverlay();
    const { octx, pad } = this;
    const { cw, H } = this._layout();

    const s  = Math.min(startIdx, endIdx);
    const e  = Math.max(startIdx, endIdx);
    const x1 = pad.l + s * cw;
    const x2 = pad.l + (e + 1) * cw;
    const h  = H - pad.t - pad.b;

    octx.fillStyle   = 'rgba(186,117,23,0.1)';
    octx.fillRect(x1, pad.t, x2 - x1, h);
    octx.setLineDash([4, 3]);
    octx.strokeStyle = '#BA7517';
    octx.lineWidth   = 1.5;
    octx.strokeRect(x1, pad.t, x2 - x1, h);
    octx.setLineDash([]);
  }

  clearOverlay() {
    const { W, H } = this._layout();
    this.octx.clearRect(0, 0, W, H);
  }

  // ─── Interaction helpers ───────────────────────────────────────────────────

  /**
   * Convert a mouse clientX to a candle index
   */
  xToIndex(clientX) {
    const rect = this.chart.getBoundingClientRect();
    const { pad, candles } = this;
    const { cw } = this._layout();
    const x = (clientX - rect.left) * (this.chart.width / rect.width);
    return Math.max(0, Math.min(candles.length - 1, Math.floor((x - pad.l) / cw)));
  }

  // ─── Layout ───────────────────────────────────────────────────────────────

  _layout() {
    const W = this.chart.width;
    const H = this.chart.height;
    const { pad, candles } = this;
    const n  = candles.length || 1;
    const cw = (W - pad.l - pad.r) / n;
    const bw = Math.max(1, cw * 0.65);

    const prices = candles.flatMap(c => [c.h, c.l]);
    const minP   = prices.length ? Math.min(...prices) : 0;
    const maxP   = prices.length ? Math.max(...prices) : 1;
    const rng    = maxP - minP || 0.001;
    const cH     = H - pad.t - pad.b;
    const toY    = p => pad.t + cH * (1 - (p - minP) / rng);

    return { W, H, cw, bw, minP, maxP, rng, cH, toY };
  }

  // ─── Resize ───────────────────────────────────────────────────────────────

  resize(w, h) {
    this.chart.width        = w;
    this.chart.height       = h;
    this.overlay.width      = w;
    this.overlay.height     = h;
    this.draw();
  }

  _bindResize() {
    const ro = new ResizeObserver(() => {
      const w = this.chart.parentElement.clientWidth;
      const h = this.chart.parentElement.clientHeight;
      if (w > 0 && h > 0) this.resize(w, h);
    });
    ro.observe(this.chart.parentElement);
  }
}
