# SepatuSuper

Monorepo katalog sepatu dengan frontend React/Vite, backend Express, database
SQLite, dashboard admin, dan pemesanan yang diteruskan ke WhatsApp.

## Persyaratan

- Node.js 22.13 atau lebih baru
- npm 10 atau lebih baru

## Menjalankan aplikasi

```sh
npm install
```

Salin `server/.env.example` menjadi `server/.env`, lalu isi nomor WhatsApp toko
dengan kode negara, tanpa tanda `+` (contoh: `628xxxxxxxxxx`). Ganti
`JWT_SECRET` dengan secret acak yang kuat sebelum menjalankan aplikasi.

```sh
npm run dev
```

Frontend tersedia di `http://localhost:3000`, backend di
`http://localhost:5000`, dan dashboard admin di `http://localhost:3000/admin`.
Jalankan setiap aplikasi secara terpisah dengan `npm run dev:client` atau
`npm run dev:server`.

Login awal untuk pengembangan lokal:

- Email: `admin@sepatusuper.id`
- Kata sandi: `password123`

Ganti kredensial awal sebelum aplikasi digunakan di lingkungan publik.

## Struktur

```text
client/                    React + Vite storefront dan dashboard admin
  src/components/          Komponen UI publik, pesanan, dan administrasi
  src/services/            Klien API dan pembentuk tautan WhatsApp
server/                    Express API dan SQLite
  src/db/                  Skema, migrasi, seed, dan database
  src/routes/              Endpoint katalog, admin, dan pesanan
package.json               npm workspaces dan skrip monorepo
```

## Katalog dan database

Katalog hanya memuat sepatu. Merek disimpan pada produk, sedangkan kategori
digunakan untuk jenis sepatu seperti sneakers, boots, sepatu kasual, dan sepatu
lari. Setiap varian menyimpan warna, ukuran EU, dan stoknya.

SQLite menyimpan jenis sepatu (`product_categories`), produk (`products`),
varian stok (`product_variants`), pengaturan toko (`store_settings`), admin
(`admin_users`), pelanggan (`customers`), serta pesanan dan snapshot item
pesanan (`orders`, `order_items`). Tabel lama `categories`, `settings`, dan
`admins` dimigrasikan saat server dimulai; produk dan stok lama juga
dipertahankan.

File database lokal berada di `server/src/db/katalogwa.sqlite`. Variabel
`DATABASE_PATH` dapat menentukan lokasi database lain. `WHATSAPP_NUMBER`
digunakan sebagai nomor WhatsApp awal jika pengaturan toko belum memiliki nomor.

Pelanggan memilih warna, ukuran, jumlah, lalu mengisi nama, alamat, dan catatan.
Pesanan disimpan dengan status **Menunggu konfirmasi** sebelum WhatsApp dibuka
dengan ringkasan pesanan. Dashboard admin menyediakan pengelolaan produk,
pelanggan, status pesanan, laporan, dan pengaturan toko. Stok diperiksa saat
pesanan dibuat, tetapi tidak dikurangi atau dicadangkan otomatis.

Endpoint API utama:

- Publik: `/api/health`, `/api/products`, `/api/categories`, `/api/stores`
- Login admin: `/api/auth/login` dan `/api/auth/me`
- Pesanan: `POST /api/orders`
- Admin (token diperlukan): `/api/orders`, `/api/orders/customers`,
  `/api/orders/summary`, dan `PATCH /api/orders/:id/status`

## Validasi

```sh
npm run lint
npm run build
```

Linting menggunakan Oxlint di workspace frontend dan backend.
