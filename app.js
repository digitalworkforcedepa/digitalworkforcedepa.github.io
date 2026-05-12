// ═══════════════════════════════════════════════
//  app.js — Data Fetching, Filters, Rendering
//  + Export Excel, Data Link, Section Visibility
//  + Data Cache/Save, Refresh, Dynamic Title
//  + Real-Time Live Clock (Date & Time)
// ═══════════════════════════════════════════════

// ── Default: Fallback URL (เว้นว่างไว้เพื่อความปลอดภัย บังคับใช้ Backend เป็นหลัก)
const DEFAULT_API_URL = '';
let currentApiUrl = DEFAULT_API_URL;  // ผู้ใช้สามารถตั้งค่าแหล่งข้อมูลใหม่ได้ผ่าน UI

let rawData = [];
let filteredData = [];
let globalKeys = {};

// ═══ BACKEND STATE ═══
let backendOnline = false; // จะถูก update ตอน init

// ═══ CACHE KEYS ═══
const CACHE_KEY_DATA = 'app-cached-data';
const CACHE_KEY_TIME = 'app-cached-time';
const CACHE_KEY_SOURCES = 'app-data-sources';
const CACHE_KEY_URL = 'app-api-url';
const CACHE_KEY_THEME = 'app-theme';
const CACHE_KEY_VIS = 'app-visibility';

// ═══ DATA SOURCES MANAGER ═══
let dataSources = [];
let swiperGallery = null;

// ═══ COLUMN → HEADING MAPPING ═══
const COLUMN_META = {
  "Year": { label: null, icon: "trending-up" },
  "Type": { label: null, icon: "pie-chart" },
  "DSR (Yes/No)": { label: null, icon: "check-circle" },
  "Digital_Skill_Roadmap หมวด": { label: null, icon: "map" },
  "Learning Method": { label: null, icon: "book-open" },
  "Field": { label: null, icon: "briefcase" },
  "Department": { label: null, icon: "building-2" },
};

// ═══ SECTION DEFINITIONS (for visibility toggles) ═══
const SECTIONS = [
  { id: 'overview', label: 'ภาพรวม', icon: 'layout-dashboard' },
  { id: 'analysis', label: 'วิเคราะห์เชิงลึก', icon: 'bar-chart-2' },
  { id: 'breakdown', label: 'รายละเอียด', icon: 'layers' },
];

// ════════════════════════════════════════════════════════════════════════════
//  DASHLIB ALIASES — เชื่อมฟังก์ชันจาก dashboard-lib.js
//  (ทำให้ app.js สามารถเรียกใช้ฟังก์ชันเหล่านี้ได้โดยตรงเหมือนเป็นฟังก์ชันของตัวเอง)
// ════════════════════════════════════════════════════════════════════════════
const uniq = DashLib.uniq;                // หาค่าที่ไม่ซ้ำใน Array
const group = DashLib.group;               // จัดกลุ่มและนับจำนวนข้อมูล
const animateValue = DashLib.animateValue;        // ทำแอนิเมชันตัวเลขวิ่งขึ้น
const showToast = DashLib.showToast;           // แสดงแจ้งเตือนมุมขวาล่าง
const openModal = DashLib.openModal;           // เปิด Popup Modal
const closeModal = DashLib.closeModal;          // ปิด Popup Modal
const initModals = DashLib.initModals;          // ผูก Event ให้ปุ่มปิด Modal ทุกปุ่ม
const normalizeData = DashLib.normalizeData;       // แปลงชื่อคอลัมน์ TH/EN ให้เป็นคีย์มาตรฐาน
const parseGoogleSheetUrl = DashLib.parseGoogleSheetUrl; // แปลง Link Google Sheet เป็น gviz URL
const parseGvizJson = DashLib.parseGvizJson;       // แปลงข้อมูลแปลกๆ จาก gviz เป็น JSON ปกติ
const smartFetch = DashLib.smartFetch;          // ตัวช่วย Fetch ข้อมูลครอบจักรวาล
const initScrollHeader = DashLib.initScrollHeader;    // ทำให้ Header มีเงาเวลาเลื่อนจอ
const startLiveClock = DashLib.startLiveClock;      // นาฬิกาและวันที่มุมขวาบน
const initLiquidParallax = DashLib.initLiquidParallax;  // แอนิเมชันพื้นหลังขยับตามการเลื่อนจอ
const initCursorGlow = DashLib.initCursorGlow;      // แสงไฟวิ่งตามเมาส์
const initRippleEffect = DashLib.initRippleEffect;    // เอฟเฟกต์คลื่นน้ำเวลากดปุ่ม
const initMagneticHover = DashLib.initMagneticHover;   // การ์ดเอียง 3 มิติเวลาเอาเมาส์ชี้
const triggerCardStagger = DashLib.triggerCardStagger;  // แอนิเมชันการ์ดเด้งขึ้นมาทีละใบ
const triggerKpiPulse = DashLib.triggerKpiPulse;     // แอนิเมชันตัวเลข KPI เด้ง
const initRevealAnimations = DashLib.initRevealAnimations; // แอนิเมชันเฟดอินเวลาเลื่อนจอลงมาเจอ
const initClickToCopy = DashLib.initClickToCopy;     // กดที่ตัวเลข KPI เพื่อก๊อปปี้


// ════════════════════════════════════════════════════════════════════════════
//  BACKEND INTEGRATION
//  ตรวจสอบและแสดงสถานะ Backend API ใน header badge
// ════════════════════════════════════════════════════════════════════════════
async function probeBackend() {
  if (typeof DashAPI === 'undefined') { backendOnline = false; return; }
  const badge = document.getElementById('backendBadge');
  const badgeText = document.getElementById('backendBadgeText');
  try {
    backendOnline = await DashAPI.isOnline();
  } catch (_) {
    backendOnline = false;
  }
  if (badge) {
    badge.style.display = backendOnline ? '' : 'none';
    badge.title = backendOnline
      ? `Backend API พร้อมใช้งาน (${DashAPI.BASE_URL})`
      : 'Backend API ออฟไลน์';
    badge.classList.toggle('backend-online', backendOnline);
    badge.classList.toggle('backend-offline', !backendOnline);
  }
  if (badgeText) badgeText.textContent = backendOnline ? 'API ✓' : 'API ✕';
  console.log(`[Backend] ${backendOnline ? '✅ Online' : '❌ Offline'} — ${DashAPI.BASE_URL}`);
  return backendOnline;
}

