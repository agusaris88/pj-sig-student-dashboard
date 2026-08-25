/**
 * map.js
 * Mengelola peta Leaflet: basemap OSM, heatmap, marker cluster, popup.
 * Menerima data terfilter dari app.js — tidak fetch sendiri.
 */

const MapService = (() => {
  let _map = null;
  let _heatLayer = null;
  let _clusterLayer = null;
  let _currentMode = 'heatmap'; // 'heatmap' | 'cluster' | 'point'

  const SULAWESI_CENTER = [-2.5, 120.5];
  const DEFAULT_ZOOM = 6;

  const COLORS = {
    marker: '#14b8a6',
    markerBorder: '#0f766e',
    cluster: '#0ea5e9',
    heatHigh: '#f97316',
  };

  function init(containerId) {
    _map = L.map(containerId, {
      center: SULAWESI_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
    });

    // Basemap OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(_map);

    // Zoom control di pojok kanan bawah
    L.control.zoom({ position: 'bottomright' }).addTo(_map);

    // Scale
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(_map);

    _bindModeButtons();
  }

  function _bindModeButtons() {
    document.querySelectorAll('[data-map-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mapMode;
        _currentMode = mode;
        document.querySelectorAll('[data-map-mode]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // Re-render dengan data terakhir — app.js akan handle
        document.dispatchEvent(new CustomEvent('map-mode-changed', { detail: mode }));
      });
    });
  }

  function _clearLayers() {
    if (_heatLayer) { _map.removeLayer(_heatLayer); _heatLayer = null; }
    if (_clusterLayer) { _map.removeLayer(_clusterLayer); _clusterLayer = null; }
  }

  function render(data) {
    _clearLayers();
    if (!data || data.length === 0) {
      _showEmptyMapNotice();
      return;
    }
    _hideEmptyMapNotice();

    switch (_currentMode) {
      case 'heatmap': _renderHeatmap(data); break;
      case 'cluster': _renderCluster(data); break;
      case 'point':   _renderPoints(data); break;
      default:        _renderHeatmap(data);
    }
  }

  function _renderHeatmap(data) {
    const points = data.map(s => [s.lat, s.lon, 1]);
    _heatLayer = L.heatLayer(points, {
      radius: 28,
      blur: 20,
      maxZoom: 10,
      max: 1.0,
      gradient: { 0.3: '#22d3ee', 0.6: '#f59e0b', 1.0: '#ef4444' },
    }).addTo(_map);
  }

  function _renderCluster(data) {
    _clusterLayer = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      iconCreateFunction: cluster => {
        const count = cluster.getChildCount();
        const size = count < 10 ? 34 : count < 50 ? 42 : 52;
        return L.divIcon({
          html: `<div class="cluster-icon" style="width:${size}px;height:${size}px;line-height:${size}px">${count}</div>`,
          className: '',
          iconSize: [size, size],
        });
      },
    });

    data.forEach(s => {
      const icon = L.divIcon({
        html: `<div class="map-marker ${s.gender === 'L' ? 'male' : 'female'}"></div>`,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const marker = L.marker([s.lat, s.lon], { icon });
      marker.bindPopup(_buildPopup(s), { maxWidth: 260 });
      _clusterLayer.addLayer(marker);
    });

    _map.addLayer(_clusterLayer);
  }

  function _renderPoints(data) {
    _clusterLayer = L.layerGroup();
    data.forEach(s => {
      const icon = L.divIcon({
        html: `<div class="map-marker ${s.gender === 'L' ? 'male' : 'female'}"></div>`,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const marker = L.marker([s.lat, s.lon], { icon });
      marker.bindPopup(_buildPopup(s), { maxWidth: 260 });
      _clusterLayer.addLayer(marker);
    });
    _clusterLayer.addTo(_map);
  }

  function _buildPopup(s) {
    const genderLabel = s.gender === 'L' ? 'Laki-laki' : 'Perempuan';
    const statusClass = s.status === 'Aktif' ? 'status-aktif' : 'status-cuti';
    return `
      <div class="map-popup">
        <div class="popup-header">
          <span class="popup-cohort">Angkatan ${s.cohort}</span>
          <span class="popup-status ${statusClass}">${s.status}</span>
        </div>
        <div class="popup-row"><span class="popup-label">Asal</span><span>${s.regency}, ${s.province}</span></div>
        <div class="popup-row"><span class="popup-label">Kecamatan</span><span>${s.district}</span></div>
        <div class="popup-row"><span class="popup-label">Sekolah</span><span>${s.school}</span></div>
        <div class="popup-row"><span class="popup-label">Jalur</span><span>${s.admission_path}</span></div>
        <div class="popup-row"><span class="popup-label">Gender</span><span>${genderLabel}</span></div>
      </div>`;
  }

  function _showEmptyMapNotice() {
    const el = document.getElementById('map-empty-notice');
    if (el) el.style.display = 'flex';
  }

  function _hideEmptyMapNotice() {
    const el = document.getElementById('map-empty-notice');
    if (el) el.style.display = 'none';
  }

  function resetView() {
    if (_map) _map.setView(SULAWESI_CENTER, DEFAULT_ZOOM);
  }

  return { init, render, resetView };
})();
