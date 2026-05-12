// ═══════════════════════════════════════════════════════════════
//  api.js  —  Dashboard Backend Client  v2.1
//
//  ห่อหุ้มการเรียก Backend API ทั้งหมดในที่เดียว
//  BASE_URL จะถูก auto-detect ว่ารันจาก server เดิม หรือ localhost
//
//  Public API:
//    DashAPI.health()                   → ตรวจสอบสถานะ backend
//    DashAPI.isOnline()                 → boolean (non-throwing)
//    DashAPI.fetchMainData(opts)        → ดึงข้อมูลหลักจาก Google Sheets ผ่าน server
//    DashAPI.fetchSheets(url, refresh)  → proxy Google Sheets URL (legacy compat)
//    DashAPI.getFilters()               → ดึง filter options ทั้งหมด
//    DashAPI.exportUrl(opts)            → URL สำหรับ download Excel
//    DashAPI.uploadExcel(file, name)    → อัปโหลดไฟล์ Excel
//    DashAPI.listDatasets()             → รายการ datasets ที่ upload
//    DashAPI.getDataset(id, lim, off)   → ดึงข้อมูลใน dataset
//    DashAPI.deleteDataset(id)          → ลบ dataset
//    DashAPI.getSummary(id)             → สรุปสถิติ dataset
//    DashAPI.getExportUrl(id, cols)     → URL ดาวน์โหลด dataset
// ═══════════════════════════════════════════════════════════════

