/**
 * Version 1.0 | 15 MAR 2026 | Siam Palette Group
 * ═══════════════════════════════════════════
 * SPG — Sale Daily Report V2
 * screens4_sd.js — Admin Screens
 * ACC Review | Channels | Vendors | Config | User Access | Audit
 * ═══════════════════════════════════════════
 */

const Scr4 = (() => {
  const e = App.esc, fm = App.fmtMoney;

  function toolbar(title) {
    return `<div class="toolbar"><button class="toolbar-back" onclick="App.go('dashboard')">←</button><div class="toolbar-title">${title}</div></div>`;
  }

  // ═══════════════════════════════════════════
  // ACC REVIEW — Sync management
  // ═══════════════════════════════════════════
  let ar = { days: [], kpis: {} };

  function renderAccReview() {
    return `${toolbar('Account Review')}
    <div class="content" id="ar-content">
      ${App.renderStoreSelector()}
      <div class="alert alert-info">📋 ข้อมูลแก้ไขย้อนหลังได้ 3 วัน · เกิน 3 วัน = auto-sync · กด 🔒 Sync = ส่งข้อมูลไป Finance ทันที</div>
      <div id="ar-table"><div class="skeleton sk-card" style="height:200px"></div></div>
      <div id="ar-summary" style="margin-top:12px;padding:10px;background:var(--bg3);border-radius:var(--rd);font-size:11px;color:var(--t2)">
        <b>กฎ:</b> Editable = ยังแก้ไขได้ · 🔒 Synced = ส่งไป Finance แล้ว · เกิน edit window → auto-sync
      </div>
    </div>`;
  }

  async function loadAccReview() {
    try {
      const data = await API.getAccReview();
      ar.days = data.days || [];
      ar.kpis = data.kpis || {};
      fillAccReview();
    } catch { App.toast('โหลดไม่สำเร็จ', 'error'); }
  }

  function fillAccReview() {
    const el = document.getElementById('ar-table');
    if (!el) return;
    if (!ar.days.length) { el.innerHTML = '<div class="empty-state">ยังไม่มีข้อมูล</div>'; return; }

    el.innerHTML = `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Date</th><th>Sales</th><th>Expense</th><th>Status</th><th></th></tr></thead>
    <tbody>${ar.days.map(d => {
      const synced = d.sync_status === 'synced';
      return `<tr${synced ? ' style="background:var(--bg3)"' : ''}>
        <td style="font-weight:600${synced ? ';color:var(--t3)' : ''}">${App.fmtDate(d.sale_date).substring(0, 10)}</td>
        <td${synced ? ' style="color:var(--t3)"' : ''}>${fm(d.total_sales)}</td>
        <td${synced ? ' style="color:var(--t3)"' : ''}>${fm(d.total_expense)}</td>
        <td>${synced ? '<span class="sts sts-lock">🔒 Synced</span>' : '<span class="sts sts-ok">✏️ Editable</span>'}</td>
        <td>${synced ? `<span style="font-size:10px;color:var(--t4)">${d.sync_method || ''}</span>` : `<button class="btn btn-primary btn-sm" onclick="Scr4.arSync('${d.sale_date}')">🔒 Sync</button>`}</td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
  }

  async function arSync(date) {
    App.showDialog(`<div class="popup-sheet" style="width:300px;text-align:center">
      <div style="font-size:15px;font-weight:700;margin-bottom:8px">🔒 Sync ${date}?</div>
      <div style="font-size:12px;color:var(--t3);margin-bottom:14px">ข้อมูลจะถูกส่งไป Finance และแก้ไขไม่ได้อีก</div>
      <div style="display:flex;gap:8px;justify-content:center">
        <button class="btn btn-outline" onclick="App.closeDialog()">ยกเลิก</button>
        <button class="btn btn-primary" id="ar-sync-btn" onclick="Scr4.arConfirmSync('${date}')">🔒 Sync</button>
      </div>
    </div>`);
  }

  async function arConfirmSync(date) {
    const btn = document.getElementById('ar-sync-btn'); if (btn) btn.disabled = true;
    try {
      await API.syncDay(API.getStore(), date);
      App.closeDialog();
      App.toast('Sync สำเร็จ', 'success');
      // Update memory
      const d = ar.days.find(x => x.sale_date === date);
      if (d) { d.sync_status = 'synced'; d.sync_method = 'manual'; }
      fillAccReview();
    } catch (err) { App.toast(err.message || 'Sync ไม่สำเร็จ', 'error'); }
    finally { if (btn) btn.disabled = false; }
  }


  // ═══════════════════════════════════════════
  // CHANNELS
  // ═══════════════════════════════════════════
  let ch = { channels: [] };

  function renderChannels() {
    return `${toolbar('Channels')}
    <div class="content" id="ch-content">
      ${App.renderStoreSelector()}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div class="sl" style="margin:0" id="ch-count">📡 Channels (0)</div>
        <button class="btn btn-primary btn-sm" onclick="Scr4.chAdd()">+ Add Channel</button>
      </div>
      <div id="ch-table"><div class="skeleton sk-card" style="height:200px"></div></div>
    </div>`;
  }

  async function loadChannels() {
    try {
      const data = await API.adminGetChannels();
      ch.channels = data.channels || [];
      fillChannels();
    } catch { App.toast('โหลดไม่สำเร็จ', 'error'); }
  }

  function fillChannels() {
    document.getElementById('ch-count').textContent = `📡 Channels (${ch.channels.length})`;
    const el = document.getElementById('ch-table');
    if (!el) return;
    const groupColors = { card_sale: 'tag-b', cash_sale: 'tag-g', delivery_sale: 'tag-o', other: 'tag-gray' };
    el.innerHTML = `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Label</th><th>Key</th><th>Group</th><th>Finance Cat</th><th>Sort</th><th>Active</th></tr></thead>
    <tbody>${ch.channels.map(c => `<tr>
      <td style="font-weight:600">${e(c.channel_label)}</td>
      <td style="font-size:10px;color:var(--t3)">${e(c.channel_key)}</td>
      <td><span class="tag ${groupColors[c.dashboard_group] || 'tag-gray'}">${e(c.dashboard_group)}</span></td>
      <td style="font-size:10px">${e(c.finance_sub_category)}</td>
      <td>${c.sort_order}</td>
      <td><div class="toggle-sw${c.is_enabled ? ' on' : ''}" onclick="Scr4.chToggle('${c.id}',${!c.is_enabled})"></div></td>
    </tr>`).join('')}</tbody></table></div>`;
  }

  async function chToggle(id, newState) {
    const c = ch.channels.find(x => x.id === id);
    if (c) c.is_enabled = newState;
    fillChannels(); // optimistic
    try { await API.adminUpdateChannel({ channel_id: id, is_enabled: newState }); }
    catch { if (c) c.is_enabled = !newState; fillChannels(); App.toast('อัพเดทไม่สำเร็จ', 'error'); }
  }

  function chAdd() {
    App.showDialog(`<div class="popup-sheet" style="width:360px">
      <div class="popup-header"><div class="popup-title">+ Add Channel</div><button class="popup-close" onclick="App.closeDialog()">✕</button></div>
      <div class="fg"><label class="fl">Channel Label <span class="req">*</span></label><input class="fi" id="ch-label" placeholder="เช่น Card Eftpos 3"></div>
      <div class="fg"><label class="fl">Channel Key <span class="req">*</span></label><input class="fi" id="ch-key" placeholder="เช่น eftpos3 (ห้ามเว้นวรรค)"></div>
      <div class="fg"><label class="fl">Dashboard Group</label><select class="fi" id="ch-group"><option value="card_sale">card_sale</option><option value="cash_sale">cash_sale</option><option value="delivery_sale">delivery_sale</option><option value="other">other</option></select></div>
      <div class="fg"><label class="fl">Finance Sub Category</label><input class="fi" id="ch-fincat" placeholder="Revenue → ..."></div>
      <button class="btn btn-gold btn-full" id="ch-save" onclick="Scr4.chSaveNew()">💾 Save</button>
    </div>`);
  }

  async function chSaveNew() {
    const label = document.getElementById('ch-label')?.value?.trim();
    const key = document.getElementById('ch-key')?.value?.trim();
    if (!label || !key) return App.toast('กรุณากรอก Label + Key', 'error');
    const btn = document.getElementById('ch-save'); if (btn) btn.disabled = true;
    try {
      const data = await API.adminCreateChannel({
        store_id: API.getStore(), channel_label: label, channel_key: key,
        dashboard_group: document.getElementById('ch-group')?.value || 'other',
        finance_sub_category: document.getElementById('ch-fincat')?.value || key,
      });
      ch.channels.push(data);
      App.closeDialog();
      fillChannels();
      App.toast('สร้าง Channel สำเร็จ', 'success');
    } catch (err) { App.toast(err.message || 'สร้างไม่สำเร็จ', 'error'); }
    finally { if (btn) btn.disabled = false; }
  }


  // ═══════════════════════════════════════════
  // VENDORS
  // ═══════════════════════════════════════════
  let vn = { vendors: [], search: '' };

  function renderVendors() {
    return `${toolbar('Vendors')}
    <div class="content" id="vn-content">
      ${App.renderStoreSelector()}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div class="sl" style="margin:0" id="vn-count">🏪 Vendors (0)</div>
        <button class="btn btn-primary btn-sm" onclick="Scr4.vnAdd()">+ Add Vendor</button>
      </div>
      <input class="fi" style="margin-bottom:10px" placeholder="🔍 Search vendors..." oninput="Scr4.vnSearch(this.value)">
      <div id="vn-table"><div class="skeleton sk-card" style="height:200px"></div></div>
    </div>`;
  }

  async function loadVendors() {
    try {
      const data = await API.adminGetSuppliers();
      vn.vendors = data.vendors || [];
      fillVendors();
    } catch { App.toast('โหลดไม่สำเร็จ', 'error'); }
  }

  function fillVendors() {
    const list = vn.search ? vn.vendors.filter(v => (v.supplier_name || '').toLowerCase().includes(vn.search.toLowerCase())) : vn.vendors;
    document.getElementById('vn-count').textContent = `🏪 Vendors (${list.length})`;
    const el = document.getElementById('vn-table');
    if (!el) return;
    el.innerHTML = `<table class="tbl"><thead><tr><th>Name</th><th>Active</th></tr></thead>
    <tbody>${list.map(v => `<tr>
      <td style="font-weight:600">${e(v.supplier_name)}</td>
      <td><div class="toggle-sw${v.is_active ? ' on' : ''}" onclick="Scr4.vnToggle('${v.id}',${!v.is_active})"></div></td>
    </tr>`).join('')}</tbody></table>`;
  }

  function vnSearch(val) { vn.search = val; fillVendors(); }

  async function vnToggle(id, newState) {
    const v = vn.vendors.find(x => x.id === id);
    if (v) v.is_active = newState;
    fillVendors();
    try { await API.adminUpdateSupplier({ supplier_id: id, is_active: newState }); }
    catch { if (v) v.is_active = !newState; fillVendors(); App.toast('อัพเดทไม่สำเร็จ', 'error'); }
  }

  function vnAdd() {
    App.showDialog(`<div class="popup-sheet" style="width:320px">
      <div class="popup-header"><div class="popup-title">+ Add Vendor</div><button class="popup-close" onclick="App.closeDialog()">✕</button></div>
      <div class="fg"><label class="fl">Vendor Name <span class="req">*</span></label><input class="fi" id="vn-name"></div>
      <button class="btn btn-gold btn-full" id="vn-save" onclick="Scr4.vnSaveNew()">💾 Save</button>
    </div>`);
  }

  async function vnSaveNew() {
    const name = document.getElementById('vn-name')?.value?.trim();
    if (!name) return App.toast('กรุณาใส่ชื่อ Vendor', 'error');
    const btn = document.getElementById('vn-save'); if (btn) btn.disabled = true;
    try {
      const data = await API.createVendor({ store_id: API.getStore(), vendor_name: name });
      vn.vendors.push(data);
      // Also update App.S.vendors for S2/S3 vendor dropdown
      App.S.vendors.push({ id: data.id, name: data.supplier_name });
      App.closeDialog();
      fillVendors();
      App.toast('สร้าง Vendor สำเร็จ', 'success');
    } catch (err) { App.toast(err.message || 'สร้างไม่สำเร็จ', 'error'); }
    finally { if (btn) btn.disabled = false; }
  }


  // ═══════════════════════════════════════════
  // CONFIG
  // ═══════════════════════════════════════════
  let cfg = {};

  function renderConfig() {
    return `${toolbar('Config')}
    <div class="content" id="cfg-content">
      ${App.renderStoreSelector()}
      <div class="sl" style="margin-top:0">⚙️ Store Config</div>
      <div id="cfg-form"><div class="skeleton sk-card" style="height:200px"></div></div>
    </div>`;
  }

  async function loadConfig() {
    try {
      const data = await API.adminGetSettings();
      cfg = data.settings || {};
      fillConfig();
    } catch { App.toast('โหลดไม่สำเร็จ', 'error'); }
  }

  function fillConfig() {
    const el = document.getElementById('cfg-form');
    if (!el) return;
    el.innerHTML = `<div class="card">
      <div class="fg"><label class="fl">Cash Tolerance ($)</label><input class="fi" type="number" step="0.01" id="cfg-tol" value="${cfg.cash_mismatch_tolerance || 2}" style="width:100px"></div>
      <div class="fg"><label class="fl">Edit Window (days)</label><input class="fi" type="number" id="cfg-days" value="${cfg.backdate_limit_days || 3}" style="width:100px"></div>
      <div class="fg"><label class="fl">Require Photos</label><div class="toggle-sw${cfg.require_photos !== false ? ' on' : ''}" id="cfg-photos" onclick="this.classList.toggle('on')"></div></div>
      <div class="fg" style="margin:0"><label class="fl">Auto-sync after edit window</label><div class="toggle-sw${cfg.auto_sync_after_window !== false ? ' on' : ''}" id="cfg-autosync" onclick="this.classList.toggle('on')"></div></div>
    </div>
    <div style="margin-top:10px"><button class="btn btn-gold" id="cfg-save" onclick="Scr4.cfgSave()">💾 Save Config</button></div>`;
  }

  async function cfgSave() {
    const btn = document.getElementById('cfg-save'); if (btn) btn.disabled = true;
    try {
      await API.adminUpdateSettings({
        cash_mismatch_tolerance: parseFloat(document.getElementById('cfg-tol')?.value) || 2,
        backdate_limit_days: parseInt(document.getElementById('cfg-days')?.value) || 3,
        require_photos: document.getElementById('cfg-photos')?.classList.contains('on'),
        auto_sync_after_window: document.getElementById('cfg-autosync')?.classList.contains('on'),
      });
      App.toast('บันทึกสำเร็จ', 'success');
    } catch (err) { App.toast(err.message || 'บันทึกไม่สำเร็จ', 'error'); }
    finally { if (btn) btn.disabled = false; }
  }


  // ═══════════════════════════════════════════
  // USER ACCESS — Permission matrix (18 × 7)
  // ═══════════════════════════════════════════
  let ua = { perms: [], changes: [] };

  function renderAccess() {
    return `${toolbar('User Access')}
    <div class="content" id="ua-content">
      <div style="font-size:11px;color:var(--t3);margin-bottom:10px">18 functions × 7 tiers — Tap to toggle (T1/T2 only)</div>
      <div id="ua-table"><div class="skeleton sk-card" style="height:300px"></div></div>
      <div style="margin-top:10px"><button class="btn btn-gold" id="ua-save" onclick="Scr4.uaSave()" style="display:none">💾 Save Changes</button></div>
    </div>`;
  }

  async function loadAccess() {
    try {
      const data = await API.adminGetPermissions();
      ua.perms = data.permissions || [];
      ua.changes = [];
      fillAccess();
    } catch { App.toast('โหลดไม่สำเร็จ', 'error'); }
  }

  function fillAccess() {
    const el = document.getElementById('ua-table');
    if (!el || !ua.perms.length) return;

    // Group by function_key
    const groups = {};
    ua.perms.forEach(p => {
      if (!groups[p.function_key]) groups[p.function_key] = { name: p.function_name, group: p.function_group, tiers: {} };
      groups[p.function_key].tiers[p.tier_id] = p.is_allowed;
    });

    const tiers = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    let lastGroup = '';
    let rows = '';
    for (const [key, fn] of Object.entries(groups)) {
      if (fn.group !== lastGroup) {
        lastGroup = fn.group;
        rows += `<tr><td colspan="8" style="background:var(--gbg);font-size:10px;font-weight:700;color:var(--g);padding:6px 8px;text-transform:uppercase">${e(fn.group)}</td></tr>`;
      }
      rows += `<tr><td><div style="font-weight:600;font-size:11px">${e(fn.name)}</div><div style="font-size:9px;color:var(--t4)">${e(key)}</div></td>`;
      tiers.forEach(t => {
        const allowed = fn.tiers[t];
        const icon = allowed ? '<span style="color:var(--g);font-size:14px;cursor:pointer">✅</span>' : '<span style="color:var(--t4);cursor:pointer">—</span>';
        rows += `<td style="text-align:center" onclick="Scr4.uaToggle('${key}','${t}')">${icon}</td>`;
      });
      rows += '</tr>';
    }

    el.innerHTML = `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th style="min-width:140px">Function</th>${tiers.map(t => `<th>${t}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function uaToggle(key, tier) {
    const p = ua.perms.find(x => x.function_key === key && x.tier_id === tier);
    if (!p) return;
    p.is_allowed = !p.is_allowed;
    // Track change
    const existing = ua.changes.findIndex(c => c.function_key === key && c.tier_id === tier);
    if (existing >= 0) ua.changes.splice(existing, 1);
    ua.changes.push({ function_key: key, tier_id: tier, is_allowed: p.is_allowed });
    fillAccess();
    document.getElementById('ua-save').style.display = ua.changes.length > 0 ? '' : 'none';
  }

  async function uaSave() {
    if (!ua.changes.length) return;
    const btn = document.getElementById('ua-save'); if (btn) btn.disabled = true;
    try {
      await API.adminBatchUpdatePermissions(ua.changes);
      ua.changes = [];
      document.getElementById('ua-save').style.display = 'none';
      App.toast(`อัพเดท ${ua.changes.length || 'all'} permissions สำเร็จ`, 'success');
    } catch (err) { App.toast(err.message || 'อัพเดทไม่สำเร็จ', 'error'); }
    finally { if (btn) btn.disabled = false; }
  }


  // ═══════════════════════════════════════════
  // AUDIT — Load-on-demand
  // ═══════════════════════════════════════════
  let au = { logs: [], offset: 0 };

  function renderAudit() {
    const now = App.todayStr();
    const weekAgo = App.addDays(now, -7);
    return `${toolbar('Audit Trail')}
    <div class="content" id="au-content">
      <div class="sl" style="margin-top:0">📜 Audit Trail</div>
      <div class="card">
        <div style="font-size:11px;color:var(--t3);margin-bottom:10px">Select date range and click Load.</div>
        <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
          <div class="fg" style="margin:0;flex:1;min-width:100px"><label class="fl">Date from</label><input class="fi" type="date" id="au-from" value="${weekAgo}"></div>
          <div class="fg" style="margin:0;flex:1;min-width:100px"><label class="fl">Date to</label><input class="fi" type="date" id="au-to" value="${now}"></div>
          <div class="fg" style="margin:0;flex:1;min-width:100px"><label class="fl">Event Type</label>
            <select class="fi" id="au-type"><option value="">All Types</option><option value="login">Login</option><option value="sale">Sale</option><option value="expense">Expense</option><option value="invoice">Invoice</option><option value="cash">Cash</option><option value="settings">Settings</option><option value="sync">Sync</option></select></div>
          <button class="btn btn-primary" onclick="Scr4.auLoad()">Load</button>
        </div>
      </div>
      <div id="au-result" style="margin-top:10px"><div style="text-align:center;padding:30px;color:var(--t3);font-size:12px">☰<br>Select date range and click Load</div></div>
      <div id="au-more" style="display:none;text-align:center;padding:10px">
        <span style="font-size:11px;color:var(--acc);padding:5px 14px;border:1px solid var(--bd);border-radius:var(--rd);cursor:pointer" onclick="Scr4.auLoadMore()">โหลดเพิ่ม →</span>
      </div>
    </div>`;
  }

  async function auLoad(append) {
    if (!append) { au.logs = []; au.offset = 0; }
    try {
      const data = await API.adminGetAuditLog({
        date_from: document.getElementById('au-from')?.value,
        date_to: document.getElementById('au-to')?.value,
        event_type: document.getElementById('au-type')?.value || undefined,
        store_id: API.getStore(),
        limit: 50, offset: au.offset,
      });
      const newLogs = data.logs || [];
      au.logs = append ? [...au.logs, ...newLogs] : newLogs;
      fillAudit();
      document.getElementById('au-more').style.display = newLogs.length >= 50 ? '' : 'none';
    } catch { App.toast('โหลดไม่สำเร็จ', 'error'); }
  }

  function fillAudit() {
    const el = document.getElementById('au-result');
    if (!el) return;
    if (!au.logs.length) { el.innerHTML = '<div class="empty-state">ไม่มีข้อมูล</div>'; return; }

    el.innerHTML = `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Time</th><th>Type</th><th>Action</th><th>By</th><th>Detail</th></tr></thead>
    <tbody>${au.logs.map(l => {
      const time = l.created_at ? new Date(l.created_at).toLocaleString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
      return `<tr>
        <td style="font-size:10px;white-space:nowrap">${time}</td>
        <td><span class="tag tag-gray">${e(l.event_type || '—')}</span></td>
        <td style="font-size:11px">${e(l.action)}</td>
        <td style="font-size:10px">${e(l.changed_by_name || l.changed_by)}</td>
        <td style="font-size:10px;color:var(--t3);max-width:200px;overflow:hidden;text-overflow:ellipsis">${e(l.target_type)}:${e(l.target_id)}</td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
  }

  function auLoadMore() { au.offset += 50; auLoad(true); }


  // ═══ PUBLIC ═══
  return {
    renderAccReview, loadAccReview, arSync, arConfirmSync,
    renderChannels, loadChannels, chToggle, chAdd, chSaveNew,
    renderVendors, loadVendors, vnSearch, vnToggle, vnAdd, vnSaveNew,
    renderConfig, loadConfig, cfgSave,
    renderAccess, loadAccess, uaToggle, uaSave,
    renderAudit, auLoad, auLoadMore,
  };
})();
