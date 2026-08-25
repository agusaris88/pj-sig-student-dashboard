/**
 * data.js — PJ-SIG Student Spatial Dashboard
 * Mendukung field: latitude/longitude (baru) DAN lat/lon (lama)
 */

var DataService = (function() {

  var _students = [];
  var _loaded   = false;

  function load() {
    if (_loaded) {
      console.log('[DATA] Sudah dimuat, skip fetch.');
      return Promise.resolve(_students);
    }

    console.log('[DATA] Fetch: ./data/students.json');

    return fetch('./data/students.json')
      .then(function(res) {
        console.log('[DATA] HTTP status:', res.status);
        if (!res.ok) {
          if (res.status === 404) throw new Error(
            'File data/students.json tidak ditemukan (HTTP 404). ' +
            'Pastikan file ada di folder data/ di repository GitHub.'
          );
          throw new Error('HTTP ' + res.status + ' — gagal memuat data.');
        }
        return res.json();
      })
      .then(function(raw) {
        if (!Array.isArray(raw)) throw new Error(
          'students.json bukan array. Periksa format file JSON.'
        );

        /* Normalisasi koordinat */
        _students = raw.map(function(s, i) {
          var lat = s.latitude  != null ? s.latitude  :
                    s.lat       != null ? s.lat       : null;
          var lon = s.longitude != null ? s.longitude :
                    s.lon       != null ? s.lon       : null;
          if (lat == null) console.warn('[DATA] Record ke-' + i + ' tidak ada koordinat');
          var r = {};
          for (var k in s) r[k] = s[k];
          r.lat = lat; r.lon = lon;
          r.latitude = lat; r.longitude = lon;
          return r;
        });

        _loaded = true;
        console.log('[DATA] Dimuat:', _students.length, 'records.');

        /* Log distribusi angkatan */
        var byC = {};
        _students.forEach(function(s){ byC[s.cohort] = (byC[s.cohort]||0)+1; });
        console.log('[DATA] Angkatan:', JSON.stringify(byC));

        return _students;
      });
  }

  function getAll() { return _students; }

  function getUniqueValues(field) {
    var seen = {}, out = [];
    _students.forEach(function(s) {
      var v = s[field];
      if (v != null && v !== '' && !seen[String(v)]) { seen[String(v)]=1; out.push(v); }
    });
    return out.sort(function(a,b){
      return typeof a==='number' ? a-b : String(a).localeCompare(String(b));
    });
  }

  function getSummary(data) {
    var src = Array.isArray(data) ? data : _students;
    return {
      total:     src.length,
      active:    src.filter(function(s){return s.status==='Aktif';}).length,
      cohorts:   uniq(src,'cohort').sort(),
      provinces: uniq(src,'province').length,
      regencies: uniq(src,'regency').length,
      schools:   uniq(src,'school').length,
    };
  }

  function uniq(arr, field) {
    var seen={}, out=[];
    arr.forEach(function(s){var v=s[field]; if(v!=null&&!seen[v]){seen[v]=1;out.push(v);}});
    return out;
  }

  function countBy(data, field) {
    var out = {};
    (Array.isArray(data)?data:[]).forEach(function(s){
      var k = (s[field]!=null&&s[field]!=='') ? String(s[field]) : 'Tidak Diketahui';
      out[k] = (out[k]||0)+1;
    });
    return out;
  }

  function topN(data, field, n) {
    return Object.entries(countBy(data,field))
      .sort(function(a,b){return b[1]-a[1];})
      .slice(0,n||10)
      .map(function(e){return {name:e[0],count:e[1]};});
  }

  return {load:load, getAll:getAll, getUniqueValues:getUniqueValues,
          getSummary:getSummary, countBy:countBy, topN:topN};
})();