const DashAPI = (() => {
  // ── Auto-detect BASE_URL ─────────────────────────────────────
  // ถ้าหน้าเว็บถูกเสิร์ฟจาก FastAPI backend เดิม (/api จะอยู่ origin เดิม)
  // ถ้าเปิดไฟล์ตรง (file://) ให้ fallback ไป localhost:8000
  const _isFileProtocol = location.protocol === 'file:';
  const BASE_URL = _isFileProtocol
    ? 'http://localhost:8000/api'
    : `${location.origin}/api`;

  // ── Internal fetch wrapper ───────────────────────────────────
  async function _fetch(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', ...options.headers },
      ...options,
    });
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try { detail = (await res.json()).detail || detail; } catch (_) {}
      throw new Error(detail);
    }
    return res.json();
  }

  // ── Health Check ─────────────────────────────────────────────
  /**
   * ตรวจสอบว่า Backend ทำงานอยู่หรือไม่
   * @returns {Promise<{status, version, datasets_uploaded, sheet_configured}>}
   */
  async function health() {
    return _fetch('/health');
  }

  // ── Connectivity Probe (non-throwing) ────────────────────────
  /**
   * @returns {Promise<boolean>}
   */
  async function isOnline() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout
      const res = await fetch(`${BASE_URL}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) return false;
      const json = await res.json();
      return json.status === 'ok';
    } catch (_) {
      return false;
    }
  }

  // ── ★ MAIN DATA ENDPOINT ─────────────────────────────────────
  /**
   * ดึงข้อมูลหลักจาก Google Sheets ผ่าน Backend (ซ่อน Sheet ID)
   * @param {Object} [opts={}]
   * @param {boolean} [opts.refresh]   - force bypass server cache
   * @param {string}  [opts.year]      - กรองตามปี
   * @param {string}  [opts.type]      - กรองตามประเภท
   * @param {string}  [opts.method]    - กรองตามรูปแบบ
   * @param {string}  [opts.dept]      - กรองตามหน่วยงาน
   * @param {string}  [opts.field]     - กรองตามสายงาน
   * @param {string}  [opts.project]   - กรองตามโครงการ
   * @returns {Promise<{meta, kpis, charts, filters}>}
   */
  async function fetchMainData(opts = {}) {
    const params = new URLSearchParams();
    if (opts.refresh) params.set('refresh', 'true');
    if (opts.year)    params.set('year',    opts.year);
    if (opts.type)    params.set('type',    opts.type);
    if (opts.method)  params.set('method',  opts.method);
    if (opts.dept)    params.set('dept',    opts.dept);
    if (opts.field)   params.set('field',   opts.field);
    if (opts.project) params.set('project', opts.project);
    const qs = params.toString() ? `?${params}` : '';
    return _fetch(`/data${qs}`);
  }

  // ── Google Sheets Proxy (legacy compat) ──────────────────────
  /**
   * ดึงข้อมูลหลักจาก Backend โดยส่งเฉพาะ refresh flag
   * (เดิมรับ sheetsUrl แต่ backend ตอนนี้ซ่อน URL ไว้ใน .env)
   * @param {string}  [_sheetsUrl]  - ignored (kept for backwards compat)
   * @param {boolean} [refresh]
   * @returns {Promise<Array>} raw records
   */
  async function fetchSheets(_sheetsUrl, refresh = false) {
    const result = await fetchMainData({ refresh });
    // flatten: คืน array ของ records เพื่อ compat กับ smartFetch
    return _buildFlatRecords(result);
  }

  // ── Filter Options ───────────────────────────────────────────
  /**
   * ดึงค่า filter options ทั้งหมด
   * @returns {Promise<{years, types, methods, depts, fields, projects}>}
   */
  async function getFilters() {
    return _fetch('/filters');
  }

  // ── Export Main Data URL ─────────────────────────────────────
  /**
   * สร้าง URL สำหรับ download Excel ของข้อมูลหลัก
   * @param {Object} [opts={}]
   * @returns {string}
   */
  function exportUrl(opts = {}) {
    const params = new URLSearchParams();
    if (opts.columns && opts.columns.length) params.set('columns', opts.columns.join(','));
    if (opts.year)    params.set('year',    opts.year);
    if (opts.type)    params.set('type',    opts.type);
    if (opts.method)  params.set('method',  opts.method);
    if (opts.dept)    params.set('dept',    opts.dept);
    if (opts.field)   params.set('field',   opts.field);
    if (opts.project) params.set('project', opts.project);
    const qs = params.toString() ? `?${params}` : '';
    return `${BASE_URL}/export${qs}`;
  }

  // ── Upload Excel ─────────────────────────────────────────────
  /**
   * อัปโหลดไฟล์ Excel ไปยัง Backend
   * @param {File}   file
   * @param {string} [name='']
   * @returns {Promise<{id, name, rows, columns}>}
   */
  async function uploadExcel(file, name = '') {
    const form = new FormData();
    form.append('file', file);
    const params = name ? `?name=${encodeURIComponent(name)}` : '';
    const res = await fetch(`${BASE_URL}/upload${params}`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try { detail = (await res.json()).detail || detail; } catch (_) {}
      throw new Error(detail);
    }
    return res.json();
  }

  // ── List Datasets ─────────────────────────────────────────────
  /**
   * @returns {Promise<Array<{id, name, rows, columns, created_at}>>}
   */
  async function listDatasets() {
    const result = await _fetch('/datasets');
    return result.datasets || [];
  }

  // ── Get Dataset ───────────────────────────────────────────────
  /**
   * @param {string} id
   * @param {number} [limit=0]
   * @param {number} [offset=0]
   * @returns {Promise<{id, name, total, data}>}
   */
  async function getDataset(id, limit = 0, offset = 0) {
    const params = new URLSearchParams();
    if (limit)  params.set('limit',  limit);
    if (offset) params.set('offset', offset);
    const qs = params.toString() ? `?${params}` : '';
    // ✅ fixed: was /data/${id}, correct route is /datasets/${id}
    return _fetch(`/datasets/${id}${qs}`);
  }

  // ── Delete Dataset ────────────────────────────────────────────
  /**
   * @param {string} id
   * @returns {Promise<{message}>}
   */
  async function deleteDataset(id) {
    return _fetch(`/datasets/${id}`, { method: 'DELETE' });
  }

  // ── Summary / Stats ───────────────────────────────────────────
  /**
   * ดึงสรุปสถิติของ dataset ที่ upload
   * @param {string} id
   * @returns {Promise<{total, kpis, column_stats}>}
   */
  async function getSummary(id) {
    // ✅ fixed: route is /datasets/{id}/summary (server-side)
    return _fetch(`/datasets/${id}/summary`);
  }

  // ── Export Dataset URL ────────────────────────────────────────
  /**
   * สร้าง URL สำหรับ download Excel ของ dataset ที่ upload
   * @param {string}   id
   * @param {string[]} [columns=[]]
   * @returns {string}
   */
  function getExportUrl(id, columns = []) {
    const base = `${BASE_URL}/datasets/${id}/export`;
    if (!columns.length) return base;
    return `${base}?columns=${encodeURIComponent(columns.join(','))}`;
  }

  // ── INTERNAL: flatten backend response → array of records ────
  function _buildFlatRecords(apiResult) {
    // apiResult = { meta, kpis, charts, filters }
    // ไม่มี raw records ใน response (backend ทำการ aggregate แล้ว)
    // คืน empty array — caller ควรใช้ fetchMainData() แทน
    if (Array.isArray(apiResult)) return apiResult;
    return [];
  }

  // ── Public API ────────────────────────────────────────────────
  return {
    BASE_URL,
    health,
    isOnline,
    fetchMainData,
    fetchSheets,
    getFilters,
    exportUrl,
    uploadExcel,
    listDatasets,
    getDataset,
    deleteDataset,
    getSummary,
    getExportUrl,
  };
})();
