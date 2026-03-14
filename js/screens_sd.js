/**
 * Version 1.0.1 | 15 MAR 2026 | Siam Palette Group
 * ═══════════════════════════════════════════
 * SPG — Sale Daily Report V2
 * screens_sd.js — Dashboard T1 Admin + T4 Store
 * Pattern: render(skeleton) → loadDashboard() → fillDashboard()
 * ═══════════════════════════════════════════
 */

const Scr = (() => {
  const e = App.esc, fm = App.fmtMoney, fms = App.fmtMoneyShort;
  let _dashLoading = false, _adminLoading = false;

  // ═══ DASHBOARD ═══
  function renderDashboard() {
    const s = App.S.session;
    if (!s) return '';
    const isAdmin = (s.tier_level || 99) <= 2;
    return isAdmin ? renderT1(s) : renderT4(s);
  }

  // ─── T1 ADMIN DASHBOARD ───
  function renderT1(s) {
    return `<div class="toolbar"><div class="toolbar-title">Dashboard</div></div>
    <div class="content" id="dash-content">
      <div style="margin-bottom:14px"><div class="welcome-name">Welcome, ${e(s.display_name)}</div><div class="welcome-meta">${e(s.tier_id)} · Admin · ${e(s.store_name || s.store_id)} · ${e(s.dept_id)}</div></div>
      ${App.renderStoreSelector()}
      <div id="dash-kpi" class="kpi-row kpi-4"><div class="skeleton sk-kpi"></div><div class="skeleton sk-kpi"></div><div class="skeleton sk-kpi"></div><div class="skeleton sk-kpi"></div></div>
      <div id="dash-chart" class="skeleton sk-card" style="height:160px"></div>
      <div id="dash-cash" class="skeleton sk-card" style="height:80px"></div>
      <div id="dash-anomaly"></div>
      <div id="dash-stores"></div>
      <div class="sl">📊 History</div>
      ${qb('📊', 'var(--gold-bg)', 'var(--gold)', 'Sale History', 'ประวัติขาย', 'sale-history')}
      ${qb('📋', 'var(--rbg)', 'var(--r)', 'Expense History', 'ประวัติจ่าย', 'expense-history')}
      <div class="sl">📝 Report</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        ${qb('📝', 'var(--obg)', 'var(--o)', 'Daily Report', '', 'daily-report')}
        ${qb('📊', 'var(--bbg)', 'var(--b)', 'Daily Hub', 'สรุปรายวัน', 'daily-hub')}
        ${qb('📋', 'var(--acc2)', 'var(--acc)', 'Tasks', '', 'tasks')}
      </div>
      <div class="sl">⚙️ Admin</div>
      ${qb('📤', 'var(--gbg)', 'var(--g)', 'Account Review', 'Editable / Sync', 'acc-review')}
      ${qb('📡', 'var(--gold-bg)', 'var(--gold)', 'Channels', 'ช่องทางขาย', 'channels')}
      ${qb('🏪', 'var(--bbg)', 'var(--b)', 'Vendors', 'รายชื่อ vendor', 'vendors')}
    </div>`;
  }

  // ─── T4 STORE DASHBOARD ───
  function renderT4(s) {
    return `<div class="toolbar"><div class="toolbar-title">Dashboard</div></div>
    <div class="content" id="dash-content">
      <div style="margin-bottom:14px"><div class="welcome-name">Welcome, ${e(s.display_name)}</div><div class="welcome-meta">${e(s.tier_id)} · Store Staff · ${e(s.store_name || s.store_id)}</div></div>
      <div id="dash-kpi" class="kpi-row kpi-2"><div class="skeleton sk-kpi"></div><div class="skeleton sk-kpi"></div><div class="skeleton sk-kpi"></div><div class="skeleton sk-kpi"></div></div>
      <div class="sl">กรอกข้อมูล</div>
      ${qb('💰', 'var(--gold-bg)', 'var(--gold)', 'กรอกยอดขาย', 'S1 Daily Sale', 'daily-sale', 'var(--gold)')}
      ${qb('🧾', 'var(--rbg)', 'var(--r)', 'ค่าใช้จ่าย', 'S2 Expense', 'expense')}
      ${qb('📄', 'var(--bbg)', 'var(--b)', 'Invoice', 'S3 Invoice', 'invoice')}
      ${qb('💵', 'var(--gbg)', 'var(--g)', 'เงินสดส่งมอบ', 'S4 Cash', 'cash')}
      <div class="sl">History & Report</div>
      ${qb('📊', 'var(--bg3)', 'var(--t2)', 'ประวัติขาย', '', 'sale-history')}
      ${qb('📋', 'var(--bg3)', 'var(--t2)', 'ประวัติจ่าย', '', 'expense-history')}
      ${qb('📝', 'var(--obg)', 'var(--o)', 'สรุปรายงาน', 'S8 Daily Report', 'daily-report')}
      ${qb('📋', 'var(--acc2)', 'var(--acc)', 'Follow-up Tasks', '', 'tasks')}
      ${qb('📊', 'var(--bbg)', 'var(--b)', 'Daily Hub', 'สรุปรายวัน', 'daily-hub')}
    </div>`;
  }

  // ─── LOAD DASHBOARD (memory first) ───
  async function loadDashboard() {
    const s = App.S.session;
    if (!s || _dashLoading) return;
    const isAdmin = (s.tier_level || 99) <= 2;

    // Use cached dashboard from initBundle if available
    if (App.S.dashboard) {
      fillKPI(App.S.dashboard, isAdmin);
      if (isAdmin) loadAdminWidgets();
      return;
    }

    // Fetch dashboard (cache was cleared or first load)
    _dashLoading = true;
    try {
      const data = await API.getDashboard();
      App.S.dashboard = data;
      fillKPI(data, isAdmin);
      if (isAdmin) loadAdminWidgets();
    } catch (err) {
      App.toast('โหลด Dashboard ไม่ได้', 'error');
    } finally { _dashLoading = false; }
  }

  // ─── FILL KPI ───
  function fillKPI(d, isAdmin) {
    const el = document.getElementById('dash-kpi');
    if (!el || !d) return;

    const today = d.today || {};
    const month = d.month || {};
    const yesterday = d.yesterday || {};
    const alerts = d.alerts || {};

    if (isAdmin) {
      el.className = 'kpi-row kpi-4';
      el.innerHTML = `
        ${kpiBox(fm(today.total_sales || 0), `<span style="color:var(--g)">●</span> Total Today`, today.is_recorded ? '⏳ Pending' : '❌ Missing', 'border-left:3px solid var(--gold)', 'color:var(--gold)')}
        ${kpiBox(fms(month.total || 0), 'เดือนนี้', (month.days_recorded || 0) + ' วัน')}
        ${kpiBox(fms(month.daily_average || 0), 'เฉลี่ย/วัน', '')}
        ${kpiBox(String(alerts.missing_days || 0), 'Pending Sync', 'days', '', alerts.missing_days > 0 ? 'color:var(--o)' : '')}`;
    } else {
      el.className = 'kpi-row kpi-2';
      el.innerHTML = `
        ${kpiBox(fm(today.total_sales || 0), '📊 ยอดวันนี้', today.is_recorded ? '⏳ Pending' : '❌ Missing', 'border-left:3px solid var(--gold)', 'color:var(--gold)')}
        ${kpiBox(fms(month.total || 0), '📅 เดือนนี้', (month.days_recorded || 0) + ' วัน')}
        ${kpiBox(fms(month.daily_average || 0), '📈 เฉลี่ย', '')}
        ${kpiBox(fm(yesterday.total_sales || 0), '📉 เมื่อวาน', '')}`;
    }
  }

  // ─── ADMIN WIDGETS (parallel fetch) ───
  async function loadAdminWidgets() {
    if (_adminLoading) return;
    _adminLoading = true;
    const chartEl = document.getElementById('dash-chart');
    const cashEl = document.getElementById('dash-cash');
    const anomalyEl = document.getElementById('dash-anomaly');
    const storesEl = document.getElementById('dash-stores');

    // Parallel fetch — non-blocking
    const [chartData, cashData, anomalyData, storeData] = await Promise.all([
      API.getWeeklyChart().catch(() => null),
      API.getCashVariance().catch(() => null),
      API.getAnomalies().catch(() => null),
      API.getStoreStatus().catch(() => null),
    ]);

    // Chart
    if (chartEl) {
      if (chartData) {
        chartEl.className = 'card';
        chartEl.style.height = 'auto';
        chartEl.innerHTML = `<div class="sl" style="margin-top:0">📈 This Week vs Last Week</div>
          <div style="display:flex;align-items:flex-end;gap:4px;height:60px">${renderMiniChart(chartData)}</div>
          <div style="display:flex;gap:12px;margin-top:6px;font-size:10px">
            <span><span style="color:var(--acc)">■</span> This week</span>
            <span><span style="color:var(--bd)">■</span> Last week</span>
          </div>`;
      } else { chartEl.innerHTML = ''; chartEl.className = ''; chartEl.style.height = '0'; }
    }

    // Cash variance
    if (cashEl) {
      if (cashData?.days?.length) {
        cashEl.className = 'card';
        cashEl.style.height = 'auto';
        cashEl.innerHTML = `<div class="sl" style="margin-top:0">💰 Cash Variance (7 วัน)</div>
          <div style="font-size:11px;line-height:2;color:var(--t2)">${cashData.days.map(d => {
            const label = d.day_label || d.date;
            if (d.matched) return `${label}: <span style="color:var(--g)">✓ Match</span>`;
            return `${label}: <span style="color:var(--r)">${fm(d.variance || 0)}</span>`;
          }).join(' · ')}</div>`;
      } else { cashEl.innerHTML = ''; cashEl.className = ''; cashEl.style.height = '0'; }
    }

    // Anomalies
    if (anomalyEl) {
      if (anomalyData?.alerts?.length) {
        anomalyEl.innerHTML = `<div class="card" style="margin-bottom:10px">
          <div class="sl" style="margin:0;color:var(--r)">🔍 ต้องตรวจสอบ</div>
          <div style="font-size:11px">${anomalyData.alerts.map(a =>
            `<div style="padding:3px 0;color:${a.severity === 'high' ? 'var(--r)' : 'var(--o)'}">⚠ ${e(a.message)}</div>`
          ).join('')}</div>
        </div>`;
      } else { anomalyEl.innerHTML = ''; }
    }

    // Store status
    if (storesEl) {
      if (storeData?.stores?.length) {
        storesEl.innerHTML = `<div class="card" style="margin-bottom:10px">
          <div class="sl" style="margin-top:0">🏪 Store Status</div>
          <table class="tbl"><thead><tr><th>Store</th><th>Status</th><th>Total</th><th>Sync</th></tr></thead>
          <tbody>${storeData.stores.map(st => `<tr>
            <td>${e(st.store_id)}</td>
            <td>${st.has_sale ? '<span class="sts sts-ok">✓</span>' : '<span class="sts sts-err">✗</span>'}</td>
            <td style="font-weight:600">${st.has_sale ? fm(st.total_sales) : '<span style="color:var(--t4)">—</span>'}</td>
            <td>${st.sync_status === 'synced' ? '<span class="sts sts-ok">Synced</span>' : '<span class="sts sts-pend">Pending</span>'}</td>
          </tr>`).join('')}</tbody></table>
        </div>`;
      } else { storesEl.innerHTML = ''; }
    }
    _adminLoading = false;
  }

  // ═══ HELPERS ═══

  function kpiBox(value, label, sub, boxStyle, valStyle) {
    return `<div class="kpi-box"${boxStyle ? ` style="${boxStyle}"` : ''}>
      <div class="kpi-label">${label}</div>
      <div class="kpi-val"${valStyle ? ` style="${valStyle}"` : ''}>${value}</div>
      ${sub ? `<div class="kpi-label">${sub}</div>` : ''}
    </div>`;
  }

  function qb(icon, bg, col, label, sub, route, borderCol) {
    const bc = borderCol ? `border-left-color:${borderCol}` : '';
    return `<div class="qb" style="${bc}" onclick="App.go('${route}')">
      <div class="qb-icon" style="background:${bg};color:${col}">${icon}</div>
      <div style="flex:1;min-width:0"><div class="qb-label">${label}</div>${sub ? `<div class="qb-sub">${sub}</div>` : ''}</div>
      <div class="qb-arr">→</div>
    </div>`;
  }

  function renderMiniChart(data) {
    if (!data?.this_week) return '';
    const all = [...(data.this_week || []), ...(data.last_week || [])].map(d => d.total || 0);
    const max = Math.max(...all, 1);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((d, i) => {
      const tw = data.this_week?.[i]?.total || 0;
      const lw = data.last_week?.[i]?.total || 0;
      const twH = Math.max(4, Math.round(tw / max * 56));
      const lwH = Math.max(4, Math.round(lw / max * 56));
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
        <div style="display:flex;gap:2px;align-items:flex-end;height:56px">
          <div style="width:8px;height:${lwH}px;background:var(--bd);border-radius:2px 2px 0 0"></div>
          <div style="width:8px;height:${twH}px;background:var(--acc2);border-radius:2px 2px 0 0"></div>
        </div>
        <div style="font-size:8px;color:var(--t4)">${d}</div>
      </div>`;
    }).join('');
  }

  return { renderDashboard, loadDashboard };
})();
