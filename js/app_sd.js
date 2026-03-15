/**
 * Version 1.8.5 | 15 MAR 2026 | Siam Palette Group
 * ═══════════════════════════════════════════
 * SPG — Sale Daily Report V2
 * app_sd.js — Router + State + Shell + Sidebar + Utilities
 * Shell mounts once — screens render inside shell-main
 * ═══════════════════════════════════════════
 */

const App = (() => {
  // ═══ STATE (memory-only except token/session in localStorage) ═══
  const S = {
    session: null, stores: [],
    channels: [], allChannels: [], vendors: [], settings: {},
    permissions: {},
    dashboard: null,
    _bundleLoaded: false, _bundleLoading: false,
    sidebarCollapsed: false,
  };

  const appEl = () => document.getElementById('app');
  let currentRoute = '';
  let currentParams = {};
  let _shellMounted = false;
  let _sidebarBuilt = false;

  // ─── ROUTES (Phase 1: dashboard only, rest are placeholders) ───
  const ROUTES = {
    'loading':        { render: () => renderLoading() },
    'no-access':      { render: () => renderNoAccess() },
    'dashboard':      { render: () => Scr.renderDashboard(),  onLoad: () => Scr.loadDashboard() },
    'daily-sale':     { render: (p) => Scr2.renderS1(p),            onLoad: (p) => Scr2.loadS1(p) },
    'expense':        { render: (p) => Scr2.renderS2(p),            onLoad: (p) => Scr2.loadS2(p) },
    'invoice':        { render: () => Scr2.renderS3List(),          onLoad: () => Scr2.loadS3List(true) },
    'invoice-form':   { render: (p) => Scr2.renderS3Form(p),       onLoad: (p) => Scr2.loadS3Form(p) },
    'cash':           { render: () => Scr2.renderS4(),              onLoad: () => Scr2.loadS4() },
    'sale-history':   { render: () => Scr3.renderS5(),              onLoad: () => Scr3.loadS5(true) },
    'expense-history':{ render: () => Scr3.renderS6(),              onLoad: () => Scr3.loadS6(true) },
    'daily-report':   { render: (p) => Scr3.renderS8(p),             onLoad: (p) => Scr3.loadS8(p) },
    'tasks':          { render: () => Scr3.renderTasks(),            onLoad: () => Scr3.loadTasks() },
    'daily-hub':      { render: () => Scr3.renderDH(),              onLoad: () => Scr3.loadDH() },
    'acc-review':     { render: () => Scr4.renderAccReview(),       onLoad: () => Scr4.loadAccReview() },
    'admin-report':   { render: () => Scr4.renderReportDash(),      onLoad: () => Scr4.loadReportDash() },
    'channels':       { render: () => Scr4.renderChannels(),        onLoad: () => Scr4.loadChannels() },
    'vendors':        { render: () => Scr4.renderVendors(),         onLoad: () => Scr4.loadVendors() },
    'config':         { render: () => Scr4.renderConfig(),          onLoad: () => Scr4.loadConfig() },
    'access':         { render: () => Scr4.renderAccess(),          onLoad: () => Scr4.loadAccess() },
    'audit':          { render: () => Scr4.renderAudit(),           onLoad: null },
  };

  // ─── NAVIGATE ───
  let _onLoadTimer = null;
  function go(route, params = {}) {
    const def = ROUTES[route];
    if (!def) return go('dashboard');
    currentRoute = route;
    currentParams = params;

    const authScreens = ['loading', 'no-access'];
    if (!authScreens.includes(route) && S.session) {
      if (!_shellMounted) mountShell();
      const main = document.querySelector('.shell-main');
      if (main) main.innerHTML = def.render(params);
      updateSidebarActive();
    } else {
      _shellMounted = false;
      appEl().innerHTML = def.render(params);
    }

    // Cancel previous onLoad before scheduling new one
    if (_onLoadTimer) { clearTimeout(_onLoadTimer); _onLoadTimer = null; }
    if (def.onLoad) _onLoadTimer = setTimeout(() => { _onLoadTimer = null; def.onLoad(params); }, 20);
    window.scrollTo(0, 0);
    const ct = document.querySelector('.content');
    if (ct) ct.scrollTop = 0;
    history.pushState({ route, params }, '', '#' + route);
  }

  // ─── PRE-AUTH SCREENS ───
  function renderLoading() {
    return '<div style="display:flex;align-items:center;justify-content:center;height:100dvh"><div class="loader-spinner"></div></div>';
  }
  function renderNoAccess() {
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100dvh;text-align:center;padding:20px">
      <div style="font-size:36px;margin-bottom:12px">🔒</div>
      <div style="font-size:16px;font-weight:700;margin-bottom:6px">ไม่สามารถเข้าถึงได้</div>
      <div style="font-size:13px;color:var(--t3);margin-bottom:20px">Session หมดอายุหรือไม่มีสิทธิ์เข้าถึง Module นี้</div>
      <button class="btn btn-primary" onclick="location.href='${API.HOME_URL}'">กลับ Home</button>
    </div>`;
  }
  function renderPlaceholder(title) {
    return `<div class="toolbar"><div class="toolbar-title">${esc(title)}</div></div>
      <div class="content"><div class="empty-state">🚧 Coming soon — Phase 2+</div></div>`;
  }

  // ═══ SHELL (mount once) ═══
  function mountShell() {
    const s = S.session || {};
    const initials = getInitials(s.display_name);
    appEl().innerHTML = `<div class="shell">
      <div class="topbar">
        <div class="hamburger" onclick="App.openSidebar()">☰</div>
        <div class="topbar-logo" onclick="App.go('dashboard')">SPG Sale Daily Report</div>
        <div class="topbar-right">
          <div class="topbar-icon" onclick="App.refreshCurrent()" title="Refresh">↻</div>
          <div class="topbar-icon" onclick="App.go('config')" title="Settings">⚙</div>
          <div class="topbar-avatar" onclick="App.showProfilePopup()">${esc(initials)}</div>
          <div class="topbar-name" onclick="App.showProfilePopup()">${esc(s.display_name)}</div>
        </div>
      </div>
      <div class="shell-body">
        <nav class="sidebar" id="dk-sidebar"></nav>
        <div class="shell-main"></div>
      </div>
    </div>`;
    buildDesktopSidebar();
    setupFlyout();
    _shellMounted = true;
  }

  function refreshCurrent() { location.reload(); }

  // ═══ DESKTOP SIDEBAR (flyout groups) ═══
  function buildDesktopSidebar() {
    const sb = document.getElementById('dk-sidebar');
    if (!sb) return;
    const tl = S.session?.tier_level || 99;
    const isAdmin = tl <= 2;

    const groups = [
      { ico: '◇', label: 'Dashboard', route: 'dashboard', type: 'item' },
      { type: 'div' },
      { ico: '✎', label: 'Input', items: [
        { label: 'Daily Sale', route: 'daily-sale' },
        { label: 'Expense', route: 'expense' },
        { label: 'Invoice', route: 'invoice' },
        { label: 'Cash On Hand', route: 'cash' },
      ]},
      { ico: '◷', label: 'History', items: [
        { label: 'Sale History', route: 'sale-history' },
        { label: 'Expense History', route: 'expense-history' },
      ]},
      { ico: '☰', label: 'Report', items: [
        { label: 'Daily Report', route: 'daily-report' },
        { label: 'Daily Hub', route: 'daily-hub' },
        { label: 'Tasks', route: 'tasks' },
      ]},
    ];

    // Admin group — visible to T1/T2 only
    if (isAdmin) {
      groups.push({ ico: '⚙', label: 'Admin', items: [
        { label: 'Account Review', route: 'acc-review' },
        { label: 'Report Dashboard', route: 'admin-report' },
        { label: 'Channels', route: 'channels' },
        { label: 'Vendors', route: 'vendors' },
        { label: 'Config', route: 'config' },
        { label: 'User Access', route: 'access' },
        { label: 'Audit', route: 'audit' },
      ]});
    }

    const cl = S.sidebarCollapsed ? ' collapsed' : '';
    let html = `<button class="sd-toggle" onclick="App.toggleSidebar()" title="Toggle sidebar">☰</button>`;

    groups.forEach(g => {
      if (g.type === 'div') { html += '<div class="sd-divider"></div>'; return; }
      if (g.type === 'item' || !g.items) {
        const a = currentRoute === g.route ? ' active' : '';
        html += `<div class="sd-item${a}" data-route="${g.route}" onclick="App.go('${g.route}')"><span class="sd-item-icon">${g.ico}</span><span>${g.label}</span></div>`;
        return;
      }
      const ga = g.items.some(i => i.route === currentRoute);
      html += `<div class="sd-group">
        <div class="sd-group-head${ga ? ' active' : ''}"><span class="sd-item-icon">${g.ico}</span><span class="sd-group-label">${g.label}</span><span class="sd-group-arr">›</span></div>
        <div class="sd-flyout">${g.items.map(i => `<div class="sd-flyout-item${currentRoute === i.route ? ' active' : ''}" data-route="${i.route}" onclick="App.go('${i.route}')">${i.label}</div>`).join('')}</div>
      </div>`;
    });

    html += `<div class="sd-footer">
      <a onclick="location.href='${API.HOME_URL}'"><span style="font-size:12px">←</span> <span class="sf-lbl">Back to Home</span></a>
      <a class="danger" onclick="API.logout()"><span style="font-size:12px">→</span> <span class="sf-lbl">Logout</span></a>
    </div>`;

    sb.className = 'sidebar' + cl;
    sb.innerHTML = html;
  }

  function setupFlyout() {
    document.querySelectorAll('.sd-group').forEach(sg => {
      const head = sg.querySelector('.sd-group-head');
      const sub = sg.querySelector('.sd-flyout');
      if (!head || !sub) return;
      let timer = null;
      sg.addEventListener('mouseenter', () => {
        clearTimeout(timer);
        document.querySelectorAll('.sd-flyout.show').forEach(s => { if (s !== sub) s.classList.remove('show'); });
        const r = head.getBoundingClientRect();
        const nav = head.closest('.sidebar');
        sub.style.top = r.top + 'px';
        sub.style.left = (nav ? nav.getBoundingClientRect().right : r.right) + 'px';
        sub.classList.add('show');
      });
      sg.addEventListener('mouseleave', () => { timer = setTimeout(() => sub.classList.remove('show'), 120); });
      sub.addEventListener('mouseenter', () => clearTimeout(timer));
      sub.addEventListener('mouseleave', () => { timer = setTimeout(() => sub.classList.remove('show'), 120); });
    });
  }

  function toggleSidebar() {
    S.sidebarCollapsed = !S.sidebarCollapsed;
    const sb = document.getElementById('dk-sidebar');
    if (sb) sb.classList.toggle('collapsed', S.sidebarCollapsed);
  }

  function updateSidebarActive() {
    document.querySelectorAll('[data-route]').forEach(el => {
      el.classList.toggle('active', el.dataset.route === currentRoute);
    });
    // Update group heads
    document.querySelectorAll('.sd-group').forEach(g => {
      const active = g.querySelector('.sd-flyout-item.active');
      g.querySelector('.sd-group-head')?.classList.toggle('active', !!active);
    });
  }

  // ═══ MOBILE SIDEBAR (slide-out) ═══
  function buildMobileSidebar() {
    const panel = document.getElementById('sidebar-panel');
    if (!panel) return;
    const s = S.session || {};
    const tl = s.tier_level || 99;
    const initials = getInitials(s.display_name);

    const sections = [
      { sec: '', items: [{ l: 'Dashboard', r: 'dashboard' }] },
      { sec: 'Input', items: [{ l: 'Daily Sale', r: 'daily-sale' }, { l: 'Expense', r: 'expense' }, { l: 'Invoice', r: 'invoice' }, { l: 'Cash On Hand', r: 'cash' }] },
      { sec: 'History', items: [{ l: 'Sale History', r: 'sale-history' }, { l: 'Expense History', r: 'expense-history' }] },
      { sec: 'Report', items: [{ l: 'Daily Report', r: 'daily-report' }, { l: 'Daily Hub', r: 'daily-hub' }, { l: 'Tasks', r: 'tasks' }] },
    ];
    if (tl <= 2) {
      sections.push({ sec: 'Admin', items: [{ l: 'Account Review', r: 'acc-review' }, { l: 'Report Dashboard', r: 'admin-report' }, { l: 'Channels', r: 'channels' }, { l: 'Vendors', r: 'vendors' }, { l: 'Config', r: 'config' }, { l: 'User Access', r: 'access' }, { l: 'Audit', r: 'audit' }] });
    }

    let html = `<div class="mob-sd-header">
      <div class="topbar-avatar" style="width:28px;height:28px;font-size:11px">${esc(initials)}</div>
      <div><div style="font-size:12px;font-weight:600">${esc(s.display_name)}</div>
      <div style="font-size:9px;color:var(--t3)">${esc(s.tier_id)} · ${esc(s.store_name || s.store_id || 'HQ')}</div></div>
    </div>`;

    sections.forEach(sec => {
      if (sec.sec) html += `<div class="mob-sd-section">${sec.sec}</div>`;
      sec.items.forEach(i => {
        const a = currentRoute === i.r ? ' active' : '';
        html += `<div class="mob-sd-item${a}" data-route="${i.r}" onclick="App.closeSidebar();App.go('${i.r}')">${i.l}</div>`;
      });
      html += '<div class="mob-sd-divider"></div>';
    });

    html += `<div class="mob-sd-footer" onclick="location.href='${API.HOME_URL}'">← Back to Home</div>`;
    html += `<div class="mob-sd-footer danger" onclick="API.logout()">→ Logout</div>`;
    panel.innerHTML = html;
    _sidebarBuilt = true;
  }

  function openSidebar() {
    if (!_sidebarBuilt) buildMobileSidebar();
    updateSidebarActive();
    document.getElementById('sidebar-overlay')?.classList.add('open');
    document.getElementById('sidebar-panel')?.classList.add('open');
  }
  function closeSidebar() {
    document.getElementById('sidebar-overlay')?.classList.remove('open');
    document.getElementById('sidebar-panel')?.classList.remove('open');
  }

  // ═══ TOAST ═══
  let _toastTimer = null;
  function toast(msg, type = 'info') {
    const el = document.getElementById('toast');
    if (!el) return;
    clearTimeout(_toastTimer);
    el.textContent = msg;
    el.className = 'toast ' + type;
    requestAnimationFrame(() => el.classList.add('show'));
    _toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
  }

  // ═══ DIALOG ═══
  function showDialog(html) {
    document.getElementById('dialog-root').innerHTML = `<div class="popup-overlay" onclick="if(event.target===this)App.closeDialog()">${html}</div>`;
  }
  function closeDialog() { document.getElementById('dialog-root').innerHTML = ''; }

  // ═══ PROFILE POPUP ═══
  function showProfilePopup() {
    const s = S.session; if (!s) return;
    const ini = getInitials(s.display_name);
    showDialog(`<div class="popup-sheet" style="width:340px">
      <div class="popup-header"><div class="popup-title">Profile</div><button class="popup-close" onclick="App.closeDialog()">✕</button></div>
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
        <div class="topbar-avatar" style="width:48px;height:48px;font-size:18px">${esc(ini)}</div>
        <div><div style="font-size:16px;font-weight:700">${esc(s.display_name)}</div><div style="font-size:12px;color:var(--t3)">${esc(s.full_name || s.display_name)}</div></div>
      </div>
      <div style="background:var(--bg3);border-radius:var(--rd);padding:14px;font-size:13px;margin-bottom:20px">
        ${profileRow('Store', s.store_name || s.store_id)}
        ${profileRow('Dept', s.dept_id)}
        ${profileRow('Tier', s.tier_id)}
      </div>
      <button class="btn btn-primary btn-full" style="margin-bottom:10px" onclick="App.closeDialog();location.href='${API.HOME_URL}'">View Full Profile</button>
      <button class="btn btn-outline btn-full" style="color:var(--r);border-color:var(--r)" onclick="App.closeDialog();API.logout()">Log out</button>
    </div>`);
  }
  function profileRow(label, value) {
    return `<div style="display:flex;justify-content:space-between;padding:5px 0"><span style="color:var(--t3)">${label}</span><span style="font-weight:600">${esc(value || '—')}</span></div>`;
  }

  // ═══ UTILITIES ═══
  function esc(str) { if (str == null) return ''; const d = document.createElement('div'); d.textContent = String(str); return d.innerHTML; }
  function getInitials(name) {
    if (!name) return '?';
    const p = name.trim().split(/\s+/);
    return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : p[0].substring(0, 2).toUpperCase();
  }
  function fmtMoney(n) { const v = parseFloat(n) || 0; return '$' + v.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function fmtMoneyShort(n) { const v = parseFloat(n) || 0; return v >= 1000 ? '$' + (v / 1000).toFixed(1) + 'k' : '$' + v.toFixed(0); }
  function fmtDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }
  function fmtDateShort(dateStr) { if (!dateStr) return ''; const d = new Date(dateStr + 'T00:00:00'); return d.getDate() + '/' + (d.getMonth() + 1); }
  function todayStr() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function addDays(dateStr, n) { const d = new Date(dateStr + 'T00:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  // ═══ STORE SELECTOR (HQ only) ═══
  function renderStoreSelector(opts) {
    if (!API.isHQ()) return '';
    const noAll = opts?.noAll || false;
    let sel = API.getStore();
    // Auto-pick first store if ALL not allowed
    if (noAll && (!sel || sel === 'ALL') && S.stores.length) { sel = S.stores[0].store_id; API.setStore(sel); }
    const allPill = noAll ? '' : `<div class="store-pill${sel === 'ALL' ? ' on' : ''}" onclick="App.selectStore('ALL')">ทุกร้าน</div>`;
    return `<div class="store-sel">${allPill}${S.stores.map(s =>
      `<div class="store-pill${s.store_id === sel ? ' on' : ''}" onclick="App.selectStore('${s.store_id}')">${esc(s.short || s.store_id)}</div>`
    ).join('')}</div>`;
  }
  function selectStore(id) {
    API.setStore(id); S.dashboard = null;
    S.channels = (id && id !== 'ALL') ? S.allChannels.filter(c => c.store_id === id) : [];
    go(currentRoute, currentParams);
  }

  // ═══ INIT ═══
  async function init() {
    const savedHash = location.hash.replace('#', '') || 'dashboard';
    go('loading');
    const token = API.initToken();
    const session = API.getSession();
    if (!token && !session?.token) { go('no-access'); return; }

    try {
      const data = await API.initBundle();
      API.saveSession({ token: token || session.token, ...data });
      S.session = API.getSession();
      S.stores = data.all_stores || [];
      S.allChannels = data.all_channels || [];
      S.vendors = data.vendors || [];
      S.settings = data.settings || {};
      S.permissions = data.permissions || {};
      S.dashboard = data._dashboard || null;
      S._bundleLoaded = true;

      // Default store + derive channels from memory
      if (!API.isHQ()) {
        API.setStore(S.session.store_id);
        S.channels = S.allChannels.filter(c => c.store_id === S.session.store_id);
      } else {
        API.setStore('ALL');
        S.channels = [];
      }

      // Navigate to saved hash or dashboard (skip loading/no-access)
      const skip = ['loading', 'no-access'];
      const target = (ROUTES[savedHash] && !skip.includes(savedHash)) ? savedHash : 'dashboard';
      go(target);
    } catch (err) {
      console.error('Init failed:', err);
      if (err.code === 'NO_ACCESS') go('no-access');
      else { toast('เชื่อมต่อไม่ได้ กรุณาลองใหม่', 'error'); go('no-access'); }
    }
  }

  // ─── POPSTATE ───
  window.addEventListener('popstate', e => {
    if (e.state?.route && ROUTES[e.state.route]) go(e.state.route, e.state.params || {});
    else { const h = location.hash.replace('#', '') || 'dashboard'; if (ROUTES[h]) go(h); }
  });
  document.addEventListener('DOMContentLoaded', init);

  return {
    S, go, toast, showDialog, closeDialog, showProfilePopup, refreshCurrent,
    esc, fmtMoney, fmtMoneyShort, fmtDate, fmtDateShort, todayStr, addDays,
    openSidebar, closeSidebar, toggleSidebar,
    renderStoreSelector, selectStore,
    getInitials,
  };
})();
