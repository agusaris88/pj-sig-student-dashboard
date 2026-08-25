/**
 * filters.js
 * Mengelola state filter global dan menyediakan fungsi apply.
 * Semua visualisasi harus memanggil FilterService.apply() sebelum render.
 */

const FilterService = (() => {
  let _state = {
    cohort: 'all',
    province: 'all',
    regency: 'all',
    gender: 'all',
    admission_path: 'all',
  };

  let _onChange = null;

  function init(onChangeCb) {
    _onChange = onChangeCb;
  }

  function getState() {
    return { ..._state };
  }

  function set(key, value) {
    _state[key] = value;

    // Cascade: jika provinsi berubah, reset kabupaten
    if (key === 'province') {
      _state.regency = 'all';
      _syncRegencyDropdown();
    }

    if (_onChange) _onChange(_state);
  }

  function apply(data) {
    return data.filter(s => {
      if (_state.cohort !== 'all' && String(s.cohort) !== String(_state.cohort)) return false;
      if (_state.province !== 'all' && s.province !== _state.province) return false;
      if (_state.regency !== 'all' && s.regency !== _state.regency) return false;
      if (_state.gender !== 'all' && s.gender !== _state.gender) return false;
      if (_state.admission_path !== 'all' && s.admission_path !== _state.admission_path) return false;
      return true;
    });
  }

  function reset() {
    _state = { cohort: 'all', province: 'all', regency: 'all', gender: 'all', admission_path: 'all' };
    document.querySelectorAll('.filter-select').forEach(el => { el.value = 'all'; });
    if (_onChange) _onChange(_state);
  }

  /** Isi dropdown dari array nilai unik */
  function populateSelect(selectEl, values, allLabel = 'Semua') {
    const current = selectEl.value;
    // Pertahankan opsi pertama (All)
    while (selectEl.options.length > 1) selectEl.remove(1);
    values.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      selectEl.appendChild(opt);
    });
    // Pulihkan nilai sebelumnya jika masih valid
    if ([...selectEl.options].some(o => o.value === current)) {
      selectEl.value = current;
    }
  }

  /** Update dropdown kabupaten berdasarkan provinsi terpilih */
  function _syncRegencyDropdown() {
    const regSel = document.getElementById('filter-regency');
    if (!regSel) return;
    const allData = DataService.getAll();
    let regencies;
    if (_state.province === 'all') {
      regencies = DataService.getUniqueValues('regency');
    } else {
      regencies = [...new Set(allData.filter(s => s.province === _state.province).map(s => s.regency))].sort();
    }
    populateSelect(regSel, regencies);
    regSel.value = 'all';
  }

  /** Pasang event listener ke semua elemen filter di DOM */
  function bindDOM() {
    const mappings = [
      { id: 'filter-cohort',     key: 'cohort' },
      { id: 'filter-province',   key: 'province' },
      { id: 'filter-regency',    key: 'regency' },
      { id: 'filter-gender',     key: 'gender' },
      { id: 'filter-admission',  key: 'admission_path' },
    ];
    mappings.forEach(({ id, key }) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', e => set(key, e.target.value));
    });

    const resetBtn = document.getElementById('btn-reset-filter');
    if (resetBtn) resetBtn.addEventListener('click', reset);
  }

  return { init, getState, set, apply, reset, populateSelect, bindDOM };
})();
