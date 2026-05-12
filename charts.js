// ═══════════════════════════════════════════════
//  charts.js — Chart.js Configuration & Factory
// ═══════════════════════════════════════════════

// ═══ NEON COLOR PALETTE ═══
const PAL = {
  teal: '#00f2fe',
  emerald: '#00ff87',
  sky: '#00c6ff',
  indigo: '#6157ff',
  violet: '#b066ff',
  magenta: '#ff00ea',
  pink: '#ff0f7b',
  cyan: '#00f2fe',
  mint: '#0df0a3',
  lavender: '#d498ff',
  coral: '#ff4b4b',
  gold: '#ffd700',
  orange: '#ff6a00'
};

// Curated color sets per chart
const SETS = {
  trend: [PAL.teal, PAL.emerald, PAL.sky, PAL.indigo, PAL.violet, PAL.magenta, PAL.gold],
  type: [PAL.sky, PAL.magenta, PAL.gold, PAL.emerald, PAL.coral, PAL.indigo, PAL.orange, PAL.pink, PAL.mint],
  roadmap: [PAL.sky, PAL.gold, PAL.emerald, PAL.coral],
  dsr: [PAL.emerald, PAL.coral, '#64748b'],
  learning: [PAL.orange, PAL.sky, PAL.magenta, PAL.gold, PAL.emerald, PAL.teal],
};

const GRID_COLOR = 'rgba(100, 130, 180, 0.10)';
const GRID_DASH = [3, 5];

// Chart instance registry
const ci = {};

// ─── Register Plugin ───────────────────────────
Chart.register(ChartDataLabels);

// ─── Global Defaults ───────────────────────────
Chart.defaults.plugins.datalabels = {
  display: false,   // disabled globally; each chart overrides
};

// ─── Theme Sync ────────────────────────────────
function updateChartTheme() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  Chart.defaults.color = isLight ? '#475569' : '#94a3b8';
  Chart.defaults.font.family = "'Kanit', 'Inter', sans-serif";
  Chart.defaults.font.size = 12;

  const tt = Chart.defaults.plugins.tooltip;
  tt.backgroundColor = isLight ? 'rgba(255, 255, 255, 0.85)' : 'rgba(10, 18, 36, 0.75)';
  tt.titleColor = isLight ? '#0ea5e9' : PAL.teal;
  tt.bodyColor = isLight ? '#1e293b' : '#f8fafc';
  tt.padding = 14;
  tt.cornerRadius = 16;
  tt.borderColor = isLight ? 'rgba(148, 163, 184, 0.2)' : 'rgba(255, 255, 255, 0.1)';
  tt.borderWidth = 1;
  tt.displayColors = true;
  tt.boxPadding = 6;
  tt.titleFont = { size: 14, weight: '800', family: "'Kanit'" };
  tt.bodyFont = { size: 13, weight: '500', family: "'Kanit'" };
  // Add backdrop filter via CSS later, or simulate by making background slightly opaque
}

// ─── Gradient Helpers ──────────────────────────
function hexToRgb(hex) {
  if (!hex || !hex.startsWith('#')) {
    // If transparent or invalid, return a safe fallback or extract rgb if possible, but for simplicity:
    return { r: 0, g: 242, b: 254 }; // fallback teal
  }
  const hexClean = hex.replace('#', '');
  const r = parseInt(hexClean.slice(0, 2), 16) || 0;
  const g = parseInt(hexClean.slice(2, 4), 16) || 0;
  const b = parseInt(hexClean.slice(4, 6), 16) || 0;
  return { r, g, b };
}

function makeGradient(ctx, color, area) {
  if (!area) return color;
  const { r, g, b } = hexToRgb(color);
  const grad = ctx.createLinearGradient(0, area.top, 0, area.bottom);
  grad.addColorStop(0, `rgba(${r},${g},${b}, 1)`);
  grad.addColorStop(0.4, `rgba(${r},${g},${b}, 0.82)`);
  grad.addColorStop(0.75, `rgba(${r},${g},${b}, 0.38)`);
  grad.addColorStop(1, `rgba(${r},${g},${b}, 0.08)`);
  return grad;
}

