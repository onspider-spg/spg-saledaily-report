/**
 * Version 1.2 | 15 MAR 2026 | Siam Palette Group
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

  function toolbar(title) {
    return `<div class="toolbar"><button class="toolbar-back" onclick="App.go('dashboard')">←</button><div class="toolbar-title">${title}</div></div>`;
  }

  // ═══════════════════════════════════════════
  // S5: SALE HISTORY (default 3 days, LIMIT 10, load more)
  // ═══════════════════════════════════════════
  let s5 = { records: [], offset: 0 };

  function renderS5() {
    return `${toolbar('Sale History')}
    <div class="content" id="s5-content">
      ${App.renderStoreSelector()}
      <div id="s5-kpi" class="kpi-row kpi-3"><div class="skeleton sk-kpi"></div><div class="skeleton sk-kpi"></div><div class="skeleton sk-kpi"></div></div>
      <div id="s5-list"><div class="skeleton sk-card"></div></div>
      <div id="s5-more" style="display:none;text-align:center;padding:10px">
        <span style="font-size:11px;color:var(--acc);padding:5px 14px;border:1px solid var(--bd);border-radius:var(--rd);cursor:pointer" onclick="Scr3.s5LoadMore()">โหลดเพิ่ม →</span>
      </div>
    </div>`;
  }

  async function loadS5(reset) {
    if (reset) { s5.records = []; s5.offset = 0; }
    if (_busy.s5) return; _busy.s5 = true;
    try {
      const data = await API.getSaleHistory({ days: 30, limit: 10, offset: s5.offset });
      const newRecs = data.records || [];
      s5.records = s5.offset === 0 ? newRecs : [...s5.records, ...newRecs];
      fillS5();
      document.getElementById('s5-more').style.display = newRecs.length >= 10 ? '' : 'none';
    } catch { App.toast('โหลดไม่สำเร็จ', 'error'); }
    finally { _busy.s5 = false; }
  }

  function fillS5() {
    // KPI from records
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
      return `<div class="card" style="padding:10px;cursor:pointer" onclick="App.go('daily-hub')">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <div><div style="font-size:12px;font-weight:700">${App.fmtDate(r.sale_date)}</div>
          <div style="font-size:10px;color:var(--t3)">${e(r.store_id)} · ${channels.length} ch</div></div>
          <div style="text-align:right"><div style="font-size:14px;font-weight:700;color:var(--gold)">${fm(r.total_sales)}</div>
          <span class="sts ${synced ? 'sts-ok' : 'sts-pend'}">${synced ? 'Synced' : 'Pending'}</span></div>
        </div>
        ${channels.length ? `<details style="font-size:10px;color:var(--t3)"><summary>▸ Channel breakdown</summary><div style="padding:4px 0">${chText}</div></details>` : ''}
      </div>`;
    }).join('');
  }

  function s5LoadMore() { s5.offset += 10; loadS5(false); }


  // ═══════════════════════════════════════════
  // S6: EXPENSE HISTORY (default 3 days, filter: all/expense/invoice)
  // ═══════════════════════════════════════════
  let s6 = { expenses: [], invoices: [], filter: 'all', offset: 0 };

  function renderS6() {
    return `${toolbar('Expense History')}
    <div class="content" id="s6-content">
      ${App.renderStoreSelector()}
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

  async function loadS6(reset) {
    if (reset) { s6.expenses = []; s6.invoices = []; s6.offset = 0; }
    if (_busy.s6) return; _busy.s6 = true;
    try {
      const data = await API.getExpenseHistory({ days: 30, limit: 10, offset: s6.offset, filter: s6.filter });
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
    if (s6.filter !== 'invoice') items.push(...s6.expenses.map(x => ({ ...x, _type: 'expense', _date: x.expense_date })));
    if (s6.filter !== 'expense') items.push(...s6.invoices.map(x => ({ ...x, _type: 'invoice', _date: x.invoice_date })));
    items.sort((a, b) => b._date.localeCompare(a._date));

    if (!items.length) { el.innerHTML = '<div class="empty-state">ยังไม่มีข้อมูล</div>'; return; }
    el.innerHTML = items.map(it => {
      const isInv = it._type === 'invoice';
      const tag = isInv ? `<span class="tag tag-o">Invoice</span>` : `<span class="tag tag-gray">Bill</span>`;
      const statusTag = isInv ? `<span class="sts ${it.payment_status === 'paid' ? 'sts-ok' : 'sts-err'}">${it.payment_status}</span>` : '';
      return `<div class="li-card"><div style="display:flex;justify-content:space-between">
        <div><div style="font-size:12px;font-weight:700">${e(it.description || it.invoice_no)}</div>
        <div style="font-size:10px;color:var(--t3)">${e(it.vendor_name)} · ${it._date} · ${tag}</div></div>
        <div style="text-align:right"><div style="font-size:13px;font-weight:700;color:var(--r)">-${fm(it.total_amount)}</div>${statusTag}</div>
      </div></div>`;
    }).join('');
    document.getElementById('s6-more').style.display = items.length >= 10 ? '' : 'none';
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
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:4px 0 10px;font-size:13px;font-weight:600">
        <span class="dbar-btn" onclick="Scr3.s8Nav(-1)">‹</span>
        <span id="s8-date-label">📅 ${App.fmtDate(s8.date)}</span>
        <span class="dbar-btn" onclick="Scr3.s8Nav(1)">›</span>
      </div>
      <div class="tab-row">
        <div class="tab-pill on" data-tab="overview" onclick="Scr3.s8SetTab('overview',this)">📊 ภาพรวม</div>
        <div class="tab-pill" data-tab="incidents" onclick="Scr3.s8SetTab('incidents',this)">⚠️ เหตุการณ์</div>
        <div class="tab-pill" data-tab="tasks" onclick="Scr3.s8SetTab('tasks',this)">📋 ติดตาม</div>
      </div>
      <div id="s8-tab-content"><div class="skeleton sk-card" style="height:200px"></div></div>
      <div style="display:flex;gap:8px;margin-top:12px;padding-bottom:8px">
        <button class="btn btn-gold" style="flex:1;padding:10px" id="s8-save" onclick="Scr3.s8Save()">💾 บันทึก</button>
        <button class="btn btn-outline" style="flex:1" onclick="Scr3.s8Copy()">📋 Copy</button>
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
      s8.incidents = repData.incidents || [];
      s8.leftovers = repData.leftovers || [];
      s8.tasks = repData.tasks || [];
      s8.summary = sumData;
      fillS8Tab();
    } catch { App.toast('โหลดไม่สำเร็จ', 'error'); }
    finally { _busy.s8 = false; }
  }

  function s8Nav(delta) {
    s8.date = App.addDays(s8.date, delta);
    document.getElementById('s8-date-label').textContent = '📅 ' + App.fmtDate(s8.date);
    loadS8();
  }

  function s8SetTab(tab, el) {
    s8.tab = tab;
    if (el) { el.parentElement.querySelectorAll('.tab-pill').forEach(t => t.classList.remove('on')); el.classList.add('on'); }
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
      cashHtml = `<div class="sl">💵 Cash on Hand (auto จาก S4)</div>
        <div class="card" style="padding:10px;border-left:3px solid ${clr}">
          <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:11px"><span>Expected</span><span style="font-weight:600">${fm(cash.expected_cash || cash.expected || 0)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:11px"><span>Actual</span><span style="font-weight:600">${fm(cash.actual_cash || cash.actual || 0)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0 0;border-top:1px solid var(--bd2);margin-top:4px;font-weight:700;font-size:12px"><span>Diff</span><span style="color:${clr}">${fm(cash.difference || cash.variance || 0)}</span></div>
          <div style="margin-top:6px;padding:6px 10px;background:${bg};border-radius:var(--rd);text-align:center;font-size:12px;font-weight:600;color:${clr}">${matched ? '✅ เงินตรง' : '🔴 เงินไม่ตรง!'}</div>
          ${!matched && (cash.mismatch_reason || cash.reason) ? `<div style="font-size:10px;color:var(--t3);margin-top:4px">📝 ${e(cash.mismatch_reason || cash.reason)}</div>` : ''}
        </div>`;
    } else {
      cashHtml = `<div class="sl">💵 Cash on Hand</div><div class="card" style="padding:10px"><div style="font-size:11px;color:var(--t3)">ยังไม่ได้นับเงิน</div></div>`;
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
      <div class="sl" style="margin-top:0">💰 ยอดขาย (auto จาก S1)</div>
      <div class="card" style="padding:10px">${chHtml}</div>

      <div class="sl">🧾 ค่าใช้จ่าย (auto จาก S2)</div>
      <div class="card" style="padding:10px">${expHtml}</div>

      ${cashHtml}

      <div class="sl">🌤️ สภาพร้านวันนี้</div>
      <div class="card" style="padding:10px">
        <div class="fg"><label class="fl">อากาศ</label><div class="chips" style="margin:0" id="s8-weather">
          ${[{k:'sunny',l:'☀️ แดด'},{k:'cloudy',l:'☁️ ครึ้ม'},{k:'rain',l:'🌧️ ฝน'},{k:'heavy_rain',l:'⛈️ ฝนหนัก'}].map(w => `<div class="chip${r.weather === w.k ? ' on' : ''}" onclick="Scr3.s8Pick('weather','${w.k}',this)">${w.l}</div>`).join('')}
        </div></div>
        <div class="fg"><label class="fl">Traffic วันนี้</label><div class="chips" style="margin:0" id="s8-traffic">
          ${[{k:'above',l:'📈 ดีกว่าปกติ'},{k:'normal',l:'➡️ ปกติ'},{k:'below',l:'📉 ต่ำกว่าปกติ'}].map(t => `<div class="chip${r.traffic === t.k ? ' on' : ''}" onclick="Scr3.s8Pick('traffic','${t.k}',this)">${t.l}</div>`).join('')}
        </div></div>
        <div class="fg"><label class="fl">ระบบ POS / Printer</label><div class="chips" style="margin:0" id="s8-pos">
          ${[{k:'ok',l:'✅ ปกติ'},{k:'issue',l:'⚠️ มีปัญหา'}].map(p => `<div class="chip${(r.pos_status || 'ok') === p.k ? ' on' : ''}" onclick="Scr3.s8Pick('pos_status','${p.k}',this)">${p.l}</div>`).join('')}
        </div></div>
      </div>

      <div class="sl">🧑‍🤝‍🧑 กลุ่มลูกค้าตามช่วงเวลา</div>
      <div class="card" style="padding:10px">
        ${custPeriods.map(p => `<div class="fg" style="margin-bottom:6px"><label class="fl">${p.label}</label><textarea class="fi" style="padding:4px 6px;font-size:11px;min-height:28px" id="s8-cust-${p.key}" placeholder="${p.ph}">${e(r['customer_' + p.key] || '')}</textarea></div>`).join('')}
      </div>

      <div class="sl">📝 Overview Note</div>
      <div class="card" style="padding:10px">
        <textarea class="fi" id="s8-note" rows="2" placeholder="เช่น ฝนตกหนักช่วงเย็น...">${e(r.overview_note || '')}</textarea>
      </div>

      <div class="sl">🍞 Waste List</div>
      <div class="card" style="padding:10px">
        <div style="font-size:12px;font-weight:600;margin-bottom:8px">ขนมปัง / เค้กที่เหลือ?</div>
        <div class="chips" style="margin:0" id="s8-waste">
          <div class="chip${r.has_waste === false ? ' on' : ''}" onclick="Scr3.s8Pick('waste','no',this)">❌ No</div>
          <div class="chip${r.has_waste === true ? ' on' : ''}" onclick="Scr3.s8Pick('waste','yes',this)">✅ Yes</div>
        </div>
        <div id="s8-waste-detail">${wasteDetail}</div>
      </div>`;
  }

  function fillS8Incidents(el) {
    const cats = ['food_quality','contamination','service_delay','wrong_order','complaint','waste','staff'];
    el.innerHTML = `<div class="sl" style="margin-top:0">⚠️ เหตุการณ์</div>
      ${cats.map(cat => {
        const inc = s8.incidents.find(i => i.category === cat);
        const count = inc?.count || 0;
        return `<div class="card" style="padding:10px;margin-bottom:6px;border-left:3px solid ${count > 0 ? 'var(--gold)' : 'transparent'}">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:12px;font-weight:600">${cat.replace(/_/g, ' ')}</span>
            <div style="display:flex;align-items:center;gap:6px">
              <button class="cnt-btn" onclick="Scr3.s8IncChange('${cat}',-1)">−</button>
              <span style="font-size:14px;font-weight:700;min-width:20px;text-align:center" id="s8-inc-${cat}">${count}</span>
              <button class="cnt-btn" onclick="Scr3.s8IncChange('${cat}',1)">+</button>
            </div>
          </div>
          ${count > 0 ? `<div style="margin-top:6px"><input class="fi" style="font-size:11px;padding:4px 8px" id="s8-inc-note-${cat}" value="${e(inc?.note || '')}" placeholder="Note..."></div>` : ''}
        </div>`;
      }).join('')}
      <div class="sl">🍞 Leftovers</div>
      <div id="s8-leftovers">${renderLeftovers()}</div>
      <button class="btn btn-outline btn-sm" onclick="Scr3.s8AddLeftover()">+ เพิ่มรายการ</button>`;
  }

  function renderLeftovers() {
    return s8.leftovers.map((l, i) => `<div style="display:flex;gap:6px;align-items:center;margin-bottom:4px">
      <input class="fi" style="flex:2;font-size:11px;padding:4px 6px" value="${e(l.item_name)}" onchange="Scr3.s8LeftUpdate(${i},'item_name',this.value)">
      <input class="fi" type="number" style="flex:0 0 40px;font-size:11px;padding:4px 6px" value="${l.quantity}" onchange="Scr3.s8LeftUpdate(${i},'quantity',this.value)">
      <select class="fi" style="flex:1;font-size:10px;padding:4px" onchange="Scr3.s8LeftUpdate(${i},'level',this.value)">
        ${['little','half','almost_full','full'].map(v => `<option value="${v}"${l.level === v ? ' selected' : ''}>${v}</option>`).join('')}
      </select>
      <button class="cnt-btn" style="color:var(--r);border-color:var(--r)" onclick="Scr3.s8LeftRemove(${i})">✕</button>
    </div>`).join('');
  }

  function fillS8Tasks(el) {
    const pending = s8.tasks.filter(t => t.status === 'pending');
    const done = s8.tasks.filter(t => t.status === 'done');

    // Equipment repairs for selected date
    const repairs = s8.tasks.filter(t => t.type === 'equipment' && t.report_date === s8.date);
    const priTags = { critical: 'tag-r', urgent: 'tag-o', normal: 'tag-b', low: 'tag-gray' };

    const repairSection = `<div class="card" style="border-left:3px solid var(--o);margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="font-size:12px;font-weight:700">🔧 แจ้งซ่อมอุปกรณ์</div>
        <button class="btn btn-outline btn-sm" style="color:var(--o);border-color:var(--o)" onclick="Scr3.s8NewRepair()">+แจ้งซ่อม</button>
      </div>
      <div style="font-size:10px;color:var(--t3);margin-bottom:6px">📅 ${App.fmtDate(s8.date)}</div>
      ${repairs.length ? repairs.map(r => {
        const isDone = r.status === 'done';
        const tagCls = priTags[r.priority] || 'tag-gray';
        return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--bd2)">
          <span>🔧</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:11px;font-weight:600;${isDone ? 'text-decoration:line-through;color:var(--t3)' : ''}">${e(r.title)}</div>
            ${r.note ? `<div style="font-size:10px;color:var(--t3)">${e(r.note)}</div>` : ''}
          </div>
          <span class="tag ${tagCls}" style="font-size:8px">${e(r.priority)}</span>
          ${isDone ? '<span style="font-size:10px;color:var(--g)">✅</span>' : `<button class="cnt-btn" style="color:var(--g);border-color:var(--g)" onclick="Scr3.s8ToggleTask('${r.id}','done')">✓</button>`}
        </div>`;
      }).join('') : '<div style="font-size:11px;color:var(--t3);padding:4px 0">ไม่มีรายการแจ้งซ่อมวันนี้</div>'}
    </div>`;

    // Non-equipment tasks
    const pendingOther = pending.filter(t => !(t.type === 'equipment' && t.report_date === s8.date));
    const doneOther = done.filter(t => !(t.type === 'equipment' && t.report_date === s8.date));

    el.innerHTML = `${repairSection}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div class="sl" style="margin:0">📋 Tasks (${pendingOther.length + doneOther.length})</div>
        <button class="btn btn-primary btn-sm" onclick="Scr3.s8NewTask()">+ New</button>
      </div>
      ${pendingOther.map(t => taskCard(t, true)).join('')}
      ${doneOther.length ? `<div class="sl">✅ Done</div>${doneOther.map(t => taskCard(t, false)).join('')}` : ''}`;
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
    if (!inc) { inc = { category: cat, count: 0, note: '' }; s8.incidents.push(inc); }
    inc.count = Math.max(0, inc.count + delta);
    fillS8Tab(); // re-render incidents tab
  }

  function s8LeftUpdate(idx, field, val) { if (s8.leftovers[idx]) s8.leftovers[idx][field] = field === 'quantity' ? parseInt(val) || 1 : val; }
  function s8LeftRemove(idx) { s8.leftovers.splice(idx, 1); document.getElementById('s8-leftovers').innerHTML = renderLeftovers(); }
  function s8AddLeftover() { s8.leftovers.push({ item_name: '', quantity: 1, level: 'half' }); document.getElementById('s8-leftovers').innerHTML = renderLeftovers(); }

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

  async function s8Save() {
    const btn = document.getElementById('s8-save'); if (btn) btn.disabled = true;
    try {
      // Collect incident notes from DOM
      s8.incidents.forEach(inc => {
        const noteEl = document.getElementById('s8-inc-note-' + inc.category);
        if (noteEl) inc.note = noteEl.value;
      });

      await API.saveDailyReport({
        store_id: API.getStore(), report_date: s8.date,
        weather: _s8Weather || s8.report?.weather,
        traffic: _s8Traffic || s8.report?.traffic,
        has_waste: _s8Waste ?? s8.report?.has_waste,
        pos_status: _s8PosStatus || s8.report?.pos_status || 'ok',
        overview_note: document.getElementById('s8-note')?.value || '',
        customer_morning: document.getElementById('s8-cust-morning')?.value,
        customer_midday: document.getElementById('s8-cust-midday')?.value,
        customer_afternoon: document.getElementById('s8-cust-afternoon')?.value,
        customer_evening: document.getElementById('s8-cust-evening')?.value,
        customer_night: document.getElementById('s8-cust-night')?.value,
        incidents: s8.incidents.filter(i => i.count > 0),
        leftovers: s8.leftovers.filter(l => l.item_name),
        is_submitted: true,
      });
      App.toast('บันทึกสำเร็จ', 'success');
    } catch (err) { App.toast(err.message || 'บันทึกไม่สำเร็จ', 'error'); }
    finally { if (btn) btn.disabled = false; }
  }

  function s8Copy() {
    const r = s8.report || {};
    const sm = s8.summary || {};
    const text = [
      `📅 ${App.fmtDate(s8.date)} — Daily Report`,
      `Store: ${API.getStore()}`,
      `💰 Sales: ${fm(sm.total_sales || 0)}`,
      `🧾 Expense: ${fm(sm.total_expense || 0)}`,
      `🌤️ Weather: ${r.weather || '—'}`,
      `🧑‍🤝‍🧑 Traffic: ${r.traffic || '—'}`,
      s8.incidents.filter(i => i.count > 0).map(i => `⚠️ ${i.category}: ${i.count}`).join('\n'),
    ].filter(Boolean).join('\n');
    navigator.clipboard?.writeText(text)?.then(() => App.toast('Copied!', 'success')).catch(() => App.toast('Copy failed', 'error'));
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
      <div class="fg"><label class="fl">Title <span class="req">*</span></label><input class="fi" id="tknew-title"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="fg"><label class="fl">Type</label><select class="fi" id="tknew-type"><option value="follow_up">📋 Follow-up</option><option value="equipment">🔧 Equipment</option><option value="suggestion">💡 Suggestion</option><option value="action">🚨 Action</option></select></div>
        <div class="fg"><label class="fl">Priority</label><select class="fi" id="tknew-pri"><option value="normal">Normal</option><option value="urgent">Urgent</option><option value="critical">Critical</option></select></div>
      </div>
      <div class="fg"><label class="fl">Due Date</label><input class="fi" type="date" id="tknew-due"></div>
      <div class="fg"><label class="fl">Note</label><textarea class="fi" id="tknew-note" rows="2"></textarea></div>
      <button class="btn btn-gold btn-full" id="tknew-save" onclick="Scr3.tkSaveNew()">💾 Save</button>
    </div>`);
  }

  async function tkSaveNew() {
    const title = document.getElementById('tknew-title')?.value?.trim();
    if (!title) return App.toast('กรุณาใส่ Title', 'error');
    const btn = document.getElementById('tknew-save'); if (btn) btn.disabled = true;
    try {
      const data = await API.createTask({
        store_id: API.getStore(), title,
        type: document.getElementById('tknew-type')?.value || 'follow_up',
        priority: document.getElementById('tknew-pri')?.value || 'normal',
        due_date: document.getElementById('tknew-due')?.value || null,
        note: document.getElementById('tknew-note')?.value || null,
      });
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
      ${App.renderStoreSelector()}
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
          <button class="btn btn-primary" style="flex:1" onclick="App.go('daily-sale',{date:'${date}'})">✏️ แก้ยอดขาย</button>
          <button class="btn btn-outline" style="flex:1" onclick="App.go('expense',{date:'${date}'})">✏️ แก้ค่าใช้จ่าย</button>
          <button class="btn btn-outline" style="flex:1" onclick="App.go('daily-report',{date:'${date}'})">📝 ดูรายงาน</button>
        </div>` : ''}
      </div>`;
    } catch { detailEl.innerHTML = '<div class="empty-state">โหลดข้อมูลไม่ได้</div>'; }
    finally { _busy.dhDetail = false; }
  }


  // ═══ PUBLIC ═══
  return {
    renderS5, loadS5, s5LoadMore,
    renderS6, loadS6, s6SetFilter, s6LoadMore,
    renderS8, loadS8, s8Nav, s8SetTab, s8Pick, s8IncChange,
    s8LeftUpdate, s8LeftRemove, s8AddLeftover,
    s8ToggleTask, s8NewTask, s8SaveNewTask,
    s8NewRepair, s8SetUrgency, s8SaveRepair,
    s8Save, s8Copy,
    renderTasks, loadTasks, tkFilter, tkNewTask, tkSaveNew, tkToggle,
    renderDH, loadDH, dhSelect,
  };
})();