// ═══════════════════════════════════════════════
//  DYNAMIC DASHBOARD TITLE
// ═══════════════════════════════════════════════
function updateDashboardTitle(data) {
  if (!data || data.length === 0) return;

  const titleEl = document.getElementById('dashTitle');
  const subtitleEl = document.getElementById('dashSubtitle');

  const projectNames = [...new Set(data.map(d => d.Project_Name || d.Sheet_Name || d.sheet_name).filter(Boolean))];
  const years = [...new Set(data.map(d => d.Year).filter(Boolean))].sort();
  const total = data.length.toLocaleString();

  if (titleEl) {
    titleEl.innerHTML = `<i data-lucide="activity" style="color:var(--teal); width:28px; height:28px; vertical-align:middle; margin-right:8px; margin-top:-4px"></i> Empowering Thailand's Digital Workforce`;
  }

  if (subtitleEl) {
    let yearText = '';
    if (years.length === 1) yearText = `ปี ${years[0]}`;
    else if (years.length > 1) yearText = `ปี ${years[0]}–${years[years.length - 1]}`;

    const currentSrc = dataSources.find(s => s.url === currentApiUrl);
    const sourceName = currentSrc ? currentSrc.name : 'Custom Dataset';

    let html = '';
    html += `<span class="dash-proj" style="color: var(--teal);"><i data-lucide="database" style="width:14px; height:14px; vertical-align:middle; margin-right:4px;"></i>${sourceName}</span> <span class="dash-stats" style="margin-left: 8px;">— ${total} รายการ`;
    if (yearText) html += ` · ${yearText}`;
    html += `</span>`;
    subtitleEl.innerHTML = html;
  }
  lucide.createIcons();
}

// ═══════════════════════════════════════════════
//  TITLE PARALLAX (single definition)
// ═══════════════════════════════════════════════
let _parallaxInitialized = false;
function initTitleParallax() {
  if (_parallaxInitialized) return;
  _parallaxInitialized = true;
  const title = document.getElementById('dashTitle');
  if (!title) return;
  document.addEventListener('mousemove', (e) => {
    const x = (window.innerWidth / 2 - e.pageX) / 60;
    const y = (window.innerHeight / 2 - e.pageY) / 60;
    title.style.transform = `translateX(${x}px) translateY(${y}px)`;
  });
}

// ═══════════════════════════════════════════════
//  THEME
// ═══════════════════════════════════════════════
function initTheme() {
  const saved = DashLib.loadTheme(CACHE_KEY_THEME);
  updateThemeIcon(saved);
  updateChartTheme();
  const toggleFn = () => {
    const next = DashLib.toggleTheme(CACHE_KEY_THEME);
    updateThemeIcon(next);
    updateChartTheme();
    if (rawData && rawData.length) applyFilters();
  };
  document.getElementById('themeToggleBtnHeader')?.addEventListener('click', toggleFn);
}

function updateThemeIcon(theme) {
  const iconHtmlSmall = theme === 'dark' ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';

  // legacy sidebar button (may not exist)
  const btn = document.getElementById('themeToggleBtn');
  if (btn) btn.innerHTML = theme === 'dark'
    ? '<i data-lucide="sun"></i><span>Theme</span>'
    : '<i data-lucide="moon"></i><span>Theme</span>';

  const btnHeader = document.getElementById('themeToggleBtnHeader');
  if (btnHeader) btnHeader.innerHTML = iconHtmlSmall;

  lucide.createIcons();
}

// initScrollHeader — aliased to DashLib.initScrollHeader
// startLiveClock   — aliased to DashLib.startLiveClock
// initUIScaling / applyFontSize — delegated to DashLib.initFontSizeControl()

// ═══════════════════════════════════════════════
//  FILTERS
// ═══════════════════════════════════════════════
function initFilters() {
  if (!rawData || rawData.length === 0) return;

  globalKeys.project = [...new Set(rawData.map(d => d.Project_Name || d.Sheet_Name || d.sheet_name).filter(Boolean))].sort();
  const b = (a, d) => `<option value="">${d}</option>` + (a || []).map(v => `<option value="${v}">${v}</option>`).join('');

  const pf = document.getElementById('projectFilter');
  if (pf) pf.innerHTML = b(globalKeys.project, 'ทุกโครงการ');

  const yf = document.getElementById('yearFilter');
  if (yf) yf.innerHTML = b(globalKeys.year, 'ทุกปี');

  const tf = document.getElementById('typeFilter');
  if (tf) tf.innerHTML = b(globalKeys.type, 'ทุกประเภท');

  const mf = document.getElementById('methodFilter');
  if (mf) mf.innerHTML = b(globalKeys.method, 'ทุกรูปแบบ');

  const df = document.getElementById('deptFilter');
  if (df) df.innerHTML = b(globalKeys.dept, 'ทุกหน่วยงาน');

  // Only attach listeners once
  if (!window._filtersInitialized) {
    ['projectFilter', 'yearFilter', 'typeFilter', 'methodFilter', 'deptFilter'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', applyFilters);
    });
    window._filtersInitialized = true;
  }
}

function getFilteredData() {
  let d = rawData;
  const pf = document.getElementById('projectFilter');
  const p = pf ? pf.value : '';
  const y = document.getElementById('yearFilter')?.value || '';
  const t = document.getElementById('typeFilter')?.value || '';
  const m = document.getElementById('methodFilter')?.value || '';
  const dp = document.getElementById('deptFilter')?.value || '';

  if (p) d = d.filter(i => (i.Project_Name || i.Sheet_Name || i.sheet_name) === p);
  if (y) d = d.filter(i => i.Year == y || (!i.Year && y === 'ไม่ระบุ'));
  if (t) d = d.filter(i => i.Type == t || (!i.Type && t === 'ไม่ระบุ'));
  if (m) d = d.filter(i => i.Method == m || (!i.Method && m === 'ไม่ระบุ'));
  if (dp) d = d.filter(i => i.Department == dp || (!i.Department && dp === 'ไม่ระบุ'));
  return d;
}

function applyFilters() {
  filteredData = getFilteredData();
  document.getElementById('drillDownContainer')?.classList.add('hidden');

  document.querySelectorAll('.card').forEach((c, idx) => {
    c.style.animation = 'none';
    void c.offsetWidth;
    c.style.animation = `popIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) ${idx * 0.06}s both`;
  });

  render(filteredData);
}

