/**
 * app.js — PJ-SIG Student Spatial Dashboard
 *
 * Urutan inisialisasi (KRITIS — jangan diubah):
 *   1. appInitSidebar()
 *   2. appInitNav()       → #page-overview display:block
 *   3. MapService.init()  → L.map() pada container yang sudah visible
 *   4. appUpdate()        → render semua komponen
 *
 * Filter dinamis:
 *   Semua dropdown dibaca dari JSON, tidak ada nilai yang hard-code.
 *   Menambah data 2027 ke students.json → dropdown otomatis tampilkan 2027.
 *   Setiap perubahan filter → appUpdate() dipanggil → SEMUA komponen diperbarui:
 *   KPI · Peta · Heatmap · Cluster · Point · Charts · Spatial Insight
 */

/* ── Overlay helpers ─────────────────────────────────────── */
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
  console.error('[APP]', msg);
}

/* ── Entry point ─────────────────────────────────────────── */
function appInit() {
  appShowLoading(true);
  console.log('[APP] Memulai inisialisasi...');

  /* Cek semua modul tersedia sebelum mulai */
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

      /* ── Isi semua dropdown dari data JSON (dinamis, tidak hard-code) ── */
      _fillAllDropdowns();

      /* ── Filter: pasang callback dan bind elemen DOM ── */
      FilterService.init(function() { appUpdate(); });
      FilterService.bindDOM();

      /* ── Navigasi DULU → #page-overview display:block ── */
      appInitSidebar();
      appInitNav();

      /* ── Init peta SETELAH container visible ── */
      MapService.init('map');

      /* ── Render pertama dengan semua filter = 'all' ── */
      appUpdate();

      /* ── Event: mode peta berubah → re-render peta ── */
      document.addEventListener('map-mode-changed', function() {
        var filtered = FilterService.apply(DataService.getAll());
        MapService.render(filtered);
      });

      /* ── Tombol reset peta ── */
      var rb = document.getElementById('btn-reset-view');
      if (rb) rb.addEventListener('click', function() { MapService.resetView(); });

      /* ── Resize chart saat window resize ── */
      window.addEventListener('resize', function() {
        clearTimeout(window._resizeTimer);
        window._resizeTimer = setTimeout(function() { ChartService.resizeAll(); }, 250);
      });

      /* ── Timestamp ── */
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

/* ══════════════════════════════════════════════════════════
   DROPDOWN — dinamis dari JSON, tidak ada nilai hard-code
══════════════════════════════════════════════════════════ */
function _fillAllDropdowns() {
  /* Cohort: dibaca dari JSON, diurutkan ascending */
  appFillSelect('filter-cohort', DataService.getUniqueValues('cohort').map(String));

  /* Province */
  appFillSelect('filter-province', DataService.getUniqueValues('province'));

  /* Regency: isi semua dulu; akan difilter saat province berubah */
  appFillSelect('filter-regency', DataService.getUniqueValues('regency'));

  /* Gender: tetap ['L','P'] tapi label diubah agar human-readable */
  appFillSelect('filter-gender', ['L', 'P']);
  var gSel = document.getElementById('filter-gender');
  if (gSel) {
    Array.from(gSel.options).forEach(function(o) {
      if (o.value === 'L') o.textContent = 'Laki-laki';
      if (o.value === 'P') o.textContent = 'Perempuan';
    });
  }

  /* Admission path: dibaca dari JSON */
  appFillSelect('filter-admission', DataService.getUniqueValues('admission_path'));

  /* Status: dibaca dari JSON (Aktif, Cuti, Lulus — tidak hard-code) */
  appFillSelect('filter-status', DataService.getUniqueValues('status'));
}

function appFillSelect(id, values) {
  var sel = document.getElementById(id);
  if (!sel) return;
  /* Hapus semua opsi kecuali yang pertama (Semua …) */
  while (sel.options.length > 1) sel.remove(1);
  values.forEach(function(v) {
    var o = document.createElement('option');
    o.value = o.textContent = String(v);
    sel.appendChild(o);
  });
}

/* ══════════════════════════════════════════════════════════
   UPDATE — dipanggil setiap kali filter berubah
   Semua komponen menerima data yang SUDAH difilter.
══════════════════════════════════════════════════════════ */
function appUpdate() {
  var all      = DataService.getAll();
  var filtered = FilterService.apply(all);

  /* Label filter aktif di topbar */
  _renderFilterBadge(filtered.length, all.length);

  /* KPI — berdasarkan data terfilter */
  appRenderKPI(filtered);

  /* Peta — semua mode (heatmap/cluster/point) ikut filter */
  MapService.render(filtered);

  /* Charts halaman Overview */
  ChartService.renderAll(filtered);

  /* Insight spasial */
  appRenderInsight(filtered);

  /* Cohort stats — ikut filter (bukan all) agar province/gender/status berpengaruh */
  appRenderCohortStats(filtered, all);
}

/* ══════════════════════════════════════════════════════════
   KPI CARDS
══════════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════════
   FILTER BADGE — tampilkan jumlah hasil filter
══════════════════════════════════════════════════════════ */
function _renderFilterBadge(filtered, total) {
  var badge = document.getElementById('filter-result-badge');
  if (!badge) return;
  if (filtered === total) {
    badge.textContent = total + ' mahasiswa';
    badge.classList.remove('badge-filtered');
  } else {
    badge.textContent = filtered + ' dari ' + total + ' mahasiswa';
    badge.classList.add('badge-filtered');
  }
}

/* ══════════════════════════════════════════════════════════
   SPATIAL INSIGHT
   Dibuat dari data terfilter — otomatis berubah saat filter berubah
══════════════════════════════════════════════════════════ */
function appRenderInsight(data) {
  var box = document.getElementById('insight-box');
  if (!box) return;

  if (!data || data.length === 0) {
    box.innerHTML = '<p class="insight-empty">Tidak ada data untuk kombinasi filter yang dipilih.<br>' +
      'Coba ubah atau reset filter.</p>';
    return;
  }

  var lines = [];
  var state = FilterService.getState();

  /* Konteks filter aktif */
  var ctx = [];
  if (state.cohort         !== 'all') ctx.push('Angkatan ' + state.cohort);
  if (state.province       !== 'all') ctx.push(state.province);
  if (state.regency        !== 'all') ctx.push(state.regency);
  if (state.gender         !== 'all') ctx.push(state.gender === 'L' ? 'Laki-laki' : 'Perempuan');
  if (state.admission_path !== 'all') ctx.push('Jalur ' + state.admission_path);
  if (state.status         !== 'all') ctx.push('Status ' + state.status);

  if (ctx.length > 0) {
    lines.push('🔍 Filter aktif: <b>' + ctx.join(' · ') + '</b> — menampilkan <b>' + data.length + '</b> mahasiswa.');
  }

  /* Kabupaten terbanyak */
  var topReg = DataService.topN(data, 'regency', 1)[0];
  if (topReg) {
    lines.push('📍 <b>' + topReg.name + '</b> adalah kabupaten/kota dengan mahasiswa terbanyak (' + topReg.count + ' mahasiswa).');
  }

  /* Gender */
  var m = data.filter(function(s){ return s.gender === 'L'; }).length;
  var f = data.filter(function(s){ return s.gender === 'P'; }).length;
  var pct = data.length > 0 ? Math.round((Math.max(m,f) / data.length) * 100) : 0;
  lines.push('👥 Didominasi <b>' + (m >= f ? 'laki-laki (' + m + ')' : 'perempuan (' + f + ')') +
    '</b> — ' + pct + '% dari total ' + data.length + ' mahasiswa.');

  /* Provinsi terbanyak */
  var topProv = DataService.topN(data, 'province', 1)[0];
  if (topProv && state.province === 'all') {
    var provPct = Math.round((topProv.count / data.length) * 100);
    lines.push('🗺️ <b>' + topProv.name + '</b> menyumbang ' + provPct + '% mahasiswa (' + topProv.count + ' orang).');
  }

  /* Jalur masuk terbanyak */
  var topPath = DataService.topN(data, 'admission_path', 1)[0];
  if (topPath && state.admission_path === 'all') {
    lines.push('🎓 Jalur masuk dominan: <b>' + topPath.name + '</b> (' + topPath.count + ' mahasiswa).');
  }

  /* Status */
  var aktif = data.filter(function(s){ return s.status === 'Aktif'; }).length;
  if (state.status === 'all') {
    var aktifPct = data.length > 0 ? Math.round((aktif / data.length) * 100) : 0;
    lines.push('✅ <b>' + aktif + '</b> mahasiswa aktif (' + aktifPct + '% dari data yang ditampilkan).');
  }

  /* Wilayah potensial tanpa representasi */
  if (state.province === 'all' && data.length > 0) {
    var topSchool = DataService.topN(data, 'school', 1)[0];
    if (topSchool) {
      lines.push('🏫 Sekolah asal terbanyak: <b>' + topSchool.name + '</b> (' + topSchool.count + ' mahasiswa).');
    }
  }

  box.innerHTML = lines.map(function(l) {
    return '<p class="insight-item">' + l + '</p>';
  }).join('');
}

/* ══════════════════════════════════════════════════════════
   COHORT STATS (halaman Cohort Comparison)
   Menerima filtered DAN all:
   - filtered: untuk statistik yang ikut filter aktif
   - all: untuk chart perbandingan antarangkatan (selalu tampil semua angkatan)
══════════════════════════════════════════════════════════ */
function appRenderCohortStats(filtered, all) {
  var container = document.getElementById('cohort-stats-grid');
  if (!container) return;

  /* Ambil semua angkatan dari dataset penuh (agar tidak hilang saat filter) */
  var allCohorts = DataService.getUniqueValues('cohort');
  var colors     = ['var(--sky-500)', 'var(--teal-500)', 'var(--indigo-400)', 'var(--amber-400)'];

  container.innerHTML = allCohorts.map(function(yr, i) {
    /* Hitung statistik dari data TERFILTER untuk angkatan ini */
    var subset = filtered.filter(function(s) { return s.cohort === yr; });
    var active  = subset.filter(function(s) { return s.status === 'Aktif'; }).length;
    var pset    = {};
    subset.forEach(function(s) { if (s.province) pset[s.province] = 1; });

    /* Total semua angkatan (tidak terfilter) untuk perbandingan */
    var totalAll = all.filter(function(s) { return s.cohort === yr; }).length;
    var pct      = totalAll > 0 ? Math.round((subset.length / totalAll) * 100) : 0;

    var subtitle = subset.length === totalAll
      ? active + ' aktif &middot; ' + Object.keys(pset).length + ' provinsi'
      : subset.length + ' / ' + totalAll + ' (' + pct + '%) &middot; ' + active + ' aktif';

    return '<div class="cohort-stat-card" style="--accent:' + colors[i % colors.length] + '">' +
      '<div class="cohort-stat-year">Angkatan ' + yr + '</div>' +
      '<div class="cohort-stat-num">' + subset.length + '</div>' +
      '<div class="cohort-stat-label">' + subtitle + '</div>' +
    '</div>';
  }).join('');

  /* Chart perbandingan: gunakan data TERFILTER agar ikut filter aktif */
  ChartService.renderCohortCharts(filtered);
}

/* ══════════════════════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════════════════════ */
function appInitSidebar() {
  var btn = document.getElementById('sidebar-toggle');
  var sb  = document.getElementById('sidebar');
  if (!btn || !sb) return;
  btn.addEventListener('click', function() {
    var collapsed = sb.classList.toggle('collapsed');
    btn.textContent = collapsed ? '▶' : '◀';
    btn.setAttribute('aria-expanded', String(!collapsed));
    setTimeout(function() { ChartService.resizeAll(); }, 320);
  });
}

/* ══════════════════════════════════════════════════════════
   NAVIGASI halaman
══════════════════════════════════════════════════════════ */
function appInitNav() {
  var links = document.querySelectorAll('[data-page]');
  var pages = document.querySelectorAll('.page');

  function go(pid) {
    /* Set halaman aktif langsung (tanpa setTimeout) */
    pages.forEach(function(p) { p.classList.toggle('active', p.id === 'page-' + pid); });
    links.forEach(function(l) { l.classList.toggle('active', l.dataset.page === pid); });

    /* Render chart halaman setelah container visible (lazy) */
    setTimeout(function() {
      ChartService.resizeAll();
      var all      = DataService.getAll();
      var filtered = FilterService.apply(all);
      if (pid === 'spatial') ChartService.renderSpatialCharts(filtered);
      if (pid === 'profile') ChartService.renderProfileCharts(filtered);
      if (pid === 'cohort')  appRenderCohortStats(filtered, all);
    }, 80);

    var ct = document.getElementById('content');
    if (ct) ct.scrollTo({ top: 0, behavior: 'smooth' });
  }

  links.forEach(function(l) {
    l.addEventListener('click', function(e) {
      e.preventDefault();
      go(l.dataset.page);
    });
  });

  /* Set Overview aktif sekarang — container overview jadi display:block
     SEBELUM MapService.init() dipanggil */
  go('overview');
}

/* ── Start ───────────────────────────────────────────────── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', appInit);
} else {
  appInit();
}
