// Memuat variabel lingkungan dari file .env
require('dotenv').config();

const axios = require('axios');
const fs = require('fs');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { ethers } = require("ethers");

// --- KONFIGURASI DARI .ENV ---
const IRYS_TESTNET_RPC_URL = process.env.IRYS_TESTNET_RPC_URL;
const PRIVATE_KEYS_STRING = process.env.PRIVATE_KEYS;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const VALUE_TO_SEND_IRYS = process.env.VALUE_TO_SEND_IRYS;

const API_KEY_2CAPTCHA = process.env.API_KEY_2CAPTCHA;
const SITE_KEY = process.env.SITE_KEY;
const WEBSITE_URL = process.env.WEBSITE_URL;

// Pastikan semua variabel lingkungan dimuat
if (!IRYS_TESTNET_RPC_URL || !PRIVATE_KEYS_STRING || !CONTRACT_ADDRESS || !VALUE_TO_SEND_IRYS ||
    !API_KEY_2CAPTCHA || !SITE_KEY || !WEBSITE_URL) {
    console.error("Kesalahan: Pastikan semua variabel diatur di file .env.");
    process.exit(1);
}

// Pisahkan string kunci pribadi menjadi array
const PRIVATE_KEYS = PRIVATE_KEYS_STRING.split(',').map(key => key.trim()).filter(key => key !== '');

// Baca proksi dari file
const proxies = fs.readFileSync('proxies.txt', 'utf-8').trim().split('\n').map(proxy => proxy.trim()).filter(proxy => proxy !== '');

if (PRIVATE_KEYS.length === 0) {
    console.error('Tidak ada kunci pribadi yang ditemukan di .env!');
    process.exit(1);
}
if (PRIVATE_KEYS.length !== proxies.length) {
    console.error('Jumlah kunci pribadi di .env dan jumlah proksi di proxies.txt tidak cocok!');
    console.error(`Kunci pribadi: ${PRIVATE_KEYS.length}, Proksi: ${proxies.length}`);
    process.exit(1);
}

// Nilai Irys yang akan dikirim untuk aktivasi game (diubah ke wei)
const VALUE_TO_SEND_WEI = ethers.parseEther(VALUE_TO_SEND_IRYS);

// --- Fungsi untuk Otomatisasi Faucet (dari skrip Anda) ---

async function createCaptchaTask2Captcha(walletAddress, proxy) {
    console.log(`🚰  Membuat tugas CAPTCHA untuk ${walletAddress}`);
    try {
        const axiosProxy = axios.create({
            httpsAgent: new HttpsProxyAgent(proxy)
        });

        const { data: taskRes } = await axiosProxy.post('http://2captcha.com/in.php', null, {
            params: {
                key: API_KEY_2CAPTCHA,
                method: 'turnstile',
                sitekey: SITE_KEY,
                pageurl: WEBSITE_URL,
                json: 1
            }
        });

        if (taskRes.status !== 1 || !taskRes.request) {
            console.error(`❌ [FAUCET] Gagal membuat tugas CAPTCHA (2Captcha) - ${walletAddress}`);
            console.error('Respons:', taskRes);
            return null;
        }
        console.log(`[FAUCET] Tugas CAPTCHA dibuat: ${taskRes.request}`);
        return taskRes.request; // Ini adalah ID tugas (request ID)
    } catch (error) {
        console.error(`❌ [FAUCET] Error saat membuat tugas CAPTCHA untuk ${walletAddress}:`, error.message);
        return null;
    }
}

async function getCaptchaResult2Captcha(taskId, walletAddress) {
    console.log(`[FAUCET] Menunggu hasil CAPTCHA untuk ${walletAddress} (ID: ${taskId})`);
    while (true) {
        await new Promise(r => setTimeout(r, 5000)); // Tunggu 5 detik

        try {
            const { data: res } = await axios.get('http://2captcha.com/res.php', {
                params: {
                    key: API_KEY_2CAPTCHA,
                    action: 'get',
                    id: taskId,
                    json: 1
                }
            });

            if (res.status === 1) {
                console.log(`✅ [FAUCET] CAPTCHA berhasil diselesaikan untuk ${walletAddress}.`);
                return res.request; // Ini adalah token CAPTCHA
            } else if (res.request === 'CAPCHA_NOT_READY') {
                console.log(`⏳ [FAUCET] Menunggu CAPTCHA: ${walletAddress}`);
            } else {
                console.error(`❌ [FAUCET] Gagal mendapatkan hasil CAPTCHA (2Captcha) - ${walletAddress}`);
                console.error('Respons:', res);
                return null;
            }
        } catch (error) {
            console.error(`❌ [FAUCET] Error saat mendapatkan hasil CAPTCHA untuk ${walletAddress}:`, error.message);
            return null;
        }
    }
}