// ═══════════════════════════════════════════════
//  DYNAMIC SECTION/CARD HEADING UPDATE
// ═══════════════════════════════════════════════
function updateHeadingsFromData(data) {
  const isEmpty = !data || data.length === 0;
  const columns = isEmpty ? [] : Object.keys(data[0]);

  function findColumn(pattern) {
    if (isEmpty) return '—';
    return columns.find(c => c === pattern) || pattern;
  }

  // Update section headings
  const secOverview = document.getElementById('secOverview');
  if (secOverview) {
    const overviewCols = [findColumn('Year'), findColumn('Type')].filter(c => c !== '—');
    secOverview.innerHTML = `<div class="sec-dot"></div> <i data-lucide="layout-dashboard"></i> ${overviewCols.length > 0 ? overviewCols.join(' / ') : 'ภาพรวม'}`;
  }

  const secAnalysis = document.getElementById('secAnalysis');
  if (secAnalysis) {
    const analysisCols = [findColumn('DSR (Yes/No)'), findColumn('Digital_Skill_Roadmap หมวด'), findColumn('Learning Method')].filter(c => c !== '—');
    secAnalysis.innerHTML = `<div class="sec-dot"></div> <i data-lucide="bar-chart-2"></i> ${analysisCols.length > 0 ? analysisCols.join(' / ') : 'การวิเคราะห์เชิงลึก'}`;
  }

  const secBreakdown = document.getElementById('secBreakdown');
  if (secBreakdown) {
    const breakdownCols = [findColumn('Field'), findColumn('Department')].filter(c => c !== '—');
    secBreakdown.innerHTML = `<div class="sec-dot"></div> <i data-lucide="layers"></i> ${breakdownCols.length > 0 ? breakdownCols.join(' / ') : 'รายละเอียด'}`;
  }

  // Update card titles
  const cardMap = {
    'cardTrend': findColumn('Year'),
    'cardType': findColumn('Type'),
    'cardDsr': findColumn('DSR (Yes/No)'),
    'cardRoadmap': findColumn('Digital_Skill_Roadmap หมวด'),
    'cardLearning': findColumn('Learning Method'),
    'cardField': findColumn('Field'),
    'cardDept': findColumn('Department'),
  };

  const iconMap = {
    'cardTrend': 'trending-up',
    'cardType': 'pie-chart',
    'cardDsr': 'check-circle',
    'cardRoadmap': 'map',
    'cardLearning': 'book-open',
    'cardField': 'briefcase',
    'cardDept': 'building-2',
  };

  Object.entries(cardMap).forEach(([cardId, colName]) => {
    const el = document.getElementById(cardId);
    if (el) {
      const titleEl = el.querySelector('.card-title');
      if (titleEl) {
        const icon = iconMap[cardId] || 'bar-chart-2';
        titleEl.innerHTML = `<i data-lucide="${icon}"></i> ${colName}`;
      }
    }
  });

  // Update filter labels
  const filterMap = {
    'labelYear': findColumn('Year'),
    'labelType': findColumn('Type'),
    'labelMethod': findColumn('Method'),
    'labelDept': findColumn('Department'),
  };

  Object.entries(filterMap).forEach(([labelId, colName]) => {
    const el = document.getElementById(labelId);
    if (el) {
      el.textContent = (colName === '—') ? el.getAttribute('data-orig-text') || colName : colName;
    }
  });

  // Update visibility section labels
  SECTIONS[0].label = `ภาพรวม (${[findColumn('Year'), findColumn('Type')].filter(c => c !== '—').join(' / ') || '...'})`;
  SECTIONS[1].label = `วิเคราะห์เชิงลึก (${[findColumn('DSR (Yes/No)'), findColumn('Digital_Skill_Roadmap หมวด'), findColumn('Learning Method')].filter(c => c !== '—').join(' / ') || '...'})`;
  SECTIONS[2].label = `รายละเอียด (${[findColumn('Field'), findColumn('Department')].filter(c => c !== '—').join(' / ') || '...'})`;

  updateDashboardTitle(data);
  lucide.createIcons();
}

// ═══════════════════════════════════════════════
//  CORE RENDER FUNCTION
//  ฟังก์ชันหลักสำหรับวาดกราฟทั้งหมดบน Dashboard
//  จะถูกเรียกทุกครั้งที่มีการโหลดข้อมูลใหม่ หรือมีการเปลี่ยน Filter
// ═══════════════════════════════════════════════
function render(data) {
  const DURATION = 1500;
  animateValue('valTotal', data.length, DURATION);
  animateValue('valDsrYes', data.filter(d => d["DSR (Yes/No)"] === "Yes").length, DURATION);
  animateValue('valProjects', new Set(data.map(d => d.Project_Name).filter(Boolean)).size, DURATION);

  // Handle empty state gracefully
  document.querySelectorAll('.empty-data').forEach(e => e.remove());
  if (data.length === 0) {
    const emptyHtml = `<div class="empty-data fade-up fade-d1"><i data-lucide="inbox"></i> ไม่มีข้อมูลสำหรับตัวกรองนี้</div>`;
    document.querySelectorAll('.chart-box').forEach(box => {
      box.insertAdjacentHTML('beforeend', emptyHtml);
    });
    lucide.createIcons();
    ['canvasTrend', 'canvasType', 'canvasDsr', 'canvasRoadmap', 'canvasLearning', 'canvasField', 'canvasDept'].forEach(id => {
      mc(id, 'bar', [], [], { colors: 'transparent' });
    });
    return;
  }

  const tG = group(data, "Year", globalKeys.year);
  Object.keys(tG).forEach(k => { if (tG[k] === 0) delete tG[k]; });
  const tC = Object.keys(tG).map((_, i) => SETS.trend[i % SETS.trend.length]);
  mc('canvasTrend', 'bar', Object.keys(tG), Object.values(tG), { colors: tC });

  const tyG = group(data, "Type", globalKeys.type);
  const tyC = Object.keys(tyG).map((_, i) => SETS.type[i % SETS.type.length]);
  mc('canvasType', 'bar', Object.keys(tyG), Object.values(tyG), {
    colors: tyC,
    extra: {
      onClick: (e, els) => {
        if (els.length) {
          const lbl = Object.keys(tyG)[els[0].index];
          drillDown(data.filter(d => d.Type == lbl || (!d.Type && lbl === 'ไม่ระบุ')), lbl);
        }
      },
      onHover: (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; }
    }
  });

  const dsG = group(data, "DSR (Yes/No)", globalKeys.dsr);
  mc('canvasDsr', 'doughnut', Object.keys(dsG), Object.values(dsG), { colors: SETS.dsr });

  const rmCats = [
    { label: "Digital Skill\nfor All", kw: ["ทุกคน", "for All"] },
    { label: "Digital-driven\nCareer", kw: ["ยุคใหม่", "driven"] },
    { label: "Digital\nProfessional", kw: ["ด้านดิจิทัล", "Professional"] },
    { label: "อื่น ๆ", kw: ["อื่น", "ไม่อยู่ใน", "Other"] }
  ];
  const rmG = {}; rmCats.forEach(c => rmG[c.label] = 0);
  data.forEach(d => {
    let v = d["Digital_Skill_Roadmap หมวด"];
    if (v && typeof v === 'string') {
      let ok = false;
      rmCats.forEach(c => { if (c.kw.some(k => v.includes(k))) { rmG[c.label]++; ok = true; } });
      if (!ok && v.trim() && v.trim() !== '-') rmG["อื่น ๆ"]++;
    }
  });
  mc('canvasRoadmap', 'bar', Object.keys(rmG), Object.values(rmG), { colors: SETS.roadmap });

  const lG = group(data, "Learning Method", globalKeys.learning);
  mc('canvasLearning', 'pie', Object.keys(lG), Object.values(lG), { colors: SETS.learning });

  const fG = group(data, "Field", globalKeys.field);
  mc('canvasField', 'bar', Object.keys(fG), Object.values(fG), {
    colors: Object.keys(fG).map((_, i) => SETS.trend[i % SETS.trend.length])
  });

  const dG = group(data, "Department", globalKeys.dept);
  mc('canvasDept', 'bar', Object.keys(dG), Object.values(dG), {
    colors: Object.keys(dG).map((_, i) => SETS.learning[i % SETS.learning.length])
  });
}

