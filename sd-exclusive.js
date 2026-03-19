/**
 * SD Exclusive Dashboard — T1/T2 Only
 * v2.0 | 19 Mar 2026
 * Zero-impact plugin: injects sidebar + page via DOM manipulation
 *
 * Features:
 *   - Daily Sales today/yesterday per store (rev + exp + inv)
 *   - Weekly table Mon→today with store filter
 *   - Revenue Trend 2/3 + Active Alerts 1/3
 *   - Editable alert threshold config
 *   - Cross-store comparison + P&L breakdown
 *   - Revenue heatmap
 *
 * Data: uses API module (real app) or mock data (wireframe)
 * Guard: checks session tier_level (real app) or window.SD_TIER_LEVEL (wireframe)
 *
 * Usage:  <script src="sd-exclusive.js"></script>
 * Remove: delete this script tag → wireframe returns to 100% original
 */
(function(){
  'use strict';

  // ═══════════════════════════════════════════
  // 1. TIER GUARD (real auth when available)
  // ═══════════════════════════════════════════
  const isLive = typeof API !== 'undefined' && typeof API.getSession === 'function';
  const session = isLive ? API.getSession() : null;
  const tierLevel = session?.tier_level ?? (window.SD_TIER_LEVEL ?? 1);
  if (tierLevel > 2) return; // Only T1 (level 1) and T2 (level 2)

  // ═══════════════════════════════════════════
  // 2. INJECT SCOPED CSS
  // ═══════════════════════════════════════════
  const css = document.createElement('style');
  css.textContent = `
    .sb-sub.ex-item{color:var(--gold);font-weight:600}
    .sb-sub.ex-item.active{background:var(--gold-bg2);color:var(--gold)}
    .ex-badge{display:inline-block;font-size:7px;background:var(--gold);color:#fff;padding:1px 5px;border-radius:8px;margin-left:4px;vertical-align:middle;font-weight:700}
    .ex-hm{display:grid;grid-template-columns:100px repeat(7,1fr);gap:2px;font-size:10px}
    .ex-hm-hd{font-size:9px;font-weight:700;color:var(--t3);text-align:center;padding:4px 2px}
    .ex-hm-store{font-weight:700;padding:6px 4px;display:flex;align-items:center}
    .ex-hm-cell{text-align:center;padding:6px 2px;border-radius:4px;font-weight:600;font-variant-numeric:tabular-nums}
    .ex-pl-row{display:flex;justify-content:space-between;padding:4px 0;font-size:11px;border-bottom:1px solid var(--bd2)}
    .ex-pl-row:last-child{border-bottom:none;font-weight:800;padding-top:8px;border-top:2px solid var(--t1)}
    .ex-pl-label{color:var(--t2)}
    .ex-rule-input{border:1px solid var(--bd);border-radius:4px;padding:3px 6px;font-size:10px;width:80px;text-align:right;background:var(--bg);font-family:inherit}
    .ex-rule-input:focus{outline:none;border-color:var(--acc);box-shadow:0 0 0 2px var(--acc2)}
    .ex-add-btn{display:inline-flex;align-items:center;gap:4px;padding:5px 12px;font-size:10px;font-weight:600;color:var(--acc);border:1px dashed var(--acc);border-radius:var(--rd2);cursor:pointer;background:none;margin-top:8px}
    .ex-add-btn:hover{background:var(--acc2)}
    .ex-loading{text-align:center;padding:40px;color:var(--t3);font-size:12px}
    .ex-sparkline{display:inline-flex;align-items:end;gap:1px;height:20px}
    .ex-sparkline span{display:block;width:3px;border-radius:1px}
  `;
  document.head.appendChild(css);

  // ═══════════════════════════════════════════
  // 3. HELPERS
  // ═══════════════════════════════════════════
  const $=n=>n==null?'—':n>=1000?'$'+(n/1000).toFixed(1)+'k':'$'+n.toLocaleString();
  const dayTH=['อา','จ','อ','พ','พฤ','ศ','ส'];
  const dayEN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const today=new Date();
  const yest=new Date(today); yest.setDate(yest.getDate()-1);
  const fmt=d=>`${d.getDate()}/${d.getMonth()+1}`;
  const isoDate=d=>d.toISOString().split('T')[0];

  // Monday of this week
  const dow=today.getDay();
  const mondayOff=dow===0?-6:1-dow;
  const monday=new Date(today); monday.setDate(today.getDate()+mondayOff);

  // Current month string
  const curMonth=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
  const monthLabel=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][today.getMonth()]+' '+today.getFullYear();

  // ═══════════════════════════════════════════
  // 4. DATA LAYER
  // ═══════════════════════════════════════════
  function getMockData(){
    return {
      stores:[
        {id:'MNG', name:'Mango Coco',
         today:{rev:14659.09,exp:135.60,inv:0}, yest:{rev:14625.28,exp:0,inv:0},
         week:[
           {rev:15301.91,exp:78.25,inv:0},{rev:15174.94,exp:21.02,inv:0},{rev:14753.24,exp:97.70,inv:0},
           {rev:21792.88,exp:132.23,inv:0},{rev:25254.47,exp:90.56,inv:0},{rev:22501.28,exp:0,inv:0},
           {rev:18513.01,exp:0,inv:0}
         ],
         monthRev:142200, monthExp:420, cogs:13100, labor:26300, overhead:7800},
        {id:'ISH', name:'Issho Cafe',
         today:{rev:633,exp:0,inv:0}, yest:{rev:0,exp:0,inv:0},
         week:[
           {rev:0,exp:0,inv:0},{rev:0,exp:0,inv:0},{rev:0,exp:0,inv:0},
           {rev:0,exp:0,inv:0},{rev:0,exp:0,inv:0},{rev:633,exp:0,inv:0},
           {rev:0,exp:0,inv:0}
         ],
         monthRev:6300, monthExp:0, cogs:600, labor:1200, overhead:400},
      ],
      alertRules:[
        {store:'Mango Coco',metric:'Daily Revenue',op:'<',value:14000,sev:'critical'},
        {store:'Issho Cafe',metric:'Daily Revenue',op:'<',value:400,sev:'warning'},
        {store:'All Stores',metric:'WoW Drop %',op:'>',value:20,sev:'critical'},
        {store:'All Stores',metric:'Missing Data (days)',op:'>',value:1,sev:'warning'},
      ],
    };
  }

  async function fetchLiveData(){
    try {
      const [accData, storeStatus] = await Promise.all([
        API.getAccReview(curMonth),
        API.getStoreStatus(),
      ]);

      // Build store map from acc review
      const storeMap={};
      (accData?.rows||[]).forEach(r=>{
        const sn=r.store_name||r.store_id;
        if(!storeMap[sn]) storeMap[sn]={id:r.store_id, name:sn, dates:{}, monthRev:0, monthExp:0, cogs:0, labor:0, overhead:0};
        storeMap[sn].dates[r.sale_date]={rev:parseFloat(r.total_sales)||0, exp:parseFloat(r.total_expense)||0, inv:0};
        storeMap[sn].monthRev+=(parseFloat(r.total_sales)||0);
        storeMap[sn].monthExp+=(parseFloat(r.total_expense)||0);
      });

      const todayStr=isoDate(today);
      const yestStr=isoDate(yest);

      const stores=Object.values(storeMap).map(s=>{
        // Today & yesterday
        s.today=s.dates[todayStr]||{rev:0,exp:0,inv:0};
        s.yest=s.dates[yestStr]||{rev:0,exp:0,inv:0};
        // Week array (Mon-Sun)
        s.week=[];
        for(let i=0;i<7;i++){
          const d=new Date(monday); d.setDate(monday.getDate()+i);
          const ds=isoDate(d);
          s.week.push(s.dates[ds]||{rev:0,exp:0,inv:0});
        }
        return s;
      });

      return { stores, alertRules: getMockData().alertRules };
    } catch(e) {
      console.error('[SD Exclusive] Live data fetch failed, using mock:', e);
      return getMockData();
    }
  }

  // ═══════════════════════════════════════════
  // 5. INJECT SIDEBAR MENU
  // ═══════════════════════════════════════════
  const alertsSub=document.querySelector('.sb-sub[data-page="alerts"]');
  if(alertsSub){
    const exItem=document.createElement('div');
    exItem.className='sb-sub ex-item';
    exItem.dataset.page='exclusive';
    exItem.innerHTML='★ Exclusive <span class="ex-badge">T1-T2</span>';
    exItem.onclick=function(){ goPage('exclusive'); };
    alertsSub.after(exItem);
  }

  // ═══════════════════════════════════════════
  // 6. CREATE PAGE CONTAINER
  // ═══════════════════════════════════════════
  const shellMain=document.querySelector('.shell-main');
  if(!shellMain) return;

  const page=document.createElement('div');
  page.id='pg-exclusive';
  page.className='page-section';
  page.innerHTML=`
    <div class="toolbar">
      <button class="toolbar-back" onclick="goPage('dashboard')">←</button>
      <div class="toolbar-title">★ Exclusive Dashboard</div>
      <div style="margin-left:auto;display:flex;align-items:center;gap:6px">
        <span style="font-size:9px;color:var(--gold);background:var(--gold-bg2);padding:2px 8px;border-radius:10px;font-weight:700">T1-T2 Only</span>
      </div>
    </div>
    <div class="content" id="ex-content"><div class="ex-loading">Loading exclusive data...</div></div>
  `;
  shellMain.appendChild(page);

  // ═══════════════════════════════════════════
  // 7. RENDER PAGE
  // ═══════════════════════════════════════════
  async function renderExclusive(){
    const data = isLive ? await fetchLiveData() : getMockData();
    const {stores, alertRules} = data;
    const content = document.getElementById('ex-content');

    // Aggregate totals
    const totalRev=stores.reduce((s,x)=>s+x.monthRev,0);
    const totalExp=stores.reduce((s,x)=>s+x.monthExp,0);
    const totalCogs=stores.reduce((s,x)=>s+(x.cogs||0),0);
    const totalLabor=stores.reduce((s,x)=>s+(x.labor||0),0);
    const totalOverhead=stores.reduce((s,x)=>s+(x.overhead||0),0);
    const totalNet=totalRev-totalExp-totalCogs-totalLabor-totalOverhead;
    const grossMargin=totalRev?(((totalRev-totalCogs)/totalRev)*100).toFixed(1):'0';
    const laborPct=totalRev?((totalLabor/totalRev)*100).toFixed(1):'0';
    const cogsPct=totalRev?((totalCogs/totalRev)*100).toFixed(1):'0';

    // ── Today vs Yesterday by store ──
    let dailyRows='';
    let tT={rev:0,exp:0,inv:0}, tY={rev:0,exp:0,inv:0};
    stores.forEach(s=>{
      tT.rev+=s.today.rev; tT.exp+=s.today.exp; tT.inv+=s.today.inv;
      tY.rev+=s.yest.rev;  tY.exp+=s.yest.exp;  tY.inv+=s.yest.inv;
      const chg=s.yest.rev?((s.today.rev-s.yest.rev)/s.yest.rev*100).toFixed(0):0;
      const arrow=chg>=0?'▲':'▼';
      const chgColor=chg>=0?'var(--g)':'var(--r)';
      dailyRows+=`<tr>
        <td class="b">${s.name}</td>
        <td class="r b" style="color:var(--gold)">${$(s.today.rev)}</td>
        <td class="r" style="color:var(--r)">${$(s.today.exp)}</td>
        <td class="r" style="color:var(--b)">${$(s.today.inv)}</td>
        <td class="r b">${$(s.yest.rev)}</td>
        <td class="r">${$(s.yest.exp)}</td>
        <td class="r">${$(s.yest.inv)}</td>
        <td class="r" style="color:${chgColor};font-size:9px;font-weight:700">${s.yest.rev?arrow+' '+Math.abs(chg)+'%':'—'}</td>
      </tr>`;
    });
    const totalDiff=tY.rev?((tT.rev-tY.rev)/tY.rev*100).toFixed(0):0;
    const totalArrow=totalDiff>=0?'▲':'▼';
    const totalDiffColor=totalDiff>=0?'var(--g)':'var(--r)';

    // ── Alert evaluation ──
    const firedAlerts=[];
    alertRules.forEach(rule=>{
      const targets=rule.store==='All Stores'?stores:stores.filter(s=>s.name===rule.store);
      targets.forEach(s=>{
        let triggered=false, actual='', detail='';
        if(rule.metric==='Daily Revenue'){
          const v=s.today.rev;
          triggered=rule.op==='<'?v<rule.value:v>rule.value;
          actual=$(v);
          detail=`Threshold: ${$(rule.value)}`;
        } else if(rule.metric==='WoW Drop %'){
          const thisWeekRev=s.week.reduce((a,d)=>a+d.rev,0);
          // simplified: compare today vs avg
          const avg=thisWeekRev/7;
          const pct=avg?Math.round((1-s.today.rev/avg)*100):0;
          triggered=pct>rule.value;
          actual=`-${pct}%`;
          detail=`Threshold: ${rule.value}%`;
        } else if(rule.metric==='Missing Data (days)'){
          let missing=0;
          for(let i=0;i<7;i++){
            const d=new Date(monday);d.setDate(monday.getDate()+i);
            if(d>today) break;
            if(!s.week[i]||s.week[i].rev===0) missing++;
          }
          triggered=missing>rule.value;
          actual=`${missing}d`;
          detail=`Threshold: ${rule.value}d`;
        }
        if(triggered){
          firedAlerts.push({sev:rule.sev,store:s.name,metric:rule.metric,actual,detail});
        }
      });
    });
    firedAlerts.sort((a,b)=>a.sev==='critical'?-1:1);

    // ── Alert list HTML ──
    let alertHTML='';
    if(firedAlerts.length===0){
      alertHTML='<div style="text-align:center;padding:16px;color:var(--g);font-size:11px;font-weight:600">All clear — no alerts triggered</div>';
    } else {
      firedAlerts.forEach(a=>{
        const isCrit=a.sev==='critical';
        const icon=isCrit?'🔴':'🟡';
        const bg=isCrit?'var(--rbg)':'var(--obg)';
        const color=isCrit?'var(--r)':'var(--o)';
        alertHTML+=`<div style="display:flex;align-items:flex-start;gap:6px;padding:6px 8px;background:${bg};border-radius:var(--rd2);font-size:10px;margin-bottom:4px">
          <span style="flex-shrink:0">${icon}</span>
          <div style="flex:1"><b style="color:${color}">${a.store}</b> — ${a.metric}<br>
          <span style="color:var(--t2)">Actual: ${a.actual} · ${a.detail}</span></div>
          <span class="tag ${isCrit?'tr':'to'}" style="flex-shrink:0">${isCrit?'CRITICAL':'WARNING'}</span>
        </div>`;
      });
    }

    // ── Heatmap ──
    let hmHeaders='<div class="ex-hm-hd"></div>';
    for(let i=0;i<7;i++){
      const d=new Date(monday);d.setDate(monday.getDate()+i);
      const past=d<=today;
      hmHeaders+=`<div class="ex-hm-hd" style="${!past?'color:var(--t4)':''}">${dayTH[d.getDay()]} ${fmt(d)}</div>`;
    }
    let hmRows='';
    stores.forEach(s=>{
      const vals=s.week.map(w=>w.rev);
      const nonZero=vals.filter(v=>v>0);
      const avg=nonZero.length?nonZero.reduce((a,b)=>a+b,0)/nonZero.length:0;
      let cells='';
      for(let i=0;i<7;i++){
        const d=new Date(monday);d.setDate(monday.getDate()+i);
        if(d>today){cells+=`<div class="ex-hm-cell" style="color:var(--t4)">—</div>`;continue;}
        const v=vals[i];
        if(v===0){cells+=`<div class="ex-hm-cell" style="color:var(--t4);background:var(--bg3)">—</div>`;continue;}
        const bg=v>=avg*1.1?'var(--gbg)':v<=avg*0.85?'var(--rbg)':'var(--bg3)';
        const color=v>=avg*1.1?'var(--g)':v<=avg*0.85?'var(--r)':'var(--t1)';
        const best=Math.max(...nonZero)===v;
        cells+=`<div class="ex-hm-cell" style="background:${best?'var(--gold-bg2)':bg};color:${best?'var(--gold)':color}">${$(v)}</div>`;
      }
      hmRows+=`<div class="ex-hm-store">${s.name}</div>${cells}`;
    });

    // ── Rules table ──
    let ruleRows='';
    alertRules.forEach(r=>{
      const sevIcon=r.sev==='critical'?'🔴':'🟡';
      const unit=r.metric.includes('%')?'%':r.metric.includes('days')||r.metric.includes('Data')?'d':'$';
      const displayVal=unit==='$'?'$'+r.value.toLocaleString():r.value+(unit==='%'?'%':'d');
      ruleRows+=`<tr>
        <td>${sevIcon}</td>
        <td class="b">${r.store}</td>
        <td>${r.metric}</td>
        <td style="text-align:center;font-weight:700">${r.op}</td>
        <td class="r"><input class="ex-rule-input" value="${displayVal}" /></td>
        <td style="text-align:center"><span style="color:var(--r);cursor:pointer;font-size:12px" title="Delete rule">✕</span></td>
      </tr>`;
    });

    // ── Cross-store compare ──
    let compareRows='';
    stores.forEach(s=>{
      const margin=s.monthRev?((s.monthRev-(s.cogs||0))/s.monthRev*100).toFixed(1):'0';
      const net=s.monthRev-s.monthExp-(s.cogs||0)-(s.labor||0)-(s.overhead||0);
      compareRows+=`<tr>
        <td class="b">${s.name}</td>
        <td class="r b" style="color:var(--gold)">${$(s.monthRev)}</td>
        <td class="r" style="color:var(--r)">${$(s.monthExp)}</td>
        <td class="r" style="color:var(--r)">${$(s.cogs||0)}</td>
        <td class="r">${margin}%</td>
        <td class="r b" style="color:var(--g)">${$(net)}</td>
      </tr>`;
    });

    // ── Weekly table (default: all stores) ──
    function buildWeekHTML(storeFilter){
      const filtered=storeFilter==='all'?stores:stores.filter(s=>s.name===storeFilter);
      let rows='';
      let tRev=0,tExp=0,tInv=0,cnt=0;
      for(let i=0;i<7;i++){
        const d=new Date(monday);d.setDate(monday.getDate()+i);
        if(d>today) break;
        let dRev=0,dExp=0,dInv=0;
        filtered.forEach(s=>{dRev+=s.week[i].rev;dExp+=s.week[i].exp;dInv+=s.week[i].inv;});
        tRev+=dRev;tExp+=dExp;tInv+=dInv;cnt++;
        const net=dRev-dExp;
        const isT=d.toDateString()===today.toDateString();
        const isY=d.toDateString()===yest.toDateString();
        const bg=isT?' style="background:var(--gold-bg)"':'';
        const tag=isT?' <span style="font-size:7px;background:var(--acc);color:#fff;padding:1px 4px;border-radius:3px;vertical-align:middle">NOW</span>':
                  isY?' <span style="font-size:7px;background:var(--t4);color:#fff;padding:1px 4px;border-radius:3px;vertical-align:middle">YEST</span>':'';
        rows+=`<tr${bg}>
          <td class="b">${dayTH[d.getDay()]}${tag}</td><td>${fmt(d)}</td>
          <td class="r b" style="color:var(--gold)">${$(dRev)}</td>
          <td class="r" style="color:var(--r)">${$(dExp)}</td>
          <td class="r" style="color:var(--b)">${$(dInv)}</td>
          <td class="r b">${$(net)}</td>
        </tr>`;
      }
      const foot=`<tr style="background:var(--bg3);font-weight:700">
        <td colspan="2">Total (${cnt}d)</td>
        <td class="r" style="color:var(--gold)">${$(tRev)}</td>
        <td class="r" style="color:var(--r)">${$(tExp)}</td>
        <td class="r" style="color:var(--b)">${$(tInv)}</td>
        <td class="r">${$(tRev-tExp)}</td>
      </tr>`;
      return {rows,foot};
    }

    // ── Revenue trend SVG (simplified sparkline-style) ──
    const allDailyRevs=[];
    for(let i=0;i<7;i++){
      const d=new Date(monday);d.setDate(monday.getDate()+i);
      if(d>today) break;
      let dRev=0;
      stores.forEach(s=>{dRev+=s.week[i].rev;});
      allDailyRevs.push(dRev);
    }
    const maxRev=Math.max(...allDailyRevs,1);
    const trendW=500, trendH=100, padL=40, padR=10;
    const chartW=trendW-padL-padR;
    const pts=allDailyRevs.map((v,i)=>{
      const x=padL+(i/(Math.max(allDailyRevs.length-1,1)))*chartW;
      const y=trendH-10-(v/maxRev)*(trendH-20);
      return `${x.toFixed(0)},${y.toFixed(0)}`;
    });
    const gridLines=[0,0.25,0.5,0.75,1].map(p=>{
      const y=trendH-10-p*(trendH-20);
      const val=$(maxRev*p);
      return `<line x1="${padL}" y1="${y}" x2="${trendW-padR}" y2="${y}" stroke="#f0f0f0"/>
              <text x="${padL-4}" y="${y+3}" text-anchor="end" fill="#999" font-size="8">${val}</text>`;
    }).join('');
    const dayLabels=allDailyRevs.map((v,i)=>{
      const x=padL+(i/(Math.max(allDailyRevs.length-1,1)))*chartW;
      const d=new Date(monday);d.setDate(monday.getDate()+i);
      return `<text x="${x}" y="${trendH}" text-anchor="middle" fill="#999" font-size="8">${dayTH[d.getDay()]}</text>`;
    }).join('');

    // ── Week range label ──
    let lastIdx=0;
    for(let i=0;i<7;i++){const d=new Date(monday);d.setDate(monday.getDate()+i);if(d<=today)lastIdx=i;}
    const lastDay=new Date(monday);lastDay.setDate(monday.getDate()+lastIdx);
    const weekRange=`${fmt(monday)} – ${fmt(lastDay)}`;

    // ── Build full page HTML ──
    const weekData=buildWeekHTML('all');

    content.innerHTML = `
      <!-- Filter Bar -->
      <div class="filter-bar">
        <div class="month-nav"><button class="month-btn">‹</button><span>${monthLabel}</span><button class="month-btn">›</button></div>
        <div class="filter-sep"></div>
        <div class="pill-group">${['All Stores',...stores.map(s=>s.name)].map((n,i)=>
          `<div class="pill ${i===0?'gold':''}" style="cursor:pointer">${n}</div>`
        ).join('')}</div>
      </div>

      <!-- Financial KPIs -->
      <div class="kpi-row kpi-4">
        <div class="kpi gold"><div class="kpi-label">Revenue (MTD)</div><div class="kpi-val" style="color:var(--gold)">${$(totalRev)}</div></div>
        <div class="kpi red"><div class="kpi-label">Expense (MTD)</div><div class="kpi-val" style="color:var(--r)">${$(totalExp)}</div></div>
        <div class="kpi green"><div class="kpi-label">Gross Margin</div><div class="kpi-val" style="color:var(--g)">${grossMargin}%</div></div>
        <div class="kpi blue"><div class="kpi-label">Net P&L</div><div class="kpi-val" style="color:${totalNet>=0?'var(--g)':'var(--r)'}">${$(totalNet)}</div></div>
      </div>

      <!-- Daily Sales Today/Yesterday per Store -->
      <div class="card">
        <div class="card-hd" style="color:var(--gold)">★ Daily Sales — By Store <span class="mute">${monthLabel}</span></div>
        <table class="tbl" style="margin-bottom:0">
          <thead>
            <tr>
              <th></th>
              <th colspan="3" class="r" style="text-align:center;background:var(--gold-bg);font-size:10px">Today <span style="font-weight:600;color:var(--t2)">${dayTH[today.getDay()]} ${fmt(today)}</span></th>
              <th colspan="3" class="r" style="text-align:center;background:var(--bg3);font-size:10px">Yesterday <span style="font-weight:600;color:var(--t2)">${dayTH[yest.getDay()]} ${fmt(yest)}</span></th>
              <th></th>
            </tr>
            <tr style="font-size:9px;color:var(--t3)">
              <th>Store</th>
              <th class="r" style="color:var(--gold)">Rev</th><th class="r" style="color:var(--r)">Exp</th><th class="r" style="color:var(--b)">Inv</th>
              <th class="r" style="color:var(--gold)">Rev</th><th class="r" style="color:var(--r)">Exp</th><th class="r" style="color:var(--b)">Inv</th>
              <th class="r" style="font-size:8px">Chg</th>
            </tr>
          </thead>
          <tbody>${dailyRows}</tbody>
          <tfoot>
            <tr style="background:var(--bg3);font-weight:700">
              <td>Total</td>
              <td class="r" style="color:var(--gold)">${$(tT.rev)}</td>
              <td class="r" style="color:var(--r)">${$(tT.exp)}</td>
              <td class="r" style="color:var(--b)">${$(tT.inv)}</td>
              <td class="r">${$(tY.rev)}</td>
              <td class="r">${$(tY.exp)}</td>
              <td class="r">${$(tY.inv)}</td>
              <td class="r" style="color:${totalDiffColor};font-size:9px;font-weight:700">${tY.rev?totalArrow+' '+Math.abs(totalDiff)+'%':'—'}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Revenue Trend 2/3 + Active Alerts 1/3 -->
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:10px">
        <div class="card">
          <div class="card-hd">Revenue Trend — This Week <span class="mute">${weekRange}</span></div>
          <svg viewBox="0 0 ${trendW} ${trendH}" style="width:100%;height:auto">
            ${gridLines}
            <polyline points="${pts.join(' ')}" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            ${pts.map((p,i)=>`<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="${i===pts.length-1?4:2.5}" fill="${i===pts.length-1?'var(--gold)':'#059669'}"/>`).join('')}
            ${dayLabels}
          </svg>
        </div>
        <div class="card" style="border-left:3px solid ${firedAlerts.length?'var(--r)':'var(--g)'}">
          <div class="card-hd" style="color:${firedAlerts.length?'var(--r)':'var(--g)'}">Active Alerts <span class="ex-badge" style="background:${firedAlerts.length?'var(--r)':'var(--g)'}">${firedAlerts.length}</span></div>
          ${alertHTML}
        </div>
      </div>

      <!-- Weekly Breakdown Table -->
      <div class="card">
        <div class="card-hd">This Week <span style="font-weight:400;color:var(--t3);font-size:10px">${weekRange}</span></div>
        <div id="ex-week-tabs" style="display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap"></div>
        <table class="tbl" id="ex-week-table">
          <thead>
            <tr style="font-size:9px;color:var(--t3)">
              <th>Day</th><th>Date</th>
              <th class="r" style="color:var(--gold)">Revenue</th>
              <th class="r" style="color:var(--r)">Expense</th>
              <th class="r" style="color:var(--b)">Invoice</th>
              <th class="r">Net</th>
            </tr>
          </thead>
          <tbody id="ex-week-body">${weekData.rows}</tbody>
          <tfoot id="ex-week-foot">${weekData.foot}</tfoot>
        </table>
      </div>

      <!-- Cross-Store Compare 2/3 + P&L 1/3 -->
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:10px">
        <div class="card">
          <div class="card-hd">Cross-Store Comparison <span class="mute">${monthLabel}</span></div>
          <table class="tbl">
            <thead><tr><th>Store</th><th class="r">Revenue</th><th class="r">Expense</th><th class="r">COGS</th><th class="r">Margin</th><th class="r">Net</th></tr></thead>
            <tbody>${compareRows}</tbody>
            <tfoot><tr style="background:var(--bg3);font-weight:700">
              <td>Total</td>
              <td class="r" style="color:var(--gold)">${$(totalRev)}</td>
              <td class="r" style="color:var(--r)">${$(totalExp)}</td>
              <td class="r" style="color:var(--r)">${$(totalCogs)}</td>
              <td class="r">${grossMargin}%</td>
              <td class="r" style="color:var(--g)">${$(totalNet)}</td>
            </tr></tfoot>
          </table>
        </div>
        <div class="card">
          <div class="card-hd">P&L Breakdown</div>
          <div class="ex-pl-row"><span class="ex-pl-label">Revenue</span><span style="color:var(--gold);font-weight:700">${$(totalRev)}</span></div>
          <div class="ex-pl-row"><span class="ex-pl-label">− COGS</span><span style="color:var(--r)">-${$(totalCogs)}</span></div>
          <div class="ex-pl-row"><span class="ex-pl-label">− Labor</span><span style="color:var(--r)">-${$(totalLabor)}</span></div>
          <div class="ex-pl-row"><span class="ex-pl-label">− Overhead</span><span style="color:var(--r)">-${$(totalOverhead)}</span></div>
          <div class="ex-pl-row"><span class="ex-pl-label">− Expense</span><span style="color:var(--r)">-${$(totalExp)}</span></div>
          <div class="ex-pl-row"><span style="font-weight:800">Net Profit</span><span style="color:${totalNet>=0?'var(--g)':'var(--r)'};font-weight:800">${$(totalNet)}</span></div>
        </div>
      </div>

      <!-- Alert Threshold Config -->
      <div class="card">
        <div class="card-hd" style="color:var(--gold)">★ Alert Threshold Config <span class="mute">ตั้งเส้นเตือนได้เอง</span></div>
        <div style="font-size:10px;color:var(--t3);margin-bottom:8px;padding:6px 8px;background:var(--gold-bg);border-radius:var(--rd2);border:1px solid var(--gold-bg2)">
          เมื่อยอดเข้า threshold → Smart Alert จะแจ้งเตือนบน Dashboard ทันที
        </div>
        <table class="tbl">
          <thead><tr><th></th><th>Store</th><th>Metric</th><th style="text-align:center">Op</th><th class="r">Threshold</th><th style="text-align:center;width:30px"></th></tr></thead>
          <tbody>${ruleRows}</tbody>
        </table>
        <button class="ex-add-btn">＋ Add Rule</button>
      </div>

      <!-- Revenue Heatmap -->
      <div class="card">
        <div class="card-hd">Revenue Heatmap — This Week</div>
        <div class="ex-hm">
          ${hmHeaders}
          ${hmRows}
        </div>
        <div style="display:flex;gap:12px;margin-top:8px;font-size:9px;color:var(--t3)">
          <span><span style="display:inline-block;width:10px;height:10px;background:var(--gbg);border-radius:2px;vertical-align:middle"></span> Above avg</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:var(--rbg);border-radius:2px;vertical-align:middle"></span> Below avg</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:var(--gold-bg2);border-radius:2px;vertical-align:middle"></span> Best day</span>
        </div>
      </div>
    `;

    // ── Wire up weekly store filter tabs ──
    const tabC=document.getElementById('ex-week-tabs');
    const tabNames=['All Stores',...stores.map(s=>s.name)];
    const tabKeys=['all',...stores.map(s=>s.name)];
    tabNames.forEach((n,i)=>{
      const btn=document.createElement('div');
      btn.className='pill'+(i===0?' gold':'');
      btn.textContent=n;
      btn.style.cssText='cursor:pointer;font-size:10px;padding:3px 10px';
      btn.onclick=()=>{
        tabC.querySelectorAll('.pill').forEach(p=>p.classList.remove('gold'));
        btn.classList.add('gold');
        const wd=buildWeekHTML(tabKeys[i]);
        document.getElementById('ex-week-body').innerHTML=wd.rows;
        document.getElementById('ex-week-foot').innerHTML=wd.foot;
      };
      tabC.appendChild(btn);
    });
  }

  // Initial render
  renderExclusive();

  // ═══════════════════════════════════════════
  // 8. MONKEY-PATCH goPage()
  // ═══════════════════════════════════════════
  const _origGoPage=window.goPage;
  window.goPage=function(id){
    _origGoPage(id);
    const exPage=document.getElementById('pg-exclusive');
    const exSidebar=document.querySelector('.sb-sub.ex-item');
    if(id==='exclusive'){
      document.querySelectorAll('.page-section').forEach(p=>p.classList.remove('active'));
      exPage?.classList.add('active');
      document.querySelectorAll('.sb-item,.sb-sub').forEach(s=>s.classList.remove('active'));
      exSidebar?.classList.add('active');
      document.querySelector('.sb-item[data-page="dashboard"]')?.classList.add('active');
    } else {
      exPage?.classList.remove('active');
      exSidebar?.classList.remove('active');
    }
  };

  console.log('[SD Exclusive] v2.0 Loaded — Tier:', tierLevel, '— Live:', isLive);
})();