function makeRadialGrad(ctx, color, cx, cy, radius) {
  const { r, g, b } = hexToRgb(color);
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  grad.addColorStop(0, `rgba(${r},${g},${b}, 1)`);
  grad.addColorStop(0.65, `rgba(${r},${g},${b}, 0.88)`);
  grad.addColorStop(1, `rgba(${r},${g},${b}, 0.65)`);
  return grad;
}

// ─── Subtle Shadow Plugin (เงากราฟ) ────────────────────────
// ปลั๊กอินเสริมเพื่อให้กราฟมีมิติ (Drop Shadow) ตอนเรนเดอร์
// ──────────────────────────────────────────────────────────
const shadowPlugin = {
  id: 'shadowPlugin',
  beforeDatasetDraw: (chart) => {
    const { ctx } = chart;
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
  },
  afterDatasetDraw: (chart) => {
    chart.ctx.restore();
  }
};

// ════════════════════════════════════════════════════════════
//  MASTER CHART FACTORY: mc()
//  ฟังก์ชันครอบจักรวาลสำหรับวาดกราฟ ไม่ต้องตั้งค่า Chart.js ซ้ำซาก
//  - id:      ไอดีของ <canvas>
//  - type:    'bar', 'doughnut', 'pie'
//  - labels:  ข้อความแกน X
//  - values:  ข้อมูลตัวเลขแกน Y
//  - opts:    ออปชันเสริม เช่น สี (colors), onClick
// ════════════════════════════════════════════════════════════
function mc(id, type, labels, values, opts = {}) {
  if (ci[id]) {
    try { ci[id].destroy(); } catch (_) { }
    delete ci[id];
  }
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const baseColors = opts.colors || SETS.type;
  const isCircular = type === 'pie' || type === 'doughnut';
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';

  // ── Datalabels config ──────────────────────
  // For bar charts: smart threshold — only show label when bar is ≥ 8% of max value
  const safeValues = values.length ? values.filter(v => typeof v === 'number' && isFinite(v)) : [];
  const maxVal = safeValues.length ? Math.max(...safeValues) : 1;
  const minShow = Math.max(maxVal * 0.08, 1);

  let dl = { display: false }; // default off

  if (type === 'bar') {
    dl = {
      anchor: 'end',
      align: 'top',
      offset: 4,
      clamp: true,   // keep label inside chart area
      clip: false,
      color: (ctx2) => {
        const v = ctx2.dataset.data[ctx2.dataIndex];
        if (v < minShow) return 'transparent';
        return isLight ? '#1e293b' : '#e2e8f0';
      },
      font: { weight: '700', size: 11, family: "'Kanit'" },
      textStrokeWidth: 0,
      display: (ctx2) => {
        const v = ctx2.dataset.data[ctx2.dataIndex];
        return v >= minShow;
      },
      formatter: (v) => {
        if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return v.toLocaleString();
      },
    };
  } else if (isCircular) {
    const total = values.reduce((s, v) => s + v, 0) || 1;
    dl = {
      anchor: 'center',
      align: 'center',
      color: '#fff',
      font: { weight: '800', size: 12, family: "'Kanit'" },
      textStrokeColor: 'rgba(0,0,0,0.3)',
      textStrokeWidth: 2,
      display: (ctx2) => {
        const v = ctx2.dataset.data[ctx2.dataIndex];
        return (v / total) >= 0.05; // only show if slice ≥ 5%
      },
      formatter: (v) => {
        const pct = ((v / total) * 100).toFixed(1);
        return pct + '%';
      },
    };
  }

  const resolveColor = (ctx2) => {
    const chart = ctx2.chart;
    const { ctx, chartArea } = chart;
    if (!chartArea) return 'transparent'; // Wait for layout

    let colorArr = Array.isArray(baseColors) ? baseColors : [baseColors];
    let color = colorArr[ctx2.dataIndex % colorArr.length] || PAL.teal;

    if (type === 'bar') {
      return makeGradient(ctx, color, chartArea);
    } else if (isCircular) {
      const cx = (chartArea.left + chartArea.right) / 2;
      const cy = (chartArea.top + chartArea.bottom) / 2;
      const radius = Math.min(chartArea.right - chartArea.left, chartArea.bottom - chartArea.top) / 2;
      return makeRadialGrad(ctx, color, cx, cy, radius);
    }
    return color;
  };

  // ── X-axis tick formatter (truncate long labels) ──
  const xTickFormatter = (val, idx) => {
    const lbl = String(labels[idx] || '');
    return lbl.length > 14 ? lbl.slice(0, 13) + '…' : lbl;
  };

  // ── Full config ────────────────────────────
  const cfg = {
    type,
    data: {
      labels,
      datasets: [{
        label: opts.label || 'จำนวน',
        data: values,
        backgroundColor: resolveColor,
        borderColor: isCircular
          ? (getComputedStyle(document.documentElement).getPropertyValue('--neu-bg').trim() || '#020617')
          : 'rgba(255,255,255,0.15)',
        borderWidth: isCircular ? 3 : 1.5,
        hoverOffset: isCircular ? 14 : 0,
        borderRadius: type === 'bar' ? 10 : 0,
        borderSkipped: false,
        hoverBackgroundColor: resolveColor,
        hoverBorderWidth: isCircular ? 3 : 2.5,
        hoverBorderColor: isCircular ? '#fff' : 'rgba(255,255,255,0.6)',
      }]
    },
    plugins: [shadowPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1600,
        easing: 'easeOutBack', // Bouncy/Elastic easing so bars overshoot and settle
        animateRotate: true,
        animateScale: true,
        delay: (context) => {
          if (context.type === 'data' && !context.chart._didAnim) {
            return context.dataIndex * 150; // noticeable sequential running effect
          }
          return 0;
        },
        onComplete: (ctx2) => { if (ctx2.chart) ctx2.chart._didAnim = true; }
      },
      // Top padding gives room for bar labels; circular charts get even padding
      layout: {
        padding: type === 'bar'
          ? { top: 36, right: 20, left: 12, bottom: 4 }
          : { top: 12, right: 12, bottom: 12, left: 12 }
      },
      plugins: {
        legend: {
          display: isCircular,
          position: 'bottom',
          labels: {
            padding: 18,
            color: isLight ? '#475569' : '#94a3b8',
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 8,
            font: { size: 11, weight: '600', family: "'Kanit'" }
          }
        },
        datalabels: dl,
        tooltip: {
          usePointStyle: true,
          boxPadding: 6,
          bodySpacing: 6,
          titleSpacing: 6,
        }
      },
      scales: isCircular
        ? { x: { display: false }, y: { display: false } }
        : {
          x: {
            grid: {
              color: opts.indexAxis === 'y'
                ? (isLight ? 'rgba(0,0,0,0.04)' : GRID_COLOR)
                : 'transparent',
              borderDash: GRID_DASH,
              drawBorder: false,
            },
            ticks: {
              color: Chart.defaults.color,
              font: { weight: '600', size: 11 },
              padding: 8,
              maxRotation: 30,
              minRotation: 0,
              callback: opts.indexAxis === 'y' ? undefined : xTickFormatter,
            },
            border: { display: false }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: opts.indexAxis === 'y'
                ? 'transparent'
                : (isLight ? 'rgba(0,0,0,0.04)' : GRID_COLOR),
              borderDash: GRID_DASH,
              drawBorder: false,
            },
            ticks: {
              color: Chart.defaults.color,
              font: { weight: '600', size: 11 },
              padding: 10,
              // Compact large numbers on Y-axis
              callback: (v) => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v,
            },
            border: { display: false }
          }
        },
      ...opts.extra
    }
  };

  if (opts.indexAxis) cfg.options.indexAxis = opts.indexAxis;
  ci[id] = new Chart(ctx, cfg);
}
