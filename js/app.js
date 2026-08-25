/**
 * app.js — PJ-SIG Student Spatial Dashboard
 * URUTAN KRITIS: appInitNav() HARUS sebelum appUpdate()
 * supaya #page-overview sudah display:block saat peta dirender
 */

function appShowLoading(show) {
  var el = document.getElementById('loading-overlay');
  if (el) el.style.display = show ? 'flex' : 'none';
}

function appShowError(msg) {
  appShowLoading(false);
  var eo = document.getElementById('error-overlay');
  var em = document.getElementById('error-message');
  if (eo) eo.style.display = 'flex';
  if (em) em.textContent = msg || 'Terjadi kesalahan. Silakan refresh halaman.';
  console.error('[APP] Error:', msg);
}

function appInit() {
  appShowLoading(true);
  console.log('[APP] Memulai inisialisasi...');

  var missing = [];
  if (typeof DataService   === 'undefined') missing.push('DataService');
  if (typeof FilterService === 'undefined') missing.push('FilterService');
  if (typeof MapService    === 'undefined') missing.push('MapService');
  if (typeof ChartService  === 'undefined') missing.push('ChartService');
  if (typeof L             === 'undefined') missing.push('Leaflet CDN');
  if (typeof echarts       === 'undefined') missing.push('ECharts CDN');

  if (missing.length > 0) {
    appShowError('Modul tidak ditemukan: ' + missing.join(', ') +
      '. Coba refresh halaman atau periksa koneksi internet.');
    return;
  }

  DataService.load()
    .then(function(allData) {
      console.log('[APP] Data dimuat:', allData.length, 'records.');

      /* 1. Isi dropdown */
      appFillSelect('filter-cohort',    DataService.getUniqueValues('cohort').map(String));
      appFillSelect('filter-province',  DataService.getUniqueValues('province'));
      appFillSelect('filter-regency',   DataService.getUniqueValues('regency'));
      appFillSelect('filter-gender',    ['L', 'P']);
      appFillSelect('filter-admission', DataService.getUniqueValues('admission_path'));

      var gSel = document.getElementById('filter-gender');
      if (gSel) Array.from(gSel.options).forEach(function(o) {
        if (o.value === 'L') o.textContent = 'Laki-laki';
        if (o.value === 'P') o.textContent = 'Perempuan';
      });

      /* 3. Filter */
      FilterService.init(function() { appUpdate(); });
      FilterService.bindDOM();

      /* 4. NAVIGASI DULU → #page-overview display:block */
      appInitSidebar();
      appInitNav();

      /* 5. Init peta SETELAH halaman visible (container bukan lagi display:none) */
      MapService.init('map');

      /* 6. Render pertama */
      appUpdate();

      /* 6. Event tambahan */
      var rb = document.getElementById('btn-reset-view');
      if (rb) rb.addEventListener('click', function() { MapService.resetView(); });

      window.addEventListener('resize', function() {
        clearTimeout(window._resizeTimer);
        window._resizeTimer = setTimeout(function() { ChartService.resizeAll(); }, 250);
      });

      /* Mode peta berubah → re-render dengan data terfilter saat ini */
      document.addEventListener('map-mode-changed', function() {
        var all      = DataService.getAll();
        var filtered = FilterService.apply(all);
        MapService.render(filtered);
      });

      var ts = document.getElementById('last-update');
      if (ts) ts.textContent = new Date().toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
      });

      console.log('[APP] Dashboard siap.');
    })
    .catch(function(err) {
      appShowError(err.message || String(err));
    })
    .finally(function() {
      appShowLoading(false);
    });
}

/* ── Update ─────────────────────────────────────────────── */
function appUpdate() {
  var all      = DataService.getAll();
  var filtered = FilterService.apply(all);
  appRenderKPI(filtered);
  MapService.render(filtered);
  ChartService.renderAll(filtered);
  appRenderInsight(filtered);
  appRenderCohortStats(all);
}

/* ── KPI ────────────────────────────────────────────────── */
function appRenderKPI(data) {
  var s = DataService.getSummary(data);
  appSetKPI('kpi-total',     s.total);
  appSetKPI('kpi-active',    s.active);
  appSetKPI('kpi-cohorts',   s.cohorts.length);
  appSetKPI('kpi-provinces', s.provinces);
  appSetKPI('kpi-regencies', s.regencies);
  appSetKPI('kpi-schools',   s.schools);
}
function appSetKPI(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = Number(val).toLocaleString('id-ID');
}

