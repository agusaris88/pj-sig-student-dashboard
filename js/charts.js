/**
 * charts.js — PJ-SIG Student Spatial Dashboard
 * PERBAIKAN: renderer:'canvas', guard offsetWidth=0, resizeAll hanya visible
 */

var ChartService = (function() {

  var _instances = {};

  var PALETTE = {
    teal:'#14b8a6', sky:'#38bdf8', indigo:'#818cf8',
    amber:'#fbbf24', coral:'#fb923c', rose:'#fb7185', slate:'#94a3b8',
  };
  var COHORT_COLORS = ['#38bdf8','#14b8a6','#818cf8','#fbbf24'];
  var BASE = { color:'#94a3b8', fontFamily:'Inter,system-ui,sans-serif', fontSize:11 };

  /* ── Core: skip jika container belum visible ─────────────── */
  function _get(id) {
    var el = document.getElementById(id);
    if (!el) return null;
    if (el.offsetWidth === 0 || el.offsetHeight === 0) return null; /* ← GUARD */
    if (!_instances[id]) {
      _instances[id] = echarts.init(el, null, { renderer: 'canvas' }); /* ← CANVAS */
    }
    return _instances[id];
  }

  function _trunc(s, n) { return s && s.length>n ? s.slice(0,n-1)+'\u2026' : (s||''); }

  /* ── Bar horizontal helper ───────────────────────────────── */
  function _horizBar(id, data, field, color, tn) {
    var chart = _get(id); if (!chart) return;
    var top    = DataService.topN(data, field, 8);
    var names  = top.map(function(d){return _trunc(d.name,tn);}).reverse();
    var counts = top.map(function(d){return d.count;}).reverse();
    chart.setOption({
      backgroundColor:'transparent',
      tooltip:{trigger:'axis',backgroundColor:'#1e293b',borderColor:'#334155',textStyle:{color:'#e2e8f0',fontSize:12}},
      grid:{left:8,right:28,top:8,bottom:8,containLabel:true},
      xAxis:{type:'value',splitLine:{lineStyle:{color:'#1e293b'}},axisLabel:BASE},
      yAxis:{type:'category',data:names,axisLabel:{color:'#94a3b8',fontSize:10},axisLine:{lineStyle:{color:'#334155'}},axisTick:{show:false}},
      series:[{type:'bar',barMaxWidth:16,
        data:counts.map(function(v){return{value:v,itemStyle:{color:color,borderRadius:[0,4,4,0]}};}),
        label:{show:true,position:'right',color:'#94a3b8',fontSize:10}}],
    }, true);
  }

  /* ── Donut helper ────────────────────────────────────────── */
  function _donut(chart, seriesData, showCenter, centerNum) {
    var opt = {
      backgroundColor:'transparent',
      tooltip:{trigger:'item',backgroundColor:'#1e293b',borderColor:'#334155',textStyle:{color:'#e2e8f0',fontSize:12}},
      legend:{bottom:4,textStyle:{color:'#94a3b8',fontSize:11}},
      series:[{type:'pie',radius:['48%','68%'],center:['50%','42%'],
        data:seriesData, label:{show:false}, emphasis:{scale:false}}],
    };
    if (showCenter) {
      opt.graphic = [
        {type:'text',left:'center',top:'36%',style:{text:String(centerNum),fill:'#e2e8f0',fontSize:22,fontWeight:'600',fontFamily:'Inter'}},
        {type:'text',left:'center',top:'50%',style:{text:'mahasiswa',fill:'#64748b',fontSize:10,fontFamily:'Inter'}},
      ];
    }
    chart.setOption(opt, true);
  }

  /* ── Overview charts ─────────────────────────────────────── */
  function renderCohortChart(data) {
    var chart = _get('chart-cohort'); if (!chart) return;
    var cohorts=[]; var seen={};
    data.forEach(function(s){if(!seen[s.cohort]){seen[s.cohort]=1;cohorts.push(s.cohort);}});
    cohorts.sort();
    var counts=cohorts.map(function(c){return data.filter(function(s){return s.cohort===c;}).length;});
    chart.setOption({
      backgroundColor:'transparent',
      tooltip:{trigger:'axis',backgroundColor:'#1e293b',borderColor:'#334155',textStyle:{color:'#e2e8f0',fontSize:12}},
      grid:{left:10,right:10,top:12,bottom:24,containLabel:true},
      xAxis:{type:'category',data:cohorts,axisLabel:{color:'#94a3b8',fontSize:11},axisLine:{lineStyle:{color:'#334155'}},axisTick:{show:false}},
      yAxis:{type:'value',splitLine:{lineStyle:{color:'#1e293b'}},axisLabel:BASE},
      series:[{type:'bar',
        data:counts.map(function(v,i){return{value:v,itemStyle:{color:COHORT_COLORS[i%COHORT_COLORS.length],borderRadius:[4,4,0,0]}};}),
        label:{show:true,position:'top',color:'#94a3b8',fontSize:11}}],
    }, true);
  }

  function renderProvinceChart(data) { _horizBar('chart-province', data,'province',PALETTE.sky, 18); }
  function renderRegencyChart(data)  { _horizBar('chart-regency',  data,'regency', PALETTE.teal,16); }

  function renderGenderChart(data) {
    var chart = _get('chart-gender'); if (!chart) return;
    var m=data.filter(function(s){return s.gender==='L';}).length;
    var f=data.filter(function(s){return s.gender==='P';}).length;
    _donut(chart,[
      {name:'Laki-laki',value:m,itemStyle:{color:PALETTE.sky}},
      {name:'Perempuan',value:f,itemStyle:{color:PALETTE.rose}},
    ], true, data.length);
  }

  function renderAdmissionChart(data) {
    var chart = _get('chart-admission'); if (!chart) return;
    var counts = DataService.countBy(data,'admission_path');
    var pal=[PALETTE.teal,PALETTE.indigo,PALETTE.amber,PALETTE.coral,PALETTE.slate];
    var series=Object.keys(counts).map(function(name,i){
      return{name:name,value:counts[name],itemStyle:{color:pal[i%pal.length]}};
    });
    _donut(chart, series, false, 0);
  }

  /* ── Profile charts ──────────────────────────────────────── */
  function renderProfileCharts(data) {
    /* Gender */
    var cg = _get('chart-gender-p');
    if (cg) {
      var m=data.filter(function(s){return s.gender==='L';}).length;
      var f=data.filter(function(s){return s.gender==='P';}).length;
      _donut(cg,[{name:'Laki-laki',value:m,itemStyle:{color:PALETTE.sky}},{name:'Perempuan',value:f,itemStyle:{color:PALETTE.rose}}],true,data.length);
    }
    /* Admission */
    var ca = _get('chart-admission-p');
    if (ca) {
      var counts=DataService.countBy(data,'admission_path');
      var pal=[PALETTE.teal,PALETTE.indigo,PALETTE.amber,PALETTE.coral,PALETTE.slate];
      _donut(ca,Object.keys(counts).map(function(n,i){return{name:n,value:counts[n],itemStyle:{color:pal[i%pal.length]}};}),false,0);
    }
    /* Status */
    var cs = _get('chart-status-p');
    if (cs) {
      var sc=DataService.countBy(data,'status');
      var scol={'Aktif':PALETTE.teal,'Cuti':PALETTE.amber,'Lulus':PALETTE.indigo};
      _donut(cs,Object.keys(sc).map(function(n){return{name:n,value:sc[n],itemStyle:{color:scol[n]||PALETTE.slate}};}),false,0);
    }
    /* School */
    _horizBar('chart-school-p', data,'school',PALETTE.indigo,20);
  }

  /* ── Spatial charts ──────────────────────────────────────── */
  function renderSpatialCharts(data) {
    _horizBar('chart-province-s', data,'province',PALETTE.sky, 18);
    _horizBar('chart-regency-s',  data,'regency', PALETTE.teal,16);
  }

  /* ── Cohort charts ───────────────────────────────────────── */
  function renderCohortCharts(allData) {
    /* Compare */
    var cc = _get('chart-cohort-compare');
    if (cc) {
      var cohorts=[]; var seen={};
      allData.forEach(function(s){if(!seen[s.cohort]){seen[s.cohort]=1;cohorts.push(s.cohort);}});
      cohorts.sort();
      var totals=cohorts.map(function(c){return allData.filter(function(s){return s.cohort===c;}).length;});
      var active=cohorts.map(function(c){return allData.filter(function(s){return s.cohort===c&&s.status==='Aktif';}).length;});
      cc.setOption({
        backgroundColor:'transparent',
        tooltip:{trigger:'axis',backgroundColor:'#1e293b',borderColor:'#334155',textStyle:{color:'#e2e8f0',fontSize:12}},
        legend:{bottom:4,textStyle:{color:'#94a3b8',fontSize:11}},
        grid:{left:10,right:10,top:12,bottom:36,containLabel:true},
        xAxis:{type:'category',data:cohorts,axisLabel:BASE,axisLine:{lineStyle:{color:'#334155'}},axisTick:{show:false}},
        yAxis:{type:'value',splitLine:{lineStyle:{color:'#1e293b'}},axisLabel:BASE},
        series:[
          {name:'Total',type:'bar',data:totals.map(function(v,i){return{value:v,itemStyle:{color:COHORT_COLORS[i%COHORT_COLORS.length],borderRadius:[4,4,0,0]}}; })},
          {name:'Aktif', type:'bar',data:active.map(function(v){return{value:v,itemStyle:{color:PALETTE.teal,borderRadius:[4,4,0,0]}}; })},
        ],
      }, true);
    }
    /* Gender per cohort */
    var cg = _get('chart-cohort-gender');
    if (cg) {
      var cohorts2=[]; var seen2={};
      allData.forEach(function(s){if(!seen2[s.cohort]){seen2[s.cohort]=1;cohorts2.push(s.cohort);}});
      cohorts2.sort();
      var male  =cohorts2.map(function(c){return allData.filter(function(s){return s.cohort===c&&s.gender==='L';}).length;});
      var female=cohorts2.map(function(c){return allData.filter(function(s){return s.cohort===c&&s.gender==='P';}).length;});
      cg.setOption({
        backgroundColor:'transparent',
        tooltip:{trigger:'axis',backgroundColor:'#1e293b',borderColor:'#334155',textStyle:{color:'#e2e8f0',fontSize:12}},
        legend:{bottom:4,textStyle:{color:'#94a3b8',fontSize:11}},
        grid:{left:10,right:10,top:12,bottom:36,containLabel:true},
        xAxis:{type:'category',data:cohorts2,axisLabel:BASE,axisLine:{lineStyle:{color:'#334155'}},axisTick:{show:false}},
        yAxis:{type:'value',splitLine:{lineStyle:{color:'#1e293b'}},axisLabel:BASE},
        series:[
          {name:'Laki-laki',type:'bar',stack:'g',barMaxWidth:40,data:male.map(function(v){return{value:v,itemStyle:{color:PALETTE.sky}};})},
          {name:'Perempuan',type:'bar',stack:'g',barMaxWidth:40,data:female.map(function(v){return{value:v,itemStyle:{color:PALETTE.rose,borderRadius:[4,4,0,0]}};})},
        ],
      }, true);
    }
  }

  /* ── renderAll (Overview saja) ───────────────────────────── */
  function renderAll(data) {
    renderCohortChart(data);
    renderProvinceChart(data);
    renderRegencyChart(data);
    renderGenderChart(data);
    renderAdmissionChart(data);
  }

  /* ── resizeAll: hanya yang visible ──────────────────────── */
  function resizeAll() {
    Object.keys(_instances).forEach(function(id) {
      var el = document.getElementById(id);
      if (el && el.offsetWidth > 0 && el.offsetHeight > 0) {
        try { _instances[id].resize(); } catch(e) {}
      }
    });
  }

  return {
    renderAll:renderAll,
    renderProfileCharts:renderProfileCharts,
    renderSpatialCharts:renderSpatialCharts,
    renderCohortCharts:renderCohortCharts,
    resizeAll:resizeAll,
  };
})();