// ═══════════════════════════════════════════════
//  DRILL DOWN (เจาะลึกข้อมูล)
//  ทำงานเมื่อผู้ใช้คลิกที่แท่งกราฟของ "Type" 
//  เพื่อแสดงรายละเอียดสายงาน (Field) ของ Type นั้นๆ
// ═══════════════════════════════════════════════
function drillDown(fData, typeLabel) {
  const c = document.getElementById('drillDownContainer');
  const t = document.getElementById('drillTitle');
  if (!c || !t) return;
  c.classList.remove('hidden');

  c.style.animation = 'none';
  c.offsetHeight;
  c.style.animation = 'fadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards';

  t.innerHTML = `<div class="card-title"><i data-lucide="target"></i> รายละเอียดแยกตามสายงาน <span style="color:var(--teal);margin-left:6px">(${typeLabel})</span></div>
    <button id="closeDrillBtn">&times;</button>`;
  lucide.createIcons();
  document.getElementById('closeDrillBtn').addEventListener('click', () => c.classList.add('hidden'));
  const fg = group(fData, "Field", globalKeys.field);
  mc('canvasDrill', 'bar', Object.keys(fg), Object.values(fg), { colors: PAL.cyan });
  setTimeout(() => c.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

// ════════════════════════════════════════════════
//  DATA CACHE — delegated to DashLib
// ════════════════════════════════════════════════
function saveDataToCache(data) {
  return DashLib.saveCache(data, CACHE_KEY_DATA, CACHE_KEY_TIME);
}
function loadDataFromCache() {
  return DashLib.loadCache(CACHE_KEY_DATA, CACHE_KEY_TIME);
}
function clearDataCache() {
  DashLib.clearCache(CACHE_KEY_DATA, CACHE_KEY_TIME);
  updateCacheInfoBar();
  showToast('ลบข้อมูลที่บันทึกแล้ว', 'trash-2');
}
function formatCacheTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const timeStr = d.toLocaleString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  return `${timeStr} (${DashLib.formatRelativeTime(isoStr)})`;
}

function updateCacheInfoBar() {
  const bar = document.getElementById('cacheInfoBar');
  const statusText = document.getElementById('cacheStatusText');
  const timeEl = document.getElementById('cacheTimestamp');
  if (!bar || !statusText || !timeEl) return;

  const cached = loadDataFromCache();

  if (cached) {
    bar.classList.remove('hidden');
    const size = (localStorage.getItem(CACHE_KEY_DATA) || '').length;
    const sizeKB = (size / 1024).toFixed(1);
    statusText.innerHTML = `<span class="cache-source">💾 บันทึกแล้ว</span> — ${cached.data.length.toLocaleString()} รายการ (${sizeKB} KB)`;
    timeEl.textContent = `🕐 ${formatCacheTime(cached.time)}`;
  } else {
    bar.classList.add('hidden');
  }
  lucide.createIcons();
}

// ════════════════════════════════════════════════
//  FEATURE: EXPORT TO EXCEL
// ════════════════════════════════════════════════
function initExport() {
  const btnExportHeader = document.getElementById('btnExportHeader');

  const handleExportClick = () => {
    buildExportColumnList();
    openModal('modalExport');
  };

  if (btnExportHeader) btnExportHeader.addEventListener('click', handleExportClick);

  const selectAllBtn = document.getElementById('exportSelectAll');
  const deselectAllBtn = document.getElementById('exportDeselectAll');
  const doExportBtn = document.getElementById('exportDoExport');

  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      document.querySelectorAll('#modalExport input[type="checkbox"]').forEach(cb => cb.checked = true);
    });
  }

  if (deselectAllBtn) {
    deselectAllBtn.addEventListener('click', () => {
      document.querySelectorAll('#modalExport input[type="checkbox"]').forEach(cb => cb.checked = false);
    });
  }

  if (doExportBtn) {
    doExportBtn.addEventListener('click', doExportExcel);
  }
}

function buildExportColumnList() {
  const container = document.getElementById('exportColumnsList');
  if (!container) return;
  if (!rawData || rawData.length === 0) {
    container.innerHTML = '<p style="color:var(--text-dim)">ไม่มีข้อมูล</p>';
    return;
  }

  const columns = Object.keys(rawData[0]);
  container.innerHTML = columns.map((col, idx) =>
    `<label class="col-check">
      <input type="checkbox" value="${col}" checked data-col-idx="${idx}">
      <span class="col-name" title="${col}">${col}</span>
    </label>`
  ).join('');
}