/* ── Insight ─────────────────────────────────────────────── */
function appRenderInsight(data) {
  var box = document.getElementById('insight-box');
  if (!box) return;
  if (!data || data.length === 0) {
    box.innerHTML = '<p class="insight-empty">Tidak ada data untuk filter yang dipilih.</p>';
    return;
  }
  var lines = [];
  var tr = DataService.topN(data, 'regency', 1)[0];
  if (tr) lines.push('📍 <b>' + tr.name + '</b> — kabupaten/kota terbanyak (' + tr.count + ' mahasiswa).');
  var m = data.filter(function(s){return s.gender==='L';}).length;
  var f = data.filter(function(s){return s.gender==='P';}).length;
  lines.push('👥 Dominasi: <b>' + (m>=f?'Laki-laki ('+m+')':'Perempuan ('+f+')') + '</b> dari ' + data.length + ' mahasiswa.');
  var tp = DataService.topN(data, 'province', 1)[0];
  if (tp) lines.push('🗺️ Provinsi terbanyak: <b>' + tp.name + '</b> (' + tp.count + ').');
  var ta = DataService.topN(data, 'admission_path', 1)[0];
  if (ta) lines.push('🎓 Jalur dominan: <b>' + ta.name + '</b> (' + ta.count + ').');
  box.innerHTML = lines.map(function(l){return '<p class="insight-item">'+l+'</p>';}).join('');
}

/* ── Cohort Stats ────────────────────────────────────────── */
function appRenderCohortStats(all) {
  var c = document.getElementById('cohort-stats-grid');
  if (!c) return;
  var cohorts = DataService.getUniqueValues('cohort');
  var colors  = ['var(--sky-500)','var(--teal-500)','var(--indigo-400)','var(--amber-400)'];
  c.innerHTML = cohorts.map(function(yr, i) {
    var sub    = all.filter(function(s){return s.cohort===yr;});
    var active = sub.filter(function(s){return s.status==='Aktif';}).length;
    var pset   = {}; sub.forEach(function(s){if(s.province)pset[s.province]=1;});
    return '<div class="cohort-stat-card" style="--accent:'+colors[i%colors.length]+'">' +
           '<div class="cohort-stat-year">Angkatan '+yr+'</div>' +
           '<div class="cohort-stat-num">'+sub.length+'</div>' +
           '<div class="cohort-stat-label">'+active+' aktif &middot; '+Object.keys(pset).length+' provinsi</div></div>';
  }).join('');
  ChartService.renderCohortCharts(all);
}

/* ── Dropdown ────────────────────────────────────────────── */
function appFillSelect(id, values) {
  var sel = document.getElementById(id);
  if (!sel) return;
  while (sel.options.length > 1) sel.remove(1);
  values.forEach(function(v) {
    var o = document.createElement('option');
    o.value = o.textContent = String(v);
    sel.appendChild(o);
  });
}

/* ── Sidebar ─────────────────────────────────────────────── */
function appInitSidebar() {
  var btn = document.getElementById('sidebar-toggle');
  var sb  = document.getElementById('sidebar');
  if (!btn || !sb) return;
  btn.addEventListener('click', function() {
    var collapsed = sb.classList.toggle('collapsed');
    btn.textContent = collapsed ? '▶' : '◀';
    btn.setAttribute('aria-expanded', String(!collapsed));
    setTimeout(function(){ ChartService.resizeAll(); }, 320);
  });
}

/* ── Navigasi ────────────────────────────────────────────── */
function appInitNav() {
  var links = document.querySelectorAll('[data-page]');
  var pages = document.querySelectorAll('.page');

  function go(pid) {
    pages.forEach(function(p){ p.classList.toggle('active', p.id==='page-'+pid); });
    links.forEach(function(l){ l.classList.toggle('active', l.dataset.page===pid); });
    setTimeout(function() {
      ChartService.resizeAll();
      var all      = DataService.getAll();
      var filtered = FilterService.apply(all);
      if (pid === 'spatial') ChartService.renderSpatialCharts(filtered);
      if (pid === 'profile') ChartService.renderProfileCharts(filtered);
      if (pid === 'cohort')  ChartService.renderCohortCharts(all);
    }, 80);
    var ct = document.getElementById('content');
    if (ct) ct.scrollTo({top:0, behavior:'smooth'});
  }

  links.forEach(function(l){
    l.addEventListener('click', function(e){
      e.preventDefault();
      go(l.dataset.page);
    });
  });

  go('overview');
}

/* ── Start ───────────────────────────────────────────────── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', appInit);
} else {
  appInit();
}
