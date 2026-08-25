/**
 * charts.js — PJ-SIG Student Spatial Dashboard
 *
 * PERBAIKAN KRITIS:
 * - _getInstance: SKIP jika container width=0 (belum visible)
 *   → mencegah error "getImageData: source width is 0"
 * - renderer: 'canvas' (bukan 'svg') — lebih stabil di semua browser
 * - resizeAll: hanya resize container yang sedang visible
 * - Semua render chart aman dipanggil kapan saja — tidak akan crash
 */

var ChartService = (function() {

  var _instances = {};

  var PALETTE = {
    teal:   '#14b8a6',
    sky:    '#38bdf8',
    indigo: '#818cf8',
    amber:  '#fbbf24',
    coral:  '#fb923c',
    rose:   '#fb7185',
    slate:  '#94a3b8',
  };

  var COHORT_COLORS = ['#38bdf8', '#14b8a6', '#818cf8', '#fbbf24'];

  var BASE_TEXT = {
    color: '#94a3b8',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 11,
  };

  /* ─── getInstance: AMAN — tidak crash jika container belum visible ─── */
  function _getInstance(id) {
    var el = document.getElementById(id);
    if (!el) return null;

    // GUARD UTAMA: jika container belum visible (width=0), skip
    // Inilah penyebab error "getImageData: source width is 0"
    if (el.offsetWidth === 0 || el.offsetHeight === 0) {
      return null;
    }

    if (!_instances[id]) {
      // 'canvas' renderer — tidak menggunakan SVG yang bisa crash
      _instances[id] = echarts.init(el, null, { renderer: 'canvas' });
    }
    return _instances[id];
  }

  function _truncate(str, n) {
    return str && str.length > n ? str.slice(0, n - 1) + '\u2026' : (str || '');
  }

  /* ─── Chart 1: Mahasiswa per Angkatan ───────────────────────────── */
  function renderCohortChart(data) {
    var chart = _getInstance('chart-cohort');
    if (!chart) return;

    var cohorts = [];
    var seen = {};
    data.forEach(function(s) { if (!seen[s.cohort]) { seen[s.cohort]=1; cohorts.push(s.cohort); } });
    cohorts.sort();
    var counts = cohorts.map(function(c) {
      return data.filter(function(s) { return s.cohort === c; }).length;
    });

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 12 } },
      grid: { left: 10, right: 10, top: 12, bottom: 24, containLabel: true },
      xAxis: { type: 'category', data: cohorts,
        axisLabel: { color: '#94a3b8', fontSize: 11 },
        axisLine: { lineStyle: { color: '#334155' } }, axisTick: { show: false } },
      yAxis: { type: 'value',
        splitLine: { lineStyle: { color: '#1e293b' } }, axisLabel: BASE_TEXT },
      series: [{ type: 'bar',
        data: counts.map(function(v, i) { return {
          value: v,
          itemStyle: { color: COHORT_COLORS[i % COHORT_COLORS.length], borderRadius: [4,4,0,0] }
        }; }),
        label: { show: true, position: 'top', color: '#94a3b8', fontSize: 11 } }],
    }, true);
  }

  /* ─── Chart 2: Mahasiswa per Provinsi ───────────────────────────── */
  function renderProvinceChart(data) {
    var chart = _getInstance('chart-province');
    if (!chart) return;

    var top    = DataService.topN(data, 'province', 8);
    var names  = top.map(function(d) { return _truncate(d.name, 18); }).reverse();
    var counts = top.map(function(d) { return d.count; }).reverse();

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 12 } },
      grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: '#1e293b' } }, axisLabel: BASE_TEXT },
      yAxis: { type: 'category', data: names,
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        axisLine: { lineStyle: { color: '#334155' } }, axisTick: { show: false } },
      series: [{ type: 'bar', barMaxWidth: 16,
        data: counts.map(function(v) { return { value: v, itemStyle: { color: PALETTE.sky, borderRadius: [0,4,4,0] } }; }),
        label: { show: true, position: 'right', color: '#94a3b8', fontSize: 10 } }],
    }, true);
  }

  /* ─── Chart 3: Top Kabupaten/Kota ───────────────────────────────── */
  function renderRegencyChart(data) {
    var chart = _getInstance('chart-regency');
    if (!chart) return;

    var top    = DataService.topN(data, 'regency', 8);
    var names  = top.map(function(d) { return _truncate(d.name, 16); }).reverse();
    var counts = top.map(function(d) { return d.count; }).reverse();

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 12 } },
      grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: '#1e293b' } }, axisLabel: BASE_TEXT },
      yAxis: { type: 'category', data: names,
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        axisLine: { lineStyle: { color: '#334155' } }, axisTick: { show: false } },
      series: [{ type: 'bar', barMaxWidth: 16,
        data: counts.map(function(v) { return { value: v, itemStyle: { color: PALETTE.teal, borderRadius: [0,4,4,0] } }; }),
        label: { show: true, position: 'right', color: '#94a3b8', fontSize: 10 } }],
    }, true);
  }

  /* ─── Chart 4: Gender Donut ─────────────────────────────────────── */
  function renderGenderChart(data) {
    var chart = _getInstance('chart-gender');
    if (!chart) return;
    _renderDonutGender(chart, data);
  }

  function _renderDonutGender(chart, data) {
    var male   = data.filter(function(s) { return s.gender === 'L'; }).length;
    var female = data.filter(function(s) { return s.gender === 'P'; }).length;
    var total  = data.length;
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', backgroundColor: '#1e293b', borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 12 } },
      legend: { bottom: 4, textStyle: { color: '#94a3b8', fontSize: 11 } },
      graphic: [
        { type: 'text', left: 'center', top: '36%',
          style: { text: String(total), fill: '#e2e8f0', fontSize: 22, fontWeight: '600', fontFamily: 'Inter' } },
        { type: 'text', left: 'center', top: '50%',
          style: { text: 'mahasiswa', fill: '#64748b', fontSize: 10, fontFamily: 'Inter' } },
      ],
      series: [{ type: 'pie', radius: ['48%', '68%'], center: ['50%', '42%'],
        data: [
          { name: 'Laki-laki', value: male,   itemStyle: { color: PALETTE.sky } },
          { name: 'Perempuan', value: female, itemStyle: { color: PALETTE.rose } },
        ],
        label: { show: false }, emphasis: { scale: false } }],
    }, true);
  }

  /* ─── Chart 5: Jalur Masuk Donut ────────────────────────────────── */
  function renderAdmissionChart(data) {
    var chart = _getInstance('chart-admission');
    if (!chart) return;
    _renderDonutAdmission(chart, data);
  }

  function _renderDonutAdmission(chart, data) {
    var counts  = DataService.countBy(data, 'admission_path');
    var palette = [PALETTE.teal, PALETTE.indigo, PALETTE.amber, PALETTE.coral, PALETTE.slate];
    var series  = Object.keys(counts).map(function(name, i) {
      return { name: name, value: counts[name], itemStyle: { color: palette[i % palette.length] } };
    });
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', backgroundColor: '#1e293b', borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 12 } },
      legend: { bottom: 4, textStyle: { color: '#94a3b8', fontSize: 11 }, itemWidth: 10, itemHeight: 10 },
      series: [{ type: 'pie', radius: ['48%', '68%'], center: ['50%', '42%'],
        data: series, label: { show: false }, emphasis: { scale: false } }],
    }, true);
  }

  /* ─── Chart Profile: Status ─────────────────────────────────────── */
  function renderStatusChart(id, data) {
    var chart = _getInstance(id);
    if (!chart) return;
    var counts = DataService.countBy(data, 'status');
    var statusColors = { 'Aktif': PALETTE.teal, 'Cuti': PALETTE.amber, 'Lulus': PALETTE.indigo };
    var series = Object.keys(counts).map(function(name) {
      return { name: name, value: counts[name], itemStyle: { color: statusColors[name] || PALETTE.slate } };
    });
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', backgroundColor: '#1e293b', borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 12 } },
      legend: { bottom: 4, textStyle: { color: '#94a3b8', fontSize: 11 } },
      series: [{ type: 'pie', radius: ['48%', '68%'], center: ['50%', '42%'],
        data: series, label: { show: false }, emphasis: { scale: false } }],
    }, true);
  }

  /* ─── Chart Profile: Top Sekolah ────────────────────────────────── */
  function renderSchoolChart(id, data) {
    var chart = _getInstance(id);
    if (!chart) return;
    var top    = DataService.topN(data, 'school', 8);
    var names  = top.map(function(d) { return _truncate(d.name, 20); }).reverse();
    var counts = top.map(function(d) { return d.count; }).reverse();
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 12 } },
      grid: { left: 8, right: 30, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: '#1e293b' } }, axisLabel: BASE_TEXT },
      yAxis: { type: 'category', data: names,
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        axisLine: { lineStyle: { color: '#334155' } }, axisTick: { show: false } },
      series: [{ type: 'bar', barMaxWidth: 14,
        data: counts.map(function(v) { return { value: v, itemStyle: { color: PALETTE.indigo, borderRadius: [0,4,4,0] } }; }),
        label: { show: true, position: 'right', color: '#94a3b8', fontSize: 10 } }],
    }, true);
  }

  /* ─── Chart Cohort: Perbandingan ────────────────────────────────── */
  function renderCohortCompare(id, allData) {
    var chart = _getInstance(id);
    if (!chart) return;
    var cohorts = [];
    var seen = {};
    allData.forEach(function(s) { if (!seen[s.cohort]) { seen[s.cohort]=1; cohorts.push(s.cohort); } });
    cohorts.sort();
    var totals = cohorts.map(function(c) { return allData.filter(function(s){return s.cohort===c;}).length; });
    var active = cohorts.map(function(c) { return allData.filter(function(s){return s.cohort===c&&s.status==='Aktif';}).length; });
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 12 } },
      legend: { bottom: 4, textStyle: { color: '#94a3b8', fontSize: 11 } },
      grid: { left: 10, right: 10, top: 12, bottom: 36, containLabel: true },
      xAxis: { type: 'category', data: cohorts, axisLabel: BASE_TEXT,
        axisLine: { lineStyle: { color: '#334155' } }, axisTick: { show: false } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1e293b' } }, axisLabel: BASE_TEXT },
      series: [
        { name: 'Total', type: 'bar',
          data: totals.map(function(v,i){ return { value:v, itemStyle:{color:COHORT_COLORS[i%COHORT_COLORS.length],borderRadius:[4,4,0,0]} }; }) },
        { name: 'Aktif', type: 'bar',
          data: active.map(function(v){ return { value:v, itemStyle:{color:PALETTE.teal,borderRadius:[4,4,0,0]} }; }) },
      ],
    }, true);
  }

  /* ─── Chart Cohort: Gender per Angkatan ─────────────────────────── */
  function renderCohortGender(id, allData) {
    var chart = _getInstance(id);
    if (!chart) return;
    var cohorts = [];
    var seen = {};
    allData.forEach(function(s) { if (!seen[s.cohort]) { seen[s.cohort]=1; cohorts.push(s.cohort); } });
    cohorts.sort();
    var male   = cohorts.map(function(c){ return allData.filter(function(s){return s.cohort===c&&s.gender==='L';}).length; });
    var female = cohorts.map(function(c){ return allData.filter(function(s){return s.cohort===c&&s.gender==='P';}).length; });
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 12 } },
      legend: { bottom: 4, textStyle: { color: '#94a3b8', fontSize: 11 } },
      grid: { left: 10, right: 10, top: 12, bottom: 36, containLabel: true },
      xAxis: { type: 'category', data: cohorts, axisLabel: BASE_TEXT,
        axisLine: { lineStyle: { color: '#334155' } }, axisTick: { show: false } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1e293b' } }, axisLabel: BASE_TEXT },
      series: [
        { name: 'Laki-laki', type: 'bar', stack: 'gender', barMaxWidth: 40,
          data: male.map(function(v){ return { value:v, itemStyle:{color:PALETTE.sky} }; }) },
        { name: 'Perempuan', type: 'bar', stack: 'gender', barMaxWidth: 40,
          data: female.map(function(v){ return { value:v, itemStyle:{color:PALETTE.rose,borderRadius:[4,4,0,0]} }; }) },
      ],
    }, true);
  }

  /* ─── Chart Spatial: Provinsi & Kabupaten ───────────────────────── */
  function _renderHorizBar(id, data, field, color, truncLen) {
    var chart = _getInstance(id);
    if (!chart) return;
    var top    = DataService.topN(data, field, 8);
    var names  = top.map(function(d) { return _truncate(d.name, truncLen); }).reverse();
    var counts = top.map(function(d) { return d.count; }).reverse();
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 12 } },
      grid: { left: 8, right: 28, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: '#1e293b' } }, axisLabel: BASE_TEXT },
      yAxis: { type: 'category', data: names,
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        axisLine: { lineStyle: { color: '#334155' } }, axisTick: { show: false } },
      series: [{ type: 'bar', barMaxWidth: 16,
        data: counts.map(function(v) { return { value: v, itemStyle: { color: color, borderRadius: [0,4,4,0] } }; }),
        label: { show: true, position: 'right', color: '#94a3b8', fontSize: 10 } }],
    }, true);
  }

  /* ─── PUBLIC API ─────────────────────────────────────────────────── */

  /** Render semua chart halaman Overview (hanya ini yang dipanggil saat load) */
  function renderAll(data) {
    renderCohortChart(data);
    renderProvinceChart(data);
    renderRegencyChart(data);
    renderGenderChart(data);
    renderAdmissionChart(data);
  }

  /** Render chart halaman Profile — dipanggil saat navigate ke halaman Profile */
  function renderProfileCharts(data) {
    var c1 = _getInstance('chart-gender-p');
    var c2 = _getInstance('chart-admission-p');
    var c3 = _getInstance('chart-status-p');
    var c4 = _getInstance('chart-school-p');
    if (c1) _renderDonutGender(c1, data);
    if (c2) _renderDonutAdmission(c2, data);
    renderStatusChart('chart-status-p', data);
    renderSchoolChart('chart-school-p', data);
  }

  /** Render chart halaman Spatial — dipanggil saat navigate ke halaman Spatial */
  function renderSpatialCharts(data) {
    _renderHorizBar('chart-province-s', data, 'province', PALETTE.sky,  18);
    _renderHorizBar('chart-regency-s',  data, 'regency',  PALETTE.teal, 16);
  }

  /** Render chart halaman Cohort — dipanggil saat navigate ke halaman Cohort */
  function renderCohortCharts(allData) {
    renderCohortCompare('chart-cohort-compare', allData);
    renderCohortGender('chart-cohort-gender',   allData);
  }

  /** Resize hanya chart yang sedang visible */
  function resizeAll() {
    Object.keys(_instances).forEach(function(id) {
      var el = document.getElementById(id);
      if (el && el.offsetWidth > 0 && el.offsetHeight > 0) {
        try { _instances[id].resize(); } catch(e) { /* abaikan */ }
      }
    });
  }

  return {
    renderAll:          renderAll,
    renderProfileCharts: renderProfileCharts,
    renderSpatialCharts: renderSpatialCharts,
    renderCohortCharts:  renderCohortCharts,
    resizeAll:           resizeAll,
  };

})();