function doExportExcel() {
  const checked = [...document.querySelectorAll('#modalExport input[type="checkbox"]:checked')].map(cb => cb.value);

  if (checked.length === 0) {
    showToast('กรุณาเลือกอย่างน้อย 1 คอลัมน์', 'alert-circle');
    return;
  }

  const dataToExport = filteredData.length ? filteredData : rawData;

  const exportRows = dataToExport.map(row => {
    const obj = {};
    checked.forEach(col => {
      obj[col] = row[col] !== undefined ? row[col] : '';
    });
    return obj;
  });

  const ws = XLSX.utils.json_to_sheet(exportRows);

  const colWidths = checked.map(col => {
    const maxLen = Math.max(
      col.length,
      ...dataToExport.map(r => String(r[col] || '').length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = `Dashboard_Export_${dateStr}_${timeStr}.xlsx`;

  XLSX.writeFile(wb, filename);
  closeModal('modalExport');
  showToast(`📥 Export ${dataToExport.length.toLocaleString()} รายการสำเร็จ`, 'download');
}

// ════════════════════════════════════════════════
//  FEATURE: SECTION VISIBILITY TOGGLES
// ════════════════════════════════════════════════
function initVisibility() {
  const container = document.getElementById('visibilityList');
  if (!container) return;

  // Load saved state
  let savedVis = {};
  try {
    const saved = localStorage.getItem(CACHE_KEY_VIS);
    if (saved) savedVis = JSON.parse(saved);
  } catch (e) { /* ignore */ }

  container.innerHTML = SECTIONS.map(sec => {
    const isVisible = savedVis[sec.id] !== false; // default visible
    return `<div class="visibility-chip ${isVisible ? 'active' : ''}" data-section-toggle="${sec.id}">
      <i data-lucide="${sec.icon}"></i>
      <span>${sec.label}</span>
    </div>`;
  }).join('');

  lucide.createIcons();

  // Apply initial state
  SECTIONS.forEach(sec => {
    const isVisible = savedVis[sec.id] !== false;
    const sectionEl = document.querySelector(`[data-section-id="${sec.id}"]`);
    if (sectionEl) {
      sectionEl.classList.toggle('section-hidden', !isVisible);
    }
  });

  // Click handlers
  container.querySelectorAll('.visibility-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const secId = chip.dataset.sectionToggle;
      chip.classList.toggle('active');
      const isNowVisible = chip.classList.contains('active');

      const sectionEl = document.querySelector(`[data-section-id="${secId}"]`);
      if (sectionEl) {
        sectionEl.classList.toggle('section-hidden', !isNowVisible);
      }

      // Save state
      const state = {};
      container.querySelectorAll('.visibility-chip').forEach(c => {
        state[c.dataset.sectionToggle] = c.classList.contains('active');
      });
      localStorage.setItem(CACHE_KEY_VIS, JSON.stringify(state));
    });
  });
}

// ════════════════════════════════════════════════
//  FEATURE: DATA GALLERY (SWIPER)
// ════════════════════════════════════════════════
function initDataSources() {
  const saved = localStorage.getItem(CACHE_KEY_SOURCES);
  if (saved) {
    try {
      dataSources = JSON.parse(saved);
      // Migrate: remove stale Apps Script URLs that no longer work
      // Remove stale Apps Script URLs and Blob URLs (blob: expires on page reload)
      dataSources = dataSources.filter(s =>
        !s.url.includes('script.google.com/a/macros/horwang') &&
        !s.url.startsWith('blob:')
      );
    } catch (e) {
      dataSources = [];
    }
  }

  // Ensure we always have the default Google Sheet entry
  if (!dataSources.some(s => s.isDefault)) {
    dataSources.unshift({
      id: 'src_default',
      name: "ฐานข้อมูล อบรม (Google Sheet)",
      url: DEFAULT_API_URL,
      isDefault: true
    });
    saveDataSources();
  }
}

function saveDataSources() {
  localStorage.setItem(CACHE_KEY_SOURCES, JSON.stringify(dataSources));
}

function renderSwiperGallery() {
  const wrapper = document.getElementById('swiperWrapperContent');
  if (!wrapper) return;

  let html = dataSources.map((src, index) => {
    return `<div class="swiper-slide neu-raised" data-url="${src.url}" data-index="${index}">
      <div class="swiper-glow"></div>
      ${!src.isDefault ? `<button class="delete-slide-btn" data-delete-id="${src.id}" title="ลบแหล่งข้อมูลนี้"><i data-lucide="trash-2"></i></button>` : ''}
      <div class="slide-icon"><i data-lucide="${src.isDefault ? 'database' : 'folder-open'}"></i></div>
      <div class="slide-title">${src.name}</div>
    </div>`;
  }).join('');

  html += `<div class="swiper-slide add-new" id="slideAddNew">
    <div class="swiper-glow"></div>
    <div class="slide-icon" style="background:transparent; color: var(--text-dim)"><i data-lucide="plus-circle"></i></div>
    <div class="slide-title" style="color: var(--text-dim)">เพิ่มไฟล์/ลิงก์ใหม่</div>
  </div>`;

  wrapper.innerHTML = html;
  lucide.createIcons();

  let activeIndex = dataSources.findIndex(s => s.url === currentApiUrl);
  if (activeIndex === -1) activeIndex = 0;

  if (swiperGallery) {
    swiperGallery.destroy(true, true);
  }

  swiperGallery = new Swiper('.data-swiper', {
    effect: 'coverflow',
    grabCursor: true,
    centeredSlides: true,
    slidesPerView: 'auto',
    initialSlide: activeIndex,
    coverflowEffect: {
      rotate: 20,
      stretch: 0,
      depth: 150,
      modifier: 1,
      slideShadows: false,
    },
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
    },
    keyboard: {
      enabled: true,
    },
    on: {
      click: function (swiper, event) {
        if (event.target.closest('#slideAddNew')) {
          openModal('modalLink');
          return;
        }

        const delBtn = event.target.closest('.delete-slide-btn');
        if (delBtn) {
          const id = delBtn.dataset.deleteId;
          const idx = dataSources.findIndex(s => s.id === id);
          if (idx !== -1) {
            if (confirm(`คุณต้องการลบ "${dataSources[idx].name}" ออกจาก Gallery หรือไม่?`)) {
              const deletedUrl = dataSources[idx].url;
              dataSources.splice(idx, 1);
              saveDataSources();
              if (currentApiUrl === deletedUrl) {
                currentApiUrl = dataSources[0]?.url || DEFAULT_API_URL;
                localStorage.setItem(CACHE_KEY_URL, currentApiUrl);
                fetchDataFromAPI(currentApiUrl);
              }
              renderSwiperGallery();
            }
          }
          return;
        }

        const slide = event.target.closest('.swiper-slide[data-url]');
        if (slide) {
          const url = slide.dataset.url;
          if (url && url !== currentApiUrl) {
            swiper.slideTo(parseInt(slide.dataset.index));
          }
        }
      },
      slideChange: function (swiper) {
        const slide = swiper.slides[swiper.activeIndex];
        if (slide && slide.dataset.url) {
          const url = slide.dataset.url;
          if (url !== currentApiUrl && url !== 'undefined') {
            currentApiUrl = url;
            localStorage.setItem(CACHE_KEY_URL, url);
            document.getElementById('badgeSourceText').textContent = 'Live Data';

            document.querySelectorAll('.empty-data').forEach(e => e.remove());
            const loaderHtml = `<div class="empty-data flip"><i class="spinning" data-lucide="loader-2"></i> กำลังโหลด Dataset...</div>`;
            document.querySelectorAll('.chart-box').forEach(box => {
              box.insertAdjacentHTML('beforeend', loaderHtml);
            });
            lucide.createIcons();

            fetchDataFromAPI(url, true);
          }
        }
      }
    }
  });
}

