require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { ethers } = require("ethers");
const { Uploader } = require("@irys/upload");
const { Ethereum } = require("@irys/upload-ethereum");

// KONFIGURASI DARI .ENV
const IRYS_TESTNET_RPC_URL = process.env.IRYS_TESTNET_RPC_URL;
const PRIVATE_KEYS_STRING = process.env.PRIVATE_KEYS;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const VALUE_TO_SEND_IRYS = process.env.VALUE_TO_SEND_IRYS;
const API_KEY_2CAPTCHA = process.env.API_KEY_2CAPTCHA;
const SITE_KEY = process.env.SITE_KEY;
const WEBSITE_URL = process.env.WEBSITE_URL;
const IRYS_UPLOADER_URL = process.env.IRYS_UPLOADER_URL || 'https://node1.irys.xyz';

if (!IRYS_TESTNET_RPC_URL || !PRIVATE_KEYS_STRING || !CONTRACT_ADDRESS || !VALUE_TO_SEND_IRYS ||
    !API_KEY_2CAPTCHA || !SITE_KEY || !WEBSITE_URL || !IRYS_UPLOADER_URL) {
    console.error("Kesalahan: Pastikan semua variabel diatur di file .env.");
    process.exit(1);
}

const PRIVATE_KEYS = PRIVATE_KEYS_STRING.split(',').map(key => key.trim()).filter(key => key !== '');
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

const VALUE_TO_SEND_WEI = ethers.parseEther(VALUE_TO_SEND_IRYS);

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
            console.error(`❌ Gagal membuat tugas CAPTCHA (2Captcha) - ${walletAddress}`);
            console.error('Respons:', taskRes);
            return null;
        }
        console.log(`🚰  Tugas CAPTCHA dibuat: ${taskRes.request}`);
        return taskRes.request; // Ini adalah ID tugas (request ID)
    } catch (error) {
        console.error(`❌  Error saat membuat tugas CAPTCHA untuk ${walletAddress}:`, error.message);
        return null;
    }
}

async function getCaptchaResult2Captcha(taskId, walletAddress) {
    console.log(` Menunggu hasil CAPTCHA untuk ${walletAddress} (ID: ${taskId})`);
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
                console.log(`✅  CAPTCHA berhasil diselesaikan untuk ${walletAddress}.`);
                return res.request; // Ini adalah token CAPTCHA
            } else if (res.request === 'CAPCHA_NOT_READY') {
                console.log(`⏳  Menunggu CAPTCHA: ${walletAddress}`);
            } else {
                console.error(`❌  Gagal mendapatkan hasil CAPTCHA (2Captcha) - ${walletAddress}`);
                console.error('Respons:', res);
                return null;
            }
        } catch (error) {
            console.error(`❌  Error saat mendapatkan hasil CAPTCHA untuk ${walletAddress}:`, error.message);
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
        console.log(`✅   Berhasil mengklaim untuk ${walletAddress}: ${res.data.message}`);
        return true; // Menandakan sukses
    } catch (error) {
        console.error(`❌   Error saat meminta faucet untuk ${walletAddress}:`, error.response?.data?.message || error.message);
        return false; // Menandakan kegagalan
    }
}
async function activateGameForAccount(privateKey, walletAddress) {
    // ... kode sama ...
    const provider = new ethers.JsonRpcProvider(IRYS_TESTNET_RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);

    const contractABI = [
        "function activateGame(uint256 value)"
    ];
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);

    try {
        console.log(`🎮 Mengirim transaksi aktivasi game untuk ${walletAddress} dengan nilai ${VALUE_TO_SEND_IRYS} ETH...`);
        const tx = await contract.activateGame(VALUE_TO_SEND_WEI, {
            value: VALUE_TO_SEND_WEI,
            gasLimit: ethers.parseUnits("500000", "wei") // Contoh gas limit, sesuaikan jika perlu
        });
        await tx.wait();
        console.log(`✅ 🎮 Game berhasil diaktivasi untuk ${walletAddress}. Transaction hash: ${tx.hash}`);
        return true;
    } catch (error) {
        console.error(`❌ 🎮 Gagal mengaktivasi game untuk ${walletAddress}:`, error.message);
        if (error.code === 'INSUFFICIENT_FUNDS') {
            console.error(`🎮 Dana tidak cukup untuk aktivasi game. Pastikan faucet berhasil.`);
        }
        return false;
    }
}

