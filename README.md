# PJ-SIG Student Spatial Dashboard

**Spatial Intelligence for Student Profile, Academic Planning & Decision Support**

Dashboard WebGIS untuk menampilkan profil dan persebaran spasial mahasiswa Program Studi Penginderaan Jauh dan Sistem Informasi Geografis (D4 PJ-SIG), Fakultas Vokasi, Universitas Hasanuddin.

> ⚠️ **DUMMY DATA** — Seluruh data yang ditampilkan adalah data dummy untuk keperluan pengembangan. Tidak mewakili data mahasiswa nyata.

---

## Fitur

- 🗺️ Peta interaktif dengan mode Heatmap, Cluster, dan Point (Leaflet + OpenStreetMap)
- 📊 Chart distribusi mahasiswa per angkatan, provinsi, kabupaten, gender, dan jalur masuk
- 🔍 Global filter: angkatan, provinsi, kabupaten/kota, gender, jalur masuk
- 💡 Spatial insights otomatis berdasarkan data terfilter
- 📱 Responsive design (desktop, tablet, mobile)
- 🆓 100% teknologi gratis dan open-source

## Struktur Project

```
pj-sig-student-dashboard/
├── index.html              ← Entry point utama
├── css/
│   └── style.css           ← Seluruh styling
├── js/
│   ├── app.js              ← Koordinator utama
│   ├── map.js              ← Logika Leaflet
│   ├── charts.js           ← Logika Apache ECharts
│   ├── filters.js          ← State & logika filter global
│   └── data.js             ← Fetch & agregasi data JSON
├── data/
│   └── students.json       ← Data mahasiswa (dummy / produksi)
├── geojson/
│   └── regions.geojson     ← Batas administratif (opsional)
└── README.md
```

## Teknologi

| Komponen | Library | CDN |
|---|---|---|
| Peta | Leaflet 1.9.4 | unpkg.com |
| Heatmap | Leaflet.heat 0.2.0 | unpkg.com |
| Cluster | Leaflet.markercluster 1.5.3 | unpkg.com |
| Chart | Apache ECharts 5.4.3 | jsdelivr.net |
| Basemap | OpenStreetMap | tile.openstreetmap.org |
| Font | Inter | fonts.googleapis.com |

Tidak menggunakan npm, Node.js, build tools, atau server berbayar.

## Cara Publikasi ke GitHub Pages

1. Buat repository baru di GitHub (misal: `pj-sig-student-dashboard`)
2. Upload semua file ke repository (pertahankan struktur folder)
3. Buka **Settings** → **Pages**
4. Source: pilih `main` branch, folder `/root`
5. Klik **Save**
6. Website akan live di: `https://username.github.io/pj-sig-student-dashboard/`

## Cara Update Data

Edit file `data/students.json` langsung di GitHub:

1. Buka file `data/students.json` di repository
2. Klik ikon pensil (Edit)
3. Tambah atau ubah entri mahasiswa
4. Klik **Commit changes**
5. Dashboard otomatis memuat data terbaru

### Format data satu mahasiswa:

```json
{
  "id": "D4PJ2026001",
  "cohort": 2026,
  "gender": "L",
  "province": "Sulawesi Selatan",
  "regency": "Gowa",
  "district": "Somba Opu",
  "school": "SMAN 1 Gowa",
  "school_type": "SMA",
  "admission_path": "SNBT",
  "status": "Aktif",
  "lat": -5.31,
  "lon": 119.47
}
```

### Field wajib:
- `cohort` (integer): tahun angkatan
- `gender`: `"L"` atau `"P"`
- `province`, `regency`, `district`: asal wilayah
- `school`: nama sekolah asal
- `admission_path`: jalur masuk (SNBP / SNBT / Mandiri)
- `status`: `"Aktif"` / `"Cuti"` / `"Lulus"`
- `lat`, `lon`: koordinat (gunakan centroid kecamatan, bukan koordinat rumah)

## Workflow Pengembangan (Claude + GitHub)

```
1. Minta kode ke Claude
2. Buka file di GitHub → Edit (pensil)
3. Paste kode dari Claude
4. Commit changes
5. Tunggu 1–3 menit → GitHub Pages update otomatis
6. Buka URL untuk melihat hasil
```

Untuk edit banyak file sekaligus: tekan `.` di halaman repository untuk membuka github.dev (editor VS Code di browser, tanpa instalasi).

## Privasi Data

- Koordinat yang digunakan adalah **centroid kecamatan**, bukan koordinat rumah individual
- NIM, nama lengkap, nomor HP, alamat rumah, dan email tidak disimpan di file publik
- Untuk dashboard publik, gunakan data agregat tingkat kabupaten/kota

## Lisensi

MIT License — bebas digunakan dan dikembangkan untuk keperluan akademik.

---

*Dikembangkan untuk D4 Program Studi Penginderaan Jauh dan Sistem Informasi Geografis, Fakultas Vokasi, Universitas Hasanuddin.*