// ════════════════════════════════════════════════
//  FEATURE: DATA LINK MODAL (CHANGE DATA SOURCE)
// ════════════════════════════════════════════════
function initLinkModal() {
  const btnLink = document.getElementById('btnLinkModal');
  if (!btnLink) return;

  const savedUrl = localStorage.getItem(CACHE_KEY_URL);
  if (savedUrl) {
    currentApiUrl = savedUrl;
  }

  btnLink.addEventListener('click', () => {
    const linkInput = document.getElementById('linkInput');
    const linkStatus = document.getElementById('linkStatus');
    if (linkInput) linkInput.value = '';
    if (linkStatus) {
      linkStatus.textContent = '';
      linkStatus.className = 'link-status';
    }
    openModal('modalLink');
  });

  // Load button handler
  const linkLoadBtn = document.getElementById('linkLoadBtn');
  if (linkLoadBtn) {
    linkLoadBtn.addEventListener('click', loadFromLink);
  }

  const linkInput = document.getElementById('linkInput');
  if (linkInput) {
    linkInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') loadFromLink();
    });
  }

  // Excel Upload Handlers
  const btnUploadExcel = document.getElementById('btnUploadExcel');
  const excelFileInput = document.getElementById('excelFileInput');

  if (btnUploadExcel && excelFileInput) {
    btnUploadExcel.addEventListener('click', () => excelFileInput.click());
    excelFileInput.addEventListener('change', handleExcelUpload);
  }
}

function handleExcelUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const status = document.getElementById('linkStatus');
  if (status) {
    status.textContent = '⏳ กำลังดึงข้อมูลจากไฟล์...';
    status.className = 'link-status loading';
  }

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const data = evt.target.result;
      const wb = XLSX.read(data, { type: 'binary' });
      const firstSheetName = wb.SheetNames[0];
      const ws = wb.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(ws);

      if (!jsonData || jsonData.length === 0) throw new Error('ไฟล์ว่างเปล่า หรือรูปแบบผิด');

      // Create a Blob URL so the system can use fetch() like a normal API
      const jsonStr = JSON.stringify(jsonData);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const blobUrl = URL.createObjectURL(blob);

      dataSources.push({
        id: 'src_' + Date.now(),
        name: `ไฟล์: ${file.name}`,
        url: blobUrl,
        isDefault: false
      });

      saveDataSources();
      currentApiUrl = blobUrl;
      localStorage.setItem(CACHE_KEY_URL, blobUrl);

      const badgeText = document.getElementById('badgeSourceText');
      if (badgeText) badgeText.textContent = 'Local File';

      if (status) {
        status.textContent = `✓ อัปโหลดสำเร็จ`;
        status.className = 'link-status success';
      }

      fetchDataFromAPI(blobUrl, true).then(() => {
        renderSwiperGallery();
        setTimeout(() => {
          if (swiperGallery) swiperGallery.slideTo(dataSources.length - 1);
          closeModal('modalLink');
        }, 1000);
      });
    } catch (err) {
      if (status) {
        status.textContent = `✕ อัปโหลดไม่สำเร็จ: ${err.message}`;
        status.className = 'link-status error';
      }
    }
    e.target.value = ''; // Reset file input
  };
  reader.readAsBinaryString(file);
}

function loadFromLink() {
  const linkInput = document.getElementById('linkInput');
  const nameInput = document.getElementById('linkNameInput');
  const status = document.getElementById('linkStatus');
  if (!linkInput || !status) return;

  const url = linkInput.value.trim();
  const manualName = nameInput ? nameInput.value.trim() : '';

  if (!url) {
    status.textContent = '⚠ กรุณาใส่ URL';
    status.className = 'link-status error';
    return;
  }

  if (dataSources.some(s => s.url === url)) {
    status.textContent = '⚠ URL นี้มีอยู่ใน Gallery แล้ว';
    status.className = 'link-status error';
    return;
  }

  status.textContent = '⏳ กำลังดึงข้อมูล...';
  status.className = 'link-status loading';

  smartFetch(url)
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) throw new Error('ข้อมูลไม่ถูกต้อง');

      let pName = manualName;
      if (!pName) {
        const pNames = [...new Set(data.map(d => d.Project_Name || d.Sheet_Name || d.sheet_name).filter(Boolean))];
        pName = pNames[0] || `นำเข้าเมื่อ ${new Date().toLocaleTimeString()}`;
      }

      // Store the resolved gviz URL so fetching always works
      const storedUrl = parseGoogleSheetUrl(url) || url;
      dataSources.push({
        id: 'src_' + Date.now(),
        name: pName,
        url: storedUrl,
        isDefault: false
      });

      saveDataSources();
      currentApiUrl = storedUrl;
      localStorage.setItem(CACHE_KEY_URL, storedUrl);
      document.getElementById('badgeSourceText').textContent = 'Live Data';

      status.textContent = `✓ อ่านสำเร็จ!`;
      status.className = 'link-status success';

      fetchDataFromAPI(storedUrl, true).then(() => {
        renderSwiperGallery();
        setTimeout(() => {
          if (swiperGallery) swiperGallery.slideTo(dataSources.length - 1);
          closeModal('modalLink');
        }, 1000);
      });
    })
    .catch(err => {
      status.textContent = `✕ โหลดไม่สำเร็จ: ${err.message}`;
      status.className = 'link-status error';
    });
}

// ═══════════════════════════════════════════════
//  UI EFFECTS & EVENT LISTENERS
// ═══════════════════════════════════════════════
function initUIEffects() {
  initScrollHeader();
  initTheme();
  DashLib.initFontSizeControl(); // replaces local initUIScaling
  initModals();
  initLinkModal();
  initExport();
  initVisibility();
  initRevealAnimations();
  initClickToCopy();
  initTitleParallax();

  // Settings Panel
  document.getElementById('btnSettings')?.addEventListener('click', () => {
    if (swiperGallery) {
      setTimeout(() => swiperGallery.update(), 100);
    }
    openModal('modalSettings');
  });

  // Save Data
  document.getElementById('btnSaveData')?.addEventListener('click', () => {
    if (!rawData || rawData.length === 0) {
      showToast('⚠ ไม่มีข้อมูลที่จะบันทึก', 'alert-circle');
      return;
    }
    const ok = saveDataToCache(rawData);
    if (ok) {
      showToast(`✓ บันทึก ${rawData.length.toLocaleString()} รายการสำเร็จ!`, 'check-circle');
      updateCacheInfoBar();
    } else {
      showToast('✕ ข้อมูลมีขนาดใหญ่เกินไป', 'alert-circle');
    }
  });

  // Refresh
  document.getElementById('btnRefresh')?.addEventListener('click', () => {
    const btn = document.getElementById('btnRefresh');
    if (btn?.classList.contains('spinning')) return;
    btn?.classList.add('spinning');
    fetchDataFromAPI(currentApiUrl, true).finally(() => {
      setTimeout(() => btn?.classList.remove('spinning'), 700);
    });
  });

  // Clear Cache
  document.getElementById('btnClearCache')?.addEventListener('click', () => {
    clearDataCache();
  });
}

