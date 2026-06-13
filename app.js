import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 🛠️ MASUKKAN KODE CONFIG ASLI FIREBASE KAMU DI SINI
const firebaseConfig = {
  apiKey: "AIzaSyBnXFEJjTovKQUGs74ZcziZ6odR6qxYeug",
  authDomain: "clean-isabel-app-eaca6.firebaseapp.com",
  databaseURL: "https://clean-isabel-app-eaca6-default-rtdb.firebaseio.com",
  projectId: "clean-isabel-app-eaca6",
  storageBucket: "clean-isabel-app-eaca6.firebasestorage.app",
  messagingSenderId: "929083923327",
  appId: "1:929083923327:web:3ebff1bbdd42eb3494984a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Elemen DOM Global
const loginPage = document.getElementById('login-page');
const dashboardPage = document.getElementById('dashboard-page');
const loginForm = document.getElementById('login-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginError = document.getElementById('login-error');
const roleTitle = document.getElementById('role-title');
const userDisplayEmail = document.getElementById('user-display-email');
const btnLogout = document.getElementById('btn-logout');

const karyawanSection = document.getElementById('karyawan-section');
const adminSection = document.getElementById('admin-section');

let currentUserEmail = "";
let currentUserUID = "";

// Daftar Area Tetap (Biar Karyawan Tinggal Klik, Tidak Ketik Manual)
const daftarAreaDefault = [
    { id: "lobby", nama: "Area Lobby" },
    { id: "toilet", nama: "Toilet & Restroom" },
    { id: "koridor", nama: "Koridor / Selasar" },
    { id: "lift", nama: "Area Lift & Tangga" },
    { id: "luar", nama: "Halaman / Area Luar" }
];

// ==========================================
// 🔑 PROSES LOGIN & LOGOUT
// ==========================================
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value)
        .then(() => { loginError.textContent = ""; loginForm.reset(); })
        .catch((err) => { loginError.textContent = "Login Gagal: " + err.message; });
});

btnLogout.addEventListener('click', () => { signOut(auth); });

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserEmail = user.email;
        currentUserUID = user.uid;
        userDisplayEmail.textContent = currentUserEmail;
        loginPage.style.display = 'none';
        dashboardPage.style.display = 'block';

        if (currentUserEmail.includes('admin')) {
            roleTitle.innerHTML = 'Panel Admin <i class="fa-solid fa-crown" style="color: #ffd700;"></i>';
            adminSection.style.display = 'block';
            karyawanSection.style.display = 'none';
            aktifkanFiturAdmin();
        } else {
            roleTitle.innerHTML = 'Panel Karyawan <i class="fa-solid fa-user-worker"></i>';
            karyawanSection.style.display = 'block';
            adminSection.style.display = 'none';
            aktifkanFiturKaryawan();
        }
    } else {
        loginPage.style.display = 'block';
        dashboardPage.style.display = 'none';
    }
});