async function requestFaucet(walletAddress, captchaToken, proxy) {
    console.log(`🚰  Meminta faucet untuk ${walletAddress}...`);
    try {
        const client = axios.create({
            httpsAgent: new HttpsProxyAgent(proxy),
            headers: {
                'Content-Type': 'application/json',
                'Origin': WEBSITE_URL,
                'Referer': WEBSITE_URL,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const res = await client.post('https://irys.xyz/api/faucet', {
            captchaToken: captchaToken,
            walletAddress: walletAddress
        });
        console.log(`✅ 🚰  Berhasil mengklaim untuk ${walletAddress}: ${res.data.message}`);
        return true; // Menandakan sukses
    } catch (error) {
        console.error(`❌ 🚰  Error saat meminta faucet untuk ${walletAddress}:`, error.response?.data?.message || error.message);
        return false; // Menandakan kegagalan
    }
}

// --- Fungsi untuk Aktivasi Game ---

async function activateGameForAccount(privateKey, walletAddress) {
    try {
        console.log(`🎮 Memulai aktivasi game untuk akun: ${walletAddress}`);
        const provider = new ethers.JsonRpcProvider(IRYS_TESTNET_RPC_URL);
        const wallet = new ethers.Wallet(privateKey, provider);

        console.log(`🎮 Mengirim ${ethers.formatEther(VALUE_TO_SEND_WEI)} Irys dari ${wallet.address} ke ${CONTRACT_ADDRESS}...`);

        const balance = await provider.getBalance(wallet.address);
        console.log(`🎮 Saldo Akun: ${ethers.formatEther(balance)} Irys`);

        if (balance < VALUE_TO_SEND_WEI) {
            console.warn(`🎮 Saldo tidak cukup untuk ${wallet.address} (${ethers.formatEther(balance)} Irys). Transaksi game mungkin akan gagal.`);
            // Kita tidak mengembalikan false di sini, tetap lanjutkan attempt transaksi.
        }

        const tx = {
            to: CONTRACT_ADDRESS,
            value: VALUE_TO_SEND_WEI,
        };

        const transactionResponse = await wallet.sendTransaction(tx);

        console.log("🎮 Transaksi dikirim! Hash:", transactionResponse.hash);
        console.log("🎮 Menunggu konfirmasi transaksi...");

        const receipt = await transactionResponse.wait();

        if (receipt && receipt.status === 1) {
            console.log("✅ 🎮 Transaksi Aktivasi Berhasil Dikonfirmasi!");
            console.log("Block Hash:", receipt.blockHash);
            console.log("Gas Used:", receipt.gasUsed.toString());
            console.log(`🎮 Akun ${wallet.address} sekarang seharusnya bisa memainkan game!`);
            return true;
        } else {
            console.error("❌ 🎮 Transaksi Aktivasi Gagal!");
            console.log("Receipt:", receipt);
            return false;
        }

    } catch (error) {
        console.error(`❌ 🎮 Terjadi kesalahan saat aktivasi game untuk akun ${walletAddress}:`, error.message);
        if (error.code === ethers.errors.INSUFFICIENT_FUNDS) {
            console.error("🎮 Dana tidak cukup di dompet ini untuk transaksi. Pastikan akun memiliki saldo.");
        }
        return false;
    }
}

// --- Alur Utama Otomatisasi ---
(async () => {
    for (let i = 0; i < PRIVATE_KEYS.length; i++) {
        const privateKey = PRIVATE_KEYS[i];
        const proxy = proxies[i];

        const wallet = new ethers.Wallet(privateKey);
        const walletAddress = wallet.address;

        console.log(`\n--- 🏁 Memulai Akun: ${walletAddress} (Proksi: ${proxy}) ---`);

        // STEP 1: KLAIM DARI FAUCET (akan selalu dicoba)
        console.log(`🚰 Memulai proses klaim faucet untuk ${walletAddress}.`);
        try {
            const taskId = await createCaptchaTask2Captcha(walletAddress, proxy);
            if (taskId) {
                const captchaToken = await getCaptchaResult2Captcha(taskId, walletAddress);
                if (captchaToken) {
                    await requestFaucet(walletAddress, captchaToken, proxy); // Tidak perlu menyimpan status faucetSuccess
                } else {
                    console.warn(`🚰 Klaim faucet gagal mendapatkan token CAPTCHA untuk ${walletAddress}.`);
                }
            } else {
                console.warn(`🚰 Klaim faucet gagal membuat tugas CAPTCHA untuk ${walletAddress}.`);
            }
        } catch (err) {
            console.error(`❌ 🚰 Error tak terduga saat proses faucet untuk ${walletAddress}:`, err.message);
        }
        
        // Tambahkan delay singkat setelah faucet untuk menghindari rate limit/memberi waktu jaringan
        await new Promise(r => setTimeout(r, 2000)); // Tunggu 2 detik

        // STEP 2: AKTIVASI GAME (akan selalu dicoba setelah faucet, terlepas dari hasilnya)
        console.log(`[ALUR] Melanjutkan ke proses aktivasi game untuk ${walletAddress}.`);
        await activateGameForAccount(privateKey, walletAddress);

        console.log('----------------------------------------------------');
    }
    console.log("\n✅ Semua proses otomatisasi untuk akun selesai.");
})();