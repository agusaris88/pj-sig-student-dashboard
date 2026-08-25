/**
 * data.js — PJ-SIG Student Spatial Dashboard
 * ─────────────────────────────────────────────────────────────
 * Satu-satunya modul yang menyentuh file JSON.
 *
 * PENTING — normalisasi field koordinat:
 *   Dataset lama  → lat / lon
 *   Dataset baru  → latitude / longitude
 *   Kedua format didukung secara transparan.
 * ─────────────────────────────────────────────────────────────
 */

const DataService = (() => {

  let _students = [];
  let _loaded   = false;

  /* ── Load ────────────────────────────────────────────────── */
  async function load() {
    if (_loaded) {
      console.log('DataService: data sudah dimuat sebelumnya, skip fetch.');
      return _students;
    }

    const PATH = './data/students.json';
    console.log('DataService: memulai fetch ->', PATH);

    /* 1. Fetch */
    let response;
    try {
      response = await fetch(PATH);
    } catch (networkErr) {
      console.error('DataService: jaringan gagal - tidak dapat menjangkau', PATH, networkErr);
      throw new Error('Gagal mengambil data. Periksa koneksi internet Anda.');
    }

    /* 2. HTTP status */
    if (!response.ok) {
      console.error('DataService: server mengembalikan HTTP', response.status, 'untuk', PATH);
      if (response.status === 404) {
        throw new Error(
          'File data/students.json tidak ditemukan (HTTP 404). ' +
          'Pastikan file sudah diupload ke folder data/ di repository GitHub.'
        );
      }
      throw new Error('Data gagal dimuat (HTTP ' + response.status + '). Periksa data/students.json.');
    }
    console.log('DataService: HTTP', response.status, '- response OK');

    /* 3. Parse JSON */
    let raw;
    try {
      raw = await response.json();
    } catch (parseErr) {
      console.error('DataService: JSON parsing gagal -', parseErr);
      throw new Error(
        'File data/students.json tidak dapat dibaca sebagai JSON. ' +
        'Periksa apakah format file valid.'
      );
    }

    /* 4. Validasi array */
    if (!Array.isArray(raw)) {
      console.error('DataService: data bukan array - tipe:', typeof raw);
      throw new Error(
        'Format data/students.json tidak valid. ' +
        'Isi file harus berupa array JSON yang dimulai dengan [ dan diakhiri dengan ].'
      );
    }

    /* 5. Validasi tidak kosong */
    if (raw.length === 0) {
      console.warn('DataService: data/students.json adalah array kosong.');
    }

    /* 6. Normalisasi field koordinat */
    _students = raw.map(function(s, idx) {
      // Dukung latitude/longitude (dataset baru) DAN lat/lon (dataset lama)
      var lat = (s.latitude  != null) ? s.latitude  :
                (s.lat       != null) ? s.lat       : null;
      var lon = (s.longitude != null) ? s.longitude :
                (s.lon       != null) ? s.lon       : null;

      if (lat == null || lon == null) {
        console.warn('DataService: record [' + idx + '] tidak memiliki koordinat -',
          s.student_id || s.id || idx);
      }

      return Object.assign({}, s, {
        lat:       lat,
        lon:       lon,
        latitude:  lat,
        longitude: lon,
      });
    });

    _loaded = true;

    /* 7. Log ringkasan */
    var validCoords   = _students.filter(function(s) { return s.lat != null && s.lon != null; }).length;
    var invalidCoords = _students.length - validCoords;
    console.log(
      'DataService: student data loaded: ' + _students.length + ' records' +
      (invalidCoords > 0 ? ' (PERINGATAN: ' + invalidCoords + ' record tanpa koordinat)' : ' - semua koordinat valid')
    );

    /* 8. Log distribusi angkatan */
    var byCohort = {};
    _students.forEach(function(s) {
      byCohort[s.cohort] = (byCohort[s.cohort] || 0) + 1;
    });
    console.log('DataService: distribusi angkatan ->', JSON.stringify(byCohort));

    return _students;
  }

  /* ── Aksesor ──────────────────────────────────────────────── */
  function getAll() {
    return _students;
  }

  function getUniqueValues(field) {
    var seen = {};
    var vals = [];
    _students.forEach(function(s) {
      var v = s[field];
      if (v != null && v !== '' && !seen[v]) {
        seen[v] = true;
        vals.push(v);
      }
    });
    return vals.sort(function(a, b) {
      return typeof a === 'number' ? a - b : String(a).localeCompare(String(b));
    });
  }

  /* ── Agregasi ─────────────────────────────────────────────── */
  function getSummary(data) {
    var src = Array.isArray(data) ? data : _students;
    return {
      total:     src.length,
      active:    src.filter(function(s) { return s.status === 'Aktif'; }).length,
      cohorts:   getUniq(src, 'cohort').sort(),
      provinces: getUniq(src, 'province').length,
      regencies: getUniq(src, 'regency').length,
      schools:   getUniq(src, 'school').length,
    };
  }

  function getUniq(arr, field) {
    var seen = {}, out = [];
    arr.forEach(function(s) {
      var v = s[field];
      if (v != null && !seen[v]) { seen[v] = true; out.push(v); }
    });
    return out;
  }

  function countBy(data, field) {
    var out = {};
    (Array.isArray(data) ? data : []).forEach(function(s) {
      var k = (s[field] != null && s[field] !== '') ? s[field] : 'Tidak Diketahui';
      out[k] = (out[k] || 0) + 1;
    });
    return out;
  }

  function topN(data, field, n) {
    n = n || 10;
    return Object.entries(countBy(data, field))
      .sort(function(a, b) { return b[1] - a[1]; })
      .slice(0, n)
      .map(function(e) { return { name: e[0], count: e[1] }; });
  }

  return { load, getAll, getUniqueValues, getSummary, countBy, topN };

})();
fix: normalisasi field koordinat latitude/longitude
