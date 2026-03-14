/**
 * Version 1.4 | 15 MAR 2026 | Siam Palette Group
 * ═══════════════════════════════════════════
 * SPG — Sale Daily Report V2
 * screens4_sd.js — Admin Screens
 * ACC Review | Report Dashboard | Channels | Vendors | Config | User Access | Audit
 * ═══════════════════════════════════════════
 */

const Scr4 = (() => {
  const e = App.esc, fm = App.fmtMoney;
  const _busy = {};

  function toolbar(title) {
    return `<div class="toolbar"><button class="toolbar-back" onclick="App.go('dashboard')">←</button><div class="toolbar-title">${title}</div></div>`;
  }

  // ─── Guard: force select store (not ALL) ───
  function needStore(containerId) {
    if (API.getStore() && API.getStore() !== 'ALL') return false;
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = '<div class="alert alert-info" style="text-align:center">⚠️ กรุณาเลือกร้านก่อน (ห้ามเลือก "ทุกร้าน")</div>';
    return true;
  }

  // ═══════════════════════════════════════════
  // ACC REVIEW — Month selector + All stores
  // ═══════════════════════════════════════════
  let ar = { days: [], stores: [], kpis: {}, month: '' };

  function arMonthLabel(m) { const p = m.split('-'); const ms = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return ms[parseInt(p[1])] + ' ' + p[0]; }

  function renderAccReview() {
    ar.month = ar.month || new Date().toISOString().substring(0, 7);
    return `${toolbar('Account Review')}
    <div class="content" id="ar-content">
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:4px 0 10px;font-size:13px;font-weight:600">
        <span class="dbar-btn" onclick="Scr4.arMonthNav(-1)">‹</span>
        <span id="ar-month-label">📅 ${arMonthLabel(ar.month)}</span>
        <span class="dbar-btn" onclick="Scr4.arMonthNav(1)">›</span>
      </div>
      <div class="alert alert-info" style="font-size:10px">📋 Editable = ยังแก้ไขได้ · 🔒 Synced = ส่งไป Finance แล้ว · เกิน edit window → auto-sync</div>
      <div id="ar-kpi" class="kpi-row" style="grid-template-columns:1fr 1fr 1fr 1fr"><div class="skeleton sk-kpi"></div><div class="skeleton sk-kpi"></div><div class="skeleton sk-kpi"></div><div class="skeleton sk-kpi"></div></div>
      <div id="ar-table"><div class="skeleton sk-card" style="height:200px"></div></div>
    </div>`;
  }

  function arMonthNav(delta) {
    const p = ar.month.split('-');
    const d = new Date(parseInt(p[0]), parseInt(p[1]) - 1 + delta, 1);
    ar.month = d.toISOString().substring(0, 7);
    document.getElementById('ar-month-label').textContent = '📅 ' + arMonthLabel(ar.month);
    loadAccReview();
  }

  async function loadAccReview() {
    if (_busy.ar) return; _busy.ar = true;
    try {
      const data = await API.getAccReview(ar.month);
      ar.days = data.days || [];
      ar.stores = data.stores || [];
      ar.kpis = data.kpis || {};
      fillAccReview();
    } catch { App.toast('โหลดไม่สำเร็จ', 'error'); }
    finally { _busy.ar = false; }
  }

  function fillAccReview() {
    const el = document.getElementById('ar-table');
    if (!el) return;
    const k = ar.kpis;
    const isT1 = (App.S.session?.tier_level || 99) <= 1;

    // KPIs
    document.getElementById('ar-kpi').innerHTML = `
      <div class="kpi-box"><div class="kpi-label">💰 Sales</div><div class="kpi-val" style="font-size:13px;color:var(--gold)">${App.fmtMoneyShort(k.total_sale || 0)}</div></div>
      <div class="kpi-box"><div class="kpi-label">🧾 Expense</div><div class="kpi-val" style="font-size:13px;color:var(--r)">${App.fmtMoneyShort(k.total_expense || 0)}</div></div>
      <div class="kpi-box"><div class="kpi-label">🔒 Synced</div><div class="kpi-val" style="font-size:13px;color:var(--g)">${k.synced || 0}</div></div>
      <div class="kpi-box"><div class="kpi-label">✏️ Pending</div><div class="kpi-val" style="font-size:13px;color:var(--o)">${k.unsynced || 0}</div></div>`;

    if (!ar.days.length) { el.innerHTML = '<div class="empty-state">ยังไม่มีข้อมูลเดือนนี้</div>'; return; }

    // Group by date
    const byDate = {};
    ar.days.forEach(d => { if (!byDate[d.sale_date]) byDate[d.sale_date] = []; byDate[d.sale_date].push(d); });
    const dates = Object.keys(byDate).sort().reverse();

    el.innerHTML = `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Date</th><th>Store</th><th>Sales</th><th>Expense</th><th>Status</th><th></th></tr></thead>
    <tbody>${dates.map(date => byDate[date].map(d => {
      const synced = d.sync_status === 'synced';
      let actionCol;
      if (synced) {
        actionCol = `<span style="font-size:9px;color:var(--t4)">${d.sync_method || ''}</span>${isT1 ? ` <button class="btn btn-outline btn-sm" style="font-size:9px;color:var(--o);border-color:var(--o);margin-left:2px" onclick="Scr4.arUnlock('${d.store_id}','${d.sale_date}')">🔓</button>` : ''}`;
      } else {
        actionCol = `<button class="btn btn-primary btn-sm" style="font-size:9px" onclick="Scr4.arSync('${d.store_id}','${d.sale_date}')">🔒 Sync</button>`;
      }
      return `<tr${synced ? ' style="background:var(--bg3)"' : ''}>
        <td style="font-size:10px;font-weight:600;white-space:nowrap">${App.fmtDateShort(d.sale_date)}</td>
        <td style="font-size:10px">${e(d.store_name || d.store_id)}</td>
        <td style="font-size:10px">${fm(d.total_sales)}</td>
        <td style="font-size:10px">${fm(d.total_expense)}</td>
        <td>${synced ? '<span class="sts sts-lock">🔒</span>' : '<span class="sts sts-ok">✏️</span>'}</td>
        <td>${actionCol}</td>
      </tr>`;
    }).join('')).join('')}</tbody></table></div>`;
  }

  async function arSync(storeId, date) {
    App.showDialog(`<div class="popup-sheet" style="width:300px;text-align:center">
      <div style="font-size:15px;font-weight:700;margin-bottom:8px">🔒 Sync ${e(storeId)} ${date}?</div>
      <div style="font-size:12px;color:var(--t3);margin-bottom:14px">ข้อมูลจะถูกส่งไป Finance และแก้ไขไม่ได้อีก</div>
      <div style="display:flex;gap:8px;justify-content:center">
        <button class="btn btn-outline" onclick="App.closeDialog()">ยกเลิก</button>
        <button class="btn btn-primary" id="ar-sync-btn" onclick="Scr4.arConfirmSync('${storeId}','${date}')">🔒 Sync</button>
      </div>
    </div>`);
  }

  async function arConfirmSync(storeId, date) {
    const btn = document.getElementById('ar-sync-btn'); if (btn) btn.disabled = true;
    try {
      await API.syncDay(storeId, date);
      App.closeDialog();
      App.toast('Sync สำเร็จ', 'success');
      const d = ar.days.find(x => x.store_id === storeId && x.sale_date === date);
      if (d) { d.sync_status = 'synced'; d.sync_method = 'manual'; }
      fillAccReview();
    } catch (err) { App.toast(err.message || 'Sync ไม่สำเร็จ', 'error'); }
    finally { if (btn) btn.disabled = false; }
  }

  async function arUnlock(storeId, date) {
    App.showDialog(`<div class="popup-sheet" style="width:300px;text-align:center">
      <div style="font-size:15px;font-weight:700;margin-bottom:8px">🔓 Unlock ${e(storeId)} ${App.fmtDateShort(date)}?</div>
      <div style="font-size:12px;color:var(--t2);margin-bottom:14px">⚠️ T1 Only — ข้อมูลจะกลับเป็น Editable</div>
      <div style="display:flex;gap:8px;justify-content:center">
        <button class="btn btn-outline" onclick="App.closeDialog()">ยกเลิก</button>
        <button class="btn btn-outline" id="ar-unlock-btn" style="color:var(--o);border-color:var(--o)" onclick="Scr4.arConfirmUnlock('${storeId}','${date}')">🔓 Unlock</button>
      </div>
    </div>`);
  }

  async function arConfirmUnlock(storeId, date) {
    const btn = document.getElementById('ar-unlock-btn'); if (btn) btn.disabled = true;
    try {
      await API.unlockDay(storeId, date);
      App.closeDialog();
      App.toast('Unlock สำเร็จ', 'success');
      const d = ar.days.find(x => x.store_id === storeId && x.sale_date === date);
      if (d) { d.sync_status = 'editable'; d.sync_method = null; }
      fillAccReview();
    } catch (err) { App.toast(err.message || 'Unlock ไม่ได้', 'error'); }
    finally { if (btn) btn.disabled = false; }
  }


  // ═══════════════════════════════════════════
  // CHANNELS — Matrix (master labels × stores)
  // ═══════════════════════════════════════════
  let ch = { masters: [], stores: [], visibility: {} };

  function renderChannels() {
    return `${toolbar('Channels')}
    <div class="content" id="ch-content">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div class="sl" style="margin:0" id="ch-count">📡 Channel Matrix</div>
        <button class="btn btn-primary btn-sm" onclick="Scr4.chAdd()">+ Add Channel</button>
      </div>
      <div style="font-size:10px;color:var(--t3);margin-bottom:8px">✓ = ร้านเห็น channel นี้ · กดเพื่อ toggle</div>
      <div id="ch-table"><div class="skeleton sk-card" style="height:200px"></div></div>
    </div>`;
  }

  async function loadChannels() {
    if (_busy.ch) return; _busy.ch = true;
    try {
      const data = await API.adminGetChannelMatrix();
      ch.masters = data.masters || [];
      ch.stores = data.stores || [];
      ch.visibility = data.visibility || {};
      fillChannels();
    } catch { App.toast('โหลดไม่สำเร็จ', 'error'); }
    finally { _busy.ch = false; }
  }

  function fillChannels() {
    document.getElementById('ch-count').textContent = `📡 Channel Matrix (${ch.masters.length} channels × ${ch.stores.length} stores)`;
    const el = document.getElementById('ch-table');
    if (!el) return;
    if (!ch.masters.length) { el.innerHTML = '<div class="empty-state">ยังไม่มี Channel</div>'; return; }
    const groupColors = { card_sale: 'tag-b', cash_sale: 'tag-g', delivery_sale: 'tag-o', other: 'tag-gray' };
    el.innerHTML = `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th style="min-width:100px">Channel</th><th>Group</th>${ch.stores.map(s => `<th style="text-align:center;font-size:10px;min-width:40px">${e(s.store_id)}</th>`).join('')}</tr></thead>
    <tbody>${ch.masters.map(m => {
      const vis = ch.visibility[m.channel_key] || {};
      return `<tr>
        <td><div style="font-size:11px;font-weight:600">${e(m.channel_label)}</div><div style="font-size:9px;color:var(--t4)">${e(m.channel_key)}</div></td>
        <td><span class="tag ${groupColors[m.dashboard_group] || 'tag-gray'}" style="font-size:8px">${e(m.dashboard_group)}</span></td>
        ${ch.stores.map(s => {
          const cell = vis[s.store_id];
          const on = cell?.is_enabled !== false;
          const hasRow = !!cell;
          return `<td style="text-align:center"><div class="toggle-sw${on && hasRow ? ' on' : ''}" style="margin:0 auto" onclick="Scr4.chToggle('${m.channel_key}','${s.store_id}',${!(on && hasRow)})"></div></td>`;
        }).join('')}
      </tr>`;
    }).join('')}</tbody></table></div>`;
  }

  async function chToggle(channelKey, storeId, newState) {
    // Optimistic: update memory + re-render
    if (!ch.visibility[channelKey]) ch.visibility[channelKey] = {};
    const prev = ch.visibility[channelKey][storeId];
    ch.visibility[channelKey][storeId] = { id: prev?.id || 'new', is_enabled: newState };
    fillChannels();
    try { await API.adminToggleChannel({ channel_key: channelKey, store_id: storeId, is_enabled: newState }); }
    catch { ch.visibility[channelKey][storeId] = prev || undefined; fillChannels(); App.toast('อัพเดทไม่สำเร็จ', 'error'); }
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
  // VENDORS — Matrix (master vendor names × stores)
  // ═══════════════════════════════════════════
  let vn = { masters: [], stores: [], visibility: {}, search: '' };

  function renderVendors() {
    return `${toolbar('Vendors')}
    <div class="content" id="vn-content">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div class="sl" style="margin:0" id="vn-count">🏪 Vendor Matrix</div>
        <button class="btn btn-primary btn-sm" onclick="Scr4.vnAdd()">+ Add Vendor</button>
      </div>
      <input class="fi" style="margin-bottom:8px" placeholder="🔍 Search vendors..." oninput="Scr4.vnSearch(this.value)">
      <div style="font-size:10px;color:var(--t3);margin-bottom:8px">✓ = ร้านเห็น vendor นี้ · กดเพื่อ toggle</div>
      <div id="vn-table"><div class="skeleton sk-card" style="height:200px"></div></div>
    </div>`;
  }

  async function loadVendors() {
    if (_busy.vn) return; _busy.vn = true;
    try {
      const data = await API.adminGetVendorMatrix();
      vn.masters = data.masters || [];
      vn.stores = data.stores || [];
      vn.visibility = data.visibility || {};
      fillVendors();
    } catch { App.toast('โหลดไม่สำเร็จ', 'error'); }
    finally { _busy.vn = false; }
  }

  function fillVendors() {
    const list = vn.search ? vn.masters.filter(m => m.supplier_name.toLowerCase().includes(vn.search.toLowerCase())) : vn.masters;
    document.getElementById('vn-count').textContent = `🏪 Vendor Matrix (${list.length} vendors × ${vn.stores.length} stores)`;
    const el = document.getElementById('vn-table');
    if (!el) return;
    if (!list.length) { el.innerHTML = '<div class="empty-state">ยังไม่มี Vendor</div>'; return; }
    el.innerHTML = `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th style="min-width:120px">Vendor</th>${vn.stores.map(s => `<th style="text-align:center;font-size:10px;min-width:40px">${e(s.store_id)}</th>`).join('')}</tr></thead>
    <tbody>${list.map(m => {
      const vis = vn.visibility[m.supplier_name] || {};
      return `<tr>
        <td style="font-size:11px;font-weight:600">${e(m.supplier_name)}</td>
        ${vn.stores.map(s => {
          const cell = vis[s.store_id];
          const on = cell?.is_active !== false;
          const hasRow = !!cell;
          return `<td style="text-align:center"><div class="toggle-sw${on && hasRow ? ' on' : ''}" style="margin:0 auto" onclick="Scr4.vnToggle('${e(m.supplier_name)}','${s.store_id}',${!(on && hasRow)})"></div></td>`;
        }).join('')}
      </tr>`;
    }).join('')}</tbody></table></div>`;
  }

  function vnSearch(val) { vn.search = val; fillVendors(); }

  async function vnToggle(supplierName, storeId, newState) {
    if (!vn.visibility[supplierName]) vn.visibility[supplierName] = {};
    const prev = vn.visibility[supplierName][storeId];
    vn.visibility[supplierName][storeId] = { id: prev?.id || 'new', is_active: newState };
    fillVendors();
    try { await API.adminToggleVendor({ supplier_name: supplierName, store_id: storeId, is_active: newState }); }
    catch { vn.visibility[supplierName][storeId] = prev || undefined; fillVendors(); App.toast('อัพเดทไม่สำเร็จ', 'error'); }
  }

  function vnAdd() {
    App.showDialog(`<div class="popup-sheet" style="width:320px">
      <div class="popup-header"><div class="popup-title">+ Add Vendor</div><button class="popup-close" onclick="App.closeDialog()">✕</button></div>
      <div class="fg"><label class="fl">Vendor Name <span class="req">*</span></label><input class="fi" id="vn-name"></div>
      <div class="fg"><label class="fl">เพิ่มให้ร้าน</label><select class="fi" id="vn-store"><option value="">— ทุกร้าน —</option>${vn.stores.map(s => `<option value="${s.store_id}">${e(s.store_name || s.store_id)}</option>`).join('')}</select></div>
      <button class="btn btn-gold btn-full" id="vn-save" onclick="Scr4.vnSaveNew()">💾 Save</button>
    </div>`);
  }

  async function vnSaveNew() {
    const name = document.getElementById('vn-name')?.value?.trim();
    if (!name) return App.toast('กรุณาใส่ชื่อ Vendor', 'error');
    const storeId = document.getElementById('vn-store')?.value;
    const btn = document.getElementById('vn-save'); if (btn) btn.disabled = true;
    try {
      if (storeId) {
        await API.createVendor({ store_id: storeId, vendor_name: name });
      } else {
        // Create for all stores
        for (const s of vn.stores) { await API.createVendor({ store_id: s.store_id, vendor_name: name }); }
      }
      App.closeDialog();
      App.toast(`สร้าง "${name}" สำเร็จ`, 'success');
      loadVendors(); // reload matrix
    } catch (err) { App.toast(err.message || 'สร้างไม่สำเร็จ', 'error'); }
    finally { if (btn) btn.disabled = false; }
  }


  // ═══════════════════════════════════════════
  // CONFIG — Global (1 config for all stores)
  // ═══════════════════════════════════════════
  let cfg = {};

  function renderConfig() {
    return `${toolbar('Config')}
    <div class="content" id="cfg-content">
      <div class="sl" style="margin-top:0">⚙️ Global Config</div>
      <div style="font-size:10px;color:var(--t3);margin-bottom:10px">ตั้งค่ากลาง — ใช้ร่วมกันทุกร้าน</div>
      <div id="cfg-form"><div class="skeleton sk-card" style="height:200px"></div></div>
    </div>`;
  }

  async function loadConfig() {
    if (_busy.cfg) return; _busy.cfg = true;
    try {
      const data = await API.adminGetSettings();
      cfg = data.settings || {};
      fillConfig();
    } catch { App.toast('โหลดไม่สำเร็จ', 'error'); }
    finally { _busy.cfg = false; }
  }

  function fillConfig() {
    const el = document.getElementById('cfg-form');
    if (!el) return;
    el.innerHTML = `<div class="card">
      <div style="font-size:12px;font-weight:700;margin-bottom:10px">💰 Cash & Edit Window</div>
      <div class="fg"><label class="fl">Cash Tolerance ($)</label><input class="fi" type="number" step="0.01" id="cfg-tol" value="${cfg.cash_mismatch_tolerance || 2}" style="width:100px"></div>
      <div class="fg"><label class="fl">Edit Window (days)</label><input class="fi" type="number" id="cfg-days" value="${cfg.backdate_limit_days || 3}" style="width:100px"></div>
      <div class="fg"><label class="fl">Require Photos</label><div class="toggle-sw${cfg.require_photos !== false ? ' on' : ''}" id="cfg-photos" onclick="this.classList.toggle('on')"></div></div>
      <div class="fg" style="margin-bottom:0"><label class="fl">Auto-sync after edit window</label><div class="toggle-sw${cfg.auto_sync_after_window !== false ? ' on' : ''}" id="cfg-autosync" onclick="this.classList.toggle('on')"></div></div>
    </div>
    <div class="card" style="margin-top:10px">
      <div style="font-size:12px;font-weight:700;margin-bottom:10px">🚨 Anomaly Detection</div>
      <div class="fg"><label class="fl">Cash Variance Threshold ($)</label><input class="fi" type="number" step="0.01" id="cfg-anomaly-cash" value="${cfg.anomaly_cash_threshold || 5}" style="width:100px"></div>
      <div class="fg" style="margin-bottom:0"><label class="fl">Sales Drop Alert (%)</label><input class="fi" type="number" id="cfg-anomaly-drop" value="${cfg.anomaly_sales_drop_pct || 30}" style="width:100px"></div>
    </div>
    <div style="margin-top:12px"><button class="btn btn-gold btn-full" id="cfg-save" onclick="Scr4.cfgSave()">💾 Save Config</button></div>`;
  }

  async function cfgSave() {
    const btn = document.getElementById('cfg-save'); if (btn) btn.disabled = true;
    try {
      await API.adminUpdateSettings({
        cash_mismatch_tolerance: parseFloat(document.getElementById('cfg-tol')?.value) || 2,
        backdate_limit_days: parseInt(document.getElementById('cfg-days')?.value) || 3,
        require_photos: document.getElementById('cfg-photos')?.classList.contains('on'),
        auto_sync_after_window: document.getElementById('cfg-autosync')?.classList.contains('on'),
        anomaly_cash_threshold: parseFloat(document.getElementById('cfg-anomaly-cash')?.value) || 5,
        anomaly_sales_drop_pct: parseInt(document.getElementById('cfg-anomaly-drop')?.value) || 30,
      });
      App.toast('บันทึกสำเร็จ', 'success');
    } catch (err) { App.toast(err.message || 'บันทึกไม่สำเร็จ', 'error'); }
    finally { if (btn) btn.disabled = false; }
  }


  // ═══════════════════════════════════════════
  // USER ACCESS — Permission matrix (18 × 7)
  // ═══════════════════════════════════════════
  let ua = { perms: [], changes: [], original: [] };

  function renderAccess() {
    return `${toolbar('User Access')}
    <div class="content" id="ua-content">
      <div style="font-size:11px;color:var(--t3);margin-bottom:10px">18 functions × 7 tiers — ติ๊ก checkbox แล้วกด Save (T1/T2 only)</div>
      <div id="ua-table"><div class="skeleton sk-card" style="height:300px"></div></div>
      <div style="display:flex;gap:8px;margin-top:10px" id="ua-actions" style="display:none">
        <button class="btn btn-gold" id="ua-save" onclick="Scr4.uaSave()">💾 Save Permissions</button>
        <button class="btn btn-outline" id="ua-reset" onclick="Scr4.uaReset()">↩ Reset</button>
      </div>
    </div>`;
  }

  async function loadAccess() {
    if (_busy.ua) return; _busy.ua = true;
    try {
      const data = await API.adminGetPermissions();
      ua.perms = data.permissions || [];
      ua.original = JSON.parse(JSON.stringify(ua.perms)); // snapshot for reset
      ua.changes = [];
      fillAccess();
      toggleUaButtons();
    } catch { App.toast('โหลดไม่สำเร็จ', 'error'); }
    finally { _busy.ua = false; }
  }

  function fillAccess() {
    const el = document.getElementById('ua-table');
    if (!el || !ua.perms.length) return;

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
        rows += `<tr class="section-row"><td colspan="8">${e(fn.group.toUpperCase())}</td></tr>`;
      }
      rows += `<tr><td><div style="font-weight:600;font-size:11px">${e(fn.name)}</div><div style="font-size:9px;color:var(--t4)">${e(key)}</div></td>`;
      tiers.forEach(t => {
        const checked = fn.tiers[t] ? 'checked' : '';
        rows += `<td style="text-align:center"><input type="checkbox" class="ua-cb" data-key="${key}" data-tier="${t}" ${checked} onchange="Scr4.uaToggle('${key}','${t}',this.checked)"></td>`;
      });
      rows += '</tr>';
    }

    el.innerHTML = `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th style="min-width:140px">Function</th>${tiers.map(t => `<th>${t}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function uaToggle(key, tier, checked) {
    const p = ua.perms.find(x => x.function_key === key && x.tier_id === tier);
    if (!p) return;
    p.is_allowed = checked;
    const existing = ua.changes.findIndex(c => c.function_key === key && c.tier_id === tier);
    if (existing >= 0) ua.changes.splice(existing, 1);
    // Only track if different from original
    const orig = ua.original.find(x => x.function_key === key && x.tier_id === tier);
    if (orig && orig.is_allowed !== checked) {
      ua.changes.push({ function_key: key, tier_id: tier, is_allowed: checked });
    }
    toggleUaButtons();
  }

  function toggleUaButtons() {
    const el = document.getElementById('ua-actions');
    if (el) el.style.display = ua.changes.length > 0 ? 'flex' : 'none';
  }

  function uaReset() {
    ua.perms = JSON.parse(JSON.stringify(ua.original));
    ua.changes = [];
    fillAccess();
    toggleUaButtons();
    App.toast('Reset แล้ว', 'info');
  }

  async function uaSave() {
    if (!ua.changes.length) return;
    const cnt = ua.changes.length;
    const btn = document.getElementById('ua-save'); if (btn) btn.disabled = true;
    try {
      await API.adminBatchUpdatePermissions(ua.changes);
      ua.original = JSON.parse(JSON.stringify(ua.perms)); // update snapshot
      ua.changes = [];
      toggleUaButtons();
      App.toast(`อัพเดท ${cnt} permissions สำเร็จ`, 'success');
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


  // ═══════════════════════════════════════════
  // C5: ADMIN REPORT DASHBOARD — Monthly summary (7 sections)
  // ═══════════════════════════════════════════
  let rd = { data: null, month: '' };

  function rdMonthLabel(m) { const p = m.split('-'); const ms = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return ms[parseInt(p[1])] + ' ' + p[0]; }

  function renderReportDash() {
    rd.month = rd.month || new Date().toISOString().substring(0, 7);
    return `${toolbar('Report Dashboard')}
    <div class="content" id="rd-content">
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:4px 0 10px;font-size:13px;font-weight:600">
        <span class="dbar-btn" onclick="Scr4.rdMonthNav(-1)">‹</span>
        <span id="rd-month-label">📊 ${rdMonthLabel(rd.month)}</span>
        <span class="dbar-btn" onclick="Scr4.rdMonthNav(1)">›</span>
      </div>
      <div id="rd-kpi" class="kpi-row" style="grid-template-columns:1fr 1fr 1fr"><div class="skeleton sk-kpi"></div><div class="skeleton sk-kpi"></div><div class="skeleton sk-kpi"></div></div>
      <div id="rd-kpi2" class="kpi-row" style="grid-template-columns:1fr 1fr 1fr"><div class="skeleton sk-kpi"></div><div class="skeleton sk-kpi"></div><div class="skeleton sk-kpi"></div></div>
      <div id="rd-sec2" class="skeleton sk-card" style="height:100px"></div>
      <div id="rd-sec3" class="skeleton sk-card" style="height:60px"></div>
      <div id="rd-sec4" class="skeleton sk-card" style="height:120px"></div>
      <div id="rd-sec5" class="skeleton sk-card" style="height:80px"></div>
      <div id="rd-sec6" class="skeleton sk-card" style="height:80px"></div>
      <div id="rd-sec7" class="skeleton sk-card" style="height:80px"></div>
    </div>`;
  }

  function rdMonthNav(delta) {
    const p = rd.month.split('-');
    const d = new Date(parseInt(p[0]), parseInt(p[1]) - 1 + delta, 1);
    rd.month = d.toISOString().substring(0, 7);
    document.getElementById('rd-month-label').textContent = '📊 ' + rdMonthLabel(rd.month);
    loadReportDash();
  }

  async function loadReportDash() {
    if (_busy.rd) return; _busy.rd = true;
    try {
      rd.data = await API.getReportDashboard(rd.month);
      fillReportDash();
    } catch { App.toast('โหลด Report Dashboard ไม่ได้', 'error'); }
    finally { _busy.rd = false; }
  }

  function fillReportDash() {
    const d = rd.data; if (!d) return;
    const fm = App.fmtMoney, fms = App.fmtMoneyShort;
    const k = d.kpis || {};

    // ── KPI Row 1: Sales / Expense / Net ──
    const kpi1 = document.getElementById('rd-kpi');
    if (kpi1) {
      kpi1.className = 'kpi-row'; kpi1.style.gridTemplateColumns = '1fr 1fr 1fr';
      kpi1.innerHTML = `
        <div class="kpi-box"><div class="kpi-label">💰 Total Sales</div><div class="kpi-val" style="font-size:13px;color:var(--gold)">${fms(k.total_sales || 0)}</div></div>
        <div class="kpi-box"><div class="kpi-label">🧾 Total Expense</div><div class="kpi-val" style="font-size:13px;color:var(--r)">${fms(k.total_expense || 0)}</div></div>
        <div class="kpi-box"><div class="kpi-label">📈 Net Profit</div><div class="kpi-val" style="font-size:13px;color:${(k.net_profit || 0) >= 0 ? 'var(--g)' : 'var(--r)'}">${fms(k.net_profit || 0)}</div></div>`;
    }

    // ── KPI Row 2: Days / Stores / Avg ──
    const kpi2 = document.getElementById('rd-kpi2');
    if (kpi2) {
      kpi2.className = 'kpi-row'; kpi2.style.gridTemplateColumns = '1fr 1fr 1fr';
      kpi2.innerHTML = `
        <div class="kpi-box"><div class="kpi-label">📅 Days Recorded</div><div class="kpi-val" style="font-size:14px">${k.days_recorded || 0}</div></div>
        <div class="kpi-box"><div class="kpi-label">🏪 Active Stores</div><div class="kpi-val" style="font-size:14px">${k.stores_active || 0}</div></div>
        <div class="kpi-box"><div class="kpi-label">📊 Avg/Day</div><div class="kpi-val" style="font-size:13px">${fms(k.avg_sales_per_day || 0)}</div></div>`;
    }

    // ── Sec 2: Incident Breakdown ──
    const sec2 = document.getElementById('rd-sec2');
    if (sec2) {
      const inc = d.incidents || {};
      const cats = inc.by_category || [];
      if (cats.length) {
        const maxC = Math.max(...cats.map(c => c.count), 1);
        sec2.className = 'card'; sec2.style.height = 'auto';
        sec2.innerHTML = `<div class="sl" style="margin-top:0">🔍 Incidents (${inc.total_count || 0} total · ${inc.stores_with_incidents || 0} stores)</div>
          ${cats.map(c => `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:11px">
            <span style="width:16px;text-align:center">${e(c.icon)}</span>
            <span style="min-width:100px">${e(c.category)}</span>
            <div style="flex:1;background:var(--bg3);border-radius:3px;height:14px;overflow:hidden"><div style="width:${Math.round(c.count / maxC * 100)}%;height:100%;background:var(--r);border-radius:3px;opacity:.7"></div></div>
            <span style="font-weight:600;min-width:24px;text-align:right">${c.count}</span>
          </div>`).join('')}`;
      } else { sec2.innerHTML = ''; sec2.className = ''; sec2.style.height = '0'; }
    }

    // ── Sec 3: Incident Trend ──
    const sec3 = document.getElementById('rd-sec3');
    if (sec3) {
      const trend = d.incident_trend || [];
      if (trend.length) {
        sec3.className = 'card'; sec3.style.height = 'auto';
        sec3.innerHTML = `<div class="sl" style="margin-top:0">📈 Incident Trend</div>
          <div style="display:flex;gap:4px;align-items:flex-end;height:50px">
            ${trend.map(t => {
              const maxT = Math.max(...trend.map(x => x.count), 1);
              const h = Math.max(Math.round(t.count / maxT * 40), 2);
              const day = t.date.substring(8);
              return `<div style="flex:1;text-align:center"><div style="background:var(--r);opacity:.6;height:${h}px;border-radius:2px 2px 0 0;margin:0 auto;width:80%"></div><div style="font-size:8px;color:var(--t4);margin-top:2px">${day}</div></div>`;
            }).join('')}
          </div>`;
      } else { sec3.innerHTML = ''; sec3.className = ''; sec3.style.height = '0'; }
    }

    // ── Sec 4: Store Comparison ──
    const sec4 = document.getElementById('rd-sec4');
    if (sec4) {
      const stores = d.store_comparison || [];
      if (stores.length) {
        sec4.className = 'card'; sec4.style.height = 'auto';
        sec4.innerHTML = `<div class="sl" style="margin-top:0">🏪 Store Comparison</div>
          <div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Store</th><th>Sales</th><th>Expense</th><th>Days</th><th>Avg/Day</th></tr></thead>
          <tbody>${stores.map(s => `<tr>
            <td style="font-size:10px;font-weight:600">${e(s.store_name || s.store_id)}</td>
            <td style="font-size:10px;color:var(--gold)">${fms(s.total_sales)}</td>
            <td style="font-size:10px;color:var(--r)">${fms(s.total_expense)}</td>
            <td style="font-size:10px;text-align:center">${s.days_recorded}</td>
            <td style="font-size:10px">${fms(s.avg_sales)}</td>
          </tr>`).join('')}</tbody></table></div>`;
      } else { sec4.innerHTML = '<div class="empty-state">ยังไม่มีข้อมูล</div>'; sec4.className = ''; sec4.style.height = 'auto'; }
    }

    // ── Sec 5: Leftovers ──
    const sec5 = document.getElementById('rd-sec5');
    if (sec5) {
      const left = d.leftovers || {};
      const items = left.top_items || [];
      if (items.length) {
        sec5.className = 'card'; sec5.style.height = 'auto';
        sec5.innerHTML = `<div class="sl" style="margin-top:0">🍰 Top Leftovers (${left.total_entries || 0} items)</div>
          <div style="font-size:11px">${items.map((it, i) =>
            `<div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid var(--bg3)">
              <span>${i + 1}. ${e(it.item_name)}</span>
              <span style="color:var(--t3)">×${it.total_qty} (${it.frequency} days)</span>
            </div>`
          ).join('')}</div>`;
      } else { sec5.innerHTML = ''; sec5.className = ''; sec5.style.height = '0'; }
    }

    // ── Sec 6: Weather × Sales ──
    const sec6 = document.getElementById('rd-sec6');
    if (sec6) {
      const wList = d.weather || [];
      if (wList.length && !(wList.length === 1 && wList[0].weather_type === 'unknown')) {
        sec6.className = 'card'; sec6.style.height = 'auto';
        const wIcons = { 'sunny': '☀️', 'cloudy': '☁️', 'rainy': '🌧️', 'stormy': '⛈️', 'hot': '🔥', 'cool': '❄️' };
        sec6.innerHTML = `<div class="sl" style="margin-top:0">🌤️ Weather Impact</div>
          <div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Weather</th><th>Days</th><th>Avg Sales</th></tr></thead>
          <tbody>${wList.map(w => `<tr>
            <td style="font-size:11px">${wIcons[w.weather_type] || '🌡️'} ${e(w.weather_type)}</td>
            <td style="font-size:11px;text-align:center">${w.count}</td>
            <td style="font-size:11px">${fms(w.avg_sales)}</td>
          </tr>`).join('')}</tbody></table></div>`;
      } else { sec6.innerHTML = ''; sec6.className = ''; sec6.style.height = '0'; }
    }

    // ── Sec 7: Tasks ──
    const sec7 = document.getElementById('rd-sec7');
    if (sec7) {
      const tk = d.tasks || {};
      if (tk.total > 0) {
        const pct = tk.completion_rate || 0;
        sec7.className = 'card'; sec7.style.height = 'auto';
        sec7.innerHTML = `<div class="sl" style="margin-top:0">📋 Tasks Summary</div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <div style="flex:1;background:var(--bg3);border-radius:4px;height:16px;overflow:hidden"><div style="width:${pct}%;height:100%;background:var(--g);border-radius:4px;transition:width .3s"></div></div>
            <span style="font-size:12px;font-weight:600">${pct}%</span>
          </div>
          <div style="display:flex;gap:12px;font-size:11px;margin-bottom:6px">
            <span>Total: <b>${tk.total}</b></span>
            <span style="color:var(--g)">Done: <b>${tk.done}</b></span>
            <span style="color:var(--o)">Pending: <b>${tk.pending}</b></span>
          </div>
          ${(tk.by_type || []).length ? `<div style="font-size:10px;color:var(--t3)">By type: ${(tk.by_type || []).map(t => `${e(t.type)} (${t.done}/${t.total})`).join(' · ')}</div>` : ''}`;
      } else { sec7.innerHTML = ''; sec7.className = ''; sec7.style.height = '0'; }
    }
  }


  // ═══ PUBLIC ═══
  return {
    renderAccReview, loadAccReview, arMonthNav, arSync, arConfirmSync, arUnlock, arConfirmUnlock,
    renderReportDash, loadReportDash, rdMonthNav,
    renderChannels, loadChannels, chToggle, chAdd, chSaveNew,
    renderVendors, loadVendors, vnSearch, vnToggle, vnAdd, vnSaveNew,
    renderConfig, loadConfig, cfgSave,
    renderAccess, loadAccess, uaToggle, uaSave, uaReset,
    renderAudit, auLoad, auLoadMore,
  };
})();