// ==========================================
// 👷 LOGIKA SISI KARYAWAN (PANEL GRID DATA AREA)
// ==========================================
function aktifkanFiturKaryawan() {
    const todayStr = new Date().toISOString().split('T')[0];

    // ⏰ 1. Logika Absensi Karyawan
    const btnMasuk = document.getElementById('btn-absen-masuk');
    const btnPulang = document.getElementById('btn-absen-pulang');
    const absenStatus = document.getElementById('absen-status');

    onValue(ref(db, `absensi/${todayStr}/${currentUserUID}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            if (data.masuk && data.pulang) {
                absenStatus.className = "status-sudah-pulang"; absenStatus.textContent = "Selesai Kerja";
                btnMasuk.disabled = true; btnPulang.disabled = true;
            } else if (data.masuk) {
                absenStatus.className = "status-sudah-masuk"; absenStatus.textContent = "Sudah Masuk (" + data.masuk + ")";
                btnMasuk.disabled = true; btnPulang.disabled = false;
            }
        } else {
            absenStatus.className = "status-belum-absen"; absenStatus.textContent = "Belum Absen";
            btnMasuk.disabled = false; btnPulang.disabled = true;
        }
    });

    btnMasuk.onclick = () => {
        const jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        set(ref(db, `absensi/${todayStr}/${currentUserUID}`), { nama: currentUserEmail, masuk: jam, status: "Aktif" });
    };
    btnPulang.onclick = () => {
        const jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        update(ref(db, `absensi/${todayStr}/${currentUserUID}`), { pulang: jam, status: "Selesai" });
    };

    // 🧹 2. Logika Grid Area Kerja Karyawan
    const gridAreaKaryawan = document.getElementById('grid-area-karyawan');
    
    onValue(ref(db, `monitoring_area/${todayStr}`), (snapshot) => {
        const dataHariIni = snapshot.val() || {};
        gridAreaKaryawan.innerHTML = ""; 

        daftarAreaDefault.forEach(area => {
            const dataArea = dataHariIni[area.id] || { status: "Belum Dikerjakan", keterangan: "-", oleh: "-" };
            
            let statusClass = "badge-belum";
            if (dataArea.status === "Butuh Check Admin") statusClass = "badge-proses";
            if (dataArea.status === "Area Bersih") statusClass = "badge-bersih";
            if (dataArea.status === "Kurang Bersih" || dataArea.status === "Masih Kotor") statusClass = "badge-kotor";

            const card = document.createElement('div');
            card.className = "card-grid-area";
            card.innerHTML = `
                <h4>${area.nama}</h4>
                <p>Status: <span class="badge-status ${statusClass}">${dataArea.status}</span></p>
                <p class="txt-keterangan">Catatan Admin: <i>${dataArea.keterangan || '-'}</i></p>
                <p><small>Pekerja: ${dataArea.oleh}</small></p>
                <button class="btn-lapor-area" id="btn-lapor-${area.id}">Laporkan Selesai Kerja</button>
            `;
            gridAreaKaryawan.appendChild(card);

            const btnLapor = document.getElementById(`btn-lapor-${area.id}`);
            if (dataArea.status === "Area Bersih" || dataArea.status === "Butuh Check Admin") {
                btnLapor.disabled = true;
                btnLapor.innerText = "Sudah Dilaporkan";
            }

            btnLapor.onclick = () => {
                const sekarang = new Date();
                const jamStr = sekarang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                
                update(ref(db, `monitoring_area/${todayStr}/${area.id}`), {
                    area: area.nama,
                    oleh: currentUserEmail.split('@')[0], 
                    waktu: jamStr,
                    status: "Butuh Check Admin",
                    keterangan: dataArea.keterangan || "-"
                }).then(() => alert(`Berhasil mengirim laporan untuk ${area.nama}`));
            };
        });
    });
}

// ==========================================
// 👑 LOGIKA SISI ADMIN (PANEL EVALUASI MANUAL)
// ==========================================
function aktifkanFiturAdmin() {
    const todayStr = new Date().toISOString().split('T')[0];

    // Buka/Tutup Monitor Absensi Admin
    document.getElementById('menu-pantau-absensi').onclick = () => document.getElementById('halaman-detail-absensi').style.display = 'block';
    document.getElementById('btn-tutup-absensi').onclick = () => document.getElementById('halaman-detail-absensi').style.display = 'none';

    // Ambil Data Absen Hari Ini (Berdasarkan UID Akurat)
    onValue(ref(db, `absensi/${todayStr}`), (snapshot) => {
        const data = snapshot.val();
        const tbody = document.getElementById('table-absensi-body');
        tbody.innerHTML = "";
        if (data) {
            for (let uid in data) {
                tbody.innerHTML += `<tr>
                    <td>${data[uid].nama}</td>
                    <td>${data[uid].masuk || '-'}</td>
                    <td>${data[uid].pulang || '-'}</td>
                    <td><span class="badge-aktif">${data[uid].status}</span></td>
                </tr>`;
            }
        } else {
            tbody.innerHTML = `<tr><td colspan="4" class="tabel-kosong">Belum ada data absensi hari ini.</td></tr>`;
        }
    });

    // Evaluasi Area Kerja oleh Admin
    document.getElementById('menu-admin-pantau-kerja').onclick = () => document.getElementById('halaman-pantau-kerja-admin').style.display = 'block';
    document.getElementById('btn-tutup-pantau-kerja').onclick = () => document.getElementById('halaman-pantau-kerja-admin').style.display = 'none';

    onValue(ref(db, `monitoring_area/${todayStr}`), (snapshot) => {
        const dataHariIni = snapshot.val() || {};
        const tbody = document.getElementById('table-pantau-area-body');
        tbody.innerHTML = "";
        
        daftarAreaDefault.forEach(area => {
            const dataArea = dataHariIni[area.id] || { status: "Belum Dikerjakan", keterangan: "-", oleh: "-", waktu: "-" };
            
            let statusClass = "text-warning-clean";
            if (dataArea.status === "Area Bersih") statusClass = "text-success-clean";
            if (dataArea.status === "Kurang Bersih" || dataArea.status === "Masih Kotor") statusClass = "text-danger-clean";

            tbody.innerHTML += `<tr>
                <td><small>Jam: ${dataArea.waktu || '-'}<br>Oleh: ${dataArea.oleh || '-'}</small></td>
                <td><b>${area.nama}</b></td>
                <td><span class="${statusClass}">${dataArea.status}</span><br><small style="color:#777">Ket: ${dataArea.keterangan}</small></td>
                <td>
                    <input type="text" id="input-ket-${area.id}" placeholder="Ketik catatan jika kotor..." value="${dataArea.keterangan !== '-' ? dataArea.keterangan : ''}" class="input-ket-admin"><br>
                    <button class="btn-evaluasi btn-eval-bersih" onclick="adminEvaluasi('${area.id}', 'Area Bersih')">Bersih ✅</button>
                    <button class="btn-evaluasi btn-eval-kurang" onclick="adminEvaluasi('${area.id}', 'Kurang Bersih')">Kurang ⚠️</button>
                    <button class="btn-evaluasi btn-eval-kotor" onclick="adminEvaluasi('${area.id}', 'Masih Kotor')">Kotor ❌</button>
                </td>
            </tr>`;
        });
    });
}

window.adminEvaluasi = function(areaID, statusBaru) {
    const todayStr = new Date().toISOString().split('T')[0];
    const catatanManual = document.getElementById(`input-ket-${areaID}`).value || "-";
    
    update(ref(db, `monitoring_area/${todayStr}/${areaID}`), { 
        status: statusBaru,
        keterangan: catatanManual
    }).then(() => alert(`Evaluasi ${statusBaru} Berhasil Disimpan!`));
};