// ═══════════════════════════════════════════════
//  DATA PROCESSING
// ═══════════════════════════════════════════════
function processNewData(data) {
  rawData = data;
  globalKeys = {
    year: uniq(data, "Year"),
    type: uniq(data, "Type"),
    method: uniq(data, "Method"),
    dept: uniq(data, "Department"),
    dsr: uniq(data, "DSR (Yes/No)"),
    learning: uniq(data, "Learning Method"),
    field: uniq(data, "Field")
  };

  updateHeadingsFromData(data);
  initFilters();
  filteredData = data;
  render(data);
  triggerKpiPulse();
  triggerCardStagger();
}

// normalizeData — aliased to DashLib.normalizeData (see DASHLIB ALIASES at top)

// ═══════════════════════════════════════════════
//  GOOGLE SHEETS — aliased to DashLib
//  parseGoogleSheetUrl, parseGvizJson, smartFetch
// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════
//  DATA FETCHING
//  ฟังก์ชันสำหรับดึงข้อมูลจาก URL ที่กำหนด (รองรับทั้ง Google Sheet และ API)
//  - isBackgroundSync = true หมายถึงดึงข้อมูลเงียบๆ อยู่เบื้องหลัง (ไม่โชว์ Loader)
// ═══════════════════════════════════════════════
// ═══════════════════════════════════════════════
//  DATA FETCHING
//  ดึงข้อมูลจาก Backend /api/data เป็นหลัก
//  Fallback ไป Google Sheets โดยตรงเมื่อ backend ออฟไลน์
// ═══════════════════════════════════════════════
function fetchDataFromAPI(url, showRefreshToast = false, isBackgroundSync = false) {
  const badge = document.querySelector('.h-badge');
  if (isBackgroundSync && badge) badge.classList.add('is-syncing');

  // ── ลอง Backend ก่อนเสมอ ──
  if (typeof DashAPI !== 'undefined' && backendOnline !== false) {
    return _fetchFromBackend(showRefreshToast, isBackgroundSync)
      .catch(() => {
        // backend ล้ม → fallback ไป Google Sheets
        backendOnline = false;
        return _fetchFromGoogleSheets(url, showRefreshToast, isBackgroundSync);
      })
      .finally(() => { if (badge) badge.classList.remove('is-syncing'); });
  }

  // ── Backend ไม่มี/ออฟไลน์ → ใช้ Google Sheets ตรงๆ ──
  return _fetchFromGoogleSheets(url, showRefreshToast, isBackgroundSync)
    .finally(() => { if (badge) badge.classList.remove('is-syncing'); });
}

// ── ดึงจาก /api/data (backend) ──────────────────────────────
async function _fetchFromBackend(showRefreshToast, isBackgroundSync) {
  const result = await DashAPI.fetchMainData({ refresh: showRefreshToast });
  // result = { meta, kpis, charts, filters } — ไม่มี raw records
  // เพื่อ render กราฟ เราต้องสร้าง pseudo-records จาก charts data
  // แต่ที่ดีกว่าคือใช้ /api/data แล้วส่งต่อไป processBackendResult
  return processBackendResult(result, showRefreshToast, isBackgroundSync);
}

// ── แปลง backend response → render dashboard ─────────────────
function processBackendResult(result, showRefreshToast, isBackgroundSync) {
  const { meta, kpis, charts, filters } = result;

  // อัปเดต KPI ตรงจาก backend
  const DURATION = 1500;
  animateValue('valTotal',    kpis.total,    DURATION);
  animateValue('valDsrYes',   kpis.dsr_yes,  DURATION);
  animateValue('valProjects', kpis.projects, DURATION);
  triggerKpiPulse();

  // อัปเดต Filter Dropdowns จาก backend
  _populateFilters(filters);

  // วาดกราฟจาก charts object โดยตรง (ไม่ต้อง loop records)
  _renderFromCharts(charts);
  triggerCardStagger();

  // อัปเดต subtitle
  const subtitleEl = document.getElementById('dashSubtitle');
  if (subtitleEl) {
    subtitleEl.innerHTML =
      `<span class="dash-proj" style="color:var(--teal);"><i data-lucide="database" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i>Backend API</span>` +
      ` <span class="dash-stats" style="margin-left:8px;">— ${meta.total.toLocaleString()} รายการ${meta.filtered ? ' (กรองแล้ว)' : ''}</span>`;
    lucide.createIcons();
  }

  // สร้าง rawData แบบ lightweight สำหรับ export
  if (!rawData || rawData.length === 0) {
    rawData = [{ _fromBackend: true }]; // marker เพื่อรู้ว่าข้อมูลมาจาก backend
  }

  hideLoader();

  if (showRefreshToast) {
    showToast(`✓ รีเฟรชสำเร็จ — ${meta.total.toLocaleString()} รายการ`, 'refresh-cw');
  }
  return result;
}

// ── Populate filter dropdowns จาก backend filters ────────────
function _populateFilters(filters) {
  if (!filters) return;
  const b = (arr, defaultLabel) =>
    `<option value="">${defaultLabel}</option>` +
    (arr || []).map(v => `<option value="${v}">${v}</option>`).join('');

  const pf = document.getElementById('projectFilter');
  if (pf) pf.innerHTML = b(filters.projects, 'ทุกโครงการ');
  const yf = document.getElementById('yearFilter');
  if (yf) yf.innerHTML = b(filters.years, 'ทุกปี');
  const tf = document.getElementById('typeFilter');
  if (tf) tf.innerHTML = b(filters.types, 'ทุกประเภท');
  const mf = document.getElementById('methodFilter');
  if (mf) mf.innerHTML = b(filters.methods, 'ทุกรูปแบบ');
  const df = document.getElementById('deptFilter');
  if (df) df.innerHTML = b(filters.depts, 'ทุกหน่วยงาน');

  if (!window._filtersInitialized) {
    ['projectFilter', 'yearFilter', 'typeFilter', 'methodFilter', 'deptFilter'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', applyFiltersBackend);
    });
    window._filtersInitialized = true;
  }
}

// ── Re-fetch จาก backend เมื่อ filter เปลี่ยน ────────────────
async function applyFiltersBackend() {
  if (!backendOnline) { applyFilters(); return; }
  try {
    const year    = document.getElementById('yearFilter')?.value    || '';
    const type_   = document.getElementById('typeFilter')?.value    || '';
    const method  = document.getElementById('methodFilter')?.value  || '';
    const dept    = document.getElementById('deptFilter')?.value    || '';
    const project = document.getElementById('projectFilter')?.value || '';
    const result = await DashAPI.fetchMainData({ year, type: type_, method, dept, project });
    processBackendResult(result, false, false);
    document.getElementById('drillDownContainer')?.classList.add('hidden');
    document.querySelectorAll('.card').forEach((c, i) => {
      c.style.animation = 'none';
      void c.offsetWidth;
      c.style.animation = `popIn 0.55s cubic-bezier(0.22,1,0.36,1) ${i * 0.06}s both`;
    });
  } catch (e) {
    console.warn('[Backend filter] failed, using local filter', e);
    applyFilters();
  }
}

