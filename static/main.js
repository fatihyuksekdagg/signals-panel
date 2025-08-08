(function(){
  // Tema toggle
  const html = document.documentElement;
  const btn = document.getElementById('themeToggle');
  if (btn){
    btn.addEventListener('click', ()=>{
      const isDark = html.getAttribute('data-theme') !== 'light';
      html.setAttribute('data-theme', isDark ? 'light' : 'dark');
      localStorage.setItem('theme', isDark ? 'light' : 'dark');
    });
    const saved = localStorage.getItem('theme');
    if (saved) html.setAttribute('data-theme', saved);
  }

  // Yardımcılar
  function calcMaxDrawdown(equity){
    let peak = equity[0] || 0, maxDD = 0;
    for (let v of equity){
      if (v > peak) peak = v;
      const dd = (peak - v);
      if (dd > maxDD) maxDD = dd;
    }
    return maxDD;
  }
  function pct(a,b){ return b === 0 ? 0 : ((a-b)/b)*100; }

  // Simülasyon
  function runSimulationFromSignals(signals, opts){
    const {
      capital0 = 10000,
      feePct = 0.05,     // %
      tpPct = 1.5,       // %
      slPct = 1.0,       // %
      useSignalLevels = true,
      useConfidence = true,
    } = opts || {};

    let capital = capital0;
    let equity = [capital];
    let wins = 0, trades = 0;
    const riskFrac = 0.2; // her işleme sermayenin %20'si

    for (const s of signals){
      if (!s || s.side === 'flat') continue;
      const entry = s.entry;
      const useLevels = useSignalLevels && entry && s.tp && s.stop;

      const tpGainPct = useLevels ? ((s.tp - entry) / entry * 100) : tpPct;
      const slLossPct = useLevels ? ((entry - s.stop) / entry * 100) : slPct;

      let win;
      if (useConfidence && typeof s.confidence === 'number'){
        const p = s.confidence <= 1 ? s.confidence : s.confidence/100;
        win = Math.random() < p;
      } else {
        win = Math.random() < 0.55;
      }

      const position = capital * riskFrac;
      const fee = position * (feePct/100);

      let pnl;
      if (win){
        pnl = position * (tpGainPct/100) - fee;
        wins += 1;
      } else {
        pnl = - position * (slLossPct/100) - fee;
      }

      capital += pnl;
      equity.push(capital);
      trades += 1;
    }

    const winRate = trades ? (wins/trades*100) : 0;
    const totalRet = pct(capital, capital0);
    const maxDD = calcMaxDrawdown(equity);
    return { equity, capital, trades, winRate, totalRet, maxDD };
  }

  // Sayfa yüklenince verileri getir, PnL grafiğini çiz, filtreleri bağla
  async function load(){
    const r = await fetch('/api/signals');
    const data = await r.json();

    // KPI (hero)
    const kpiSignals = document.getElementById('kpiSignals');
    const kpiHit = document.getElementById('kpiHit');
    const kpiWin = document.getElementById('kpiWin');
    if (kpiSignals) kpiSignals.textContent = data.length;
    if (kpiHit)     kpiHit.textContent = (50 + Math.random()*20).toFixed(0) + '%';
    if (kpiWin)     kpiWin.textContent = ((Math.random()-0.4)*10).toFixed(2) + '%';

    const lu = document.getElementById('lastUpdated');
    if (lu) lu.textContent = 'Güncellendi: ' + new Date().toLocaleString();

    // PnL simülasyon grafiği (hero sağ)
    const labels = [];
    const series = [];
    let equity = 0;
    data.forEach(s=>{
      labels.push(new Date(s.timestamp));
      const step = s.side === 'flat' ? 0 : (Math.random() - 0.45);
      equity += step;
      series.push(equity);
    });
    const ctx = document.getElementById('pnl');
    if (ctx && window.Chart){
      new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ label: 'PnL (simülasyon)', data: series }] },
        options: { responsive: true, scales: { x: { display:false } } }
      });
    }

    // Filtreler
    const search = document.getElementById('search');
    const symbolFilter = document.getElementById('symbolFilter');
    const segs = document.querySelectorAll('.segmented .seg');
    const rows = Array.from(document.querySelectorAll('#tbody tr'));

    function applyFilters(){
      const q = (search?.value || '').trim().toLowerCase();
      const sym = symbolFilter?.value || '';
      const sideBtn = document.querySelector('.segmented .seg.active');
      const side = sideBtn ? sideBtn.dataset.side : '';

      rows.forEach(tr=>{
        const rSym = tr.dataset.symbol || '';
        const rSide = tr.dataset.side || '';
        const matchesQ = !q || rSym.toLowerCase().includes(q);
        const matchesSym = !sym || rSym === sym;
        const matchesSide = !side || rSide === side;
        tr.style.display = (matchesQ && matchesSym && matchesSide) ? '' : 'none';
      });
    }

    search?.addEventListener('input', applyFilters);
    symbolFilter?.addEventListener('change', applyFilters);
    segs.forEach(b=>{
      b.addEventListener('click', ()=>{
        segs.forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        applyFilters();
      });
    });

    document.getElementById('refresh')?.addEventListener('click', ()=>location.reload());
  }

  // Simülasyon UI bağlama
  async function attachSimulation(){
    const btn = document.getElementById('runSim');
    if (!btn) return;
    const r = await fetch('/api/signals');
    const signals = await r.json();

    btn.addEventListener('click', ()=>{
      const capital0 = parseFloat(document.getElementById('simCapital').value || '10000');
      const feePct   = parseFloat(document.getElementById('simFeePct').value || '0.05');
      const tpPct    = parseFloat(document.getElementById('simTP').value || '1.5');
      const slPct    = parseFloat(document.getElementById('simSL').value || '1.0');
      const useSignalLevels = document.getElementById('useSignalLevels').checked;
      const useConfidence   = document.getElementById('useConfidence').checked;

      const res = runSimulationFromSignals(signals, { capital0, feePct, tpPct, slPct, useSignalLevels, useConfidence });

      // KPI’lar
      document.getElementById('simTrades').textContent   = res.trades;
      document.getElementById('simWinRate').textContent  = res.winRate.toFixed(1) + '%';
      document.getElementById('simTotalRet').textContent = res.totalRet.toFixed(2) + '%';
      document.getElementById('simMaxDD').textContent    = res.maxDD.toFixed(2);

      // Grafik
      const sc = document.getElementById('simChart');
      if (sc && window.Chart){
        if (sc._chartInstance){ sc._chartInstance.destroy(); }
        sc._chartInstance = new Chart(sc, {
          type: 'line',
          data: { 
            labels: res.equity.map((_,i)=>i),
            datasets: [{ label: 'Equity', data: res.equity }]
          },
          options: { responsive: true, scales: { x: { display:false } } }
        });
      }
    });
  }

  // Çalıştır
  if (document.readyState !== 'loading'){
    load(); attachSimulation();
  } else {
    document.addEventListener('DOMContentLoaded', ()=>{ load(); attachSimulation(); });
  }
})();
