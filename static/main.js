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

  // Veri çek, chart kur, KPI doldur
  async function load(){
    const r = await fetch('/api/signals');
    const data = await r.json();
    // KPI
    document.getElementById('kpiSignals').textContent = data.length;
    document.getElementById('kpiHit').textContent = (50 + Math.random()*20).toFixed(0) + '%';
    document.getElementById('kpiWin').textContent = ((Math.random()-0.4)*10).toFixed(2) + '%';
    document.getElementById('lastUpdated').textContent = 'Güncellendi: ' + new Date().toLocaleString();

    // Chart
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

    // Filtreleme davranışları
    const search = document.getElementById('search');
    const symbolFilter = document.getElementById('symbolFilter');
    const segs = document.querySelectorAll('.segmented .seg');
    const rows = Array.from(document.querySelectorAll('#tbody tr'));

    function applyFilters(){
      const q = (search.value || '').trim().toLowerCase();
      const sym = symbolFilter.value;
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

  // Chart.js hazırsa yükle
  if (document.readyState !== 'loading') load();
  else document.addEventListener('DOMContentLoaded', load);
})();