// ── วาดกราฟจาก charts object (backend) ──────────────────────
function _renderFromCharts(charts) {
  if (!charts) return;

  const tG = charts.trend || {};
  const tC = Object.keys(tG).map((_, i) => SETS.trend[i % SETS.trend.length]);
  mc('canvasTrend', 'bar', Object.keys(tG), Object.values(tG), { colors: tC });

  const tyG = charts.type || {};
  const tyC = Object.keys(tyG).map((_, i) => SETS.type[i % SETS.type.length]);
  mc('canvasType', 'bar', Object.keys(tyG), Object.values(tyG), {
    colors: tyC,
    extra: {
      onClick: (e, els) => {
        if (els.length) {
          const lbl = Object.keys(tyG)[els[0].index];
          showToast(`คลิก: ${lbl}`, 'target');
        }
      },
      onHover: (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; }
    }
  });

  const dsG = charts.dsr || {};
  mc('canvasDsr', 'doughnut', Object.keys(dsG), Object.values(dsG), { colors: SETS.dsr });

  const rmG = charts.roadmap || {};
  mc('canvasRoadmap', 'bar', Object.keys(rmG), Object.values(rmG), { colors: SETS.roadmap });

  const lG = charts.learning || {};
  mc('canvasLearning', 'pie', Object.keys(lG), Object.values(lG), { colors: SETS.learning });

  const fG = charts.field || {};
  mc('canvasField', 'bar', Object.keys(fG), Object.values(fG), {
    colors: Object.keys(fG).map((_, i) => SETS.trend[i % SETS.trend.length])
  });

  const dG = charts.dept || {};
  mc('canvasDept', 'bar', Object.keys(dG), Object.values(dG), {
    colors: Object.keys(dG).map((_, i) => SETS.learning[i % SETS.learning.length])
  });
}

// ── ดึงจาก Google Sheets โดยตรง (fallback) ───────────────────
function _fetchFromGoogleSheets(url, showRefreshToast, isBackgroundSync) {
  return smartFetch(url)
    .then(async data => {
      data = normalizeData(data);
      if (isBackgroundSync && rawData.length > 0) {
        if (JSON.stringify(data) === JSON.stringify(rawData)) return data;
        showToast('ข้อมูลอัปเดตแบบ Real-time ✨', 'radio');
      }
      rawData = data; filteredData = data;
      globalKeys = {
        year: uniq(data, 'Year'), type: uniq(data, 'Type'),
        method: uniq(data, 'Method'), dept: uniq(data, 'Department'),
        dsr: uniq(data, 'DSR (Yes/No)'), learning: uniq(data, 'Learning Method'),
        field: uniq(data, 'Field')
      };
      hideLoader();
      updateHeadingsFromData(data);
      initFilters();
      if (!isBackgroundSync) {
        ['projectFilter','yearFilter','typeFilter','methodFilter','deptFilter']
          .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        render(data); triggerKpiPulse(); triggerCardStagger();
      } else { applyFilters(); }
      saveDataToCache(data); updateCacheInfoBar();
      if (showRefreshToast) showToast(`✓ รีเฟรชสำเร็จ — ${data.length.toLocaleString()} รายการ`, 'refresh-cw');
      return data;
    })
    .catch(() => { if (!isBackgroundSync) showToast('โหลดข้อมูลไม่สำเร็จ', 'alert-circle'); });
}

function startRealtimeSync() {
  setInterval(() => {
    fetchDataFromAPI(currentApiUrl, false, true).catch(() => { });
  }, 30000);
}

function hideLoader() {
  const l = document.getElementById('loader');
  if (l && l.style.display !== 'none') {
    l.style.opacity = '0';
    setTimeout(() => l.style.display = 'none', 300);
  }
}

// ═══════════════════════════════════════════════
//  ANIMATIONS — all aliased to DashLib (see top of file)
//  initClickToCopy, initLiquidParallax, initCursorGlow,
//  initRippleEffect, initMagneticHover, triggerCardStagger,
//  triggerKpiPulse, initRevealAnimations
// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════
//  MAIN INIT (Entry Point)
//  ฟังก์ชันที่ทำงานเป็นอันดับแรกสุดเมื่อหน้าเว็บโหลดเสร็จ
//  ทำหน้าที่: 
//  1. ผูก Event Listeners ทั้งหมด
//  2. โหลดข้อมูลจาก Cache (ถ้ามีและยังไม่หมดอายุ)
//  3. หรือดึงข้อมูลใหม่จาก API (ถ้าไม่มี Cache)
// ═══════════════════════════════════════════════
window.onload = async () => {
  initUIEffects();
  lucide.createIcons();
  startLiveClock();

  initDataSources();
  renderSwiperGallery();
  initLiquidParallax();
  initCursorGlow();
  initRippleEffect();
  initMagneticHover();
  startRealtimeSync();

  // ── Probe Backend แล้วตัดสินใจว่าจะดึงข้อมูลจากไหน ──
  const isOnline = await probeBackend();

  const savedUrl = localStorage.getItem(CACHE_KEY_URL);
  if (savedUrl && savedUrl.includes('script.google.com/a/macros/horwang')) {
    localStorage.removeItem(CACHE_KEY_URL);
    localStorage.removeItem(CACHE_KEY_DATA);
    localStorage.removeItem(CACHE_KEY_TIME);
  } else if (savedUrl && !isOnline) {
    // ถ้า backend ออฟไลน์ ใช้ saved URL เป็น fallback
    currentApiUrl = savedUrl;
  }

  const cached = loadDataFromCache();
  if (cached && !isOnline) {
    // ไม่มี backend + มี cache → แสดง cache ทันที
    processNewData(cached.data);
    hideLoader();
    updateCacheInfoBar();
    triggerKpiPulse();
    triggerCardStagger();
    const cacheAge = Date.now() - new Date(cached.time).getTime();
    if (cacheAge >= 300000) {
      fetchDataFromAPI(currentApiUrl, false, true).catch(() => {});
    }
  } else {
    // มี backend online → ดึงจาก backend โดยตรง
    fetchDataFromAPI(currentApiUrl, false).catch(() => {
      const p = document.querySelector('#loader p');
      if (p) p.innerText = 'โหลดข้อมูลไม่สำเร็จ';
    });
  }
};

