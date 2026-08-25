/**
 * map.js — PJ-SIG Student Spatial Dashboard
 *
 * Tiga mode visualisasi:
 *   point   → CircleMarker per mahasiswa, warna per angkatan, popup detail
 *   cluster → MarkerClusterGroup, badge jumlah, popup detail
 *   heatmap → Leaflet.heat, gradient density biru→kuning→merah
 *
 * Fitur tambahan:
 *   zoom control (tombol +/−)
 *   pan (drag peta)
 *   scale bar (km)
 *   legend (otomatis berubah sesuai mode)
 *   reset map (kembali ke center Indonesia/Sulawesi)
 *
 * Semua data berasal dari parameter render(data) — tidak fetch sendiri.
 * Filter cohort/province/regency dihandle di luar modul ini.
 */

var MapService = (function() {

  /* ── Konstanta ────────────────────────────────────────── */
  var CENTER       = [-2.5, 120.5];
  var DEFAULT_ZOOM = 6;

  /* Warna per angkatan untuk mode point & cluster */
  var COHORT_COLOR = {
    2024: { fill: '#38bdf8', border: '#0369a1' },
    2025: { fill: '#2dd4bf', border: '#0f766e' },
    2026: { fill: '#a78bfa', border: '#6d28d9' },
  };
  var DEFAULT_COLOR = { fill: '#94a3b8', border: '#475569' };

  /* Gradient heatmap: rendah=biru, sedang=kuning, tinggi=merah */
  var HEAT_GRADIENT = { 0.0: '#1e3a5f', 0.3: '#0ea5e9', 0.6: '#f59e0b', 1.0: '#ef4444' };

  /* ── State internal ───────────────────────────────────── */
  var _map         = null;
  var _activeLayer = null;   /* layer yang sedang tampil */
  var _legendCtrl  = null;
  var _mode        = 'heatmap';
  var _lastData    = [];     /* cache data terfilter terakhir */

  /* ── INIT ─────────────────────────────────────────────── */
  function init(containerId) {
    if (_map) return; /* idempotent — cegah double-init */

    _map = L.map(containerId, {
      center:      CENTER,
      zoom:        DEFAULT_ZOOM,
      zoomControl: false,    /* kita buat sendiri di posisi bottomright */
      minZoom:     4,
      maxZoom:     18,
    });

    /* Basemap OpenStreetMap — gratis, no API key */
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(_map);

    /* Zoom control di kanan bawah */
    L.control.zoom({ position: 'bottomright' }).addTo(_map);

    /* Scale bar di kiri bawah (metric) */
    L.control.scale({ imperial: false, position: 'bottomleft', maxWidth: 120 }).addTo(_map);

    /* Legend */
    _buildLegend();

    /* Tombol Reset View (custom control di kanan atas) */
    _buildResetControl();

    /* Bind tombol mode [data-map-mode] */
    _bindModeButtons();
  }

  /* ── KONTROL RESET VIEW ───────────────────────────────── */
  function _buildResetControl() {
    var ResetCtrl = L.Control.extend({
      options: { position: 'topright' },
      onAdd: function() {
        var btn = L.DomUtil.create('button', 'map-ctrl-reset');
        btn.innerHTML  = '&#8635; Reset';
        btn.title      = 'Reset tampilan peta';
        btn.setAttribute('aria-label', 'Reset tampilan peta');
        L.DomEvent.disableClickPropagation(btn);
        L.DomEvent.on(btn, 'click', resetView);
        return btn;
      },
    });
    new ResetCtrl().addTo(_map);
  }

  /* ── LEGEND ───────────────────────────────────────────── */
  function _buildLegend() {
    var LegendCtrl = L.Control.extend({
      options: { position: 'bottomright' },
      onAdd: function() {
        var div = L.DomUtil.create('div', 'map-legend');
        div.id = 'map-legend';
        div.innerHTML = _legendHTML(_mode);
        return div;
      },
    });
    _legendCtrl = new LegendCtrl();
    _legendCtrl.addTo(_map);
  }

  function _legendHTML(mode) {
    if (mode === 'heatmap') {
      return '<div class="legend-title">Kepadatan</div>' +
             '<div class="legend-heat-bar"></div>' +
             '<div class="legend-heat-labels"><span>Rendah</span><span>Tinggi</span></div>';
    }
    /* Point / Cluster: warna per angkatan */
    var rows = '';
    var cohorts = [2024, 2025, 2026];
    cohorts.forEach(function(yr) {
      var col = COHORT_COLOR[yr] || DEFAULT_COLOR;
      rows += '<div class="legend-row">' +
              '<span class="legend-dot" style="background:' + col.fill + ';border-color:' + col.border + '"></span>' +
              '<span>Angkatan ' + yr + '</span></div>';
    });
    rows += '<div class="legend-row">' +
            '<span class="legend-dot" style="background:' + DEFAULT_COLOR.fill + ';border-color:' + DEFAULT_COLOR.border + '"></span>' +
            '<span>Lainnya</span></div>';
    return '<div class="legend-title">Angkatan</div>' + rows;
  }

  function _updateLegend(mode) {
    var el = document.getElementById('map-legend');
    if (el) el.innerHTML = _legendHTML(mode);
  }

  /* ── TOMBOL MODE ──────────────────────────────────────── */
  function _bindModeButtons() {
    /* Gunakan event delegation — aman untuk button yang ada di DOM */
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-map-mode]');
      if (!btn) return;

      var newMode = btn.dataset.mapMode;
      if (!newMode || newMode === _mode) return;

      /* Update tombol aktif */
      document.querySelectorAll('[data-map-mode]').forEach(function(b) {
        b.classList.toggle('map-btn-active', b.dataset.mapMode === newMode);
      });

      _mode = newMode;
      _updateLegend(newMode);

      /* Re-render dengan data terakhir */
      _render(_lastData);
    });

    /* Set heatmap sebagai default aktif */
    document.querySelectorAll('[data-map-mode="heatmap"]').forEach(function(b) {
      b.classList.add('map-btn-active');
    });
  }

  /* ── RENDER ───────────────────────────────────────────── */
  function render(data) {
    _lastData = data || [];
    _render(_lastData);
  }

  function _render(data) {
    _clearActive();

    var notice = document.getElementById('map-empty-notice');

    if (!data || data.length === 0) {
      if (notice) notice.style.display = 'flex';
      return;
    }
    if (notice) notice.style.display = 'none';

    if (_mode === 'point')   { _renderPoint(data);   return; }
    if (_mode === 'cluster') { _renderCluster(data); return; }
    _renderHeatmap(data); /* default */
  }

  function _clearActive() {
    if (_activeLayer) {
      _map.removeLayer(_activeLayer);
      _activeLayer = null;
    }
  }

  /* ── MODE: POINT ──────────────────────────────────────── */
  function _renderPoint(data) {
    var group = L.layerGroup();

    data.forEach(function(s) {
      var coord = _coord(s);
      if (!coord) return;

      var col = COHORT_COLOR[s.cohort] || DEFAULT_COLOR;

      var circle = L.circleMarker(coord, {
        radius:      7,
        fillColor:   col.fill,
        color:       col.border,
        weight:      1.5,
        opacity:     1,
        fillOpacity: 0.85,
      });

      circle.bindPopup(_buildPopup(s), { maxWidth: 270 });
      circle.bindTooltip(
        '<b>' + (s.regency || '') + '</b> &middot; ' + s.cohort,
        { direction: 'top', offset: [0, -8] }
      );
      group.addLayer(circle);
    });

    _activeLayer = group;
    group.addTo(_map);
  }

  /* ── MODE: CLUSTER ────────────────────────────────────── */
  function _renderCluster(data) {
    var group = L.markerClusterGroup({
      showCoverageOnHover:  false,
      zoomToBoundsOnClick:  true,
      maxClusterRadius:     55,
      chunkedLoading:       true,
      iconCreateFunction:   _clusterIcon,
    });

    data.forEach(function(s) {
      var coord = _coord(s);
      if (!coord) return;

      var col  = COHORT_COLOR[s.cohort] || DEFAULT_COLOR;
      var icon = L.divIcon({
        html:      '<div class="pt-dot" style="background:' + col.fill + ';border-color:' + col.border + '"></div>',
        className: '',
        iconSize:  [12, 12],
        iconAnchor:[6, 6],
      });

      var marker = L.marker(coord, { icon: icon });
      marker.bindPopup(_buildPopup(s), { maxWidth: 270 });
      marker.bindTooltip(
        '<b>' + (s.regency || '') + '</b> &middot; ' + s.cohort,
        { direction: 'top', offset: [0, -8] }
      );
      group.addLayer(marker);
    });

    _activeLayer = group;
    group.addTo(_map);
  }

  function _clusterIcon(cluster) {
    var n    = cluster.getChildCount();
    var size = n < 10 ? 32 : n < 50 ? 40 : n < 100 ? 48 : 56;
    var bg   = n < 10 ? '#0ea5e9' : n < 50 ? '#14b8a6' : n < 100 ? '#f59e0b' : '#ef4444';
    return L.divIcon({
      html:      '<div class="cl-icon" style="width:' + size + 'px;height:' + size + 'px;line-height:' + size + 'px;background:' + bg + '">' + n + '</div>',
      className: '',
      iconSize:  [size, size],
      iconAnchor:[Math.round(size/2), Math.round(size/2)],
    });
  }

  /* ── MODE: HEATMAP ────────────────────────────────────── */
  function _renderHeatmap(data) {
    var points = [];
    data.forEach(function(s) {
      var coord = _coord(s);
      if (coord) points.push([coord[0], coord[1], 1]);
    });

    _activeLayer = L.heatLayer(points, {
      radius:   30,
      blur:     22,
      maxZoom:  11,
      max:      1.0,
      gradient: HEAT_GRADIENT,
    });
    _activeLayer.addTo(_map);
  }

  /* ── POPUP ────────────────────────────────────────────── */
  function _buildPopup(s) {
    var genderLabel = s.gender === 'L' ? 'Laki-laki' : 'Perempuan';
    var stClass     = s.status === 'Aktif' ? 'st-aktif' :
                      s.status === 'Lulus' ? 'st-lulus' : 'st-cuti';
    return '<div class="pp-wrap">' +
      '<div class="pp-head">' +
        '<span class="pp-cohort">Angkatan ' + s.cohort + '</span>' +
        '<span class="pp-status ' + stClass + '">' + (s.status || '—') + '</span>' +
      '</div>' +
      '<table class="pp-table">' +
        '<tr><td>Kabupaten</td><td>' + (s.regency   || '—') + '</td></tr>' +
        '<tr><td>Provinsi</td><td>'  + (s.province  || '—') + '</td></tr>' +
        '<tr><td>Kecamatan</td><td>' + (s.district  || '—') + '</td></tr>' +
        '<tr><td>Sekolah</td><td>'   + (s.school    || '—') + '</td></tr>' +
        '<tr><td>Jalur</td><td>'     + (s.admission_path || '—') + '</td></tr>' +
        '<tr><td>Gender</td><td>'    + genderLabel + '</td></tr>' +
      '</table>' +
    '</div>';
  }

  /* ── COORD HELPER ─────────────────────────────────────── */
  /* Mendukung latitude/longitude (baru) DAN lat/lon (lama) */
  function _coord(s) {
    var lat = s.latitude  != null ? s.latitude  : s.lat;
    var lon = s.longitude != null ? s.longitude : s.lon;
    if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) return null;
    return [lat, lon];
  }

  /* ── RESET VIEW ───────────────────────────────────────── */
  function resetView() {
    if (_map) _map.setView(CENTER, DEFAULT_ZOOM);
  }

  /* ── FIT BOUNDS ───────────────────────────────────────── */
  function fitToData(data) {
    if (!_map || !data || data.length === 0) return;
    var coords = data.map(_coord).filter(Boolean);
    if (coords.length === 0) return;
    _map.fitBounds(L.latLngBounds(coords), { padding: [40, 40], maxZoom: 10 });
  }

  /* ── PUBLIC API ───────────────────────────────────────── */
  return {
    init:       init,
    render:     render,
    resetView:  resetView,
    fitToData:  fitToData,
  };

})();
