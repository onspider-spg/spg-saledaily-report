/**
 * Version 1.1 | 15 MAR 2026 | Siam Palette Group
 * ═══════════════════════════════════════════
 * SPG — Sale Daily Report V2
 * api_sd.js — API Client + Token + Session
 * Memory-only cache — no localStorage except token
 * ═══════════════════════════════════════════
 */

const API = (() => {
  const BASE = 'https://ahvzblrfzhtrjhvbzdhg.supabase.co/functions/v1/saledaily-report';
  const HOME_URL = 'https://onspider-spg.github.io/spg/';
  const LOGOUT_URL = 'https://onspider-spg.github.io/spg/#logout';
  const TK = 'spg_token';
  const SK = 'spg_sd_session';

  // ─── Token: 3-step fallback ───
  function initToken() {
    const params = new URLSearchParams(location.search);
    let token = params.get('token');
    if (!token) token = localStorage.getItem(TK);
    if (!token) { try { token = JSON.parse(localStorage.getItem(SK))?.token; } catch {} }
    if (!token) return null;
    localStorage.setItem(TK, token);
    if (params.has('token')) history.replaceState(null, '', location.pathname + location.hash);
    return token;
  }

  function getToken() { return localStorage.getItem(TK) || ''; }

  // ─── Session ───
  function saveSession(d) {
    const s = {
      token: d.session_id || d.token,
      account_id: d.account_id, user_id: d.user_id,
      display_name: d.display_name, full_name: d.full_name || '',
      tier_id: d.tier_id, tier_level: d.tier_level,
      store_id: d.store_id, dept_id: d.dept_id,
      store_name: d.store_name || '', brand: d.brand || '',
      access_level: d.access_level, permissions: d.permissions || {},
    };
    localStorage.setItem(SK, JSON.stringify(s));
    localStorage.setItem(TK, s.token);
    return s;
  }
  function getSession() { try { return JSON.parse(localStorage.getItem(SK)) || null; } catch { return null; } }
  function clearSession() { localStorage.removeItem(SK); }

  function hasPermission(key) { return getSession()?.permissions?.[key] === true; }
  function isHQ() { const s = getSession(); return s?.store_id === 'HQ' || (s?.tier_level || 99) <= 2; }
  function tokenBody(extra = {}) { return { token: getToken(), ...extra }; }

  // ─── HTTP POST ───
  async function post(action, data = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const resp = await fetch(`${BASE}?action=${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data), signal: ctrl.signal,
      });
      const json = await resp.json();
      if (!json.success) {
        if (json.error?.code === 'INVALID_SESSION') { clearSession(); location.href = LOGOUT_URL; }
        const e = new Error(json.error?.message || 'Unknown error'); e.code = json.error?.code; throw e;
      }
      return json.data;
    } finally { clearTimeout(timer); }
  }

  // ─── Image Compression ───
  function compressImage(file, maxPx = 1200, quality = 0.75) {
    if (!file.type.startsWith('image/') || file.size < 500 * 1024) return Promise.resolve(file);
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxPx || h > maxPx) { if (w > h) { h = Math.round(h * maxPx / w); w = maxPx; } else { w = Math.round(w * maxPx / h); h = maxPx; } }
        const cvs = document.createElement('canvas'); cvs.width = w; cvs.height = h;
        cvs.getContext('2d').drawImage(img, 0, 0, w, h);
        cvs.toBlob(blob => resolve(blob ? new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }) : file), 'image/jpeg', quality);
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  }

  // ─── Photo Upload ───
  async function uploadPhoto(file, category = 'sale', store_id) {
    const compressed = await compressImage(file);
    const fd = new FormData();
    fd.append('token', getToken());
    fd.append('file', compressed);
    fd.append('category', category);
    if (store_id) fd.append('store_id', store_id);
    const resp = await fetch(`${BASE}?action=sd_upload_photo`, { method: 'POST', body: fd });
    const json = await resp.json();
    if (!json.success) { const e = new Error(json.error?.message || 'Upload failed'); e.code = json.error?.code; throw e; }
    return json.data;
  }

  // ─── Store selector state ───
  let _store = null;
  function setStore(id) { _store = id; }
  function getStore() { return _store || getSession()?.store_id || null; }

  // ─── Public API ───
  return {
    HOME_URL, LOGOUT_URL,
    initToken, getToken, saveSession, getSession, clearSession,
    hasPermission, isHQ, tokenBody, post, uploadPhoto, compressImage,
    setStore, getStore,

    // Global
    initBundle:      ()        => post('sd_init_bundle', tokenBody()),
    // Dashboard
    getDashboard:    (sid)     => post('sd_get_dashboard', tokenBody({ store_id: sid || getStore() })),
    getWeeklyChart:  (sid)     => post('sd_get_weekly_comparison', tokenBody({ store_id: sid || getStore() })),
    getCashVariance: (days)    => post('sd_get_cash_variance_history', tokenBody({ days: days || 7 })),
    getAnomalies:    (sid)     => post('sd_get_anomalies', tokenBody({ store_id: sid || getStore() })),
    getStoreStatus:  ()        => post('sd_get_store_status', tokenBody()),
    // S1 Daily Sale
    getDailySale:    (date, sid) => post('sd_get_daily_sale', tokenBody({ sale_date: date, store_id: sid || getStore() })),
    saveDailySale:   (d)       => post('sd_save_daily_sale', tokenBody(d)),
    checkSync:       (date, sid) => post('sd_check_sync', tokenBody({ sync_date: date, store_id: sid || getStore() })),
    // S2 Expense
    getExpenses:     (date, sid) => post('sd_get_expenses', tokenBody({ expense_date: date, store_id: sid || getStore() })),
    saveExpense:     (d)       => post('sd_save_expense', tokenBody(d)),
    deleteExpense:   (id)      => post('sd_delete_expense', tokenBody({ expense_id: id })),
    // S3 Invoice
    getInvoices:     (f)       => post('sd_get_invoices', tokenBody(f)),
    saveInvoice:     (d)       => post('sd_save_invoice', tokenBody(d)),
    deleteInvoice:   (id)      => post('sd_delete_invoice', tokenBody({ invoice_id: id })),
    // S4 Cash
    getCash:         (date, sid) => post('sd_get_cash', tokenBody({ cash_date: date, store_id: sid || getStore() })),
    submitCash:      (d)       => post('sd_submit_cash_count', tokenBody(d)),
    confirmHandover: (id)      => post('sd_confirm_handover', tokenBody({ cash_id: id })),
    // S5-S6 History
    getSaleHistory:    (f)     => post('sd_get_sale_history', tokenBody({ store_id: getStore(), ...f })),
    getExpenseHistory: (f)     => post('sd_get_expense_history', tokenBody({ store_id: getStore(), ...f })),
    // S8 Daily Report
    getDailyReport:  (sid, d)  => post('sd_get_daily_report', tokenBody({ store_id: sid || getStore(), report_date: d })),
    saveDailyReport: (d)       => post('sd_save_daily_report', tokenBody(d)),
    getS8Summary:    (sid, d)  => post('sd_get_s8_summary', tokenBody({ store_id: sid || getStore(), detail_date: d })),
    // Tasks
    getTasks:        (sid, st) => post('sd_get_tasks', tokenBody({ store_id: sid, status: st })),
    createTask:      (d)       => post('sd_create_task', tokenBody(d)),
    updateTask:      (d)       => post('sd_update_task', tokenBody(d)),
    // Daily Hub
    getDailyHub:     (sid)     => post('sd_get_daily_hub', tokenBody({ store_id: sid || getStore() })),
    getDailyDetail:  (sid, d)  => post('sd_get_daily_detail', tokenBody({ store_id: sid || getStore(), detail_date: d })),
    // Admin
    syncDay:         (sid, d)  => post('sd_sync_day', tokenBody({ store_id: sid || getStore(), sync_date: d })),
    unlockDay:       (sid, d)  => post('sd_unlock_day', tokenBody({ store_id: sid || getStore(), sync_date: d })),
    getAccReview:    (sid)     => post('sd_get_acc_review', tokenBody({ store_id: sid || getStore() })),
    adminGetChannels:    (sid) => post('sd_admin_get_channels', tokenBody({ store_id: sid || getStore() })),
    adminCreateChannel:  (d)   => post('sd_admin_create_channel', tokenBody(d)),
    adminUpdateChannel:  (d)   => post('sd_admin_update_channel', tokenBody(d)),
    reorderChannel:      (id, dir) => post('sd_reorder_channel', tokenBody({ channel_id: id, direction: dir })),
    adminGetSuppliers:   ()    => post('sd_admin_get_suppliers', tokenBody()),
    adminUpdateSupplier: (d)   => post('sd_admin_update_supplier', tokenBody(d)),
    createVendor:        (d)   => post('sd_create_vendor', tokenBody(d)),
    adminGetSettings:    (sid) => post('sd_admin_get_settings', tokenBody({ store_id: sid || getStore() })),
    adminUpdateSettings: (d)   => post('sd_admin_update_settings', tokenBody({ store_id: getStore(), ...d })),
    adminGetPermissions: ()    => post('sd_admin_get_permissions', tokenBody()),
    adminBatchUpdatePermissions: (c) => post('sd_admin_batch_update_permissions', tokenBody({ changes: c })),
    adminGetAuditLog:    (f)   => post('sd_admin_get_audit_log', tokenBody(f || {})),

    logout() { clearSession(); localStorage.removeItem(TK); location.href = LOGOUT_URL; },
  };
})();
