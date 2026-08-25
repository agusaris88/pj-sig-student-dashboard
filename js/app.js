/**
 * app.js — PJ-SIG Student Spatial Dashboard
 * Koordinator utama. Inisialisasi semua modul dan orkestrasi aliran data.
 */

(async function() {

  /* ── 1. Tampilkan loading, sembunyikan error ──────────────── */
  _showOverlay('loading-overlay', true);
  _showOverlay('error-overlay',   false);

  try {

    /* ── 2. Muat data ─────────────────────────────────────────
       DataService.load() melakukan fetch, validasi, normalisasi,
       dan logging. Jika gagal, ia throw Error dengan pesan yang jelas. */
    var allData = await DataService.load();

    /* ── 3. Inisialisasi peta ─────────────────────────────────
       MapService.init() aman dipanggil berulang (idempotent). */
    MapService.init('map');

    /* ── 4. Isi dropdown filter dari nilai unik di data ────── */
    _populateFilter('filter-cohort',   DataService.getUniqueValues('cohort').map(String));
    _populateFilter('filter-province', DataService.getUniqueValues('province'));
    _populateFilter('filter-regency',  DataService.getUniqueValues('regency'));
    _populateFilter('filter-gender',   ['L', 'P']);
    _populateFilter('filter-admission', DataService.getUniqueValues('admission_path'));

    /* Override label gender agar human-readable */
    _fixGenderLabels();

    /* ── 5. Filter service: pasang callback, bind elemen DOM ─ */
    FilterService.init(function() { _update(); });
    FilterService.bindDOM();

    /* ── 6. Render pertama ────────────────────────────────────*/
    _update();

    /* ── 7. Event mode peta ─────────────────────────────────── */
    document.addEventListener('map-mode-changed', function() { _update(); });

    /* ── 8. Sidebar toggle ─────────────────────────────────── */
    _initSidebar();

    /* ── 9. Navigasi halaman ─────────────────────────────────  */
    _initNavigation();

    /* ── 10. Tombol reset view peta ──────────────────────────  */
    var resetBtn = document.getElementById('btn-reset-view');
    if (resetBtn) {
      resetBtn.addEventListener('click', function() { MapService.resetView(); });
    }

    /* ── 11. Resize chart saat window resize ─────────────────  */
    window.addEventListener('resize', _debounce(function() {
      ChartService.resizeAll();
    }, 200));

    /* ── 12. Timestamp last update ───────────────────────────  */
    var tsEl = document.getElementById('last-update');
    if (tsEl) {
      tsEl.textContent = new Date().toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
    }

  } catch (err) {
    /* Tangkap error apapun dan tampilkan ke user + console */
    console.error('app.js: inisialisasi gagal -', err);
    _showError(err.message || 'Terjadi kesalahan yang tidak diketahui.');
  } finally {
    /* Selalu sembunyikan loading, apapun hasilnya */
    _showOverlay('loading-overlay', false);
  }

  /* ══════════════════════════════════════════════════════════
     FUNGSI INTI
  ══════════════════════════════════════════════════════════ */

  /** Ambil data terfilter → update semua komponen visual */
  function _update() {
    var all      = DataService.getAll();
    var filtered = FilterService.apply(all);

    _renderKPI(filtered);
    MapService.render(filtered);
    ChartService.renderAll(filtered);
    ChartService.renderProfileCharts(filtered);
    ChartService.renderSpatialCharts(filtered);
    ChartService.renderCohortCharts(all);   // cohort: selalu pakai semua data
    _renderInsight(filtered);
    _renderCohortStats(all);
  }

  /** Update enam KPI card */
  function _renderKPI(data) {
    var s = DataService.getSummary(data);
    _setKPI('kpi-total',     s.total);
    _setKPI('kpi-active',    s.active);
    _setKPI('kpi-cohorts',   s.cohorts.length);
    _setKPI('kpi-provinces', s.provinces);
    _setKPI('kpi-regencies', s.regencies);
    _setKPI('kpi-schools',   s.schools);
  }

  function _setKPI(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = Number(value).toLocaleString('id-ID');
  }

  /** Auto-insight teks berdasarkan data terfilter */
  function _renderInsight(data) {
    var box = document.getElementById('insight-box');
    if (!box) return;

    if (!data || data.length === 0) {
      box.innerHTML = '<p class="insight-empty">Tidak ada data untuk filter yang dipilih.</p>';
      return;
    }

    var insights = [];

    var topReg = DataService.topN(data, 'regency', 1)[0];
    if (topReg) {
      insights.push(
        '\uD83D\uDCCD <b>' + topReg.name + '</b> merupakan kabupaten/kota asal terbanyak ' +
        'dengan <b>' + topReg.count + '</b> mahasiswa.'
      );
    }

    var male   = data.filter(function(s) { return s.gender === 'L'; }).length;
    var female = data.filter(function(s) { return s.gender === 'P'; }).length;
    var domGender = male >= female
      ? 'laki-laki (' + male + ')'
      : 'perempuan (' + female + ')';
    insights.push(
      '\uD83D\uDC65 Mahasiswa didominasi <b>' + domGender + '</b> dari total <b>' + data.length + '</b>.'
    );

    var topProv = DataService.topN(data, 'province', 1)[0];
    if (topProv) {
      insights.push(
        '\uD83D\uDDFA\uFE0F <b>' + topProv.name + '</b> adalah provinsi dengan kontribusi terbesar.'
      );
    }

    var topPath = DataService.topN(data, 'admission_path', 1)[0];
    if (topPath) {
      insights.push(
        '\uD83C\uDF93 Jalur masuk terbanyak: <b>' + topPath.name +
        '</b> (' + topPath.count + ' mahasiswa).'
      );
    }

    box.innerHTML = insights
      .map(function(i) { return '<p class="insight-item">' + i + '</p>'; })
      .join('');
  }

  /** Render kartu statistik per angkatan di halaman Cohort */
  function _renderCohortStats(allData) {
    var container = document.getElementById('cohort-stats-grid');
    if (!container) return;

    var cohorts = DataService.getUniqueValues('cohort');  // sudah di-sort
    var colors  = ['var(--sky-500)', 'var(--teal-500)', 'var(--indigo-400)', 'var(--amber-400)'];

    container.innerHTML = cohorts.map(function(c, i) {
      var cData  = allData.filter(function(s) { return s.cohort === c; });
      var active = cData.filter(function(s)  { return s.status === 'Aktif'; }).length;
      var provs  = DataService.getUniqueValues.call(null, 'province',
                   // fallback: hitung dari subset
                   (function() {
                     var seen = {}, out = [];
                     cData.forEach(function(s) {
                       if (!seen[s.province]) { seen[s.province] = true; out.push(s.province); }
                     });
                     return out.length;
                   })()
                   );
      // Hitung provinsi dari subset cohort langsung
      var provCount = (function() {
        var seen = {};
        cData.forEach(function(s) { seen[s.province] = true; });
        return Object.keys(seen).length;
      })();

      return '<div class="cohort-stat-card" style="--accent:' + colors[i % colors.length] + '">' +
        '<div class="cohort-stat-year">Angkatan ' + c + '</div>' +
        '<div class="cohort-stat-num">' + cData.length + '</div>' +
        '<div class="cohort-stat-label">' + active + ' aktif &middot; ' + provCount + ' provinsi</div>' +
      '</div>';
    }).join('');
  }

  /* ══════════════════════════════════════════════════════════
     HELPER UI
  ══════════════════════════════════════════════════════════ */

  /** Isi dropdown dari array string, pertahankan opsi "Semua" pertama */
  function _populateFilter(selectId, values) {
    var sel = document.getElementById(selectId);
    if (!sel) return;

    // Hapus semua opsi kecuali yang pertama (Semua …)
    while (sel.options.length > 1) sel.remove(1);

    values.forEach(function(v) {
      var opt = document.createElement('option');
      opt.value       = String(v);
      opt.textContent = String(v);
      sel.appendChild(opt);
    });
  }

  function _fixGenderLabels() {
    var sel = document.getElementById('filter-gender');
    if (!sel) return;
    Array.from(sel.options).forEach(function(opt) {
      if (opt.value === 'L') opt.textContent = 'Laki-laki';
      if (opt.value === 'P') opt.textContent = 'Perempuan';
    });
  }

  /** Toggle sidebar collapse */
  function _initSidebar() {
    var btn     = document.getElementById('sidebar-toggle');
    var sidebar = document.getElementById('sidebar');
    var main    = document.getElementById('main');
    if (!btn || !sidebar || !main) return;

    btn.addEventListener('click', function() {
      var collapsed = sidebar.classList.toggle('collapsed');
      main.classList.toggle('sidebar-collapsed', collapsed);
      btn.setAttribute('aria-expanded', String(!collapsed));
      btn.textContent = collapsed ? '\u25B6' : '\u25C0';  // ► / ◀
      setTimeout(function() { ChartService.resizeAll(); }, 320);
    });
  }

  /** Navigasi halaman (single-page) */
  function _initNavigation() {
    var navLinks = document.querySelectorAll('[data-page]');
    var pages    = document.querySelectorAll('.page');

    function showPage(pageId) {
      pages.forEach(function(p) {
        p.classList.toggle('active', p.id === 'page-' + pageId);
      });
      navLinks.forEach(function(l) {
        l.classList.toggle('active', l.dataset.page === pageId);
      });
      setTimeout(function() { ChartService.resizeAll(); }, 120);
      var content = document.getElementById('content');
      if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
    }

    navLinks.forEach(function(link) {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        showPage(link.dataset.page);
      });
    });

    showPage('overview');  // halaman default
  }

  /* ══════════════════════════════════════════════════════════
     OVERLAY HELPERS
  ══════════════════════════════════════════════════════════ */

  function _showOverlay(id, show) {
    var el = document.getElementById(id);
    if (el) el.style.display = show ? 'flex' : 'none';
  }

  function _showError(message) {
    _showOverlay('loading-overlay', false);
    _showOverlay('error-overlay', true);
    var msgEl = document.getElementById('error-message');
    if (msgEl) msgEl.textContent = message || 'Terjadi kesalahan yang tidak diketahui.';
    console.error('app.js [error ditampilkan ke user]:', message);
  }

  function _debounce(fn, ms) {
    var timer;
    return function() {
      clearTimeout(timer);
      timer = setTimeout(fn, ms);
    };
  }

})();

fix: perbaiki error handling dan overlay management
