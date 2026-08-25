/**
 * app.js
 * Koordinator utama. Inisialisasi semua modul dan orkestrasi aliran data.
 * Dipanggil saat DOM selesai dimuat.
 */

(async () => {
  // ── 1. Tampilkan loading ──────────────────────────────────────────────────
  showLoading(true);

  try {
    // ── 2. Muat data ─────────────────────────────────────────────────────────
    const allData = await DataService.load();

    // ── 3. Inisialisasi peta ─────────────────────────────────────────────────
    MapService.init('map');

    // ── 4. Isi dropdown filter dari data ─────────────────────────────────────
    FilterService.populateSelect(
      document.getElementById('filter-cohort'),
      DataService.getUniqueValues('cohort').map(String)
    );
    FilterService.populateSelect(
      document.getElementById('filter-province'),
      DataService.getUniqueValues('province')
    );
    FilterService.populateSelect(
      document.getElementById('filter-regency'),
      DataService.getUniqueValues('regency')
    );
    FilterService.populateSelect(
      document.getElementById('filter-gender'),
      [{ val: 'L', label: 'Laki-laki' }, { val: 'P', label: 'Perempuan' }]
        .map(g => g.val),  // FilterService.populateSelect menerima array string
    );
    // Override label gender agar lebih jelas
    _fixGenderLabels();

    FilterService.populateSelect(
      document.getElementById('filter-admission'),
      DataService.getUniqueValues('admission_path')
    );

    // ── 5. Inisialisasi filter — pasang callback ───────────────────────────
    FilterService.init(() => _update());
    FilterService.bindDOM();

    // ── 6. Render pertama dengan seluruh data ─────────────────────────────
    _update();

    // ── 7. Listen event map-mode-changed dari tombol mode peta ────────────
    document.addEventListener('map-mode-changed', () => _update());

    // ── 8. Sidebar toggle ─────────────────────────────────────────────────
    _initSidebar();

    // ── 9. Navigasi halaman (single-page behavior) ────────────────────────
    _initNavigation();

    // ── 10. Tombol reset view peta ────────────────────────────────────────
    const resetViewBtn = document.getElementById('btn-reset-view');
    if (resetViewBtn) resetViewBtn.addEventListener('click', () => MapService.resetView());

    // ── 11. Resize chart saat window resize ──────────────────────────────
    window.addEventListener('resize', debounce(() => ChartService.resizeAll(), 200));

    // ── 12. Update timestamp ──────────────────────────────────────────────
    const tsEl = document.getElementById('last-update');
    if (tsEl) tsEl.textContent = new Date().toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

  } catch (err) {
    showError(err);
  } finally {
    showLoading(false);
  }

  // ── Fungsi ─────────────────────────────────────────────────────────────────

  /** Ambil data terfilter, update KPI + peta + chart */
  function _update() {
    const allData  = DataService.getAll();
    const filtered = FilterService.apply(allData);
    _renderKPI(filtered);
    MapService.render(filtered);
    ChartService.renderAll(filtered);
    ChartService.renderProfileCharts(filtered);
    ChartService.renderSpatialCharts(filtered);
    ChartService.renderCohortCharts(allData);  // cohort selalu pakai semua data
    _renderInsight(filtered);
    _renderCohortStats(allData);
  }

  /** Update 6 KPI card */
  function _renderKPI(data) {
    const summary = DataService.getSummary(data);
    _setKPI('kpi-total',     summary.total);
    _setKPI('kpi-active',    summary.active);
    _setKPI('kpi-cohorts',   summary.cohorts.length);
    _setKPI('kpi-provinces', summary.provinces);
    _setKPI('kpi-regencies', summary.regencies);
    _setKPI('kpi-schools',   summary.schools);
  }

  function _setKPI(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value.toLocaleString('id-ID');
  }

  /** Auto-insight berdasarkan data yang difilter */
  function _renderInsight(data) {
    const box = document.getElementById('insight-box');
    if (!box) return;
    if (data.length === 0) {
      box.innerHTML = '<p class="insight-empty">Tidak ada data untuk filter yang dipilih.</p>';
      return;
    }
    const insights = [];
    const top = DataService.topN(data, 'regency', 1)[0];
    if (top) insights.push(`📍 <b>${top.name}</b> merupakan asal kabupaten/kota terbanyak dengan <b>${top.count}</b> mahasiswa.`);

    const male   = data.filter(s => s.gender === 'L').length;
    const female = data.filter(s => s.gender === 'P').length;
    const domGender = male >= female ? `laki-laki (${male})` : `perempuan (${female})`;
    insights.push(`👥 Mahasiswa didominasi oleh <b>${domGender}</b> dari total <b>${data.length}</b>.`);

    const topProv = DataService.topN(data, 'province', 1)[0];
    if (topProv) insights.push(`🗺️ <b>${topProv.name}</b> adalah provinsi dengan kontribusi mahasiswa terbesar.`);

    const topPath = DataService.topN(data, 'admission_path', 1)[0];
    if (topPath) insights.push(`🎓 Jalur masuk terbanyak: <b>${topPath.name}</b> (<b>${topPath.count}</b> mahasiswa).`);

    box.innerHTML = insights.map(i => `<p class="insight-item">${i}</p>`).join('');
  }

  function _fixGenderLabels() {
    const sel = document.getElementById('filter-gender');
    if (!sel) return;
    [...sel.options].forEach(opt => {
      if (opt.value === 'L') opt.textContent = 'Laki-laki';
      if (opt.value === 'P') opt.textContent = 'Perempuan';
    });
  }

  function _initSidebar() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar   = document.getElementById('sidebar');
    const main      = document.getElementById('main');
    if (!toggleBtn || !sidebar || !main) return;

    toggleBtn.addEventListener('click', () => {
      const collapsed = sidebar.classList.toggle('collapsed');
      main.classList.toggle('sidebar-collapsed', collapsed);
      toggleBtn.setAttribute('aria-expanded', String(!collapsed));
      setTimeout(() => ChartService.resizeAll(), 320);
    });
  }

  function _initNavigation() {
    const navLinks = document.querySelectorAll('[data-page]');
    const pages    = document.querySelectorAll('.page');

    function showPage(pageId) {
      pages.forEach(p => p.classList.toggle('active', p.id === `page-${pageId}`));
      navLinks.forEach(l => l.classList.toggle('active', l.dataset.page === pageId));
      setTimeout(() => ChartService.resizeAll(), 120);
      document.getElementById('content').scrollTo({ top: 0, behavior: 'smooth' });
    }

    navLinks.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        showPage(link.dataset.page);
      });
    });

    showPage('overview'); // default
  }

  /** Render kartu statistik per angkatan di halaman Cohort */
  function _renderCohortStats(allData) {
    const container = document.getElementById('cohort-stats-grid');
    if (!container) return;
    const cohorts = [...new Set(allData.map(s => s.cohort))].sort();
    const colors  = ['var(--sky-500)', 'var(--teal-500)', 'var(--indigo-400)', 'var(--amber-400)'];
    container.innerHTML = cohorts.map((c, i) => {
      const cData  = allData.filter(s => s.cohort === c);
      const active = cData.filter(s => s.status === 'Aktif').length;
      const provs  = new Set(cData.map(s => s.province)).size;
      return `
        <div class="cohort-stat-card" style="--accent:${colors[i % colors.length]}">
          <div class="cohort-stat-year">Angkatan ${c}</div>
          <div class="cohort-stat-num">${cData.length}</div>
          <div class="cohort-stat-label">mahasiswa · ${active} aktif · ${provs} provinsi</div>
        </div>`;
    }).join('');
  }
})();

// ── Helpers ────────────────────────────────────────────────────────────────

function showLoading(show) {
  const el = document.getElementById('loading-overlay');
  if (el) el.style.display = show ? 'flex' : 'none';
}

function showError(err) {
  const el = document.getElementById('error-overlay');
  if (el) {
    el.style.display = 'flex';
    const msg = el.querySelector('#error-message');
    if (msg) msg.textContent = err?.message || 'Gagal memuat data.';
  }
  console.error(err);
}

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}
