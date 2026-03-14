/**
 * Version 1.0.1 | 15 MAR 2026 | Siam Palette Group
 * ═══════════════════════════════════════════
 * SPG — Sale Daily Report V2
 * screens2_sd.js — Input Screens S1-S4
 * S1: Daily Sale | S2: Expense | S3: Invoice | S4: Cash
 * Pattern: render(skeleton) → load(API) → fill(DOM)
 * ═══════════════════════════════════════════
 */

const Scr2 = (() => {
  const e = App.esc, fm = App.fmtMoney, td = App.todayStr;

  // ═══ SHARED: Date Bar ═══
  function dateBar(id, date, onChange) {
    return `<div class="dbar">
      <button class="dbar-btn" onclick="${onChange}(-1)">‹</button>
      <div class="dbar-label" id="${id}-label">${App.fmtDate(date)}</div>
      <button class="dbar-btn" onclick="${onChange}(1)">›</button>
      <input type="date" class="dbar-picker" id="${id}-picker" value="${date}" onchange="${onChange}(0,this.value)">
    </div>`;
  }

  // ═══ SHARED: Lock Banner ═══
  function lockBanner(synced) {
    if (!synced) return '';
    return '<div class="alert alert-lock">🔒 <b>ข้อมูลถูก Sync แล้ว</b> — แก้ไขไม่ได้ ติดต่อ Admin</div>';
  }

  // ═══ SHARED: Toolbar with back ═══
  function toolbar(title) {
    return `<div class="toolbar"><button class="toolbar-back" onclick="App.go('dashboard')">←</button><div class="toolbar-title">${title}</div></div>`;
  }


  // ═══════════════════════════════════════════
  // S1: DAILY SALE
  // ═══════════════════════════════════════════
  let s1 = { date: '', channels: [], amounts: {}, photoCard: null, photoCash: null, synced: false, saleId: null, _target: null };

  function renderS1(params) {
    s1.date = params?.date || s1.date || td();
    return `${toolbar('Daily Sale')}
    <div class="content" id="s1-content">
      ${App.renderStoreSelector()}
      ${dateBar('s1', s1.date, 'Scr2.s1Nav')}
      <div id="s1-lock"></div>
      <div class="sl">ช่องทางขาย</div>
      <div id="s1-channels"><div class="skeleton sk-card" style="height:200px"></div></div>
      <div class="total-bar" style="background:var(--gold-bg);border:1.5px solid var(--gold);color:var(--gold)">
        <span>ยอดรวมทั้งหมด</span><span style="font-size:18px" id="s1-total">$0.00</span>
      </div>
      <details style="margin-bottom:8px;border:1px solid var(--bd2);border-radius:var(--rd);padding:8px 10px">
        <summary style="font-size:12px;font-weight:600;cursor:pointer">▸ Cancel / ผลต่าง (ถ้ามี)</summary>
        <div style="padding-top:8px">
          <div class="fg"><label class="fl">💰 ยอด Cancel</label><input class="fi" id="s1-cancel-amt" placeholder="0.00" type="number" step="0.01"></div>
          <div class="fg"><label class="fl">📝 เหตุผล</label><input class="fi" id="s1-cancel-reason" placeholder="เช่น ลูกค้าจ่ายไม่ตรง"></div>
        </div>
      </details>
      <div class="sl">📸 Photo (mandatory)</div>
      <div style="display:flex;gap:8px">
        <div class="pbox" id="s1-photo-card" onclick="Scr2.s1PickPhoto('card')"><div>📸</div><div>Card Summary</div><div style="color:var(--r)">*</div></div>
        <div class="pbox" id="s1-photo-cash" onclick="Scr2.s1PickPhoto('cash')" style="display:none"><div>📸</div><div>Cash</div></div>
      </div>
      <input type="file" id="s1-file" accept="image/*" style="display:none" onchange="Scr2.s1HandlePhoto(event)">
      <div style="margin-top:12px"><button class="btn btn-gold btn-full" style="padding:10px" id="s1-save" onclick="Scr2.s1Save()">💾 Save</button></div>
    </div>`;
  }

  async function loadS1(params) {
    if (params?.date) s1.date = params.date;
    try {
      const data = await API.getDailySale(s1.date);
      s1.channels = App.S.channels || [];
      s1.synced = data.is_synced;
      s1.saleId = data.sale?.id || null;
      s1.amounts = {};
      s1.photoCard = data.sale?.photo_card_url || null;
      s1.photoCash = data.sale?.photo_cash_url || null;
      if (data.sale?.sd_sale_channels) data.sale.sd_sale_channels.forEach(ch => { s1.amounts[ch.channel_key] = ch.amount; });
      fillS1();
      if (data.sale) {
        const ca = document.getElementById('s1-cancel-amt');
        const cr = document.getElementById('s1-cancel-reason');
        if (ca) ca.value = data.sale.cancel_amount || '';
        if (cr) cr.value = data.sale.cancel_reason || '';
      }
    } catch (err) { App.toast('โหลดข้อมูลไม่สำเร็จ', 'error'); }
  }

  function fillS1() {
    document.getElementById('s1-lock').innerHTML = lockBanner(s1.synced);
    const el = document.getElementById('s1-channels');
    if (!el) return;
    if (!s1.channels.length) { el.innerHTML = '<div class="empty-state">ไม่มี channel config</div>'; return; }
    const icons = { card_sale: '💳', cash_sale: '💵', delivery_sale: '🛵', other: '📦' };
    el.innerHTML = s1.channels.map(ch => {
      const v = s1.amounts[ch.channel_key] ?? '';
      const ico = icons[ch.dashboard_group] || '📦';
      return `<div class="ch-row"><div class="ch-icon">${ico}</div><div style="flex:1;min-width:0">
        <div class="ch-name">${e(ch.channel_label)}</div>
        ${ch.finance_sub_category ? `<div class="ch-sub">Revenue → ${e(ch.finance_sub_category)}</div>` : ''}
      </div><input class="ch-input" type="number" step="0.01" min="0" value="${v}" data-key="${ch.channel_key}"
        oninput="Scr2.s1Recalc()" ${s1.synced ? 'disabled' : ''}></div>`;
    }).join('');
    s1Recalc();
    // Photo state
    const pc = document.getElementById('s1-photo-card');
    if (pc && s1.photoCard) { pc.innerHTML = `<img src="${s1.photoCard}" style="width:100%;height:100%;object-fit:cover;border-radius:6px">`; pc.style.border = 'none'; }
    // Disable save if synced
    const btn = document.getElementById('s1-save');
    if (btn) btn.disabled = s1.synced;
  }

  function s1Recalc() {
    let total = 0;
    document.querySelectorAll('.ch-input').forEach(inp => { total += parseFloat(inp.value) || 0; });
    const el = document.getElementById('s1-total');
    if (el) el.textContent = fm(total);
  }

  function s1Nav(delta, dateVal) {
    if (dateVal) s1.date = dateVal;
    else s1.date = App.addDays(s1.date, delta);
    const lbl = document.getElementById('s1-label');
    if (lbl) lbl.textContent = App.fmtDate(s1.date);
    const pk = document.getElementById('s1-picker');
    if (pk) pk.value = s1.date;
    loadS1();
  }

  function s1PickPhoto(target) {
    s1._target = target;
    document.getElementById('s1-file')?.click();
  }

  async function s1HandlePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      App.toast('กำลังอัพโหลด...', 'info');
      const data = await API.uploadPhoto(file, 'sale');
      if (s1._target === 'card') {
        s1.photoCard = data.url;
        const el = document.getElementById('s1-photo-card');
        if (el) { el.innerHTML = `<img src="${data.url}" style="width:100%;height:100%;object-fit:cover;border-radius:6px">`; el.style.border = 'none'; }
      } else {
        s1.photoCash = data.url;
      }
      App.toast('อัพโหลดสำเร็จ', 'success');
    } catch (err) { App.toast('อัพโหลดล้มเหลว', 'error'); }
    event.target.value = '';
  }

  async function s1Save() {
    if (s1.synced) return App.toast('ข้อมูลถูก Sync แล้ว', 'error');
    if (!s1.photoCard) return App.toast('กรุณาถ่ายรูป Card Summary', 'error');
    const channels = {};
    document.querySelectorAll('.ch-input').forEach(inp => { channels[inp.dataset.key] = inp.value || '0'; });
    const btn = document.getElementById('s1-save');
    if (btn) btn.disabled = true;
    try {
      const resp = await API.saveDailySale({
        store_id: API.getStore(), sale_date: s1.date, channels,
        photo_card_url: s1.photoCard, photo_cash_url: s1.photoCash,
        cancel_amount: document.getElementById('s1-cancel-amt')?.value || null,
        cancel_reason: document.getElementById('s1-cancel-reason')?.value || null,
      });
      s1.saleId = resp.daily_sale_id;
      // Update dashboard cache
      if (App.S.dashboard?.today && s1.date === td()) {
        App.S.dashboard.today.total_sales = resp.total_sales;
        App.S.dashboard.today.is_recorded = true;
      }
      App.toast('บันทึกสำเร็จ', 'success');
    } catch (err) { App.toast(err.message || 'บันทึกไม่สำเร็จ', 'error'); }
    finally { if (btn) btn.disabled = false; }
  }


  // ═══════════════════════════════════════════
  // S2: EXPENSE
  // ═══════════════════════════════════════════
  let s2 = { date: '', expenses: [], total: 0, synced: false };

  function renderS2(params) {
    s2.date = params?.date || s2.date || td();
    return `${toolbar('Expense')}
    <div class="content" id="s2-content">
      ${App.renderStoreSelector()}
      ${dateBar('s2', s2.date, 'Scr2.s2Nav')}
      <div id="s2-lock"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div class="sl" style="margin:0" id="s2-count">Today (0)</div>
        <button class="btn btn-gold btn-sm" id="s2-add-btn" onclick="Scr2.s2ShowPopup()">+ Add</button>
      </div>
      <div id="s2-list"><div class="skeleton sk-card"></div></div>
      <div class="total-bar" style="background:var(--rbg);border:1.5px solid var(--r);color:var(--r)" id="s2-total">
        <span>Total</span><span>$0.00</span>
      </div>
    </div>`;
  }

  async function loadS2(params) {
    if (params?.date) s2.date = params.date;
    try {
      const data = await API.getExpenses(s2.date);
      s2.expenses = data.expenses || [];
      s2.total = data.total || 0;
      s2.synced = data.is_synced;
      fillS2();
    } catch (err) { App.toast('โหลดข้อมูลไม่สำเร็จ', 'error'); }
  }

  function fillS2() {
    document.getElementById('s2-lock').innerHTML = lockBanner(s2.synced);
    const addBtn = document.getElementById('s2-add-btn');
    if (addBtn) addBtn.style.display = s2.synced ? 'none' : '';
    const cnt = document.getElementById('s2-count');
    if (cnt) cnt.textContent = `${App.fmtDate(s2.date)} (${s2.expenses.length})`;
    document.getElementById('s2-total').innerHTML = `<span>Total</span><span>-${fm(s2.total)}</span>`;

    const el = document.getElementById('s2-list');
    if (!el) return;
    if (!s2.expenses.length) { el.innerHTML = '<div class="empty-state">ยังไม่มีค่าใช้จ่าย</div>'; return; }
    el.innerHTML = s2.expenses.map(ex => `<div class="li-card">
      <div style="display:flex;justify-content:space-between">
        <div><div style="font-size:12px;font-weight:700">${e(ex.description)}</div>
        <div style="font-size:10px;color:var(--t3)">${e(ex.vendor_name)} · ${e(ex.payment_method)}</div></div>
        <div style="font-size:13px;font-weight:800;color:var(--r)">-${fm(ex.total_amount)}</div>
      </div>
      ${!s2.synced ? `<div style="display:flex;gap:4px;margin-top:6px">
        <button class="btn btn-outline btn-sm" onclick="Scr2.s2ShowPopup('${ex.id}')">✏️</button>
        <button class="btn btn-outline btn-sm" style="color:var(--r);border-color:var(--r)" onclick="Scr2.s2Delete('${ex.id}')">🗑️</button>
      </div>` : ''}
    </div>`).join('');
  }

  function s2Nav(delta, dateVal) {
    if (dateVal) s2.date = dateVal;
    else s2.date = App.addDays(s2.date, delta);
    document.getElementById('s2-label').textContent = App.fmtDate(s2.date);
    document.getElementById('s2-picker').value = s2.date;
    loadS2();
  }

  function s2ShowPopup(editId) {
    const ex = editId ? s2.expenses.find(x => x.id === editId) : null;
    const title = ex ? 'Edit Expense' : '+ Add Expense';
    const vendors = App.S.vendors || [];
    App.showDialog(`<div class="popup-sheet" style="width:400px;max-height:85dvh;overflow-y:auto">
      <div class="popup-header"><div class="popup-title">${title}</div><button class="popup-close" onclick="App.closeDialog()">✕</button></div>
      <div class="fg"><label class="fl">📅 Date</label><input class="fi" type="date" id="s2f-date" value="${ex?.expense_date || s2.date}"></div>
      <div class="fg"><label class="fl">Vendor <span class="req">*</span></label>
        <select class="fi" id="s2f-vendor"><option value="">-- เลือก Vendor --</option>${vendors.map(v => `<option value="${e(v.name)}" ${ex?.vendor_name === v.name ? 'selected' : ''}>${e(v.name)}</option>`).join('')}</select></div>
      <div class="fg"><label class="fl">Doc Number <span class="req">*</span></label><input class="fi" id="s2f-doc" value="${e(ex?.doc_number || '')}"></div>
      <div class="fg"><label class="fl">Description <span class="req">*</span></label><input class="fi" id="s2f-desc" value="${e(ex?.description || '')}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="fg"><label class="fl">Main Category <span class="req">*</span></label><input class="fi" id="s2f-maincat" value="${e(ex?.main_category || '')}"></div>
        <div class="fg"><label class="fl">Sub Category</label><input class="fi" id="s2f-subcat" value="${e(ex?.sub_category || '')}"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div class="fg"><label class="fl">Amount (ex GST) <span class="req">*</span></label><input class="fi" type="number" step="0.01" id="s2f-amt" value="${ex?.amount_ex_gst || ''}" oninput="Scr2.s2CalcTotal()"></div>
        <div class="fg"><label class="fl">GST</label><input class="fi" type="number" step="0.01" id="s2f-gst" value="${ex?.gst || '0'}" oninput="Scr2.s2CalcTotal()"></div>
        <div class="fg"><label class="fl">Total <span class="tag tag-b" style="font-size:8px">AUTO</span></label><input class="fi" id="s2f-total" readonly style="background:var(--bg3)"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="fg"><label class="fl">💳 Payment</label><div class="chips" style="margin:0" id="s2f-pm">
          <div class="chip ${(!ex || ex?.payment_method === 'cash') ? 'on' : ''}" onclick="Scr2.s2SetPm('cash',this)">Cash</div>
          <div class="chip ${ex?.payment_method === 'card' ? 'on' : ''}" onclick="Scr2.s2SetPm('card',this)">Card</div>
        </div></div>
        <div class="fg"><label class="fl">📸 Photo <span class="req">*</span></label>
          <div class="pbox" style="width:60px;height:60px" id="s2f-photo-box" onclick="document.getElementById('s2f-file').click()">
            ${ex?.photo_url ? `<img src="${ex.photo_url}" style="width:100%;height:100%;object-fit:cover;border-radius:6px">` : '<div>📸</div>'}
          </div>
          <input type="file" id="s2f-file" accept="image/*" style="display:none" onchange="Scr2.s2HandlePhoto(event)">
        </div>
      </div>
      <input type="hidden" id="s2f-photo-url" value="${ex?.photo_url || ''}">
      <input type="hidden" id="s2f-id" value="${editId || ''}">
      <input type="hidden" id="s2f-pm-val" value="${ex?.payment_method || 'cash'}">
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-gold btn-full" id="s2f-save" onclick="Scr2.s2Save()">💾 บันทึก</button>
        <button class="btn btn-outline" style="flex:0 0 70px" onclick="App.closeDialog()">ยกเลิก</button>
      </div>
    </div>`);
    s2CalcTotal();
  }

  function s2SetPm(val, el) {
    document.getElementById('s2f-pm-val').value = val;
    el.parentElement.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
    el.classList.add('on');
  }

  function s2CalcTotal() {
    const a = parseFloat(document.getElementById('s2f-amt')?.value) || 0;
    const g = parseFloat(document.getElementById('s2f-gst')?.value) || 0;
    const el = document.getElementById('s2f-total');
    if (el) el.value = fm(a + g);
  }

  async function s2HandlePhoto(event) {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      App.toast('กำลังอัพโหลด...', 'info');
      const data = await API.uploadPhoto(file, 'expense');
      document.getElementById('s2f-photo-url').value = data.url;
      const box = document.getElementById('s2f-photo-box');
      if (box) { box.innerHTML = `<img src="${data.url}" style="width:100%;height:100%;object-fit:cover;border-radius:6px">`; box.style.border = 'none'; }
      App.toast('อัพโหลดสำเร็จ', 'success');
    } catch { App.toast('อัพโหลดล้มเหลว', 'error'); }
    event.target.value = '';
  }

  async function s2Save() {
    const btn = document.getElementById('s2f-save'); if (btn) btn.disabled = true;
    try {
      await API.saveExpense({
        store_id: API.getStore(), expense_date: document.getElementById('s2f-date')?.value || s2.date,
        vendor_name: document.getElementById('s2f-vendor')?.value,
        doc_number: document.getElementById('s2f-doc')?.value,
        description: document.getElementById('s2f-desc')?.value,
        main_category: document.getElementById('s2f-maincat')?.value,
        sub_category: document.getElementById('s2f-subcat')?.value,
        amount_ex_gst: document.getElementById('s2f-amt')?.value,
        gst: document.getElementById('s2f-gst')?.value || '0',
        payment_method: document.getElementById('s2f-pm-val')?.value || 'cash',
        photo_url: document.getElementById('s2f-photo-url')?.value,
        expense_id: document.getElementById('s2f-id')?.value || null,
      });
      App.closeDialog();
      App.toast('บันทึกสำเร็จ', 'success');
      loadS2(); // re-fetch list
    } catch (err) { App.toast(err.message || 'บันทึกไม่สำเร็จ', 'error'); }
    finally { if (btn) btn.disabled = false; }
  }

  async function s2Delete(id) {
    App.showDialog(`<div class="popup-sheet" style="width:300px;text-align:center">
      <div style="font-size:15px;font-weight:700;margin-bottom:12px">ลบรายการนี้?</div>
      <div style="display:flex;gap:8px;justify-content:center">
        <button class="btn btn-outline" onclick="App.closeDialog()">ยกเลิก</button>
        <button class="btn btn-primary" style="background:var(--r)" onclick="Scr2.s2ConfirmDelete('${id}')">ลบ</button>
      </div>
    </div>`);
  }

  async function s2ConfirmDelete(id) {
    try {
      await API.deleteExpense(id);
      App.closeDialog();
      App.toast('ลบแล้ว', 'success');
      // Remove from memory
      s2.expenses = s2.expenses.filter(x => x.id !== id);
      s2.total = s2.expenses.reduce((s, x) => s + (x.total_amount || 0), 0);
      fillS2();
    } catch (err) { App.toast(err.message || 'ลบไม่สำเร็จ', 'error'); }
  }


  // ═══════════════════════════════════════════
  // S3: INVOICE
  // ═══════════════════════════════════════════
  let s3 = { invoices: [], summary: {}, synced: false, dateFrom: '', dateTo: '' };

  function renderS3List() {
    const now = td();
    s3.dateFrom = s3.dateFrom || now.substring(0, 7) + '-01';
    s3.dateTo = s3.dateTo || now;
    return `${toolbar('Invoice')}
    <div class="content" id="s3-content">
      ${App.renderStoreSelector()}
      <div id="s3-lock"></div>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;font-size:12px">
        <span>📅</span>
        <input class="fi" type="date" style="flex:1;padding:6px 8px" id="s3-from" value="${s3.dateFrom}" onchange="Scr2.s3Reload()">
        <span style="color:var(--t3)">→</span>
        <input class="fi" type="date" style="flex:1;padding:6px 8px" id="s3-to" value="${s3.dateTo}" onchange="Scr2.s3Reload()">
      </div>
      <button class="btn btn-gold btn-full" style="margin-bottom:10px;padding:10px" onclick="App.go('invoice-form')">+ New Invoice →</button>
      <div id="s3-kpi" class="kpi-row kpi-3"><div class="skeleton sk-kpi"></div><div class="skeleton sk-kpi"></div><div class="skeleton sk-kpi"></div></div>
      <div id="s3-list"><div class="skeleton sk-card"></div></div>
    </div>`;
  }

  async function loadS3List() {
    try {
      s3.dateFrom = document.getElementById('s3-from')?.value || s3.dateFrom;
      s3.dateTo = document.getElementById('s3-to')?.value || s3.dateTo;
      const data = await API.getInvoices({ store_id: API.getStore(), date_from: s3.dateFrom, date_to: s3.dateTo });
      s3.invoices = data.invoices || [];
      s3.summary = data.summary || {};
      fillS3List();
    } catch (err) { App.toast('โหลดข้อมูลไม่สำเร็จ', 'error'); }
  }

  function fillS3List() {
    const sm = s3.summary;
    document.getElementById('s3-kpi').innerHTML = `
      <div class="kpi-box"><div class="kpi-label">Total</div><div class="kpi-val" style="font-size:14px">${sm.count || 0}</div></div>
      <div class="kpi-box"><div class="kpi-label">Unpaid</div><div class="kpi-val" style="font-size:14px;color:var(--r)">${fm(sm.unpaid_total || 0)}</div></div>
      <div class="kpi-box"><div class="kpi-label">Paid</div><div class="kpi-val" style="font-size:14px;color:var(--g)">${fm((sm.total || 0) - (sm.unpaid_total || 0))}</div></div>`;

    const el = document.getElementById('s3-list');
    if (!el) return;
    if (!s3.invoices.length) { el.innerHTML = '<div class="empty-state">ยังไม่มี Invoice</div>'; return; }
    el.innerHTML = s3.invoices.map(inv => {
      const isPaid = inv.payment_status === 'paid';
      const bc = isPaid ? 'var(--g)' : 'var(--r)';
      return `<div class="li-card" style="border-left-color:${bc};cursor:pointer" onclick="App.go('invoice-form',{id:'${inv.id}'})">
        <div style="display:flex;justify-content:space-between">
          <div><div style="font-size:12px;font-weight:700">${e(inv.invoice_no)}</div>
          <div style="font-size:10px;color:var(--t3)">${e(inv.vendor_name)}</div></div>
          <div style="text-align:right"><div style="font-size:13px;font-weight:700${isPaid ? ';color:var(--g)' : ''}">${fm(inv.total_amount)}</div>
          <span class="sts ${isPaid ? 'sts-ok' : 'sts-err'}">${isPaid ? 'Paid' : 'Unpaid'}</span></div>
        </div>
      </div>`;
    }).join('');
  }

  function s3Reload() { loadS3List(); }

  // ─── S3 FORM ───
  let s3f = { id: null, photoUrl: '' };

  function renderS3Form(params) {
    s3f.id = params?.id || null;
    return `${toolbar(s3f.id ? 'Edit Invoice' : 'New Invoice')}
    <div class="content" id="s3f-content">
      <div class="card">
        <div style="display:flex;gap:4px;margin-bottom:10px"><span class="tag tag-gray">Store: ${e(API.getStore())}</span><span class="tag tag-b">Invoice</span></div>
        <div class="fg"><label class="fl">📅 Issue Date <span class="req">*</span></label><input class="fi" type="date" id="s3f-date" value="${td()}"></div>
        <div class="fg"><label class="fl">Invoice No <span class="req">*</span></label><input class="fi" id="s3f-no"></div>
        <div class="fg"><label class="fl">Vendor <span class="req">*</span></label>
          <select class="fi" id="s3f-vendor"><option value="">-- เลือก --</option>${(App.S.vendors || []).map(v => `<option value="${e(v.name)}">${e(v.name)}</option>`).join('')}</select></div>
        <div class="fg"><label class="fl">Description <span class="req">*</span></label><input class="fi" id="s3f-desc"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
          <div class="fg"><label class="fl">Amount <span class="req">*</span></label><input class="fi" type="number" step="0.01" id="s3f-amt" oninput="Scr2.s3fCalc()"></div>
          <div class="fg"><label class="fl">GST</label><input class="fi" type="number" step="0.01" id="s3f-gst" value="0" oninput="Scr2.s3fCalc()"></div>
          <div class="fg"><label class="fl">Total <span class="tag tag-b" style="font-size:8px">AUTO</span></label><input class="fi" id="s3f-total" readonly style="background:var(--bg3)"></div>
        </div>
        <div class="divider"></div>
        <div style="padding:8px 10px;background:var(--rbg);border-radius:var(--rd);margin-bottom:8px">
          <span style="font-size:12px;font-weight:700;color:var(--r)">Invoice = Unpaid เสมอ</span>
          <div style="font-size:10px;color:var(--t3);margin-top:2px">จ่ายผ่านหน้า Expense เมื่อถึงวัน Due</div>
        </div>
        <div class="fg"><label class="fl">Due Date <span class="req">*</span></label><input class="fi" type="date" id="s3f-due"></div>
        <div class="fg"><label class="fl">📝 Note</label><input class="fi" id="s3f-note"></div>
        <div class="fg"><label class="fl">📸 Invoice Photo <span class="req">*</span></label>
          <div class="pbox" id="s3f-photo-box" onclick="document.getElementById('s3f-file').click()"><div>📸</div><div style="font-size:8px">* บังคับ</div></div>
          <input type="file" id="s3f-file" accept="image/*" style="display:none" onchange="Scr2.s3fHandlePhoto(event)">
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-gold" style="flex:1;padding:10px" id="s3f-save" onclick="Scr2.s3fSave()">💾 บันทึก</button>
        <button class="btn btn-outline" style="flex:0.4" onclick="App.go('invoice')">ยกเลิก</button>
      </div>
    </div>`;
  }

  async function loadS3Form(params) {
    if (!params?.id) return;
    const inv = s3.invoices.find(x => x.id === params.id);
    if (!inv) return;
    s3f.id = inv.id;
    s3f.photoUrl = inv.photo_url || '';
    document.getElementById('s3f-date').value = inv.invoice_date;
    document.getElementById('s3f-no').value = inv.invoice_no;
    document.getElementById('s3f-vendor').value = inv.vendor_name;
    document.getElementById('s3f-desc').value = inv.description;
    document.getElementById('s3f-amt').value = inv.amount_ex_gst;
    document.getElementById('s3f-gst').value = inv.gst;
    document.getElementById('s3f-due').value = inv.due_date || '';
    document.getElementById('s3f-note').value = inv.note || '';
    if (inv.photo_url) {
      const box = document.getElementById('s3f-photo-box');
      if (box) { box.innerHTML = `<img src="${inv.photo_url}" style="width:100%;height:100%;object-fit:cover;border-radius:6px">`; }
    }
    s3fCalc();
  }

  function s3fCalc() {
    const a = parseFloat(document.getElementById('s3f-amt')?.value) || 0;
    const g = parseFloat(document.getElementById('s3f-gst')?.value) || 0;
    document.getElementById('s3f-total').value = fm(a + g);
  }

  async function s3fHandlePhoto(event) {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      App.toast('กำลังอัพโหลด...', 'info');
      const data = await API.uploadPhoto(file, 'invoice');
      s3f.photoUrl = data.url;
      const box = document.getElementById('s3f-photo-box');
      if (box) { box.innerHTML = `<img src="${data.url}" style="width:100%;height:100%;object-fit:cover;border-radius:6px">`; }
      App.toast('อัพโหลดสำเร็จ', 'success');
    } catch { App.toast('อัพโหลดล้มเหลว', 'error'); }
    event.target.value = '';
  }

  async function s3fSave() {
    if (!s3f.photoUrl) return App.toast('กรุณาถ่ายรูป Invoice', 'error');
    const btn = document.getElementById('s3f-save'); if (btn) btn.disabled = true;
    try {
      await API.saveInvoice({
        store_id: API.getStore(), invoice_date: document.getElementById('s3f-date')?.value,
        invoice_no: document.getElementById('s3f-no')?.value,
        vendor_name: document.getElementById('s3f-vendor')?.value,
        description: document.getElementById('s3f-desc')?.value,
        amount_ex_gst: document.getElementById('s3f-amt')?.value,
        gst: document.getElementById('s3f-gst')?.value || '0',
        due_date: document.getElementById('s3f-due')?.value,
        note: document.getElementById('s3f-note')?.value,
        photo_url: s3f.photoUrl,
        invoice_id: s3f.id,
      });
      App.toast('บันทึกสำเร็จ', 'success');
      App.go('invoice');
    } catch (err) { App.toast(err.message || 'บันทึกไม่สำเร็จ', 'error'); }
    finally { if (btn) btn.disabled = false; }
  }


  // ═══════════════════════════════════════════
  // S4: CASH ON HAND
  // ═══════════════════════════════════════════
  let s4 = { date: '', cashSale: 0, cashExpend: 0, expected: 0, tolerance: 2, existing: null };

  function renderS4() {
    s4.date = s4.date || td();
    return `${toolbar('Cash On Hand')}
    <div class="content" id="s4-content">
      ${App.renderStoreSelector()}
      ${dateBar('s4', s4.date, 'Scr2.s4Nav')}
      <div class="sl">🧮 Auto-Calculation</div>
      <div id="s4-calc"><div class="skeleton sk-card" style="height:140px"></div></div>
      <div class="sl">✍️ นับเงินสดจริง</div>
      <div class="card">
        <div class="fg"><label class="fl">④ Actual Cash <span class="req">*</span></label>
          <input class="fi fi-lg" type="number" step="0.01" id="s4-actual" placeholder="0.00" oninput="Scr2.s4Check()"></div>
      </div>
      <div id="s4-result"></div>
      <div id="s4-mismatch" style="display:none">
        <div class="fg"><label class="fl">เหตุผลเงินไม่ตรง <span class="req">*</span></label>
          <input class="fi" id="s4-reason" placeholder="อธิบายเหตุผล"></div>
      </div>
      <div class="sl">📸 ถ่ายรูปเงินสด (บังคับ)</div>
      <div class="pbox" style="width:100%;height:50px;flex-direction:row;gap:8px" id="s4-photo-box" onclick="document.getElementById('s4-file').click()">
        <div>💵</div><div>ถ่ายรูปเงินสดก่อนส่ง</div><div style="color:var(--r)">*</div>
      </div>
      <input type="file" id="s4-file" accept="image/*" style="display:none" onchange="Scr2.s4HandlePhoto(event)">
      <input type="hidden" id="s4-photo-url">
      <div class="sl">🤝 Handover</div>
      <div id="s4-handover"><div class="empty-state">ยังไม่มีข้อมูล</div></div>
      <div style="margin-top:12px"><button class="btn btn-gold btn-full" style="padding:10px" id="s4-submit" onclick="Scr2.s4Submit()">💾 Submit</button></div>
    </div>`;
  }

  async function loadS4() {
    try {
      const data = await API.getCash(s4.date);
      s4.cashSale = data.cash_sale || 0;
      s4.cashExpend = data.cash_expend || 0;
      s4.expected = data.expected_cash || 0;
      s4.tolerance = data.tolerance || 2;
      s4.existing = data.existing;
      fillS4();
    } catch (err) { App.toast('โหลดข้อมูลไม่สำเร็จ', 'error'); }
  }

  function fillS4() {
    document.getElementById('s4-calc').innerHTML = `<div class="card" style="border-color:var(--gold);background:var(--gold-bg)">
      <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:6px;align-items:center;text-align:center">
        <div><div style="font-size:10px;color:var(--t2)">① Cash Sale</div><div style="font-size:9px;color:var(--b)">AUTO จาก S1</div><div style="font-size:18px;font-weight:700;color:var(--g)">${fm(s4.cashSale)}</div></div>
        <div style="font-size:20px;color:var(--t3)">−</div>
        <div><div style="font-size:10px;color:var(--t2)">② Cash Expend</div><div style="font-size:9px;color:var(--b)">AUTO จาก S2</div><div style="font-size:18px;font-weight:700;color:var(--r)">${fm(s4.cashExpend)}</div></div>
      </div>
      <div style="text-align:center;margin:8px 0;font-size:18px;color:var(--t3)">=</div>
      <div style="text-align:center"><div style="font-size:10px;color:var(--t2)">③ Expected Cash</div><div style="font-size:24px;font-weight:700;color:var(--gold)">${fm(s4.expected)}</div></div>
    </div>`;

    if (s4.existing) {
      document.getElementById('s4-actual').value = s4.existing.actual_cash;
      s4Check();
      if (s4.existing.cashier_photo_url) {
        document.getElementById('s4-photo-url').value = s4.existing.cashier_photo_url;
        const box = document.getElementById('s4-photo-box');
        if (box) box.innerHTML = `<img src="${s4.existing.cashier_photo_url}" style="height:48px;border-radius:6px"> <span>เปลี่ยนรูป</span>`;
      }
      fillS4Handover();
    }
  }

  function s4Check() {
    const actual = parseFloat(document.getElementById('s4-actual')?.value) || 0;
    const diff = actual - s4.expected;
    const matched = Math.abs(diff) <= s4.tolerance;
    const el = document.getElementById('s4-result');
    if (!el) return;
    if (actual === 0 && !s4.existing) { el.innerHTML = ''; document.getElementById('s4-mismatch').style.display = 'none'; return; }
    if (matched) {
      el.innerHTML = `<div class="alert alert-ok">✅ Match — ผลต่าง ${fm(Math.abs(diff))}</div>`;
      document.getElementById('s4-mismatch').style.display = 'none';
    } else {
      el.innerHTML = `<div class="alert alert-err">⚠️ ไม่ตรง — ผลต่าง ${diff >= 0 ? '+' : ''}${fm(diff)}</div>`;
      document.getElementById('s4-mismatch').style.display = '';
    }
  }

  function fillS4Handover() {
    const c = s4.existing;
    if (!c) return;
    const steps = [
      { label: 'Cashier counted', done: !!c.cashier_confirmed_at, by: c.cashier_confirmed_by },
      { label: 'Manager confirmed', done: c.handover_status !== 'with_cashier', by: c.manager_confirmed_by },
      { label: 'Owner confirmed', done: c.handover_status === 'owner' || c.handover_status === 'deposited', by: c.owner_confirmed_by },
      { label: 'Deposited', done: c.handover_status === 'deposited' },
    ];
    const canConfirm = c.handover_status !== 'deposited';

    document.getElementById('s4-handover').innerHTML = `<div class="card">
      ${steps.map(s => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:11px">
        <div style="width:8px;height:8px;border-radius:50%;background:${s.done ? 'var(--g)' : 'var(--o)'}"></div>
        <div>${s.done ? '<b>' : ''}${s.label}${s.done ? '</b>' : ''}${s.by ? ' · ' + e(s.by) : ''}</div>
      </div>`).join('')}
      ${canConfirm ? `<button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="Scr2.s4Confirm()">✓ Confirm Next</button>` : ''}
    </div>`;
  }

  function s4Nav(delta, dateVal) {
    if (dateVal) s4.date = dateVal;
    else s4.date = App.addDays(s4.date, delta);
    document.getElementById('s4-label').textContent = App.fmtDate(s4.date);
    document.getElementById('s4-picker').value = s4.date;
    loadS4();
  }

  async function s4HandlePhoto(event) {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      App.toast('กำลังอัพโหลด...', 'info');
      const data = await API.uploadPhoto(file, 'cash');
      document.getElementById('s4-photo-url').value = data.url;
      const box = document.getElementById('s4-photo-box');
      if (box) box.innerHTML = `<img src="${data.url}" style="height:48px;border-radius:6px"> <span>เปลี่ยนรูป</span>`;
      App.toast('อัพโหลดสำเร็จ', 'success');
    } catch { App.toast('อัพโหลดล้มเหลว', 'error'); }
    event.target.value = '';
  }

  async function s4Submit() {
    const photo = document.getElementById('s4-photo-url')?.value;
    if (!photo) return App.toast('กรุณาถ่ายรูปเงินสด', 'error');
    const actual = document.getElementById('s4-actual')?.value;
    if (!actual) return App.toast('กรุณาใส่จำนวนเงินจริง', 'error');

    const btn = document.getElementById('s4-submit'); if (btn) btn.disabled = true;
    try {
      await API.submitCash({
        store_id: API.getStore(), cash_date: s4.date,
        actual_cash: actual, photo_url: photo,
        mismatch_reason: document.getElementById('s4-reason')?.value || '',
      });
      App.toast('บันทึกสำเร็จ', 'success');
      loadS4();
    } catch (err) { App.toast(err.message || 'บันทึกไม่สำเร็จ', 'error'); }
    finally { if (btn) btn.disabled = false; }
  }

  async function s4Confirm() {
    if (!s4.existing?.id) return;
    try {
      const resp = await API.confirmHandover(s4.existing.id);
      App.toast(`${resp.previous} → ${resp.new_status}`, 'success');
      loadS4();
    } catch (err) { App.toast(err.message || 'ยืนยันไม่สำเร็จ', 'error'); }
  }


  // ═══ PUBLIC ═══
  return {
    // S1
    renderS1, loadS1, s1Nav, s1Recalc, s1PickPhoto, s1HandlePhoto, s1Save,
    // S2
    renderS2, loadS2, s2Nav, s2ShowPopup, s2SetPm, s2CalcTotal, s2HandlePhoto, s2Save, s2Delete, s2ConfirmDelete,
    // S3
    renderS3List, loadS3List, s3Reload, s3fCalc, s3fHandlePhoto, s3fSave,
    renderS3Form, loadS3Form,
    // S4
    renderS4, loadS4, s4Nav, s4Check, s4HandlePhoto, s4Submit, s4Confirm,
  };
})();
