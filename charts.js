/**
 * charts.js
 * Mengelola semua instansi Apache ECharts.
 * Setiap fungsi render menerima data terfilter dan menggambar ulang chart.
 */

const ChartService = (() => {
  const _instances = {};

  const PALETTE = {
    teal:   '#14b8a6',
    sky:    '#38bdf8',
    indigo: '#818cf8',
    amber:  '#fbbf24',
    coral:  '#fb923c',
    rose:   '#fb7185',
    slate:  '#94a3b8',
  };

  const COHORT_COLORS = ['#38bdf8', '#14b8a6', '#818cf8', '#fbbf24'];

  const BASE_TEXT = {
    color: '#94a3b8',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 11,
  };

  function _getInstance(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    if (!_instances[id]) {
      _instances[id] = echarts.init(el, null, { renderer: 'svg' });
    }
    return _instances[id];
  }

  /** Chart 1 — Mahasiswa per Angkatan (Bar) */
  function renderCohortChart(data) {
    const chart = _getInstance('chart-cohort');
    if (!chart) return;

    const cohorts = [...new Set(data.map(s => s.cohort))].sort();
    const counts = cohorts.map(c => data.filter(s => s.cohort === c).length);

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e293b',
        borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: params => `<b>Angkatan ${params[0].name}</b><br/>${params[0].value} mahasiswa`,
      },
      grid: { left: 10, right: 10, top: 12, bottom: 24, containLabel: true },
      xAxis: {
        type: 'category',
        data: cohorts,
        axisLabel: { ...BASE_TEXT, formatter: v => `'${String(v).slice(2)}` },
        axisLine: { lineStyle: { color: '#334155' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: BASE_TEXT,
      },
      series: [{
        type: 'bar',
        data: counts.map((v, i) => ({ value: v, itemStyle: { color: COHORT_COLORS[i % COHORT_COLORS.length], borderRadius: [4, 4, 0, 0] } })),
        label: { show: true, position: 'top', color: '#94a3b8', fontSize: 11 },
      }],
    }, true);
  }

  /** Chart 2 — Mahasiswa per Provinsi (Bar Horizontal) */
  function renderProvinceChart(data) {
    const chart = _getInstance('chart-province');
    if (!chart) return;

    const top = DataService.topN(data, 'province', 8);
    const names = top.map(d => _truncate(d.name, 18)).reverse();
    const counts = top.map(d => d.count).reverse();

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e293b',
        borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: params => `<b>${top[top.length - 1 - params[0].dataIndex]?.name}</b><br/>${params[0].value} mahasiswa`,
      },
      grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: BASE_TEXT,
      },
      yAxis: {
        type: 'category',
        data: names,
        axisLabel: { ...BASE_TEXT, fontSize: 10 },
        axisLine: { lineStyle: { color: '#334155' } },
        axisTick: { show: false },
      },
      series: [{
        type: 'bar',
        data: counts.map(v => ({ value: v, itemStyle: { color: PALETTE.sky, borderRadius: [0, 4, 4, 0] } })),
        label: { show: true, position: 'right', color: '#94a3b8', fontSize: 10 },
        barMaxWidth: 16,
      }],
    }, true);
  }

  /** Chart 3 — Top Kabupaten/Kota (Bar Horizontal) */
  function renderRegencyChart(data) {
    const chart = _getInstance('chart-regency');
    if (!chart) return;

    const top = DataService.topN(data, 'regency', 8);
    const names = top.map(d => _truncate(d.name, 16)).reverse();
    const counts = top.map(d => d.count).reverse();

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e293b',
        borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: params => `<b>${top[top.length - 1 - params[0].dataIndex]?.name}</b><br/>${params[0].value} mahasiswa`,
      },
      grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: BASE_TEXT,
      },
      yAxis: {
        type: 'category',
        data: names,
        axisLabel: { ...BASE_TEXT, fontSize: 10 },
        axisLine: { lineStyle: { color: '#334155' } },
        axisTick: { show: false },
      },
      series: [{
        type: 'bar',
        data: counts.map(v => ({ value: v, itemStyle: { color: PALETTE.teal, borderRadius: [0, 4, 4, 0] } })),
        label: { show: true, position: 'right', color: '#94a3b8', fontSize: 10 },
        barMaxWidth: 16,
      }],
    }, true);
  }

  /** Chart 4 — Gender (Donut) */
  function renderGenderChart(data) {
    const chart = _getInstance('chart-gender');
    if (!chart) return;

    const male   = data.filter(s => s.gender === 'L').length;
    const female = data.filter(s => s.gender === 'P').length;
    const total  = data.length;

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#1e293b',
        borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: p => `<b>${p.name}</b><br/>${p.value} (${p.percent}%)`,
      },
      legend: {
        bottom: 4,
        textStyle: { color: '#94a3b8', fontSize: 11 },
      },
      graphic: [{
        type: 'text',
        left: 'center',
        top: '36%',
        style: { text: total, fill: '#e2e8f0', fontSize: 22, fontWeight: 600, fontFamily: 'Inter' },
      }, {
        type: 'text',
        left: 'center',
        top: '50%',
        style: { text: 'mahasiswa', fill: '#64748b', fontSize: 10, fontFamily: 'Inter' },
      }],
      series: [{
        type: 'pie',
        radius: ['48%', '68%'],
        center: ['50%', '42%'],
        data: [
          { name: 'Laki-laki', value: male, itemStyle: { color: PALETTE.sky } },
          { name: 'Perempuan', value: female, itemStyle: { color: PALETTE.rose } },
        ],
        label: { show: false },
        emphasis: { scale: false, itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.3)' } },
      }],
    }, true);
  }

  /** Chart 5 — Jalur Masuk (Donut) */
  function renderAdmissionChart(data) {
    const chart = _getInstance('chart-admission');
    if (!chart) return;

    const counts = DataService.countBy(data, 'admission_path');
    const palette = [PALETTE.teal, PALETTE.indigo, PALETTE.amber, PALETTE.coral, PALETTE.slate];
    const series = Object.entries(counts).map(([name, value], i) => ({
      name, value, itemStyle: { color: palette[i % palette.length] },
    }));

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#1e293b',
        borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: p => `<b>${p.name}</b><br/>${p.value} (${p.percent}%)`,
      },
      legend: {
        bottom: 4,
        textStyle: { color: '#94a3b8', fontSize: 11 },
        itemWidth: 10,
        itemHeight: 10,
      },
      series: [{
        type: 'pie',
        radius: ['48%', '68%'],
        center: ['50%', '42%'],
        data: series,
        label: { show: false },
        emphasis: { scale: false },
      }],
    }, true);
  }

  /** Panggil resize semua chart (saat sidebar toggle atau resize window) */
  function resizeAll() {
    Object.values(_instances).forEach(c => c.resize());
  }

  function _truncate(str, n) {
    return str.length > n ? str.slice(0, n - 1) + '…' : str;
  }

  /** Chart — Status Mahasiswa (Donut) */
  function renderStatusChart(id, data) {
    const chart = _getInstance(id);
    if (!chart) return;
    const counts = DataService.countBy(data, 'status');
    const statusColors = { 'Aktif': PALETTE.teal, 'Cuti': PALETTE.amber, 'Lulus': PALETTE.indigo };
    const series = Object.entries(counts).map(([name, value]) => ({
      name, value, itemStyle: { color: statusColors[name] || PALETTE.slate },
    }));
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#e2e8f0', fontSize: 12 }, formatter: p => `<b>${p.name}</b><br/>${p.value} (${p.percent}%)` },
      legend: { bottom: 4, textStyle: { color: '#94a3b8', fontSize: 11 } },
      series: [{ type: 'pie', radius: ['48%', '68%'], center: ['50%', '42%'], data: series, label: { show: false }, emphasis: { scale: false } }],
    }, true);
  }

  /** Chart — Top Sekolah (Bar Horizontal) */
  function renderSchoolChart(id, data) {
    const chart = _getInstance(id);
    if (!chart) return;
    const top = DataService.topN(data, 'school', 8);
    const names = top.map(d => _truncate(d.name, 20)).reverse();
    const counts = top.map(d => d.count).reverse();
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#e2e8f0', fontSize: 12 } },
      grid: { left: 8, right: 30, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: '#1e293b' } }, axisLabel: BASE_TEXT },
      yAxis: { type: 'category', data: names, axisLabel: { ...BASE_TEXT, fontSize: 10 }, axisLine: { lineStyle: { color: '#334155' } }, axisTick: { show: false } },
      series: [{ type: 'bar', data: counts.map(v => ({ value: v, itemStyle: { color: PALETTE.indigo, borderRadius: [0, 4, 4, 0] } })), label: { show: true, position: 'right', color: '#94a3b8', fontSize: 10 }, barMaxWidth: 14 }],
    }, true);
  }

  /** Chart — Cohort Comparison grouped bar */
  function renderCohortCompare(id, allData) {
    const chart = _getInstance(id);
    if (!chart) return;
    const cohorts = [...new Set(allData.map(s => s.cohort))].sort();
    const totals  = cohorts.map(c => allData.filter(s => s.cohort === c).length);
    const active  = cohorts.map(c => allData.filter(s => s.cohort === c && s.status === 'Aktif').length);
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#e2e8f0', fontSize: 12 } },
      legend: { bottom: 4, textStyle: { color: '#94a3b8', fontSize: 11 } },
      grid: { left: 10, right: 10, top: 12, bottom: 36, containLabel: true },
      xAxis: { type: 'category', data: cohorts, axisLabel: BASE_TEXT, axisLine: { lineStyle: { color: '#334155' } }, axisTick: { show: false } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1e293b' } }, axisLabel: BASE_TEXT },
      series: [
        { name: 'Total', type: 'bar', data: totals.map((v,i) => ({ value: v, itemStyle: { color: COHORT_COLORS[i % COHORT_COLORS.length], borderRadius: [4,4,0,0] } })) },
        { name: 'Aktif', type: 'bar', data: active.map(v => ({ value: v, itemStyle: { color: PALETTE.teal, borderRadius: [4,4,0,0] } })) },
      ],
    }, true);
  }

  /** Chart — Gender per Angkatan (Stacked Bar) */
  function renderCohortGender(id, allData) {
    const chart = _getInstance(id);
    if (!chart) return;
    const cohorts = [...new Set(allData.map(s => s.cohort))].sort();
    const male   = cohorts.map(c => allData.filter(s => s.cohort === c && s.gender === 'L').length);
    const female = cohorts.map(c => allData.filter(s => s.cohort === c && s.gender === 'P').length);
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#334155', textStyle: { color: '#e2e8f0', fontSize: 12 } },
      legend: { bottom: 4, textStyle: { color: '#94a3b8', fontSize: 11 } },
      grid: { left: 10, right: 10, top: 12, bottom: 36, containLabel: true },
      xAxis: { type: 'category', data: cohorts, axisLabel: BASE_TEXT, axisLine: { lineStyle: { color: '#334155' } }, axisTick: { show: false } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1e293b' } }, axisLabel: BASE_TEXT },
      series: [
        { name: 'Laki-laki', type: 'bar', stack: 'gender', data: male.map(v => ({ value: v, itemStyle: { color: PALETTE.sky } })), barMaxWidth: 40 },
        { name: 'Perempuan', type: 'bar', stack: 'gender', data: female.map(v => ({ value: v, itemStyle: { color: PALETTE.rose, borderRadius: [4,4,0,0] } })), barMaxWidth: 40 },
      ],
    }, true);
  }

  /** Render semua chart sekaligus (halaman overview) */
  function renderAll(data) {
    renderCohortChart(data);
    renderProvinceChart(data);
    renderRegencyChart(data);
    renderGenderChart(data);
    renderAdmissionChart(data);
  }

  /** Render chart halaman Profile */
  function renderProfileCharts(data) {
    renderGenderChart_to('chart-gender-p', data);
    renderAdmissionChart_to('chart-admission-p', data);
    renderStatusChart('chart-status-p', data);
    renderSchoolChart('chart-school-p', data);
  }

  /** Render chart halaman Spatial */
  function renderSpatialCharts(data) {
    // Re-use province dan regency chart di container baru
    const cp = _getInstance('chart-province-s');
    const cr = _getInstance('chart-regency-s');
    if (cp) { const top = DataService.topN(data,'province',8); const n=top.map(d=>_truncate(d.name,18)).reverse(); const c=top.map(d=>d.count).reverse(); cp.setOption({ backgroundColor:'transparent', tooltip:{trigger:'axis',backgroundColor:'#1e293b',borderColor:'#334155',textStyle:{color:'#e2e8f0',fontSize:12}}, grid:{left:8,right:28,top:8,bottom:8,containLabel:true}, xAxis:{type:'value',splitLine:{lineStyle:{color:'#1e293b'}},axisLabel:BASE_TEXT}, yAxis:{type:'category',data:n,axisLabel:{...BASE_TEXT,fontSize:10},axisLine:{lineStyle:{color:'#334155'}},axisTick:{show:false}}, series:[{type:'bar',data:c.map(v=>({value:v,itemStyle:{color:PALETTE.sky,borderRadius:[0,4,4,0]}})),label:{show:true,position:'right',color:'#94a3b8',fontSize:10},barMaxWidth:16}] },true); }
    if (cr) { const top = DataService.topN(data,'regency',8); const n=top.map(d=>_truncate(d.name,16)).reverse(); const c=top.map(d=>d.count).reverse(); cr.setOption({ backgroundColor:'transparent', tooltip:{trigger:'axis',backgroundColor:'#1e293b',borderColor:'#334155',textStyle:{color:'#e2e8f0',fontSize:12}}, grid:{left:8,right:28,top:8,bottom:8,containLabel:true}, xAxis:{type:'value',splitLine:{lineStyle:{color:'#1e293b'}},axisLabel:BASE_TEXT}, yAxis:{type:'category',data:n,axisLabel:{...BASE_TEXT,fontSize:10},axisLine:{lineStyle:{color:'#334155'}},axisTick:{show:false}}, series:[{type:'bar',data:c.map(v=>({value:v,itemStyle:{color:PALETTE.teal,borderRadius:[0,4,4,0]}})),label:{show:true,position:'right',color:'#94a3b8',fontSize:10},barMaxWidth:16}] },true); }
  }

  /** Render chart halaman Cohort (selalu pakai allData) */
  function renderCohortCharts(allData) {
    renderCohortCompare('chart-cohort-compare', allData);
    renderCohortGender('chart-cohort-gender', allData);
  }

  /* --- internal helpers untuk render ke instance berbeda --- */
  function renderGenderChart_to(id, data) {
    const chart = _getInstance(id);
    if (!chart) return;
    const male = data.filter(s=>s.gender==='L').length;
    const female = data.filter(s=>s.gender==='P').length;
    const total = data.length;
    chart.setOption({ backgroundColor:'transparent', tooltip:{trigger:'item',backgroundColor:'#1e293b',borderColor:'#334155',textStyle:{color:'#e2e8f0',fontSize:12},formatter:p=>`<b>${p.name}</b><br/>${p.value} (${p.percent}%)`}, legend:{bottom:4,textStyle:{color:'#94a3b8',fontSize:11}}, graphic:[{type:'text',left:'center',top:'36%',style:{text:total,fill:'#e2e8f0',fontSize:22,fontWeight:600,fontFamily:'Inter'}},{type:'text',left:'center',top:'50%',style:{text:'mahasiswa',fill:'#64748b',fontSize:10,fontFamily:'Inter'}}], series:[{type:'pie',radius:['48%','68%'],center:['50%','42%'],data:[{name:'Laki-laki',value:male,itemStyle:{color:PALETTE.sky}},{name:'Perempuan',value:female,itemStyle:{color:PALETTE.rose}}],label:{show:false},emphasis:{scale:false}}] },true);
  }

  function renderAdmissionChart_to(id, data) {
    const chart = _getInstance(id);
    if (!chart) return;
    const counts = DataService.countBy(data,'admission_path');
    const palette = [PALETTE.teal,PALETTE.indigo,PALETTE.amber,PALETTE.coral,PALETTE.slate];
    const series = Object.entries(counts).map(([name,value],i)=>({name,value,itemStyle:{color:palette[i%palette.length]}}));
    chart.setOption({ backgroundColor:'transparent', tooltip:{trigger:'item',backgroundColor:'#1e293b',borderColor:'#334155',textStyle:{color:'#e2e8f0',fontSize:12},formatter:p=>`<b>${p.name}</b><br/>${p.value} (${p.percent}%)`}, legend:{bottom:4,textStyle:{color:'#94a3b8',fontSize:11},itemWidth:10,itemHeight:10}, series:[{type:'pie',radius:['48%','68%'],center:['50%','42%'],data:series,label:{show:false},emphasis:{scale:false}}] },true);
  }

  return {
    renderAll,
    renderProfileCharts,
    renderSpatialCharts,
    renderCohortCharts,
    resizeAll,
  };
})();
