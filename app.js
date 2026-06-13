import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 🛠️ KONFIGURASI FIREBASE KAMU
const firebaseConfig = {
    apiKey: "AIzaSy...", 
    authDomain: "clean-isabel-app.firebaseapp.com",
    databaseURL: "https://clean-isabel-app-default-rtdb.firebaseio.com",
    projectId: "clean-isabel-app",
    storageBucket: "clean-isabel-app.appspot.com",
    messagingSenderId: "...",
    appId: "..."
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

// ==========================================
// 🔑 PROSES LOGIN & CEK ROLE USER
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
            karyawanSection.style.style = 'none'; // reset
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
// 👷 LOGIKA SISI KARYAWAN
// ==========================================
function aktifkanFiturKaryawan() {
    // ⏰ LOGIKA ABSENSI KARYAWAN
    const btnMasuk = document.getElementById('btn-absen-masuk');
    const btnPulang = document.getElementById('btn-absen-pulang');
    const absenStatus = document.getElementById('absen-status');
    const absenFeedback = document.getElementById('absen-feedback');
    const todayStr = new Date().toISOString().split('T')[0];

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

    // 🧹 TOMBOL "STATUS AREA" UNTUK KARYAWAN (POPUP SELESAI AREA)
    const btnStatusAreaKaryawan = document.getElementById('menu-karyawan-status-area');
    btnStatusAreaKaryawan.onclick = () => {
        const namaArea = prompt("Masukkan Nama Area yang selesai dibersihkan:\n(Contoh: Area A, Area B, Lorong Utama, Toilet)");
        if (!namaArea) return;

        const sekarang = new Date();
        const tglJamStr = sekarang.toLocaleDateString('id-ID') + " - " + sekarang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const cleanAreaID = namaArea.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

        set(ref(db, `monitoring_area/${todayStr}/${cleanAreaID}`), {
            area: namaArea,
            oleh: currentUserEmail,
            uid: currentUserUID,
            waktu: tglJamStr,
            status: "Butuh Pengecekan",
            catatanAdmin: "-"
        }).then(() => alert(`Berhasil! ${namaArea} dilaporkan selesai ke Admin.`));
    };

    // 🔔 REAL-TIME NOTIFIKASI BALIKAN DARI ADMIN
    const textNotifKaryawan = document.getElementById('text-notif-karyawan');
    const boxNotifKaryawan = document.getElementById('notif-area-karyawan');
    onValue(ref(db, `monitoring_area/${todayStr}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            let infoTeks = "<strong>Update Status Area Hari Ini:</strong><br>";
            for (let id in data) {
                if (data[id].uid === currentUserUID) {
                    let warnaStatus = "text-warning-clean";
                    if (data[id].status === "Area Bersih") warnaStatus = "text-success-clean";
                    if (data[id].status === "Masih Kotor" || data[id].status === "Kurang Bersih") warnaStatus = "text-danger-clean";

                    infoTeks += `📍 <b>${data[id].area}</b>: <span class="${warnaStatus}">${data[id].status}</span><br>`;
                }
            }
            textNotifKaryawan.innerHTML = infoTeks;
        }
    });
}

// ==========================================
// 👑 LOGIKA SISI ADMIN
// ==========================================
function aktifkanFiturAdmin() {
    const todayStr = new Date().toISOString().split('T')[0];

    // Slide 4: Buka/Tutup Monitor Absensi Admin
    document.getElementById('menu-pantau-absensi').onclick = () => document.getElementById('halaman-detail-absensi').style.display = 'block';
    document.getElementById('btn-tutup-absensi').onclick = () => document.getElementById('halaman-detail-absensi').style.display = 'none';

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

    // 🧹 SLIDE 3: MONITOR & EVALUASI KERJA AREA ADMIN
    document.getElementById('menu-admin-pantau-kerja').onclick = () => document.getElementById('halaman-pantau-kerja-admin').style.display = 'block';
    document.getElementById('btn-tutup-pantau-kerja').onclick = () => document.getElementById('halaman-pantau-kerja-admin').style.display = 'none';

    onValue(ref(db, `monitoring_area/${todayStr}`), (snapshot) => {
        const data = snapshot.val();
        const tbody = document.getElementById('table-pantau-area-body');
        tbody.innerHTML = "";
        
        if (data) {
            for (let areaID in data) {
                let statusClass = "text-warning-clean";
                if (data[areaID].status === "Area Bersih") statusClass = "text-success-clean";
                if (data[areaID].status === "Kurang Bersih" || data[areaID].status === "Masih Kotor") statusClass = "text-danger-clean";

                tbody.innerHTML += `<tr>
                    <td><small>${data[areaID].waktu}<br>By: ${data[areaID].oleh}</small></td>
                    <td><b>${data[areaID].area}</b></td>
                    <td><span class="${statusClass}">${data[areaID].status}</span></td>
                    <td>
                        <button class="btn-evaluasi btn-eval-bersih" onclick="evaluasiArea('${areaID}', 'Area Bersih')">Bersih ✅</button>
                        <button class="btn-evaluasi btn-eval-kurang" onclick="evaluasiArea('${areaID}', 'Kurang Bersih')">Kurang ⚠️</button>
                        <button class="btn-evaluasi btn-eval-kotor" onclick="evaluasiArea('${areaID}', 'Masih Kotor')">Kotor ❌</button>
                    </td>
                </tr>`;
            }
        } else {
            tbody.innerHTML = `<tr><td colspan="4" class="tabel-kosong">Belum ada laporan penyelesaian area hari ini.</td></tr>`;
        }
    });
}

// Fungsi global agar bisa dipanggil langsung dari onclick HTML dinamis tabel admin
window.evaluasiArea = function(areaID, statusBaru) {
    const todayStr = new Date().toISOString().split('T')[0];
    update(ref(db, `monitoring_area/${todayStr}/${areaID}`), { status: statusBaru })
        .then(() => alert(`Evaluasi disimpan: ${statusBaru}`));
};
