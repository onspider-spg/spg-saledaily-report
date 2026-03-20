/**
 * Version 1.6.1 | 16 MAR 2026 | Siam Palette Group
 * ═══════════════════════════════════════════
 * SPG — Sale Daily Report V2
 * screens3_sd.js — History + Report Screens
 * S5: Sale History | S6: Expense History
 * S8: Daily Report (3 tabs) | Tasks | Daily Hub
 * ═══════════════════════════════════════════
 */

const Scr3 = (() => {
  const e = App.esc, fm = App.fmtMoney, fms = App.fmtMoneyShort, td = App.todayStr;
  const _busy = {}; // in-flight guard

  // ═══ CONSTANTS ═══
  const INCIDENT_CATS = [
    { key: 'food_quality', icon: '🍽️', name: 'Food Quality', desc: 'รสชาติเปลี่ยน, ไม่อร่อย, texture ผิดปกติ' },
    { key: 'contamination', icon: '🦠', name: 'Contamination', desc: 'ผมในอาหาร, เศษวัตถุ, แมลง' },
    { key: 'service_delay', icon: '⏱️', name: 'Service Delay', desc: 'ออเดอร์ช้า, คิวยาว, ลูกค้ารอนาน' },
    { key: 'wrong_order', icon: '🔄', name: 'Wrong Order', desc: 'เสิร์ฟผิดเมนู, ผิดตัวเลือก' },
    { key: 'complaint', icon: '💢', name: 'Customer Complaint', desc: 'บ่นโดยตรง, ขอคืนเงิน, Review' },
    { key: 'waste', icon: '🗑️', name: 'Waste / เหลือผิดปกติ', desc: 'เมนูเหลือเยอะ, ทิ้งบ่อย' },
    { key: 'staff', icon: '👤', name: 'Staff Issue', desc: 'ขาดคน, ไม่แจ้งออก, พฤติกรรม' },
  ];
  const LEVEL_OPTS = [
    { key: 'little', label: '🟢 นิดหน่อย' },
    { key: 'half', label: '🟡 ครึ่งนึง' },
    { key: 'almost_full', label: '🔴 เกือบหมด' },
    { key: 'full', label: '⚫ ทั้งจาน' },
  ];

  function toolbar(title) {
    return `<div class="toolbar"><button class="toolbar-back" onclick="App.go('dashboard')">←</button><div class="toolbar-title">${title}</div></div>`;
  }

  // ═══════════════════════════════════════════
  // S5: SALE HISTORY (date range, default 3 days, LIMIT 10, load more, sync lock)
  // ═══════════════════════════════════════════
  let s5 = { records: [], offset: 0, dateFrom: '', dateTo: '' };

  function renderS5() {
    const now = td();
    s5.dateTo = s5.dateTo || now;
    s5.dateFrom = s5.dateFrom || App.addDays(now, -3);
    return `${toolbar('Sale History')}
    <div class="content" id="s5-content">
      ${App.renderStoreSelector()}
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;font-size:12px">
        <span>📅</span>
        <input class="fi" type="date" style="flex:1;padding:6px 8px" id="s5-from" value="${s5.dateFrom}" onchange="Scr3.s5Reload()">
        <span style="color:var(--t3)">→</span>
        <input class="fi" type="date" style="flex:1;padding:6px 8px" id="s5-to" value="${s5.dateTo}" onchange="Scr3.s5Reload()">
      </div>
      <div id="s5-kpi" class="kpi-row kpi-3"><div class="skeleton sk-kpi"></div><div class="skeleton sk-kpi"></div><div class="skeleton sk-kpi"></div></div>
      <div id="s5-list"><div class="skeleton sk-card"></div></div>
      <div id="s5-more" style="display:none;text-align:center;padding:10px">
        <span style="font-size:11px;color:var(--acc);padding:5px 14px;border:1px solid var(--bd);border-radius:var(--rd);cursor:pointer" onclick="Scr3.s5LoadMore()">โหลดเพิ่ม →</span>
      </div>
    </div>`;
  }

  function s5Reload() {
    s5.dateFrom = document.getElementById('s5-from')?.value || s5.dateFrom;
    s5.dateTo = document.getElementById('s5-to')?.value || s5.dateTo;
    loadS5(true);
  }

  async function loadS5(reset) {
    if (reset) { s5.records = []; s5.offset = 0; }
    if (_busy.s5) return; _busy.s5 = true;
    try {
      const data = await API.getSaleHistory({ date_from: s5.dateFrom, date_to: s5.dateTo, limit: 10, offset: s5.offset });
      const newRecs = data.records || [];
      s5.records = s5.offset === 0 ? newRecs : [...s5.records, ...newRecs];
      fillS5();
      document.getElementById('s5-more').style.display = newRecs.length >= 10 ? '' : 'none';
    } catch { App.toast('โหลดไม่สำเร็จ', 'error'); }
    finally { _busy.s5 = false; }
  }

  function fillS5() {
    const total = s5.records.reduce((s, r) => s + (r.total_sales || 0), 0);
    const cnt = s5.records.length;
    const avg = cnt > 0 ? Math.round(total / cnt) : 0;
    document.getElementById('s5-kpi').innerHTML = `
      <div class="kpi-box"><div class="kpi-label">Total</div><div class="kpi-val" style="font-size:14px;color:var(--gold)">${fms(total)}</div></div>
      <div class="kpi-box"><div class="kpi-label">Recorded</div><div class="kpi-val" style="font-size:14px">${cnt}</div></div>
      <div class="kpi-box"><div class="kpi-label">เฉลี่ย/วัน</div><div class="kpi-val" style="font-size:14px">${fms(avg)}</div></div>`;

    const el = document.getElementById('s5-list');
    if (!el) return;
    if (!s5.records.length) { el.innerHTML = '<div class="empty-state">ยังไม่มีข้อมูล</div>'; return; }
    el.innerHTML = s5.records.map(r => {
      const synced = r.sync_status === 'synced';
      const channels = r.sd_sale_channels || [];
      const chText = channels.map(c => `${c.channel_key}: ${fm(c.amount)}`).join(' · ');
      return `<div class="card" style="padding:10px;cursor:pointer;${synced ? 'background:var(--bg3)' : ''}" onclick="App.go('daily-hub')">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <div><div style="font-size:12px;font-weight:700">${App.fmtDate(r.sale_date)}</div>
          <div style="font-size:10px;color:var(--t3)">${e(r.store_id)} · ${channels.length} ch</div></div>
          <div style="text-align:right"><div style="font-size:14px;font-weight:700;color:var(--gold)">${fm(r.total_sales)}</div>
          ${synced ? '<span class="sts sts-lock">🔒 Synced</span>' : '<span class="sts sts-ok">✏️ Editable</span>'}</div>
        </div>
        ${channels.length ? `<details style="font-size:10px;color:var(--t3)"><summary>▸ Channel breakdown</summary><div style="padding:4px 0">${chText}</div></details>` : ''}
      </div>`;
    }).join('');
  }

  function s5LoadMore() { s5.offset += 10; loadS5(false); }


  // ═══════════════════════════════════════════
  // S6: EXPENSE HISTORY (date range, default 3 days, filter: all/expense/invoice, sync lock)
  // ═══════════════════════════════════════════
  let s6 = { expenses: [], invoices: [], filter: 'all', offset: 0, dateFrom: '', dateTo: '', _items: [] };

  function renderS6() {
    const now = td();
    s6.dateTo = s6.dateTo || now;
    s6.dateFrom = s6.dateFrom || App.addDays(now, -3);
    return `${toolbar('Expense History')}
    <div class="content" id="s6-content">
      ${App.renderStoreSelector()}
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;font-size:12px">
        <span>📅</span>
        <input class="fi" type="date" style="flex:1;padding:6px 8px" id="s6-from" value="${s6.dateFrom}" onchange="Scr3.s6Reload()">
        <span style="color:var(--t3)">→</span>
        <input class="fi" type="date" style="flex:1;padding:6px 8px" id="s6-to" value="${s6.dateTo}" onchange="Scr3.s6Reload()">
      </div>
      <div class="chips" id="s6-filter">
        <div class="chip on" onclick="Scr3.s6SetFilter('all',this)">All</div>
        <div class="chip" onclick="Scr3.s6SetFilter('expense',this)">Expense</div>
        <div class="chip" onclick="Scr3.s6SetFilter('invoice',this)">Invoice</div>
      </div>
      <div id="s6-list"><div class="skeleton sk-card"></div></div>
      <div id="s6-more" style="display:none;text-align:center;padding:10px">
        <span style="font-size:11px;color:var(--acc);padding:5px 14px;border:1px solid var(--bd);border-radius:var(--rd);cursor:pointer" onclick="Scr3.s6LoadMore()">โหลดเพิ่ม →</span>
      </div>
    </div>`;
  }

  function s6Reload() {
    s6.dateFrom = document.getElementById('s6-from')?.value || s6.dateFrom;
    s6.dateTo = document.getElementById('s6-to')?.value || s6.dateTo;
    loadS6(true);
  }

  async function loadS6(reset) {
    if (reset) { s6.expenses = []; s6.invoices = []; s6.offset = 0; }
    if (_busy.s6) return; _busy.s6 = true;
    try {
      const data = await API.getExpenseHistory({ date_from: s6.dateFrom, date_to: s6.dateTo, limit: 10, offset: s6.offset, filter: s6.filter });
      if (s6.offset === 0) { s6.expenses = data.expenses || []; s6.invoices = data.invoices || []; }
      else { s6.expenses = [...s6.expenses, ...(data.expenses || [])]; s6.invoices = [...s6.invoices, ...(data.invoices || [])]; }
      fillS6();
    } catch { App.toast('โหลดไม่สำเร็จ', 'error'); }
    finally { _busy.s6 = false; }
  }

  function fillS6() {
    const el = document.getElementById('s6-list');
    if (!el) return;
    let items = [];
    if (s6.filter !== 'invoice') items.push(...s6.expenses.map(x => ({ ...x, _type: 'expense', _date: x.expense_date, _synced: x.sync_status === 'synced' })));
    if (s6.filter !== 'expense') items.push(...s6.invoices.map(x => ({ ...x, _type: 'invoice', _date: x.invoice_date, _synced: x.sync_status === 'synced' })));
    items.sort((a, b) => b._date.localeCompare(a._date));
    s6._items = items;

    if (!items.length) { el.innerHTML = '<div class="empty-state">ยังไม่มีข้อมูล</div>'; return; }
    el.innerHTML = items.map((it, idx) => {
      const isInv = it._type === 'invoice';
      const tag = isInv ? `<span class="tag tag-o">Invoice</span>` : `<span class="tag tag-gray">Bill</span>`;
      const statusTag = isInv ? `<span class="sts ${it.payment_status === 'paid' ? 'sts-ok' : 'sts-err'}">${it.payment_status}</span>` : '';
      const lockTag = it._synced ? '<span class="sts sts-lock">🔒</span>' : '';
      let html = `<div class="li-card" style="${it._synced ? 'background:var(--bg3);' : ''}cursor:pointer" onclick="Scr3.showDetail(${idx})"><div style="display:flex;justify-content:space-between">
        <div><div style="font-size:12px;font-weight:700">${e(it.description || it.invoice_no)}</div>
        <div style="font-size:10px;color:var(--t3)">${e(it.vendor_name)} · ${it._date} · ${tag} ${lockTag}</div></div>
        <div style="text-align:right"><div style="font-size:13px;font-weight:700;color:var(--r)">-${fm(it.total_amount)}</div>${statusTag}</div>
      </div></div>`;
      // Credit Note sub-row
      if (isInv && it.has_credit_note && it.credit_note_no) {
        const cnAmt = parseFloat(it.credit_note_amount) || 0;
        html += `<div class="li-card" style="margin-top:-8px;margin-left:24px;padding:6px 10px;background:var(--gbg);border-left:3px solid var(--g);cursor:pointer" onclick="Scr3.showDetail(${idx})">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div><div style="font-size:11px;color:var(--g);font-weight:600">↳ CN: ${e(it.credit_note_no)}</div></div>
            <div style="font-size:12px;font-weight:700;color:var(--g)">+${fm(cnAmt)}</div>
          </div>
        </div>`;
      }
      return html;
    }).join('');
    document.getElementById('s6-more').style.display = items.length >= 10 ? '' : 'none';
  }

  function showDetail(idx) {
    const it = s6._items?.[idx];
    if (!it) return;
    const isInv = it._type === 'invoice';
    const rows = [
      ['Type', isInv ? 'Invoice' : 'Expense (Bill)'],
      ['Date', App.fmtDate(it._date)],
      isInv ? ['Invoice No.', it.invoice_no] : ['Doc Number', it.doc_number],
      ['Vendor', it.vendor_name],
      ['Description', it.description],
      ['Amount (ex GST)', fm(it.amount_ex_gst)],
      ['GST', fm(it.gst)],
      ['Total', fm(it.total_amount)],
    ];
    if (isInv) {
      rows.push(['Status', it.payment_status]);
      if (it.due_date) rows.push(['Due Date', App.fmtDate(it.due_date)]);
      if (it.has_credit_note) {
        rows.push(['Credit Note', it.credit_note_no || '—']);
        rows.push(['CN Amount', fm(parseFloat(it.credit_note_amount) || 0)]);
      }
    } else {
      rows.push(['Payment', it.payment_method || '—']);
    }
    if (it._synced) rows.push(['Sync', '🔒 Synced']);

    const photoHtml = it.photo_url ? `<div style="margin-top:10px"><img src="${e(it.photo_url)}" style="max-width:100%;border-radius:var(--rd);max-height:200px;object-fit:contain" onerror="this.style.display='none'"></div>` : '';

    App.showDialog(`<div class="popup-sheet" style="width:380px;max-height:80vh;overflow-y:auto">
      <div class="popup-header"><div class="popup-title">${isInv ? 'Invoice' : 'Expense'} Detail</div><button class="popup-close" onclick="App.closeDialog()">✕</button></div>
      <div style="background:var(--bg3);border-radius:var(--rd);padding:12px;font-size:12px">
        ${rows.map(r => `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--bd)"><span style="color:var(--t3)">${r[0]}</span><span style="font-weight:600;text-align:right;max-width:60%;word-break:break-word">${e(r[1])}</span></div>`).join('')}
      </div>
      ${photoHtml}
      <button class="btn btn-outline btn-full" style="margin-top:12px" onclick="App.closeDialog()">Close</button>
    </div>`);
  }

  function s6SetFilter(f, el) {
    s6.filter = f;
    el.parentElement.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
    el.classList.add('on');
    loadS6(true);
  }
  function s6LoadMore() { s6.offset += 10; loadS6(false); }


  // ═══════════════════════════════════════════
  // S8: DAILY REPORT (3 tabs)
  // ═══════════════════════════════════════════
  let s8 = { date: '', tab: 'overview', report: null, incidents: [], leftovers: [], tasks: [], summary: null };

  function renderS8(params) {
    if (params?.date) s8.date = params.date;
    s8.date = s8.date || td();
    return `${toolbar('Daily Report')}
    <div class="content" id="s8-content">
      ${App.renderStoreSelector({ noAll: true })}
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:4px 0 10px;font-size:13px;font-weight:600">
        <span class="dbar-btn" onclick="Scr3.s8Nav(-1)">‹</span>
        <span id="s8-date-label">📅 ${App.fmtDate(s8.date)}</span>
        <span class="dbar-btn" onclick="Scr3.s8Nav(1)">›</span>
      </div>
      <div class="tab-row" id="s8-tabs-top">
        <div class="tab-pill on" data-tab="overview" onclick="Scr3.s8SetTab('overview',this)">📊 ภาพรวม</div>
        <div class="tab-pill" data-tab="incidents" onclick="Scr3.s8SetTab('incidents',this)">⚠️ เหตุการณ์</div>
        <div class="tab-pill" data-tab="tasks" onclick="Scr3.s8SetTab('tasks',this)">📋 ติดตาม</div>
      </div>
      <div id="s8-tab-content"><div class="skeleton sk-card" style="height:200px"></div></div>
      <div class="tab-row-sm" id="s8-tabs-bottom">
        <div class="tab-sm on" data-tab="overview" onclick="Scr3.s8SetTab('overview',this)">📊 ภาพรวม</div>
        <div class="tab-sm" data-tab="incidents" onclick="Scr3.s8SetTab('incidents',this)">⚠️ เหตุการณ์</div>
        <div class="tab-sm" data-tab="tasks" onclick="Scr3.s8SetTab('tasks',this)">📋 ติดตาม</div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;padding-bottom:8px">
        <button class="btn btn-gold" style="flex:1;padding:10px" id="s8-save" onclick="Scr3.s8Save()">💾 บันทึก</button>
        <button class="btn btn-outline" style="flex:1" onclick="Scr3.s8Copy()">📋 Copy</button>
        <button class="btn btn-outline" style="flex:0 0 44px;display:none" id="s8-share-btn" onclick="Scr3.s8Share()">📤</button>
      </div>
    </div>`;
  }

  async function loadS8(params) {
    if (params?.date) s8.date = params.date;
    if (_busy.s8) return; _busy.s8 = true;
    try {
      // getDailyReport = report + incidents + leftovers + tasks
      // getDailyDetail = sale + channels + expenses + cash (for overview tab)
      // Both run parallel — report field overlaps but data is different
      const [repData, sumData] = await Promise.all([
        API.getDailyReport(null, s8.date),
        API.getS8Summary(null, s8.date),
      ]);
      s8.report = repData.report;
      // Init incidents with notes arrays (V1 pattern)
      s8.incidents = [];
      INCIDENT_CATS.forEach(c => {
        const raw = (repData.incidents || []).find(i => i.category === c.key);
        const count = raw?.count || 0;
        let notes = [];
        if (raw?.notes && Array.isArray(raw.notes)) notes = raw.notes;
        else if (raw?.note) { try { let p = JSON.parse(raw.note); if (typeof p === 'string') p = JSON.parse(p); if (Array.isArray(p)) notes = p; else notes = [String(p)]; } catch { notes = [raw.note]; } }
        while (notes.length < count) notes.push('');
        s8.incidents.push({ category: c.key, count, notes: notes.slice(0, Math.max(count, notes.length)) });
      });
      s8.leftovers = repData.leftovers || [];
      s8.tasks = repData.tasks || [];
      s8.summary = sumData;
      fillS8Tab();
      if (navigator.share) { const sb = document.getElementById('s8-share-btn'); if (sb) sb.style.display = ''; }
    } catch { App.toast('โหลดไม่สำเร็จ', 'error'); }
    finally { _busy.s8 = false; }
  }

  function s8Nav(delta) {
    s8.date = App.addDays(s8.date, delta);
    document.getElementById('s8-date-label').textContent = '📅 ' + App.fmtDate(s8.date);
    loadS8();
  }

  function collectS8Overview() {
    if (!s8.report) s8.report = {};
    const note = document.getElementById('s8-note');
    if (note) s8.report.overview_note = note.value;
    ['morning', 'midday', 'afternoon', 'evening', 'night'].forEach(p => {
      const el = document.getElementById('s8-cust-' + p);
      if (el) s8.report['customer_' + p] = el.value;
    });
    if (_s8Weather) s8.report.weather = _s8Weather;
    if (_s8Traffic) s8.report.traffic = _s8Traffic;
    if (_s8PosStatus) s8.report.pos_status = _s8PosStatus;
    if (_s8Waste !== null && _s8Waste !== undefined) s8.report.has_waste = _s8Waste;
  }

  function s8SetTab(tab, el) {
    // Collect current tab values before switching
    if (s8.tab === 'overview') collectS8Overview();
    s8.tab = tab;
    // Sync both tab bars
    ['s8-tabs-top', 's8-tabs-bottom'].forEach(id => {
      const row = document.getElementById(id);
      if (!row) return;
      row.querySelectorAll('[data-tab]').forEach(t => { t.classList.toggle('on', t.dataset.tab === tab); });
    });
    fillS8Tab();
  }

  function fillS8Tab() {
    const el = document.getElementById('s8-tab-content');
    if (!el) return;
    if (s8.tab === 'overview') fillS8Overview(el);
    else if (s8.tab === 'incidents') fillS8Incidents(el);
    else if (s8.tab === 'tasks') fillS8Tasks(el);
  }

  function fillS8Overview(el) {
    const r = s8.report || {};
    const sm = s8.summary || {};
    const channels = sm.channels || [];
    const expenses = sm.expenses || [];
    const cash = sm.cash;
    const tk = API.getToken();

    // ─── Sales ───
    const chHtml = channels.length ? channels.map(c =>
      `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:11px"><span>${e(c.channel_key)}</span><span style="font-weight:600">${fm(c.amount)}</span></div>`
    ).join('') + `<div style="border-top:1px solid var(--bd2);margin-top:4px;padding-top:4px;display:flex;justify-content:space-between;font-weight:700;font-size:12px"><span>Total</span><span style="color:var(--gold)">${fm(sm.total_sales || 0)}</span></div>` : '<div style="font-size:11px;color:var(--t3)">ไม่มีข้อมูล</div>';

    // ─── Expenses ───
    const expHtml = expenses.length ? expenses.map(x =>
      `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:11px"><span>${e(x.vendor_name)} · ${e(x.description)}</span><span style="font-weight:600;color:var(--r)">-${fm(x.total_amount)}</span></div>`
    ).join('') : '<div style="font-size:11px;color:var(--t3)">ไม่มี</div>';

    // ─── Cash On Hand ───
    let cashHtml = '';
    if (cash) {
      const matched = cash.is_matched;
      const clr = matched ? 'var(--g)' : 'var(--r)';
      const bg = matched ? 'var(--gbg)' : 'var(--rbg)';
      cashHtml = `<div class="card" style="padding:10px;border-left:3px solid ${clr}"><div class="sl" style="margin-top:0">💵 Cash on Hand (auto จาก S4)</div>
        
          <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:11px"><span>Expected</span><span style="font-weight:600">${fm(cash.expected_cash || cash.expected || 0)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:11px"><span>Actual</span><span style="font-weight:600">${fm(cash.actual_cash || cash.actual || 0)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0 0;border-top:1px solid var(--bd2);margin-top:4px;font-weight:700;font-size:12px"><span>Diff</span><span style="color:${clr}">${fm(cash.difference || cash.variance || 0)}</span></div>
          <div style="margin-top:6px;padding:6px 10px;background:${bg};border-radius:var(--rd);text-align:center;font-size:12px;font-weight:600;color:${clr}">${matched ? '✅ เงินตรง' : '🔴 เงินไม่ตรง!'}</div>
          ${!matched && (cash.mismatch_reason || cash.reason) ? `<div style="font-size:10px;color:var(--t3);margin-top:4px">📝 ${e(cash.mismatch_reason || cash.reason)}</div>` : ''}
        </div>`;
    } else {
      cashHtml = `<div class="card" style="padding:10px"><div class="sl" style="margin-top:0">💵 Cash on Hand</div><div style="font-size:11px;color:var(--t3)">ยังไม่ได้นับเงิน</div></div>`;
    }

    // ─── Customer time periods ───
    const custPeriods = [
      { key: 'morning', label: '🌅 เช้า (open–11:00)', ph: 'เช่น คนทำงาน, ลูกค้าประจำ...' },
      { key: 'midday', label: '☀️ กลางวัน (11:00–14:00)', ph: 'เช่น กลุ่มออฟฟิศ, นักเรียน...' },
      { key: 'afternoon', label: '🌤️ บ่าย (14:00–17:00)', ph: 'เช่น แม่ลูก, ลูกค้าสั่งหวาน...' },
      { key: 'evening', label: '🌆 เย็น (17:00–20:00)', ph: 'เช่น ฝรั่งมาคู่, after work...' },
      { key: 'night', label: '🌙 ค่ำ–ปิด (20:00–close)', ph: 'เช่น วัยรุ่นเอเชีย, Take away...' },
    ];

    // ─── Waste detail ───
    let wasteDetail = '';
    if (r.has_waste === true) {
      wasteDetail = `<div style="margin-top:8px;padding:10px;background:var(--gold-bg);border-radius:var(--rd)">
        <div style="font-size:11px;color:var(--t2);margin-bottom:6px">กรุณากรอก Waste List ที่ BC Order</div>
        <a onclick="location.href='https://onspider-spg.github.io/spg-bakeryorder/?token=${tk}#waste'" style="display:block;text-align:center;padding:10px;background:var(--gold);color:#fff;border-radius:var(--rd);font-weight:600;font-size:13px;cursor:pointer">🍞 เปิด Waste List →</a>
      </div>`;
    } else if (r.has_waste === false) {
      wasteDetail = '<div style="margin-top:6px;padding:6px 10px;background:var(--bg3);border-radius:var(--rd);font-size:11px;color:var(--t3)">✅ ไม่มี waste วันนี้</div>';
    }

    el.innerHTML = `
      <div class="card" style="padding:10px">
        <div class="sl" style="margin-top:0">💰 ยอดขาย (auto จาก S1)</div>
        ${chHtml}
      </div>

      <div class="card" style="padding:10px">
        <div class="sl" style="margin-top:0">🧾 ค่าใช้จ่าย (auto จาก S2)</div>
        ${expHtml}
      </div>

      ${cashHtml}

      <div class="card" style="padding:10px">
        <div class="sl" style="margin-top:0">🌤️ สภาพร้านวันนี้</div>
        <div class="fg"><label class="fl">อากาศ</label><div class="chips" style="margin:0" id="s8-weather">
          ${[{k:'sunny',l:'☀️ แดด'},{k:'cloudy',l:'☁️ ครึ้ม'},{k:'rain',l:'🌧️ ฝน'},{k:'heavy_rain',l:'⛈️ ฝนหนัก'}].map(w => `<div class="chip${r.weather === w.k ? ' on' : ''}" onclick="Scr3.s8Pick('weather','${w.k}',this)">${w.l}</div>`).join('')}
        </div></div>
        <div class="fg"><label class="fl">Traffic วันนี้</label><div class="chips" style="margin:0" id="s8-traffic">
          ${[{k:'above',l:'📈 ดีกว่าปกติ'},{k:'normal',l:'➡️ ปกติ'},{k:'below',l:'📉 ต่ำกว่าปกติ'}].map(t => `<div class="chip${r.traffic === t.k ? ' on' : ''}" onclick="Scr3.s8Pick('traffic','${t.k}',this)">${t.l}</div>`).join('')}
        </div></div>
        <div class="fg"><label class="fl">ระบบ POS / Printer</label><div class="chips" style="margin:0" id="s8-pos">
          ${[{k:'ok',l:'✅ ปกติ'},{k:'issue',l:'⚠️ มีปัญหา'}].map(p => `<div class="chip${r.pos_status === p.k ? ' on' : ''}" onclick="Scr3.s8Pick('pos_status','${p.k}',this)">${p.l}</div>`).join('')}
        </div></div>
      </div>

      <div class="card" style="padding:10px">
        <div class="sl" style="margin-top:0">🧑‍🤝‍🧑 กลุ่มลูกค้าตามช่วงเวลา</div>
        ${custPeriods.map(p => `<div class="fg" style="margin-bottom:6px"><label class="fl">${p.label}</label><textarea class="fi" style="padding:4px 6px;font-size:11px;min-height:28px" id="s8-cust-${p.key}" placeholder="${p.ph}">${e(r['customer_' + p.key] || '')}</textarea></div>`).join('')}
      </div>

      <div class="card" style="padding:10px">
        <div class="sl" style="margin-top:0">📝 Overview Note</div>
        <textarea class="fi" id="s8-note" rows="2" placeholder="เช่น ฝนตกหนักช่วงเย็น...">${e(r.overview_note || '')}</textarea>
      </div>

      <div class="card" style="padding:10px">
        <div class="sl" style="margin-top:0">🍞 Waste List</div>
        <div style="font-size:12px;font-weight:600;margin-bottom:8px">ขนมปัง / เค้กที่เหลือ?</div>
        <div class="chips" style="margin:0" id="s8-waste">
          <div class="chip${r.has_waste === false ? ' on' : ''}" onclick="Scr3.s8Pick('waste','no',this)">❌ No</div>
          <div class="chip${r.has_waste === true ? ' on' : ''}" onclick="Scr3.s8Pick('waste','yes',this)">✅ Yes</div>
        </div>
        <div id="s8-waste-detail">${wasteDetail}</div>
      </div>`;
  }

  function fillS8Incidents(el) {
    let totalCount = 0;
    const catHtml = INCIDENT_CATS.map(c => {
      const inc = s8.incidents.find(i => i.category === c.key) || { category: c.key, count: 0, notes: [] };
      const count = inc.count || 0;
      totalCount += count;
      let notesHtml = '';
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const val = e((inc.notes && inc.notes[i]) || '');
          notesHtml += `<input class="fi" style="font-size:11px;padding:4px 8px;margin-bottom:4px" placeholder="รายการที่ ${i + 1}: รายละเอียด..." value="${val}" oninput="Scr3.s8IncNote('${c.key}',${i},this.value)">`;
        }
      }
      return `<div class="card" style="padding:10px;margin-bottom:6px;border-left:3px solid ${count > 0 ? 'var(--gold)' : 'transparent'}">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:18px">${c.icon}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600">${c.name}</div>
            <div style="font-size:10px;color:var(--t3)">${c.desc}</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <button class="cnt-btn" onclick="Scr3.s8IncChange('${c.key}',-1)">−</button>
            <span style="font-size:14px;font-weight:700;min-width:20px;text-align:center" id="s8-inc-${c.key}">${count}</span>
            <button class="cnt-btn" onclick="Scr3.s8IncChange('${c.key}',1)">+</button>
          </div>
        </div>
        <div style="margin-top:6px;${count > 0 ? '' : 'display:none'}" id="s8-inc-notes-${c.key}">${notesHtml}</div>
      </div>`;
    }).join('');

    // Summary badges
    const badges = INCIDENT_CATS.filter(c => (s8.incidents.find(i => i.category === c.key)?.count || 0) > 0).map(c => {
      const inc = s8.incidents.find(i => i.category === c.key);
      return `<span style="background:var(--gold-bg);color:var(--gold);padding:3px 8px;border-radius:6px;font-size:10px">${c.icon} ${c.name.split(' ')[0]} ×${inc.count}</span>`;
    }).join('');

    el.innerHTML = `<div class="sl" style="margin-top:0">⚠️ เหตุการณ์ — กดจำนวน + ใส่ note</div>
      ${catHtml}
      <div class="card" style="padding:10px;margin-bottom:12px">
        <div style="font-size:11px;font-weight:600;margin-bottom:4px">📊 สรุปเหตุการณ์วันนี้</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px" id="s8-inc-summary">${badges || '<span style="font-size:10px;color:var(--t3)">ไม่มีเหตุการณ์</span>'}</div>
        <div style="font-size:10px;color:var(--t3);margin-top:4px">รวม <b id="s8-inc-total">${totalCount}</b> เหตุการณ์</div>
      </div>
      <div class="sl">🍚 อาหารเหลือ</div>
      <div style="font-size:10px;color:var(--t3);margin-bottom:6px">กรอกรายการอาหารที่เหลือประจำวัน</div>
      <div id="s8-leftovers">${renderLeftovers()}</div>
      <div style="display:flex;align-items:center;gap:6px;padding:8px 0;cursor:pointer;color:var(--gold);font-size:12px;font-weight:600" onclick="Scr3.s8AddLeftover()">➕ เพิ่มรายการ</div>`;
  }

  function renderLeftovers() {
    if (!s8.leftovers.length) return '<div style="text-align:center;padding:10px;color:var(--t3);font-size:11px">ยังไม่มีรายการ — กด ➕ เพิ่ม</div>';
    return s8.leftovers.map((l, i) => `<div class="card" style="padding:10px;margin-bottom:6px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span>🍞</span>
        <input class="fi" style="flex:1;font-size:12px;padding:4px 6px" value="${e(l.item_name)}" placeholder="ชื่ออาหาร..." oninput="Scr3.s8LeftUpdate(${i},'item_name',this.value)">
        <input class="fi" type="number" style="width:44px;font-size:12px;padding:4px 6px;text-align:center" value="${l.quantity}" min="0" oninput="Scr3.s8LeftUpdate(${i},'quantity',this.value)">
        <button class="cnt-btn" style="color:var(--r);border-color:var(--r)" onclick="Scr3.s8LeftRemove(${i})">✕</button>
      </div>
      <div class="chips" style="margin:0">${LEVEL_OPTS.map(lv => `<div class="chip${l.level === lv.key ? ' on' : ''}" onclick="Scr3.s8LeftLevel(${i},'${lv.key}',this)">${lv.label}</div>`).join('')}</div>
      <input class="fi" style="font-size:11px;padding:4px 6px;margin-top:6px;width:100%" value="${e(l.note || '')}" placeholder="หมายเหตุ เช่น ทำเยอะเกิน, ขายไม่ออก..." oninput="Scr3.s8LeftUpdate(${i},'note',this.value)">
    </div>`).join('');
  }

  function fillS8Tasks(el) {
    // Equipment repairs for selected date
    const equipTasks = s8.tasks.filter(t => t.type === 'equipment' && t.report_date === s8.date);
    const pending = s8.tasks.filter(t => t.status === 'pending');
    const uMap = { critical: '🔴', high: '🟠', low: '🟡', dispose: '⚫' };

    el.innerHTML = `
      <div class="sl" style="margin-top:0">🔧 Equipment Repair Report</div>
      <div class="card" style="padding:10px;margin-bottom:10px">
        <div class="fg" style="margin-bottom:6px"><label class="fl">ชื่ออุปกรณ์ / เครื่อง</label>
          <input class="fi" id="s8-eq-name" placeholder="เช่น เครื่องทำน้ำแข็ง, เตาอบ..."></div>
        <div class="fg" style="margin-bottom:6px"><label class="fl">อาการ</label>
          <input class="fi" id="s8-eq-symptom" placeholder="เช่น ไม่ทำความเย็น, มีเสียงดัง..."></div>
        <div class="fg" style="margin-bottom:8px"><label class="fl">ความเร่งด่วน</label>
          <select class="fi" id="s8-eq-urgency">
            <option value="">— เลือก —</option>
            <option value="critical">🔴 ใช้งานไม่ได้ ต้องซ่อมทันที</option>
            <option value="high">🟠 ควรซ่อมเร็ว</option>
            <option value="low">🟡 ไม่รีบ ซ่อมเมื่อมีเวลา</option>
            <option value="dispose">⚫ ไม่ซ่อม — ทิ้ง</option>
          </select></div>
        <button class="btn btn-gold btn-full" id="s8-eq-save" onclick="Scr3.s8AddEquipment()">+ แจ้งซ่อม</button>
      </div>
      ${equipTasks.length ? `<div style="font-size:11px;font-weight:600;color:var(--t2);margin-bottom:4px">🔧 รายการแจ้งซ่อม (${equipTasks.length})</div>
        ${equipTasks.map(t => `<div class="card" style="padding:8px 10px;margin-bottom:4px;border-left:3px solid var(--o)">
          <div style="font-size:12px;font-weight:600">${uMap[t.priority] || '🔧'} ${e(t.title)}</div>
          ${t.note ? `<div style="font-size:10px;color:var(--t3);margin-top:2px">${e(t.note)}</div>` : ''}
        </div>`).join('')}` : ''}

      <div class="sl">📋 เพิ่มงานติดตาม</div>
      <div class="card" style="padding:10px;margin-bottom:10px">
        <input class="fi" id="s8-task-title" placeholder="เช่น โทรสั่ง stock เพิ่ม, นัดประชุมทีม..." style="margin-bottom:6px">
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <input class="fi" id="s8-task-assign" placeholder="มอบหมายให้..." style="flex:1">
          <select class="fi" id="s8-task-pri" style="width:100px">
            <option value="normal">📋 ปกติ</option>
            <option value="urgent">🚨 ด่วน</option>
          </select>
        </div>
        <button class="btn btn-gold btn-full" id="s8-task-save" onclick="Scr3.s8AddTask('follow_up')">+ เพิ่มงาน</button>
      </div>

      <div class="sl">💡 เพิ่ม Suggestion</div>
      <div class="card" style="padding:10px;margin-bottom:12px">
        <input class="fi" id="s8-sug-title" placeholder="เช่น ลองเพิ่มเมนูใหม่, ปรับ layout..." style="margin-bottom:8px">
        <button class="btn btn-outline btn-full" id="s8-sug-save" onclick="Scr3.s8AddTask('suggestion')">+ เพิ่ม Suggestion</button>
      </div>

      <div class="sl">⏳ ค้าง (${pending.length})</div>
      <div id="s8-pending-list">${pending.length ? pending.map(t => {
        const isSug = t.type === 'suggestion';
        const isEquip = t.type === 'equipment';
        const icon = isEquip ? '🔧' : isSug ? '💡' : (t.priority === 'urgent' ? '🚨' : '⏳');
        const bc = isSug ? 'var(--acc)' : isEquip ? 'var(--o)' : (t.priority === 'urgent' ? 'var(--r)' : 'var(--gold)');
        return `<div class="card" style="padding:10px;margin-bottom:4px;border-left:3px solid ${bc}">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:14px">${icon}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:600">${e(t.title)}</div>
              ${t.note ? `<div style="font-size:10px;color:var(--t3);margin-top:2px">${e(t.note)}</div>` : ''}
              ${t.assigned_to ? `<div style="font-size:10px;color:var(--t3)">👤 ${e(t.assigned_to)}</div>` : ''}
            </div>
            <button class="cnt-btn" style="color:var(--g);border-color:var(--g);font-size:14px;width:28px;height:28px" onclick="Scr3.s8ToggleTask('${t.id}','done')">✓</button>
          </div>
        </div>`;
      }).join('') : '<div class="card" style="text-align:center;padding:16px;color:var(--t3);font-size:11px">ไม่มีงานค้าง</div>'}</div>`;
  }

  function taskCard(t, canComplete, toggleFn) {
    const fn = toggleFn || 'Scr3.s8ToggleTask';
    const icons = { equipment: '🔧', follow_up: '📋', suggestion: '💡', action: '🚨' };
    const priColors = { critical: 'var(--r)', urgent: 'var(--o)', normal: 'var(--gold)' };
    const isDone = t.status === 'done';
    return `<div class="card" style="padding:10px;border-left:3px solid ${isDone ? 'var(--g)' : (priColors[t.priority] || 'var(--o)')};${isDone ? 'opacity:.6' : ''}">
      <div style="display:flex;align-items:center;gap:8px">
        <span>${icons[t.type] || '📋'}</span>
        <div style="flex:1"><div style="font-size:12px;font-weight:700;${isDone ? 'text-decoration:line-through;color:var(--t3)' : ''}">${e(t.title)}</div>
        <div style="font-size:10px;color:var(--t3)">${e(t.type)}${t.report_date ? ' · จาก Daily Report ' + App.fmtDateShort(t.report_date) : ''}${t.due_date ? ' · Due: ' + App.fmtDateShort(t.due_date) : ''}${t.assigned_to ? ' · 👤 ' + e(t.assigned_to) : ''}</div></div>
        ${canComplete ? `<button class="cnt-btn" style="color:var(--g);border-color:var(--g)" onclick="${fn}('${t.id}','done')">✓</button>` : `<button class="cnt-btn" style="color:var(--o);border-color:var(--o)" onclick="${fn}('${t.id}','pending')">↩</button>`}
      </div>
    </div>`;
  }

  // S8 actions
  let _s8Weather = null, _s8Traffic = null, _s8PosStatus = null, _s8Waste = null;
  function s8Pick(field, val, el) {
    if (field === 'weather') _s8Weather = val;
    else if (field === 'traffic') _s8Traffic = val;
    else if (field === 'pos_status') _s8PosStatus = val;
    else if (field === 'waste') {
      _s8Waste = val === 'yes';
      const wd = document.getElementById('s8-waste-detail');
      if (wd) {
        if (_s8Waste) {
          const tk = API.getToken();
          wd.innerHTML = `<div style="margin-top:8px;padding:10px;background:var(--gold-bg);border-radius:var(--rd)">
            <div style="font-size:11px;color:var(--t2);margin-bottom:6px">กรุณากรอก Waste List ที่ BC Order</div>
            <a onclick="location.href='https://onspider-spg.github.io/spg-bakeryorder/?token=${tk}#waste'" style="display:block;text-align:center;padding:10px;background:var(--gold);color:#fff;border-radius:var(--rd);font-weight:600;font-size:13px;cursor:pointer">🍞 เปิด Waste List →</a>
          </div>`;
        } else {
          wd.innerHTML = '<div style="margin-top:6px;padding:6px 10px;background:var(--bg3);border-radius:var(--rd);font-size:11px;color:var(--t3)">✅ ไม่มี waste วันนี้</div>';
        }
      }
    }
    el.parentElement.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
    el.classList.add('on');
  }

  function s8IncChange(cat, delta) {
    let inc = s8.incidents.find(i => i.category === cat);
    if (!inc) { inc = { category: cat, count: 0, notes: [] }; s8.incidents.push(inc); }
    // Collect current note values from DOM before changing
    const noteWrap = document.getElementById('s8-inc-notes-' + cat);
    if (noteWrap) { const inputs = noteWrap.querySelectorAll('input'); inputs.forEach((inp, i) => { if (i < inc.notes.length) inc.notes[i] = inp.value; }); }
    const newCount = Math.max(0, inc.count + delta);
    while (inc.notes.length < newCount) inc.notes.push('');
    if (newCount < inc.notes.length) inc.notes.length = newCount;
    inc.count = newCount;
    // Update count display
    const cntEl = document.getElementById('s8-inc-' + cat);
    if (cntEl) cntEl.textContent = inc.count;
    // Re-render note inputs
    if (noteWrap) {
      noteWrap.style.display = inc.count > 0 ? '' : 'none';
      let html = '';
      for (let i = 0; i < inc.count; i++) {
        html += `<input class="fi" style="font-size:11px;padding:4px 8px;margin-bottom:4px" placeholder="รายการที่ ${i + 1}: รายละเอียด..." value="${e(inc.notes[i] || '')}" oninput="Scr3.s8IncNote('${cat}',${i},this.value)">`;
      }
      noteWrap.innerHTML = html;
    }
    s8UpdateIncSummary();
  }

  function s8IncNote(cat, idx, val) {
    const inc = s8.incidents.find(i => i.category === cat);
    if (inc && inc.notes) inc.notes[idx] = val;
  }

  function s8UpdateIncSummary() {
    let total = 0;
    const badges = INCIDENT_CATS.filter(c => (s8.incidents.find(i => i.category === c.key)?.count || 0) > 0).map(c => {
      const inc = s8.incidents.find(i => i.category === c.key);
      total += inc.count;
      return `<span style="background:var(--gold-bg);color:var(--gold);padding:3px 8px;border-radius:6px;font-size:10px">${c.icon} ${c.name.split(' ')[0]} ×${inc.count}</span>`;
    }).join('');
    const sumEl = document.getElementById('s8-inc-summary');
    if (sumEl) sumEl.innerHTML = badges || '<span style="font-size:10px;color:var(--t3)">ไม่มีเหตุการณ์</span>';
    const totalEl = document.getElementById('s8-inc-total');
    if (totalEl) totalEl.textContent = total;
  }

  function s8LeftUpdate(idx, field, val) { if (s8.leftovers[idx]) s8.leftovers[idx][field] = field === 'quantity' ? parseInt(val) || 1 : val; }
  function s8LeftRemove(idx) { s8.leftovers.splice(idx, 1); document.getElementById('s8-leftovers').innerHTML = renderLeftovers(); }
  function s8AddLeftover() { s8.leftovers.push({ item_name: '', quantity: 1, level: 'half', note: '' }); document.getElementById('s8-leftovers').innerHTML = renderLeftovers(); }
  function s8LeftLevel(idx, level, el) {
    if (s8.leftovers[idx]) s8.leftovers[idx].level = level;
    el.parentElement.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
    el.classList.add('on');
  }

  async function s8ToggleTask(taskId, newStatus) {
    try {
      await API.updateTask({ task_id: taskId, status: newStatus });
      const t = s8.tasks.find(x => x.id === taskId);
      if (t) { t.status = newStatus; t.completed_at = newStatus === 'done' ? new Date().toISOString() : null; }
      fillS8Tab();
      App.toast(newStatus === 'done' ? '✅ เสร็จแล้ว' : '↩ เปิดใหม่', 'success');
    } catch { App.toast('อัพเดทไม่สำเร็จ', 'error'); }
  }

  function s8NewTask() {
    App.showDialog(`<div class="popup-sheet" style="width:360px">
      <div class="popup-header"><div class="popup-title">+ New Task</div><button class="popup-close" onclick="App.closeDialog()">✕</button></div>
      <div class="fg"><label class="fl">Title <span class="req">*</span></label><input class="fi" id="nt-title"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="fg"><label class="fl">Type</label><select class="fi" id="nt-type"><option value="follow_up">📋 Follow-up</option><option value="equipment">🔧 Equipment</option><option value="suggestion">💡 Suggestion</option><option value="action">🚨 Action</option></select></div>
        <div class="fg"><label class="fl">Priority</label><select class="fi" id="nt-pri"><option value="normal">Normal</option><option value="urgent">Urgent</option><option value="critical">Critical</option></select></div>
      </div>
      <div class="fg"><label class="fl">Due Date</label><input class="fi" type="date" id="nt-due"></div>
      <div class="fg"><label class="fl">Note</label><textarea class="fi" id="nt-note" rows="2"></textarea></div>
      <button class="btn btn-gold btn-full" id="nt-save" onclick="Scr3.s8SaveNewTask()">💾 Save</button>
    </div>`);
  }

  async function s8SaveNewTask() {
    const title = document.getElementById('nt-title')?.value?.trim();
    if (!title) return App.toast('กรุณาใส่ Title', 'error');
    const btn = document.getElementById('nt-save'); if (btn) btn.disabled = true;
    try {
      const data = await API.createTask({
        store_id: API.getStore(), title,
        type: document.getElementById('nt-type')?.value || 'follow_up',
        priority: document.getElementById('nt-pri')?.value || 'normal',
        due_date: document.getElementById('nt-due')?.value || null,
        note: document.getElementById('nt-note')?.value || null,
        report_date: s8.date,
      });
      s8.tasks.push(data);
      App.closeDialog();
      fillS8Tab();
      App.toast('สร้าง Task สำเร็จ', 'success');
    } catch (err) { App.toast(err.message || 'สร้างไม่สำเร็จ', 'error'); }
    finally { if (btn) btn.disabled = false; }
  }

  // ─── S8-07: Equipment Repair ───
  let _repairUrgency = 'normal';

  function s8NewRepair() {
    _repairUrgency = 'normal';
    App.showDialog(`<div class="popup-sheet" style="width:360px">
      <div class="popup-header"><div class="popup-title">🔧 แจ้งซ่อมอุปกรณ์</div><button class="popup-close" onclick="App.closeDialog()">✕</button></div>
      <div style="font-size:10px;color:var(--t3);margin-bottom:8px">📅 ${App.fmtDate(s8.date)}</div>
      <div class="fg"><label class="fl">ชื่อเครื่อง/อุปกรณ์ <span class="req">*</span></label><input class="fi" id="rp-name" placeholder="เช่น เครื่องปั่น, ตู้เย็น"></div>
      <div class="fg"><label class="fl">อาการ/ปัญหา</label><textarea class="fi" id="rp-symptom" rows="2" placeholder="เช่น มีเสียงดัง, ไม่เย็น"></textarea></div>
      <div class="fg"><label class="fl">ความเร่งด่วน</label><div class="chips" style="margin:0" id="rp-urgency">
        <div class="chip" onclick="Scr3.s8SetUrgency('low',this)">Low</div>
        <div class="chip on" onclick="Scr3.s8SetUrgency('normal',this)">Normal</div>
        <div class="chip" onclick="Scr3.s8SetUrgency('urgent',this)">Urgent</div>
        <div class="chip" onclick="Scr3.s8SetUrgency('critical',this)">Critical</div>
      </div></div>
      <button class="btn btn-gold btn-full" id="rp-save" onclick="Scr3.s8SaveRepair()">💾 แจ้งซ่อม</button>
    </div>`);
  }

  function s8SetUrgency(val, el) {
    _repairUrgency = val;
    el.parentElement.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
    el.classList.add('on');
  }

  async function s8SaveRepair() {
    const name = document.getElementById('rp-name')?.value?.trim();
    if (!name) return App.toast('กรุณาใส่ชื่อเครื่อง/อุปกรณ์', 'error');
    const btn = document.getElementById('rp-save'); if (btn) btn.disabled = true;
    try {
      const data = await API.createTask({
        store_id: API.getStore(),
        title: name,
        type: 'equipment',
        priority: _repairUrgency,
        note: document.getElementById('rp-symptom')?.value || null,
        report_date: s8.date,
      });
      s8.tasks.push(data);
      App.closeDialog();
      fillS8Tab();
      App.toast('แจ้งซ่อมสำเร็จ', 'success');
    } catch (err) { App.toast(err.message || 'แจ้งซ่อมไม่สำเร็จ', 'error'); }
    finally { if (btn) btn.disabled = false; }
  }

  // ─── C3: Inline Tab 3 save functions ───
  async function s8AddEquipment() {
    const name = document.getElementById('s8-eq-name')?.value?.trim();
    const symptom = document.getElementById('s8-eq-symptom')?.value?.trim();
    const urgency = document.getElementById('s8-eq-urgency')?.value;
    if (!name) return App.toast('กรุณาใส่ชื่ออุปกรณ์', 'error');
    if (!symptom) return App.toast('กรุณาใส่อาการ', 'error');
    if (!urgency) return App.toast('กรุณาเลือกความเร่งด่วน', 'error');
    const btn = document.getElementById('s8-eq-save'); if (btn) btn.disabled = true;
    try {
      const uMap = { critical: '🔴 ซ่อมทันที', high: '🟠 ควรซ่อมเร็ว', low: '🟡 ไม่รีบ', dispose: '⚫ ทิ้ง' };
      const pri = urgency === 'critical' ? 'urgent' : 'normal';
      const data = await API.createTask({
        store_id: API.getStore(), title: '🔧 ' + name,
        note: symptom + ' [' + (uMap[urgency] || urgency) + ']',
        type: 'equipment', priority: pri, report_date: s8.date,
      });
      s8.tasks.push(data);
      App.toast('แจ้งซ่อมสำเร็จ', 'success');
      // Clear inputs
      const n = document.getElementById('s8-eq-name'); if (n) n.value = '';
      const sy = document.getElementById('s8-eq-symptom'); if (sy) sy.value = '';
      const u = document.getElementById('s8-eq-urgency'); if (u) u.value = '';
      fillS8Tab();
    } catch (err) { App.toast(err.message || 'แจ้งซ่อมไม่สำเร็จ', 'error'); }
    finally { if (btn) btn.disabled = false; }
  }

  async function s8AddTask(type) {
    const isTask = type === 'follow_up';
    const titleEl = document.getElementById(isTask ? 's8-task-title' : 's8-sug-title');
    const title = (titleEl?.value || '').trim();
    if (!title) return App.toast('กรุณากรอกหัวข้อ', 'error');
    const btnId = isTask ? 's8-task-save' : 's8-sug-save';
    const btn = document.getElementById(btnId); if (btn) btn.disabled = true;
    try {
      const data = await API.createTask({
        store_id: API.getStore(), title, type,
        assigned_to: isTask ? (document.getElementById('s8-task-assign')?.value || '') : '',
        priority: isTask ? (document.getElementById('s8-task-pri')?.value || 'normal') : 'normal',
        note: '', report_date: s8.date,
      });
      s8.tasks.push(data);
      App.toast(isTask ? '📋 เพิ่มงานแล้ว' : '💡 เพิ่ม Suggestion แล้ว', 'success');
      if (titleEl) titleEl.value = '';
      if (isTask) { const a = document.getElementById('s8-task-assign'); if (a) a.value = ''; }
      fillS8Tab();
    } catch (err) { App.toast(err.message || 'เพิ่มไม่สำเร็จ', 'error'); }
    finally { if (btn) btn.disabled = false; }
  }

  async function s8Save() {
    const btn = document.getElementById('s8-save'); if (btn) btn.disabled = true;
    try {
      // Collect overview values (customer, note, weather etc.) into s8.report
      // so they survive even when overview tab DOM is destroyed
      collectS8Overview();

      // Collect incident notes from DOM
      s8.incidents.forEach(inc => {
        const noteWrap = document.getElementById('s8-inc-notes-' + inc.category);
        if (noteWrap && inc.count > 0) {
          const inputs = noteWrap.querySelectorAll('input');
          const notes = [];
          inputs.forEach(inp => notes.push(inp.value));
          inc.notes = notes;
        }
      });

      // Validate: count > 0 → every note must be filled
      for (const c of INCIDENT_CATS) {
        const inc = s8.incidents.find(i => i.category === c.key);
        if (inc && inc.count > 0) {
          for (let i = 0; i < inc.count; i++) {
            if (!(inc.notes[i] || '').trim()) {
              App.toast(`⚠️ กรุณาใส่รายละเอียด "${c.name}" รายการที่ ${i + 1}`, 'error');
              if (btn) btn.disabled = false;
              return;
            }
          }
        }
      }

      // Build incidents payload with note string (pipe-separated) + notes array
      const incidents = s8.incidents.filter(i => i.count > 0).map(i => ({
        category: i.category, count: i.count,
        note: (i.notes || []).filter(n => n).join(' | '),
        notes: i.notes || [],
      }));

      await API.saveDailyReport({
        store_id: API.getStore(), report_date: s8.date,
        weather: _s8Weather || s8.report?.weather,
        traffic: _s8Traffic || s8.report?.traffic,
        has_waste: _s8Waste ?? s8.report?.has_waste,
        pos_status: _s8PosStatus || s8.report?.pos_status || 'ok',
        overview_note: document.getElementById('s8-note')?.value ?? s8.report?.overview_note ?? '',
        customer_morning: document.getElementById('s8-cust-morning')?.value ?? s8.report?.customer_morning ?? null,
        customer_midday: document.getElementById('s8-cust-midday')?.value ?? s8.report?.customer_midday ?? null,
        customer_afternoon: document.getElementById('s8-cust-afternoon')?.value ?? s8.report?.customer_afternoon ?? null,
        customer_evening: document.getElementById('s8-cust-evening')?.value ?? s8.report?.customer_evening ?? null,
        customer_night: document.getElementById('s8-cust-night')?.value ?? s8.report?.customer_night ?? null,
        incidents,
        leftovers: s8.leftovers.filter(l => l.item_name),
        is_submitted: true,
      });
      App.toast('บันทึกสำเร็จ', 'success');
    } catch (err) { App.toast(err.message || 'บันทึกไม่สำเร็จ', 'error'); }
    finally { if (btn) btn.disabled = false; }
  }

  let _lastReportText = '';

  async function s8Copy() {
    collectS8Overview();
    const r = s8.report || {};
    const sm = s8.summary || {};
    const session = API.getSession();
    const storeName = session?.store_name || API.getStore();
    const reporter = session?.full_name || session?.display_name || '';
    const channels = sm.channels || [];
    const expenses = sm.expenses || [];
    const cash = sm.cash;
    const wMap = { sunny: '☀️ แดด', cloudy: '☁️ ครึ้ม', rain: '🌧️ ฝน', heavy_rain: '⛈️ ฝนหนัก' };
    const tMap = { above: '📈 ดีกว่าปกติ', normal: '➡️ ปกติ', below: '📉 ต่ำกว่าปกติ' };
    const pMap = { ok: '✅ ปกติ', issue: '⚠️ มีปัญหา' };

    let text = `📋 Daily Report — ${storeName}\n📅 ${App.fmtDate(s8.date)}\n🧑 ผู้รายงาน: ${reporter}\n━━━━━━━━━━━━━━━\n\n`;

    // Sales
    text += '💰 ยอดขาย\n';
    if (channels.length) { channels.forEach(c => { text += `  ${c.channel_key}: ${fm(c.amount)}\n`; }); text += `  Total: ${fm(sm.total_sales || 0)}\n`; }
    else text += '  ยังไม่มีข้อมูล\n';
    text += '\n';

    // Expenses
    text += '🧾 ค่าใช้จ่าย\n';
    if (expenses.length) { expenses.forEach(x => { text += `  ${x.vendor_name || x.description || '—'}: -${fm(x.total_amount)}\n`; }); text += `  รวม ${expenses.length} รายการ: -${fm(expenses.reduce((s, x) => s + (x.total_amount || 0), 0))}\n`; }
    else text += '  ไม่มี\n';
    text += '\n';

    // Cash
    text += '💵 Cash on Hand\n';
    if (cash) {
      text += `  Expected: ${fm(cash.expected_cash || cash.expected || 0)}\n  Actual: ${fm(cash.actual_cash || cash.actual || 0)}\n  Diff: ${fm(cash.difference || cash.variance || 0)}\n`;
      text += cash.is_matched ? '  ✅ เงินตรง\n' : `  🔴 เงินไม่ตรง!${cash.mismatch_reason || cash.reason ? ' — ' + (cash.mismatch_reason || cash.reason) : ''}\n`;
    } else text += '  ยังไม่ได้นับเงิน\n';
    text += '\n';

    // Weather/Traffic/POS
    const rw = _s8Weather || r.weather, rt = _s8Traffic || r.traffic, rp = _s8PosStatus || r.pos_status;
    text += `🌤️ สภาพร้าน\n  อากาศ: ${wMap[rw] || '—'}\n  Traffic: ${tMap[rt] || '—'}\n  POS: ${pMap[rp] || '—'}\n`;
    const note = document.getElementById('s8-note')?.value || r.overview_note || '';
    if (note) text += `  📝 ภาพรวม: ${note}\n`;
    text += '\n';

    // Customer insights
    const custs = [['🌅 เช้า', 's8-cust-morning', 'customer_morning'], ['☀️ กลางวัน', 's8-cust-midday', 'customer_midday'],
      ['🌤️ บ่าย', 's8-cust-afternoon', 'customer_afternoon'], ['🌆 เย็น', 's8-cust-evening', 'customer_evening'],
      ['🌙 ค่ำ', 's8-cust-night', 'customer_night']].filter(c => (document.getElementById(c[1])?.value || r[c[2]]));
    if (custs.length) { text += '🧑‍🤝‍🧑 กลุ่มลูกค้า\n'; custs.forEach(c => { text += `  ${c[0]}: ${document.getElementById(c[1])?.value || r[c[2]]}\n`; }); text += '\n'; }

    // Waste
    const hasWaste = _s8Waste ?? r.has_waste;
    text += `🍞 Waste: ${hasWaste === true ? '✅ มี waste' : hasWaste === false ? '❌ ไม่มี waste' : '— ยังไม่ตอบ'}\n\n`;

    // Incidents
    const activeInc = INCIDENT_CATS.filter(c => (s8.incidents.find(i => i.category === c.key)?.count || 0) > 0);
    if (activeInc.length) {
      const total = activeInc.reduce((s, c) => s + (s8.incidents.find(i => i.category === c.key)?.count || 0), 0);
      text += `⚠️ เหตุการณ์ (${total} รายการ)\n`;
      activeInc.forEach(c => { const inc = s8.incidents.find(i => i.category === c.key);
        text += `  ${c.icon} ${c.name} ×${inc.count}\n`;
        (inc.notes || []).forEach((n, i) => { if (n) text += `    ${i + 1}. ${n}\n`; });
      }); text += '\n';
    }

    // Leftovers
    const activeLft = s8.leftovers.filter(l => (l.item_name || '').trim());
    if (activeLft.length) {
      const lvMap = { little: '🟢 นิดหน่อย', half: '🟡 ครึ่งนึง', almost_full: '🔴 เกือบหมด', full: '⚫ ทั้งจาน' };
      text += '🍚 อาหารเหลือ\n';
      activeLft.forEach(l => { text += `  ${l.item_name} ×${l.quantity} (${lvMap[l.level] || l.level})${l.note ? ' — ' + l.note : ''}\n`; });
      text += '\n';
    }

    // Equipment
    const equipTasks = s8.tasks.filter(t => t.type === 'equipment' && t.report_date === s8.date);
    if (equipTasks.length) { text += `🔧 แจ้งซ่อม (${equipTasks.length})\n`; equipTasks.forEach(t => { text += `  ${t.title}${t.note ? ' — ' + t.note : ''}\n`; }); text += '\n'; }

    // Follow-up tasks
    const followTasks = s8.tasks.filter(t => t.type === 'follow_up' && t.status === 'pending');
    if (followTasks.length) { text += `📋 งานติดตาม (${followTasks.length})\n`; followTasks.forEach(t => { text += `  ${t.priority === 'urgent' ? '🚨' : '⏳'} ${t.title}${t.assigned_to ? ' → ' + t.assigned_to : ''}\n`; }); text += '\n'; }

    // Suggestions
    const sugTasks = s8.tasks.filter(t => t.type === 'suggestion' && t.status === 'pending');
    if (sugTasks.length) { text += `💡 Suggestion (${sugTasks.length})\n`; sugTasks.forEach(t => { text += `  ${t.title}\n`; }); text += '\n'; }

    _lastReportText = text;

    // Copy to clipboard
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(text);
      else { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
    } catch {}

    // Auto-save (fire-and-forget)
    try { await s8Save(); App.toast('📋 Copy แล้ว! วางใน LINE ได้เลย', 'success'); }
    catch { App.toast('📋 Copy แล้ว แต่บันทึกไม่สำเร็จ', 'info'); }
  }

  async function s8Share() {
    if (!_lastReportText) await s8Copy();
    if (!_lastReportText) return;
    try { await navigator.share({ text: _lastReportText }); }
    catch (err) { if (err.name !== 'AbortError') App.toast('Share ไม่ได้ — Copy ไว้แล้ว วางได้เลย', 'info'); }
  }


  // ═══════════════════════════════════════════
  // TASKS (standalone page)
  // ═══════════════════════════════════════════
  let tk = { tasks: [], typeFilter: 'all', statusFilter: 'all' };

  function renderTasks() {
    return `${toolbar('Tasks')}
    <div class="content" id="tk-content">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div class="sl" style="margin:0" id="tk-count">📋 Tasks (0)</div>
        <button class="btn btn-primary btn-sm" onclick="Scr3.tkNewTask()">+ New Task</button>
      </div>
      <div style="font-size:9px;font-weight:600;color:var(--t4);text-transform:uppercase;margin-bottom:4px">Type</div>
      <div class="chips" id="tk-type"><div class="chip on" onclick="Scr3.tkFilter('type','all',this)">All</div><div class="chip" onclick="Scr3.tkFilter('type','equipment',this)">🔧 Equipment</div><div class="chip" onclick="Scr3.tkFilter('type','follow_up',this)">📋 Tasks</div><div class="chip" onclick="Scr3.tkFilter('type','action',this)">💡 Action</div></div>
      <div style="font-size:9px;font-weight:600;color:var(--t4);text-transform:uppercase;margin-bottom:4px">Status</div>
      <div class="chips" id="tk-status"><div class="chip on" onclick="Scr3.tkFilter('status','all',this)">All</div><div class="chip" onclick="Scr3.tkFilter('status','pending',this)">⏳ Open</div><div class="chip" onclick="Scr3.tkFilter('status','done',this)">✅ Done</div></div>
      <div id="tk-list"><div class="skeleton sk-card"></div></div>
    </div>`;
  }

  async function loadTasks() {
    if (_busy.tk) return; _busy.tk = true;
    try {
      const data = await API.getTasks(API.getStore());
      tk.tasks = data.tasks || [];
      fillTasks();
    } catch { App.toast('โหลดไม่สำเร็จ', 'error'); }
    finally { _busy.tk = false; }
  }

  function fillTasks() {
    let list = tk.tasks;
    if (tk.typeFilter !== 'all') list = list.filter(t => t.type === tk.typeFilter);
    if (tk.statusFilter !== 'all') list = list.filter(t => t.status === tk.statusFilter);
    document.getElementById('tk-count').textContent = `📋 Tasks (${list.length})`;

    const el = document.getElementById('tk-list');
    if (!el) return;
    if (!list.length) { el.innerHTML = '<div class="empty-state">ไม่มี Task</div>'; return; }
    el.innerHTML = list.map(t => taskCard(t, t.status === 'pending', 'Scr3.tkToggle')).join('');
  }

  async function tkToggle(taskId, newStatus) {
    try {
      await API.updateTask({ task_id: taskId, status: newStatus });
      const t = tk.tasks.find(x => x.id === taskId);
      if (t) { t.status = newStatus; t.completed_at = newStatus === 'done' ? new Date().toISOString() : null; }
      fillTasks();
      App.toast(newStatus === 'done' ? '✅ เสร็จแล้ว' : '↩ เปิดใหม่', 'success');
    } catch { App.toast('อัพเดทไม่สำเร็จ', 'error'); }
  }

  function tkFilter(dimension, val, el) {
    if (dimension === 'type') tk.typeFilter = val;
    else tk.statusFilter = val;
    el.parentElement.querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
    el.classList.add('on');
    fillTasks();
  }

  function tkNewTask() {
    App.showDialog(`<div class="popup-sheet" style="width:360px">
      <div class="popup-header"><div class="popup-title">+ New Task</div><button class="popup-close" onclick="App.closeDialog()">✕</button></div>
      <div class="fg"><label class="fl">Type</label><select class="fi" id="tknew-type" onchange="Scr3.tkTypeChange()">
        <option value="follow_up">📋 Follow-up</option><option value="equipment">🔧 Equipment</option><option value="suggestion">💡 Suggestion</option><option value="action">🚨 Action</option>
      </select></div>
      <div id="tknew-fields-default">
        <div class="fg"><label class="fl">Title <span class="req">*</span></label><input class="fi" id="tknew-title"></div>
        <div class="fg"><label class="fl">Priority</label><select class="fi" id="tknew-pri"><option value="normal">Normal</option><option value="urgent">Urgent</option><option value="critical">Critical</option></select></div>
        <div class="fg"><label class="fl">Due Date</label><input class="fi" type="date" id="tknew-due"></div>
        <div class="fg"><label class="fl">Note</label><textarea class="fi" id="tknew-note" rows="2"></textarea></div>
      </div>
      <div id="tknew-fields-equip" style="display:none">
        <div class="fg"><label class="fl">ชื่ออุปกรณ์ / เครื่อง <span class="req">*</span></label><input class="fi" id="tknew-eq-name" placeholder="เช่น เครื่องทำน้ำแข็ง, เตาอบ..."></div>
        <div class="fg"><label class="fl">อาการ <span class="req">*</span></label><input class="fi" id="tknew-eq-symptom" placeholder="เช่น ไม่ทำความเย็น, มีเสียงดัง..."></div>
        <div class="fg"><label class="fl">ความเร่งด่วน</label><select class="fi" id="tknew-eq-urgency">
          <option value="">— เลือก —</option>
          <option value="critical">🔴 ใช้งานไม่ได้ ต้องซ่อมทันที</option>
          <option value="high">🟠 ควรซ่อมเร็ว</option>
          <option value="low">🟡 ไม่รีบ ซ่อมเมื่อมีเวลา</option>
          <option value="dispose">⚫ ไม่ซ่อม — ทิ้ง</option>
        </select></div>
      </div>
      <button class="btn btn-gold btn-full" id="tknew-save" onclick="Scr3.tkSaveNew()">💾 Save</button>
    </div>`);
  }

  function tkTypeChange() {
    const type = document.getElementById('tknew-type')?.value;
    const defaultFields = document.getElementById('tknew-fields-default');
    const equipFields = document.getElementById('tknew-fields-equip');
    if (defaultFields) defaultFields.style.display = type === 'equipment' ? 'none' : '';
    if (equipFields) equipFields.style.display = type === 'equipment' ? '' : 'none';
  }

  async function tkSaveNew() {
    const type = document.getElementById('tknew-type')?.value || 'follow_up';
    const btn = document.getElementById('tknew-save'); if (btn) btn.disabled = true;
    try {
      let payload;
      if (type === 'equipment') {
        const name = document.getElementById('tknew-eq-name')?.value?.trim();
        const symptom = document.getElementById('tknew-eq-symptom')?.value?.trim();
        const urgency = document.getElementById('tknew-eq-urgency')?.value;
        if (!name) { if (btn) btn.disabled = false; return App.toast('กรุณาใส่ชื่ออุปกรณ์', 'error'); }
        if (!symptom) { if (btn) btn.disabled = false; return App.toast('กรุณาใส่อาการ', 'error'); }
        if (!urgency) { if (btn) btn.disabled = false; return App.toast('กรุณาเลือกความเร่งด่วน', 'error'); }
        const uMap = { critical: '🔴 ซ่อมทันที', high: '🟠 ควรซ่อมเร็ว', low: '🟡 ไม่รีบ', dispose: '⚫ ทิ้ง' };
        const pri = urgency === 'critical' ? 'urgent' : 'normal';
        payload = { store_id: API.getStore(), title: '🔧 ' + name, type: 'equipment', priority: pri, note: symptom + ' [' + (uMap[urgency] || urgency) + ']' };
      } else {
        const title = document.getElementById('tknew-title')?.value?.trim();
        if (!title) { if (btn) btn.disabled = false; return App.toast('กรุณาใส่ Title', 'error'); }
        payload = {
          store_id: API.getStore(), title, type,
          priority: document.getElementById('tknew-pri')?.value || 'normal',
          due_date: document.getElementById('tknew-due')?.value || null,
          note: document.getElementById('tknew-note')?.value || null,
        };
      }
      const data = await API.createTask(payload);
      tk.tasks.unshift(data);
      App.closeDialog();
      fillTasks();
      App.toast('สร้าง Task สำเร็จ', 'success');
    } catch (err) { App.toast(err.message || 'สร้างไม่สำเร็จ', 'error'); }
    finally { if (btn) btn.disabled = false; }
  }


  // ═══════════════════════════════════════════
  // DAILY HUB — 7-day overview + detail expand
  // ═══════════════════════════════════════════
  let dh = { days: [], pendingTasks: 0, totalIncidents: 0, selectedDate: null, detail: null };

  function renderDH() {
    return `${toolbar('Daily Hub')}
    <div class="content" id="dh-content">
      ${App.renderStoreSelector({ noAll: true })}
      <div id="dh-kpi" class="kpi-row" style="grid-template-columns:1fr 1fr 1fr 1fr"><div class="skeleton sk-kpi"></div><div class="skeleton sk-kpi"></div><div class="skeleton sk-kpi"></div><div class="skeleton sk-kpi"></div></div>
      <div class="sl">📋 รายวัน — กดเลือกดู detail</div>
      <div style="font-size:10px;color:var(--t3);margin-bottom:6px">แสดงย้อนหลัง 7 วัน · วันก่อนหน้าดูที่ Sale History</div>
      <div id="dh-days"><div class="skeleton sk-card"></div></div>
      <div id="dh-detail" style="margin-top:12px"></div>
    </div>`;
  }

  async function loadDH() {
    if (_busy.dh) return; _busy.dh = true;
    try {
      const data = await API.getDailyHub();
      dh.days = data.days || [];
      dh.pendingTasks = data.pending_tasks || 0;
      dh.totalIncidents = data.total_incidents || 0;
      fillDH();
      if (dh.days.length) dhSelect(dh.days[0].date);
    } catch { App.toast('โหลดไม่สำเร็จ', 'error'); }
    finally { _busy.dh = false; }
  }

  function fillDH() {
    const reported = dh.days.filter(d => d.has_report).length;
    const total = dh.days.length;
    const pct = total > 0 ? Math.round(reported / total * 100) : 0;
    document.getElementById('dh-kpi').innerHTML = `
      <div class="kpi-box"><div class="kpi-label">📝 รายงาน</div><div class="kpi-val" style="font-size:16px">${reported}/${total}</div></div>
      <div class="kpi-box"><div class="kpi-label">⚠️ เหตุการณ์</div><div class="kpi-val" style="font-size:16px;color:var(--r)">${dh.totalIncidents}</div></div>
      <div class="kpi-box"><div class="kpi-label">📋 Tasks ค้าง</div><div class="kpi-val" style="font-size:16px;color:var(--acc)">${dh.pendingTasks}</div></div>
      <div class="kpi-box"><div class="kpi-label">✅ Completion</div><div class="kpi-val" style="font-size:16px;color:var(--g)">${pct}%</div></div>`;

    const el = document.getElementById('dh-days');
    if (!el) return;
    el.innerHTML = dh.days.map(d => {
      const sel = d.date === dh.selectedDate;
      const synced = d.sync_status === 'synced';
      const lockTag = synced ? '<span class="sts sts-lock">🔒 Synced</span>' : '<span class="sts sts-ok">✏️ Editable</span>';
      const repTag = d.report_submitted ? '<span class="sts sts-ok">✓ Submitted</span>' : d.has_report ? '<span class="sts sts-pend">Draft</span>' : '<span class="sts sts-lock">— Missing</span>';
      const isToday = d.date === td();
      return `<div class="card" style="padding:8px 10px;cursor:pointer;border-left:3px solid ${sel ? 'var(--acc)' : 'transparent'};${sel ? 'background:var(--acc2)' : synced ? 'background:var(--bg3)' : ''}" onclick="Scr3.dhSelect('${d.date}')">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:12px"><b>${App.fmtDate(d.date).substring(0, 10)}</b>${isToday ? ' <span style="color:var(--t3)">วันนี้</span>' : ''}</div>
          <div style="display:flex;gap:4px;align-items:center">${lockTag}${repTag}</div>
        </div>
      </div>`;
    }).join('');
  }

  async function dhSelect(date) {
    dh.selectedDate = date;
    fillDH(); // re-highlight

    const detailEl = document.getElementById('dh-detail');
    if (!detailEl) return;
    if (_busy.dhDetail) return; _busy.dhDetail = true;
    detailEl.innerHTML = '<div class="skeleton sk-card" style="height:200px"></div>';

    try {
      const data = await API.getDailyDetail(null, date);
      dh.detail = data;
      const isEditable = data.sync_status !== 'synced';
      const channels = data.channels || [];
      const expenses = data.expenses || [];
      const cash = data.cash;
      const chRows = channels.map(c => `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:11px"><span>${e(c.channel_key)}</span><span style="font-weight:600">${fm(c.amount)}</span></div>`).join('') || '<div style="font-size:11px;color:var(--t3)">ไม่มีข้อมูล</div>';
      const expRows = expenses.map(x => `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:11px"><span>${e(x.vendor_name)} · ${e(x.description)}</span><span style="font-weight:600;color:var(--r)">-${fm(x.total_amount)}</span></div>`).join('') || '<div style="font-size:11px;color:var(--t3)">ไม่มี</div>';

      const totalSales = data.sale?.total_sales || 0;
      const totalExp = expenses.reduce((s, x) => s + (x.total_amount || 0), 0);
      const cashMatched = cash?.is_matched;
      const cashColor = cashMatched === true ? 'var(--g)' : cashMatched === false ? 'var(--r)' : 'var(--t3)';

      detailEl.innerHTML = `<div class="card" style="border-top:3px solid var(--acc)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div style="font-size:14px;font-weight:700">📅 ${App.fmtDate(date)}</div>
          <div style="display:flex;gap:4px">${isEditable ? '<span class="sts sts-ok">✏️ Editable</span>' : '<span class="sts sts-lock">🔒 Synced</span>'}</div>
        </div>
        <div class="sl" style="margin-top:0">💰 ยอดขาย</div><div class="card" style="padding:8px">${chRows}<div style="border-top:1px solid var(--bd2);margin-top:4px;padding-top:4px;display:flex;justify-content:space-between;font-weight:700;font-size:12px"><span>Total</span><span style="color:var(--gold)">${fm(totalSales)}</span></div></div>
        <div class="sl">🧾 ค่าใช้จ่าย</div><div class="card" style="padding:8px">${expRows}<div style="border-top:1px solid var(--bd2);margin-top:4px;padding-top:4px;display:flex;justify-content:space-between;font-weight:700;font-size:12px"><span>Total</span><span style="color:var(--r)">-${fm(totalExp)}</span></div></div>
        ${cash ? `<div class="sl">💵 Cash On Hand</div><div class="card" style="padding:8px;border-left:3px solid ${cashColor}">
          <div style="display:flex;justify-content:space-between;font-size:11px"><span>Expected</span><span>${fm(cash.expected_cash || 0)}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:11px"><span>Variance</span><span style="color:${cashColor};font-weight:600">${fm(cash.difference || 0)}</span></div>
        </div>` : ''}
        ${isEditable ? `<div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn btn-primary" style="flex:1" onclick="App.go('daily-sale-edit',{date:'${date}'})">✏️ แก้ยอดขาย</button>
          <button class="btn btn-outline" style="flex:1" onclick="App.go('expense',{date:'${date}'})">✏️ แก้ค่าใช้จ่าย</button>
          <button class="btn btn-outline" style="flex:1" onclick="Scr3.dhViewReport('${date}')">📝 ดูรายงาน</button>
        </div>` : ''}
      </div>`;
    } catch { detailEl.innerHTML = '<div class="empty-state">โหลดข้อมูลไม่ได้</div>'; }
    finally { _busy.dhDetail = false; }
  }


  // ─── Daily Hub: View Report popup (read-only) ───
  async function dhViewReport(date) {
    App.showDialog(`<div class="popup-sheet" style="width:420px;max-height:85dvh;overflow-y:auto">
      <div class="popup-header"><div class="popup-title">📋 Daily Report — ${App.fmtDate(date)}</div><button class="popup-close" onclick="App.closeDialog()">✕</button></div>
      <div class="skeleton sk-card" style="height:120px"></div>
    </div>`);

    try {
      const [repData, sumData] = await Promise.all([
        API.getDailyReport(null, date),
        API.getS8Summary(null, date),
      ]);
      const r = repData.report || {};
      const incidents = repData.incidents || [];
      const leftovers = repData.leftovers || [];
      const tasks = repData.tasks || [];
      const sm = sumData || {};
      const channels = sm.channels || [];
      const expenses = sm.expenses || [];
      const cash = sm.cash;

      const wMap = { sunny: '☀️ แดด', cloudy: '☁️ ครึ้ม', rain: '🌧️ ฝน', heavy_rain: '⛈️ ฝนหนัก' };
      const tMap = { above: '📈 ดีกว่าปกติ', normal: '➡️ ปกติ', below: '📉 ต่ำกว่าปกติ' };
      const pMap = { ok: '✅ ปกติ', issue: '⚠️ มีปัญหา' };

      // Sales
      const chHtml = channels.length ? channels.map(c =>
        `<div style="display:flex;justify-content:space-between;padding:2px 0;font-size:11px"><span>${e(c.channel_key)}</span><span style="font-weight:600">${fm(c.amount)}</span></div>`
      ).join('') + `<div style="border-top:1px solid var(--bd2);margin-top:4px;padding-top:4px;display:flex;justify-content:space-between;font-weight:700;font-size:12px"><span>Total</span><span style="color:var(--gold)">${fm(sm.total_sales || 0)}</span></div>` : '<div style="font-size:11px;color:var(--t3)">ไม่มีข้อมูล</div>';

      // Expenses
      const expHtml = expenses.length ? expenses.map(x =>
        `<div style="display:flex;justify-content:space-between;padding:2px 0;font-size:11px"><span>${e(x.vendor_name)}</span><span style="font-weight:600;color:var(--r)">-${fm(x.total_amount)}</span></div>`
      ).join('') : '<div style="font-size:11px;color:var(--t3)">ไม่มี</div>';

      // Cash
      let cashHtml = '';
      if (cash) {
        const matched = cash.is_matched;
        const clr = matched ? 'var(--g)' : 'var(--r)';
        cashHtml = `<div style="margin-bottom:8px"><div style="font-size:10px;font-weight:600;color:var(--t3);margin-bottom:4px">💵 CASH ON HAND</div>
          <div style="padding:8px;border-left:3px solid ${clr};background:var(--bg2);border-radius:var(--rd)">
            <div style="display:flex;justify-content:space-between;font-size:11px"><span>Expected</span><span>${fm(cash.expected_cash || 0)}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:11px"><span>Actual</span><span>${fm(cash.actual_cash || 0)}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-top:4px;padding-top:4px;border-top:1px solid var(--bd2)"><span>Diff</span><span style="color:${clr}">${fm(cash.difference || 0)}</span></div>
          </div></div>`;
      }

      // Weather / Traffic / POS
      const condHtml = `<div style="font-size:11px;line-height:2;color:var(--t2)">
        อากาศ: ${wMap[r.weather] || '—'} · Traffic: ${tMap[r.traffic] || '—'} · POS: ${pMap[r.pos_status] || '—'}
      </div>`;

      // Incidents
      let incHtml = '';
      const activeInc = incidents.filter(i => i.count > 0);
      if (activeInc.length) {
        incHtml = `<div style="margin-bottom:8px"><div style="font-size:10px;font-weight:600;color:var(--t3);margin-bottom:4px">⚠️ เหตุการณ์ (${activeInc.reduce((s, i) => s + i.count, 0)})</div>
          ${activeInc.map(i => {
            const cat = INCIDENT_CATS.find(c => c.key === i.category);
            const notes = i.notes || (i.note ? i.note.split(' | ') : []);
            return `<div style="padding:4px 0;font-size:11px">${cat?.icon || '⚠️'} <b>${cat?.name || i.category}</b> ×${i.count}${notes.length ? '<br>' + notes.map((n, idx) => `  ${idx + 1}. ${e(n)}`).join('<br>') : ''}</div>`;
          }).join('')}</div>`;
      }

      // Leftovers
      let leftHtml = '';
      const activeLft = leftovers.filter(l => l.item_name);
      if (activeLft.length) {
        const lvMap = { little: '🟢 นิดหน่อย', half: '🟡 ครึ่งนึง', almost_full: '🔴 เกือบหมด', full: '⚫ ทั้งจาน' };
        leftHtml = `<div style="margin-bottom:8px"><div style="font-size:10px;font-weight:600;color:var(--t3);margin-bottom:4px">🍚 อาหารเหลือ</div>
          ${activeLft.map(l => `<div style="font-size:11px;padding:2px 0">${e(l.item_name)} ×${l.quantity} (${lvMap[l.level] || l.level})${l.note ? ' — ' + e(l.note) : ''}</div>`).join('')}</div>`;
      }

      // Pending tasks
      let taskHtml = '';
      const pendingTasks = tasks.filter(t => t.status === 'pending');
      if (pendingTasks.length) {
        const icons = { equipment: '🔧', follow_up: '📋', suggestion: '💡', action: '🚨' };
        taskHtml = `<div style="margin-bottom:8px"><div style="font-size:10px;font-weight:600;color:var(--t3);margin-bottom:4px">📋 งานค้าง (${pendingTasks.length})</div>
          ${pendingTasks.map(t => `<div style="font-size:11px;padding:2px 0">${icons[t.type] || '📋'} ${e(t.title)}${t.assigned_to ? ' → ' + e(t.assigned_to) : ''}</div>`).join('')}</div>`;
      }

      // Overview note
      const noteHtml = r.overview_note ? `<div style="margin-bottom:8px"><div style="font-size:10px;font-weight:600;color:var(--t3);margin-bottom:4px">📝 Note</div><div style="font-size:11px">${e(r.overview_note)}</div></div>` : '';

      // Submitted status
      const submitted = r.is_submitted;
      const stsBadge = submitted ? '<span class="sts sts-ok">✓ Submitted</span>' : '<span class="sts sts-pend">Draft</span>';

      App.showDialog(`<div class="popup-sheet" style="width:420px;max-height:85dvh;overflow-y:auto">
        <div class="popup-header"><div class="popup-title">📋 Daily Report</div><button class="popup-close" onclick="App.closeDialog()">✕</button></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div style="font-size:13px;font-weight:700">📅 ${App.fmtDate(date)}</div>${stsBadge}
        </div>
        <div style="margin-bottom:8px"><div style="font-size:10px;font-weight:600;color:var(--t3);margin-bottom:4px">💰 ยอดขาย</div><div style="padding:6px 8px;background:var(--bg2);border-radius:var(--rd)">${chHtml}</div></div>
        <div style="margin-bottom:8px"><div style="font-size:10px;font-weight:600;color:var(--t3);margin-bottom:4px">🧾 ค่าใช้จ่าย</div><div style="padding:6px 8px;background:var(--bg2);border-radius:var(--rd)">${expHtml}</div></div>
        ${cashHtml}
        <div style="margin-bottom:8px"><div style="font-size:10px;font-weight:600;color:var(--t3);margin-bottom:4px">🌤️ สภาพร้าน</div>${condHtml}</div>
        ${noteHtml}${incHtml}${leftHtml}${taskHtml}
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-primary" style="flex:1" onclick="App.closeDialog();App.go('daily-report',{date:'${date}'})">✏️ แก้ไขรายงาน</button>
          <button class="btn btn-outline" style="flex:1" onclick="App.closeDialog()">ปิด</button>
        </div>
      </div>`);
    } catch (err) {
      App.showDialog(`<div class="popup-sheet" style="width:320px;text-align:center">
        <div style="font-size:13px;font-weight:700;margin-bottom:8px">โหลดรายงานไม่ได้</div>
        <div style="font-size:11px;color:var(--t3);margin-bottom:12px">${e(err.message || 'Unknown error')}</div>
        <button class="btn btn-outline" onclick="App.closeDialog()">ปิด</button>
      </div>`);
    }
  }


  // ═══ PUBLIC ═══
  return {
    renderS5, loadS5, s5Reload, s5LoadMore,
    renderS6, loadS6, s6Reload, s6SetFilter, s6LoadMore, showDetail,
    renderS8, loadS8, s8Nav, s8SetTab, s8Pick, s8IncChange, s8IncNote,
    s8LeftUpdate, s8LeftRemove, s8AddLeftover, s8LeftLevel,
    s8ToggleTask, s8NewTask, s8SaveNewTask,
    s8NewRepair, s8SetUrgency, s8SaveRepair,
    s8AddEquipment, s8AddTask,
    s8Save, s8Copy, s8Share,
    renderTasks, loadTasks, tkFilter, tkNewTask, tkTypeChange, tkSaveNew, tkToggle,
    renderDH, loadDH, dhSelect, dhViewReport,
  };
})();
