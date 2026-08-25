/**
 * filters.js — PJ-SIG Student Spatial Dashboard
 *
 * State filter global dengan 6 dimensi:
 *   cohort · province · regency · gender · admission_path · status
 *
 * Semua nilai dibaca DINAMIS dari JSON — tidak ada yang hard-code.
 * Cascade: province berubah → regency di-reset dan diisi ulang.
 *          cohort berubah → tidak mereset filter lain (bebas kombinasi).
 */

var FilterService = (function() {

  /* ── State awal: semua 'all' ─────────────────────────── */
  var _state = {
    cohort:         'all',
    province:       'all',
    regency:        'all',
    gender:         'all',
    admission_path: 'all',
    status:         'all',
  };

  var _onChange = null;  /* callback dipanggil setiap state berubah */

  /* ── init ────────────────────────────────────────────── */
  function init(onChangeCb) {
    _onChange = onChangeCb;
  }

  /* ── getState ────────────────────────────────────────── */
  function getState() {
    /* kembalikan salinan agar state tidak bisa diubah dari luar */
    var copy = {};
    Object.keys(_state).forEach(function(k) { copy[k] = _state[k]; });
    return copy;
  }

  /* ── set ─────────────────────────────────────────────── */
  function set(key, value) {
    _state[key] = value;

    /* CASCADE: saat province berubah, reset regency dan isi ulang */
    if (key === 'province') {
      _state.regency = 'all';
      _syncRegencyDropdown();
    }

    if (_onChange) _onChange(getState());
  }

  /* ── apply ───────────────────────────────────────────── */
  /**
   * Terapkan semua filter aktif ke array data.
   * Mengembalikan subset data yang memenuhi SEMUA filter.
   * Filter 'all' diabaikan (tidak menyaring apapun).
   */
  function apply(data) {
    if (!Array.isArray(data)) return [];
    return data.filter(function(s) {
      if (_state.cohort         !== 'all' && String(s.cohort)         !== String(_state.cohort))         return false;
      if (_state.province       !== 'all' && s.province               !== _state.province)               return false;
      if (_state.regency        !== 'all' && s.regency                !== _state.regency)                return false;
      if (_state.gender         !== 'all' && s.gender                 !== _state.gender)                 return false;
      if (_state.admission_path !== 'all' && s.admission_path         !== _state.admission_path)         return false;
      if (_state.status         !== 'all' && s.status                 !== _state.status)                 return false;
      return true;
    });
  }

  /* ── reset ───────────────────────────────────────────── */
  function reset() {
    Object.keys(_state).forEach(function(k) { _state[k] = 'all'; });

    /* Reset semua elemen <select> ke opsi pertama ('all') */
    document.querySelectorAll('.filter-select').forEach(function(el) {
      el.value = 'all';
    });

    /* Pulihkan dropdown regency ke daftar lengkap */
    _syncRegencyDropdown();

    if (_onChange) _onChange(getState());
  }

  /* ── populateSelect ──────────────────────────────────── */
  /**
   * Isi <select> dari array values.
   * Opsi pertama ('Semua …') dipertahankan, opsi lama dihapus.
   * Nilai yang sedang aktif dipulihkan jika masih valid.
   */
  function populateSelect(selectEl, values) {
    if (!selectEl) return;
    var current = selectEl.value;

    /* Hapus semua opsi kecuali yang pertama (Semua …) */
    while (selectEl.options.length > 1) selectEl.remove(1);

    values.forEach(function(v) {
      var opt = document.createElement('option');
      opt.value       = String(v);
      opt.textContent = String(v);
      selectEl.appendChild(opt);
    });

    /* Pulihkan nilai sebelumnya jika masih tersedia */
    var stillValid = false;
    Array.from(selectEl.options).forEach(function(o) {
      if (o.value === current) stillValid = true;
    });
    selectEl.value = stillValid ? current : 'all';
  }

  /* ── _syncRegencyDropdown ────────────────────────────── */
  /**
   * Isi ulang dropdown kabupaten/kota berdasarkan provinsi aktif.
   * Jika province='all', tampilkan semua kabupaten.
   * Dipanggil otomatis saat province berubah atau saat reset.
   */
  function _syncRegencyDropdown() {
    var regSel = document.getElementById('filter-regency');
    if (!regSel) return;

    var allData = DataService.getAll();
    var regencies;

    if (_state.province === 'all') {
      regencies = DataService.getUniqueValues('regency');
    } else {
      /* Hanya tampilkan kabupaten yang ada di provinsi terpilih */
      var seen = {}, out = [];
      allData.forEach(function(s) {
        if (s.province === _state.province && s.regency && !seen[s.regency]) {
          seen[s.regency] = true;
          out.push(s.regency);
        }
      });
      regencies = out.sort();
    }

    populateSelect(regSel, regencies);
    regSel.value = 'all';
    _state.regency = 'all';
  }

  /* ── bindDOM ─────────────────────────────────────────── */
  /**
   * Pasang event listener 'change' ke semua elemen filter di DOM.
   * Dipanggil sekali setelah DOM siap.
   */
  function bindDOM() {
    var mappings = [
      { id: 'filter-cohort',    key: 'cohort'         },
      { id: 'filter-province',  key: 'province'        },
      { id: 'filter-regency',   key: 'regency'         },
      { id: 'filter-gender',    key: 'gender'          },
      { id: 'filter-admission', key: 'admission_path'  },
      { id: 'filter-status',    key: 'status'          },
    ];

    mappings.forEach(function(m) {
      var el = document.getElementById(m.id);
      if (el) {
        el.addEventListener('change', function(e) {
          set(m.key, e.target.value);
        });
      }
    });

    var resetBtn = document.getElementById('btn-reset-filter');
    if (resetBtn) resetBtn.addEventListener('click', reset);
  }

  /* ── Public API ──────────────────────────────────────── */
  return {
    init:           init,
    getState:       getState,
    set:            set,
    apply:          apply,
    reset:          reset,
    populateSelect: populateSelect,
    bindDOM:        bindDOM,
  };

})();
