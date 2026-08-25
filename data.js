/**
 * data.js
 * Satu-satunya modul yang berinteraksi langsung dengan file JSON.
 * Modul lain tidak boleh fetch data secara mandiri.
 */

const DataService = (() => {
  let _students = [];
  let _loaded = false;

  async function load() {
    if (_loaded) return _students;
    try {
      const res = await fetch('./data/students.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      _students = await res.json();
      _loaded = true;
      return _students;
    } catch (err) {
      console.error('DataService: gagal memuat students.json', err);
      throw err;
    }
  }

  function getAll() {
    return _students;
  }

  /** Kembalikan daftar unik nilai dari field tertentu, diurutkan */
  function getUniqueValues(field) {
    const vals = [...new Set(_students.map(s => s[field]).filter(Boolean))];
    return vals.sort();
  }

  /** Ringkasan agregat seluruh dataset (sebelum filter) */
  function getSummary(data) {
    const src = data || _students;
    return {
      total: src.length,
      active: src.filter(s => s.status === 'Aktif').length,
      cohorts: [...new Set(src.map(s => s.cohort))].sort(),
      provinces: [...new Set(src.map(s => s.province))].length,
      regencies: [...new Set(src.map(s => s.regency))].length,
      schools: [...new Set(src.map(s => s.school))].length,
    };
  }

  /** Hitung frekuensi per nilai dari field tertentu */
  function countBy(data, field) {
    const counts = {};
    data.forEach(s => {
      const key = s[field] || 'Tidak Diketahui';
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }

  /** Top-N entri dari hasil countBy, diurutkan descending */
  function topN(data, field, n = 10) {
    const counts = countBy(data, field);
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([name, count]) => ({ name, count }));
  }

  return { load, getAll, getUniqueValues, getSummary, countBy, topN };
})();
