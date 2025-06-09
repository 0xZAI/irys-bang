# irys-bang

Irys Faucet & Game Activator Bot
Daftar Isi
Tentang Proyek
Fitur
Persyaratan
Instalasi
Konfigurasi
.env File
proxies.txt File
Penggunaan
Penting - Keamanan!
Penyelesaian Masalah
Tentang Proyek
Skrip ini mengotomatisasi dua langkah utama untuk berinteraksi dengan platform Irys Testnet dan game-nya:

Klaim Token dari Faucet Irys: Secara otomatis meminta token Irys testnet untuk setiap akun yang dikonfigurasi, dengan kemampuan menyelesaikan CAPTCHA (menggunakan 2Captcha) dan merutekan permintaan melalui proksi.
Aktivasi Game Irys Arcade: Setelah (atau terlepas dari) upaya klaim faucet, skrip akan mengirimkan transaksi aktivasi ke kontrak game Irys Arcade yang ditentukan.
Skrip ini dirancang untuk mendukung multi-akun dan menggunakan variabel lingkungan untuk konfigurasi yang aman.

Fitur
Otomatisasi Klaim Faucet: Mengklaim token dari faucet Irys secara terprogram.
Dukungan 2Captcha: Terintegrasi dengan 2Captcha untuk menyelesaikan CAPTCHA Turnstile.
Dukungan Proksi: Setiap akun dapat menggunakan proksinya sendiri untuk klaim faucet.
Aktivasi Game Otomatis: Mengirimkan transaksi yang diperlukan untuk mengaktifkan game Irys Arcade.
Multi-Akun: Memproses klaim faucet dan aktivasi game untuk beberapa akun secara berurutan.
Manajemen Kunci Aman: Menggunakan file .env untuk menyimpan kunci pribadi dan konfigurasi sensitif lainnya.
Logging Detail: Memberikan umpan balik yang jelas tentang status setiap operasi untuk setiap akun.
Persyaratan
Sebelum Anda memulai, pastikan Anda telah menginstal yang berikut:

Node.js (Versi 18 atau lebih tinggi direkomendasikan)
npm (Node Package Manager, biasanya disertakan dengan Node.js)
Kunci API 2Captcha (Dapatkan dari 2captcha.com)
Proksi HTTP/HTTPS (Daftar proksi sesuai kebutuhan Anda)
Instalasi
Clone repositori ini atau unduh file skrip secara manual.

Bash

git clone https://github.com/0xZAI/irys-bang
cd irys-bang


Instal dependensi yang diperlukan:

Bash

npm install dotenv axios https-proxy-agent ethers
Konfigurasi
Anda perlu membuat dan mengedit dua file untuk mengonfigurasi skrip: .env dan proxies.txt.

.env File
Buat file bernama .env di direktori root proyek Anda. File ini akan menyimpan semua konfigurasi sensitif dan penting.

Cuplikan kode

IRYS_TESTNET_RPC_URL="https://testnet.irys.xyz/rpc"
PRIVATE_KEYS="0xKUNCI_PRIBADI_ANDA_1,0xKUNCI_PRIBADI_ANDA_2,0xKUNCI_PRIBADI_ANDA_3"
CONTRACT_ADDRESS="0xf137e228c9b44c6fa6332698e5c6bce429683d6c"
VALUE_TO_SEND_IRYS="0.02"

API_KEY_2CAPTCHA="YOUR_2CAPTCHA_API_KEY"
SITE_KEY="0x4AAAAAAA6vnrvBCtS4FAl-" # Jangan diubah kecuali faucet mengubah sitekey mereka
WEBSITE_URL="https://irys.xyz/faucet"
Ganti Placeholder:

IRYS_TESTNET_RPC_URL: Sangat Penting! Ganti dengan URL RPC Irys Testnet yang valid dan stabil. Anda mungkin perlu mencarinya di dokumentasi resmi Irys atau komunitas mereka.
PRIVATE_KEYS: Daftar kunci pribadi yang dipisahkan koma (0x...). Sangat hati-hati dengan ini. Setiap kunci pribadi mewakili satu akun yang akan diproses.
CONTRACT_ADDRESS: Alamat kontrak game Irys Arcade yang Anda interaksikan (0xf137e228c9b44c6fa6332698e5c6bce429683d6c).
VALUE_TO_SEND_IRYS: Jumlah token Irys testnet yang akan dikirim untuk aktivasi game (misalnya, 0.02).
API_KEY_2CAPTCHA: Kunci API 2Captcha Anda.
SITE_KEY: Ini adalah kunci situs CAPTCHA yang digunakan oleh faucet Irys. Biarkan seperti adanya kecuali ada perubahan di sisi faucet.
WEBSITE_URL: URL faucet Irys.
proxies.txt File
Buat file bernama proxies.txt di direktori root proyek Anda. Setiap baris harus berisi satu proksi HTTP/HTTPS.

Penting: Jumlah proksi di proxies.txt harus sama dengan jumlah kunci pribadi di variabel PRIVATE_KEYS di file .env. Urutan proksi akan sesuai dengan urutan kunci pribadi.

Contoh proxies.txt:

http://user1:pass1@proxy_ip1:port1
http://user2:pass2@proxy_ip2:port2
http://user3:pass3@proxy_ip3:port3
Penggunaan
Setelah Anda menginstal dependensi dan mengkonfigurasi file .env serta proxies.txt, Anda dapat menjalankan skrip:

Bash

node faucetAndGame.js
Skrip akan secara otomatis:

Mulai memproses setiap akun (berdasarkan kunci pribadi di .env).
Untuk setiap akun, ia akan mencoba mengklaim token dari faucet Irys (menggunakan proksi dan menyelesaikan CAPTCHA).
Terlepas dari keberhasilan atau kegagalan klaim faucet, skrip akan melanjutkan untuk mengirimkan transaksi aktivasi game ke kontrak yang ditentukan.
Memberikan log konsol terperinci untuk setiap langkah dan status akun.
Penting - Keamanan!
Jangan Pernah Bagikan Kunci Pribadi Anda: Kunci pribadi memberikan kontrol penuh atas aset kripto Anda. Jangan pernah membagikannya atau mengunggah file .env ke repositori publik (seperti GitHub). Tambahkan .env ke file .gitignore Anda.
Gunakan Akun Testnet: Disarankan untuk selalu menguji skrip ini di jaringan testnet dengan dana yang tidak bernilai.
Dana yang Cukup: Pastikan akun Anda memiliki saldo Irys testnet yang cukup untuk transaksi game, terutama jika klaim faucet gagal. Skrip akan memberikan peringatan jika saldo tidak mencukupi, tetapi tetap akan mencoba mengirim transaksi.
Keamanan Proksi: Pastikan proksi yang Anda gunakan tepercaya.
Penyelesaian Masalah
"Kesalahan: Pastikan semua variabel diatur di file .env.": Periksa kembali file .env Anda. Pastikan semua variabel ada dan tidak ada kesalahan ketik.
"Jumlah kunci pribadi... dan jumlah proksi... tidak cocok!": Pastikan jumlah baris di proxies.txt sama persis dengan jumlah kunci pribadi di variabel PRIVATE_KEYS di .env.
"Error saat membuat tugas CAPTCHA" atau "Gagal mendapatkan hasil CAPTCHA":
Periksa API_KEY_2CAPTCHA Anda.
Pastikan ada dana yang cukup di akun 2Captcha Anda.
Verifikasi SITE_KEY dan WEBSITE_URL di .env sudah benar.
Periksa status proksi Anda.
"Error saat meminta faucet":
Periksa kembali WEBSITE_URL dan pastikan API endpoint faucet tidak berubah.
Proksi mungkin diblokir atau tidak berfungsi.
"Dana tidak cukup di dompet Anda untuk transaksi ini": Meskipun skrip akan mencoba faucet, jika gagal, akun mungkin tidak memiliki cukup dana untuk transaksi game. Pastikan akun memiliki saldo yang memadai.
"Error saat aktivasi game":
Periksa IRYS_TESTNET_RPC_URL apakah itu URL RPC yang valid dan aktif.
Verifikasi CONTRACT_ADDRESS sudah benar.
Jaringan mungkin sibuk atau ada masalah sementara. Coba jalankan ulang skrip.
