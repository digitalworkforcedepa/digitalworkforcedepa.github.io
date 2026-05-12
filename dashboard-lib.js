// ═══════════════════════════════════════════════════════
//  dashboard-lib.js  — Reusable Dashboard Utility Library
//  Usage: เรียกใช้ผ่าน DashLib.functionName(...)
// ═══════════════════════════════════════════════════════

const DashLib = (() => {

  // ─────────────────────────────────────────────
  //  1. DOM HELPERS
  // ─────────────────────────────────────────────

  /** ดึง element ด้วย id */
  function el(id) { return document.getElementById(id); }

  /** แสดง Toast notification
   * @param {string} message - ข้อความ
   * @param {string} icon    - lucide icon name (default: 'check-circle')
   * @param {string} toastId - id ของ toast element (default: 'saveToast')
   */
  function showToast(message, icon = 'check-circle', toastId = 'saveToast') {
    const toast = el(toastId);
    const msgEl = el('toastMessage');
    if (!toast || !msgEl) return;
    const iconEl = toast.querySelector('i');
    msgEl.textContent = message;
    if (iconEl) iconEl.setAttribute('data-lucide', icon);
    if (window.lucide) lucide.createIcons();
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  // ─────────────────────────────────────────────
  //  2. MODAL SYSTEM
  // ─────────────────────────────────────────────

  function openModal(id) {
    const m = el(id);
    if (m) { m.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
  }

  function closeModal(id) {
    const m = el(id);
    if (m) { m.classList.add('hidden'); document.body.style.overflow = ''; }
  }

  /** เชื่อม event ปุ่มปิด modal ทั้งหมดในหน้า */
  function initModals() {
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(btn.getAttribute('data-close-modal')));
    });
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) { overlay.classList.add('hidden'); document.body.style.overflow = ''; }
      });
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => m.classList.add('hidden'));
        document.body.style.overflow = '';
      }
    });
  }

  // ─────────────────────────────────────────────
  //  3. DATA UTILITIES
  // ─────────────────────────────────────────────

  /** หาค่า unique ใน array of objects ตาม key */
  function uniq(data, key) {
    const s = new Set();
    data.forEach(d => { let v = d[key]; if (!v || String(v).trim() === '') v = 'ไม่ระบุ'; s.add(v); });
    return [...s].sort();
  }

  /** นับจำนวนรายการตาม key */
  function group(data, key, allKeys) {
    const r = {};
    if (allKeys) allKeys.forEach(k => r[k] = 0);
    data.forEach(d => {
      let v = d[key];
      if (!v || String(v).trim() === '') v = 'ไม่ระบุ';
      if (r[v] !== undefined) r[v]++;
      else if (!allKeys) r[v] = 1;
    });
    return r;
  }

  /** นับตัวเลข animate ขึ้นไปถึงค่า end
   * @param {string} objId    - element id
   * @param {number} end      - ค่าสุดท้าย
   * @param {number} duration - ระยะเวลา ms
   */
  function animateValue(objId, end, duration = 1500) {
    const obj = el(objId);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      obj.innerHTML = Math.floor(ease * end).toLocaleString();
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }

  // ─────────────────────────────────────────────
  //  4. GOOGLE SHEETS HELPERS
  // ─────────────────────────────────────────────

  /** แปลง Google Sheet URL ปกติ → gviz/tq endpoint */
  function parseGoogleSheetUrl(url) {
    const m = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!m) return null;
    const id = m[1];
    const gidM = url.match(/[#&?]gid=(\d+)/);
    let endpoint = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json`;
    if (gidM) endpoint += `&gid=${gidM[1]}`;
    return endpoint;
  }

  /** Parse gviz/tq response (JSONP-like) → array of objects */
  function parseGvizJson(raw) {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('Invalid gviz response');
    const obj = JSON.parse(raw.slice(start, end + 1));
    const table = obj.table;
    if (!table || !table.cols || !table.rows) return [];
    const headers = table.cols.map(c => c.label || c.id);
    return table.rows.map(row => {
      const rec = {};
      headers.forEach((h, i) => {
        const cell = row.c[i];
        rec[h] = cell ? (cell.v !== null && cell.v !== undefined ? cell.v : '') : '';
      });
      return rec;
    });
  }

  /** Fetch อัตโนมัติ: รองรับ Google Sheets URL, gviz, JSON API, Blob URL
   * @param {string} url
   * @returns {Promise<Array>}
   */
  async function smartFetch(url) {
    const gvizEndpoint = parseGoogleSheetUrl(url);
    const targetUrl = gvizEndpoint || url;
    const isGviz = !!gvizEndpoint || url.includes('gviz/tq');
    const res = await fetch(targetUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (isGviz) { const raw = await res.text(); return parseGvizJson(raw); }
    return res.json();
  }

  // ─────────────────────────────────────────────
  //  5. LOCAL STORAGE CACHE
  // ─────────────────────────────────────────────

  /** บันทึก data array ลง localStorage
   * @param {Array}  data
   * @param {string} cacheKey - key สำหรับ data (default: 'lib-cached-data')
   * @param {string} timeKey  - key สำหรับเวลา (default: 'lib-cached-time')
   */
  function saveCache(data, cacheKey = 'lib-cached-data', timeKey = 'lib-cached-time') {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(timeKey, new Date().toISOString());
      return true;
    } catch (e) { console.warn('Cache save failed:', e.message); return false; }
  }

  /** โหลด data จาก localStorage
   * @returns {{ data: Array, time: string } | null}
   */
  function loadCache(cacheKey = 'lib-cached-data', timeKey = 'lib-cached-time') {
    try {
      const json = localStorage.getItem(cacheKey);
      const time = localStorage.getItem(timeKey);
      if (!json) return null;
      const data = JSON.parse(json);
      if (!Array.isArray(data) || data.length === 0) return null;
      return { data, time };
    } catch (e) { return null; }
  }

  /** ลบ cache
   * @param {string[]} keys - array ของ key ที่ต้องการลบ
   */
  function clearCache(...keys) {
    keys.forEach(k => localStorage.removeItem(k));
  }

  /** แปลง ISO string → ข้อความสัมพัทธ์ (เมื่อสักครู่ / N นาทีที่แล้ว ฯลฯ) */
  function formatRelativeTime(isoStr) {
    if (!isoStr) return '';
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)   return 'เมื่อสักครู่';
    if (mins < 60)  return `${mins} นาทีที่แล้ว`;
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
    return `${days} วันที่แล้ว`;
  }

  // ─────────────────────────────────────────────
  //  6. THEME
  // ─────────────────────────────────────────────

  /** Toggle dark/light theme บน <html> data-theme */
  function toggleTheme(storageKey = 'app-theme') {
    const cur  = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(storageKey, next);
    return next;
  }

  /** โหลด theme ที่บันทึกไว้ */
  function loadTheme(storageKey = 'app-theme') {
    const saved = localStorage.getItem(storageKey) || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    return saved;
  }

  // ─────────────────────────────────────────────
  //  7. LIVE CLOCK
  // ─────────────────────────────────────────────

  /**
   * เริ่มนาฬิกาแบบ real-time (ภาษาไทย พ.ศ.)
   * @param {string} dateElId - id ของ element แสดงวันที่
   * @param {string} timeElId - id ของ element แสดงเวลา
   */
  function startLiveClock(dateElId = 'liveDate', timeElId = 'liveTime') {
    const dateEl = el(dateElId);
    const timeEl = el(timeElId);
    if (!dateEl && !timeEl) return;

    const DAY_TH   = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
    const MONTH_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

    const tick = () => {
      const now = new Date();
      if (dateEl) {
        const yy = String(now.getFullYear() + 543).slice(-2);
        dateEl.textContent = `${DAY_TH[now.getDay()]} ${String(now.getDate()).padStart(2,'0')} ${MONTH_TH[now.getMonth()]} ${yy}`;
      }
      if (timeEl) {
        const pad = n => String(n).padStart(2,'0');
        timeEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      }
    };
    tick();
    setInterval(tick, 1000);
  }

  // ─────────────────────────────────────────────
  //  8. SCROLL HEADER EFFECT
  // ─────────────────────────────────────────────

  /** เพิ่ม class 'header-scrolled' เมื่อ scroll เกิน threshold */
  function initScrollHeader(selector = 'header', threshold = 20) {
    const header = document.querySelector(selector);
    if (!header) return;
    window.addEventListener('scroll', () => {
      header.classList.toggle('header-scrolled', window.scrollY > threshold);
    }, { passive: true });
  }

  // ─────────────────────────────────────────────
  //  9. FONT SIZE CONTROL
  // ─────────────────────────────────────────────

  const _fontSizes  = ['sm', 'md', 'lg', 'xl'];
  const _fontLabels = { sm: 'S', md: 'M', lg: 'L', xl: 'XL' };
  let   _fontIndex  = 1;

  function applyFontSize(labelId = 'fontSizeLabel') {
    const size = _fontSizes[_fontIndex];
    _fontSizes.forEach(s => document.documentElement.classList.remove('fs-' + s));
    document.documentElement.classList.add('fs-' + size);
    localStorage.setItem('app-font-size', size);
    const lbl = el(labelId);
    if (lbl) lbl.textContent = _fontLabels[size];
    const btnOut = el('btnZoomOut');
    const btnIn  = el('btnZoomIn');
    if (btnOut) btnOut.disabled = _fontIndex === 0;
    if (btnIn)  btnIn.disabled  = _fontIndex === _fontSizes.length - 1;
  }

  /** เริ่มต้น font-size control (ปุ่ม +/-) */
  function initFontSizeControl(zoomInId = 'btnZoomIn', zoomOutId = 'btnZoomOut') {
    const saved = localStorage.getItem('app-font-size');
    if (saved && _fontSizes.includes(saved)) _fontIndex = _fontSizes.indexOf(saved);
    applyFontSize();
    el(zoomInId)?.addEventListener('click',  () => { _fontIndex = Math.min(_fontIndex + 1, _fontSizes.length - 1); applyFontSize(); });
    el(zoomOutId)?.addEventListener('click', () => { _fontIndex = Math.max(_fontIndex - 1, 0); applyFontSize(); });
  }

  // ─────────────────────────────────────────────
  //  10. ANIMATIONS & EFFECTS
  // ─────────────────────────────────────────────

  /** Cursor glow ตามเมาส์
   * @param {string} glowId - id ของ div#cursorGlow
   */
  function initCursorGlow(glowId = 'cursorGlow') {
    const glow = el(glowId);
    if (!glow) return;
    let mx = 0, my = 0, px = 0, py = 0;
    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      glow.style.opacity = '1';
      const hue = 180 + (e.clientX / window.innerWidth - 0.5) * 60;
      glow.style.background = `radial-gradient(circle, hsla(${hue},100%,60%,0.10) 0%, transparent 70%)`;
    });
    document.addEventListener('mouseleave', () => glow.style.opacity = '0');
    const tick = () => {
      px += (mx - px) * 0.09; py += (my - py) * 0.09;
      glow.style.left = `${px}px`; glow.style.top = `${py}px`;
      requestAnimationFrame(tick);
    };
    tick();
  }

  /** Parallax effect บน .blob elements เมื่อ scroll */
  function initLiquidParallax(selector = '.blob') {
    const blobs = document.querySelectorAll(selector);
    window.addEventListener('scroll', () => {
      const s = window.scrollY;
      if (blobs[0]) blobs[0].style.transform = `translateY(${s * 0.18}px) rotate(${s * 0.02}deg)`;
      if (blobs[1]) blobs[1].style.transform = `translateY(${s * -0.14}px) rotate(${s * -0.015}deg)`;
      if (blobs[2]) blobs[2].style.transform = `translateY(${s * 0.09}px)`;
      if (blobs[3]) blobs[3].style.transform = `translateY(${s * -0.08}px)`;
      if (blobs[4]) blobs[4].style.transform = `translateY(${s * 0.05}px)`;
    }, { passive: true });
  }

  /** Ripple effect เมื่อ click element
   * @param {string} selector - CSS selector ของ elements ที่จะมี ripple
   */
  function initRippleEffect(selector = '.btn-primary, .btn-ghost, .kpi') {
    document.querySelectorAll(selector).forEach(el => {
      el.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = el.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 2;
        ripple.style.cssText = `position:absolute;border-radius:50%;background:rgba(0,242,254,0.25);
          pointer-events:none;transform:scale(0);animation:rippleAnim 0.55s cubic-bezier(0.4,0,0.2,1) forwards;z-index:999;
          width:${size}px;height:${size}px;left:${e.clientX - rect.left - size/2}px;top:${e.clientY - rect.top - size/2}px`;
        if (!['relative','absolute','fixed'].includes(getComputedStyle(el).position)) el.style.position = 'relative';
        el.style.overflow = 'hidden';
        el.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
    });
    if (!document.getElementById('rippleStyle')) {
      const s = document.createElement('style');
      s.id = 'rippleStyle';
      s.textContent = `@keyframes rippleAnim { to { transform:scale(1); opacity:0; } }`;
      document.head.appendChild(s);
    }
  }

  /** Magnetic 3D hover บน elements
   * @param {string} selector - CSS selector
   */
  function initMagneticHover(selector = '.kpi, .h-action-btn') {
    document.querySelectorAll(selector).forEach(el => {
      el.addEventListener('mousemove', e => {
        const rect = el.getBoundingClientRect();
        const dx = (e.clientX - rect.left - rect.width  / 2) / rect.width  * 10;
        const dy = (e.clientY - rect.top  - rect.height / 2) / rect.height * 10;
        el.style.transform = `translateY(-6px) rotateX(${-dy}deg) rotateY(${dx}deg) scale(1.02)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
        el.style.transition = 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)';
      });
    });
  }

  /** Scroll-reveal animation ด้วย IntersectionObserver
   * @param {string} selector - CSS selector ของ elements
   */
  function initRevealAnimations(selector = '.card, .kpi') {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll(selector).forEach((el, i) => {
      el.classList.add('reveal-hidden');
      el.classList.add(`delay-${Math.min((i % 5) + 1, 4)}`);
      observer.observe(el);
    });
  }

  /** Stagger animation สำหรับ card elements */
  function triggerCardStagger(selector = '.card') {
    document.querySelectorAll(selector).forEach((c, idx) => {
      c.style.animation = 'none';
      void c.offsetWidth;
      c.style.animation = `popIn 0.55s cubic-bezier(0.22,1,0.36,1) ${idx * 0.06}s both`;
    });
  }

  /** Pulse animation สำหรับ KPI cards */
  function triggerKpiPulse(selector = '.kpi') {
    document.querySelectorAll(selector).forEach((kpi, i) => {
      kpi.style.animation = 'none';
      void kpi.offsetWidth;
      kpi.style.animation = `popIn 0.6s cubic-bezier(0.22,1,0.36,1) ${i * 0.12}s both`;
    });
  }

  /** Click-to-copy ค่า KPI ไปยัง clipboard */
  function initClickToCopy(selector = '.kpi', valueSelector = '.kpi-val') {
    document.querySelectorAll(selector).forEach(kpi => {
      kpi.addEventListener('click', () => {
        const valEl = kpi.querySelector(valueSelector);
        if (!valEl) return;
        navigator.clipboard.writeText(valEl.innerText.replace(/,/g, '')).then(() => {
          kpi.classList.add('copied');
          setTimeout(() => kpi.classList.remove('copied'), 2000);
        }).catch(() => {});
      });
    });
  }

  // ─────────────────────────────────────────────
  //  11. EXCEL EXPORT (ต้องมี SheetJS CDN)
  // ─────────────────────────────────────────────

  /**
   * Export data เป็นไฟล์ .xlsx
   * @param {Array}    data     - array of objects
   * @param {string[]} columns  - คอลัมน์ที่ต้องการ export
   * @param {string}   filename - ชื่อไฟล์ (ไม่ต้องมี .xlsx)
   */
  function exportToExcel(data, columns, filename = 'Export') {
    if (!window.XLSX) { console.error('SheetJS (XLSX) not loaded'); return; }
    if (!columns || columns.length === 0) return;

    const rows = data.map(row => {
      const obj = {};
      columns.forEach(col => { obj[col] = row[col] !== undefined ? row[col] : ''; });
      return obj;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = columns.map(col => ({
      wch: Math.min(Math.max(col.length, ...data.map(r => String(r[col] || '').length)) + 2, 40)
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    XLSX.writeFile(wb, `${filename}_${dateStr}.xlsx`);
  }

  // ─────────────────────────────────────────────
  //  12. SECTION VISIBILITY TOGGLE
  // ─────────────────────────────────────────────

  /**
   * Toggle ซ่อน/แสดง section โดย data attribute
   * @param {string} sectionId   - ค่าของ data-section-id
   * @param {boolean} isVisible  - true = แสดง
   */
  function setSectionVisible(sectionId, isVisible) {
    const el = document.querySelector(`[data-section-id="${sectionId}"]`);
    if (el) el.classList.toggle('section-hidden', !isVisible);
  }

  // ─────────────────────────────────────────────
  //  13. NORMALIZE DATA (column mapping อัตโนมัติ)
  // ─────────────────────────────────────────────

  /**
   * Normalize column names จาก Google Sheet / Excel ให้ตรงกับ key มาตรฐาน
   * รองรับหัวคอลัมน์ภาษาไทยและอังกฤษ
   */
  function normalizeData(data) {
    if (!data || data.length === 0) return data;
    const allCols = new Set();
    data.slice(0, 10).forEach(row => Object.keys(row).forEach(k => allCols.add(k)));
    const cols = [...allCols];
    const mapKey = (patterns) => cols.find(c => patterns.some(p => c.toLowerCase().includes(p.toLowerCase())));

    const keyMap = {
      Year:         mapKey(['ปี', 'year', 'งบประมาณ']),
      Type:         mapKey(['type', 'ประเภท']),
      Department:   mapKey(['dept', 'department', 'หน่วยงาน', 'สังกัด', 'หน่วย']),
      Project_Name: mapKey(['project', 'ชื่อโครงการ', 'โครงการ', 'sheet_name']),
      Method:       mapKey(['method', 'รูปแบบ', 'การเรียน']),
      Field:        mapKey(['field', 'สายงาน', 'ด้าน', 'ทักษะ']),
      DSR:          mapKey(['dsr', 'ผ่านเกณฑ์', 'เกณฑ์']),
      Roadmap:      mapKey(['roadmap', 'หมวด', 'skill', 'ทักษะหลัก'])
    };

    return data.map(d => {
      const n = { ...d };
      if (keyMap.Year)         n.Year = d[keyMap.Year];
      if (keyMap.Type)         n.Type = d[keyMap.Type];
      if (keyMap.Department)   n.Department = d[keyMap.Department];
      if (keyMap.Project_Name) n.Project_Name = d[keyMap.Project_Name];
      if (keyMap.Method)       n.Method = d[keyMap.Method];
      if (keyMap.Field)        n.Field = d[keyMap.Field];
      if (keyMap.DSR)          n['DSR (Yes/No)'] = d[keyMap.DSR];
      if (keyMap.Roadmap)      n['Digital_Skill_Roadmap หมวด'] = d[keyMap.Roadmap];
      return n;
    });
  }

  // ─────────────────────────────────────────────
  //  PUBLIC API
  // ─────────────────────────────────────────────
  return {
    // DOM
    el,
    showToast,
    // Modal
    openModal, closeModal, initModals,
    // Data
    uniq, group, animateValue, normalizeData,
    // Google Sheets / Fetch
    parseGoogleSheetUrl, parseGvizJson, smartFetch,
    // Cache
    saveCache, loadCache, clearCache, formatRelativeTime,
    // Theme
    toggleTheme, loadTheme,
    // Clock & UI
    startLiveClock, initScrollHeader, initFontSizeControl, applyFontSize,
    // Animations
    initCursorGlow, initLiquidParallax, initRippleEffect,
    initMagneticHover, initRevealAnimations,
    triggerCardStagger, triggerKpiPulse,
    initClickToCopy,
    // Export
    exportToExcel,
    // Visibility
    setSectionVisible,
  };

})();