async function submitScoreForAccount(privateKey, walletAddress, score, gameId, proxy) {
    console.log(`📝 Memulai submit skor (${score}) untuk akun: ${walletAddress}`);
    try {
        // Inisialisasi Irys Uploader menggunakan pola baru
        const irysUploader = await Uploader(Ethereum).withWallet(privateKey);

        console.log(`📝 Terhubung ke Irys uploader sebagai: ${irysUploader.address}`);

        const scoreData = {
            game: gameId,
            score: score,
            date: new Date().toISOString()
        };
        const dataToUpload = JSON.stringify(scoreData);

        const tags = [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Application-Id', value: 'Irys-Arcade' },
            { name: 'Score-Entry', value: 'true' },
            { name: 'Game-Name', value: gameId },
            { name: 'Player-Wallet', value: walletAddress },
            { name: 'Player-Name', value: walletAddress.slice(0, 8) + '...' + walletAddress.slice(-4) },
            { name: 'Score', value: score.toString() },
            { name: 'Game-Version', value: '1.0' },
            { name: 'Timestamp', value: Date.now().toString() }
        ];

        console.log(`📝 Data yang akan diunggah: ${dataToUpload}`);
        console.log(`📝 Tags yang akan dilampirkan:`, tags);

        const receipt = await irysUploader.upload(dataToUpload, { tags: tags });

        if (receipt && receipt.id) {
            console.log("✅ 📝 Skor berhasil diunggah ke Irys network!");
            console.log("Transaction ID (Arweave/Irys ID):", receipt.id);
            console.log(`Lihat data Anda di gateway: https://gateway.irys.xyz/${receipt.id}`);
            return true;
        } else {
            console.error(`❌ 📝 Gagal mengunggah skor. Respons tidak valid:`, receipt);
            return false;
        }

    } catch (error) {
        console.error(`❌ 📝 Terjadi kesalahan saat submit skor untuk akun ${walletAddress}:`, error.message);
        return false;
    }
}

(async () => {
    const GAME_ID = "snake";
    const MOCK_SCORE = 10;

    for (let i = 0; i < PRIVATE_KEYS.length; i++) {
        const privateKey = PRIVATE_KEYS[i];
        const proxy = proxies[i];

        const wallet = new ethers.Wallet(privateKey);
        const walletAddress = wallet.address;

        console.log(`\n--- Memulai Otomatisasi untuk Akun: ${walletAddress} (Proksi: ${proxy}) ---`);

        // STEP 1: KLAIM DARI FAUCET
        console.log(`ᝰ.ᐟ Memulai proses klaim faucet untuk ${walletAddress}.`);
        try {
            const taskId = await createCaptchaTask2Captcha(walletAddress, proxy);
            if (taskId) {
                const captchaToken = await getCaptchaResult2Captcha(taskId, walletAddress);
                if (captchaToken) {
                    await requestFaucet(walletAddress, captchaToken, proxy);
                } else {
                    console.warn(`ᝰ.ᐟ Klaim faucet gagal mendapatkan token CAPTCHA untuk ${walletAddress}.`);
                }
            } else {
                console.warn(`ᝰ.ᐟ Klaim faucet gagal membuat tugas CAPTCHA untuk ${walletAddress}.`);
            }
        } catch (err) {
            console.error(`❌ ᝰ.ᐟ Error tak terduga saat proses faucet untuk ${walletAddress}:`, err.message);
        }

        await new Promise(r => setTimeout(r, 2000));

        // STEP 2: AKTIVASI GAME
        console.log(`ᝰ.ᐟ Melanjutkan ke proses aktivasi game untuk ${walletAddress}.`);
        await activateGameForAccount(privateKey, walletAddress);

        await new Promise(r => setTimeout(r, 3000));

        // STEP 3: SUBMIT SKOR
        console.log(`ᝰ.ᐟ Melanjutkan ke proses submit skor untuk ${walletAddress}.`);
        const currentScore = MOCK_SCORE + Math.floor(Math.random() * 5);
        await submitScoreForAccount(privateKey, walletAddress, currentScore, GAME_ID, proxy);

        console.log('----------------------------------------------------');
    }
    console.log("\n✅ Semua proses otomatisasi untuk akun selesai.");
})();
