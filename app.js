import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// =================================================================
// ⚠️ DATA CONFIG FIREBASE CONSOLE
// =================================================================
const firebaseConfig = {
  apiKey: "AIzaSyBnXFEJjTovKQUGs74ZcziZ6odR6qxYeug",
  authDomain: "clean-isabel-app-eaca6.firebaseapp.com",
  projectId: "clean-isabel-app-eaca6",
  storageBucket: "clean-isabel-app-eaca6.firebasestorage.app",
  messagingSenderId: "929083923327",
  appId: "1:929083923327:web:3ebff1bbdd42eb3494984a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// DAFTAR EMAIL USER
const listAdminEmail = ["adminisabel@gmail.com", "adriansyah@gmail.com"];

// ELEMEN HTML DOM
const loginPage = document.getElementById('login-page');
const dashboardPage = document.getElementById('dashboard-page');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const userDisplayEmail = document.getElementById('user-display-email');
const roleTitle = document.getElementById('role-title');
const btnLogout = document.getElementById('btn-logout');
const karyawanSection = document.getElementById('karyawan-section');
const adminSection = document.getElementById('admin-section');

// ELEMEN ABSENSI
const btnAbsenMasuk = document.getElementById('btn-absen-masuk');
const btnAbsenPulang = document.getElementById('btn-absen-pulang');
const absenStatus = document.getElementById('absen-status');
const absenFeedback = document.getElementById('absen-feedback');
const menuPantauAbsensi = document.getElementById('menu-pantau-absensi');
const halamanDetailAbsensi = document.getElementById('halaman-detail-absensi');
const btnTutupAbsensi = document.getElementById('btn-tutup-absensi');

// 1. CEK STATUS AUTHENTICATION REALTIME
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginPage.style.display = 'none';
        dashboardPage.style.display = 'block';
        userDisplayEmail.innerText = user.email;

        if (listAdminEmail.includes(user.email.toLowerCase())) {
            roleTitle.innerText = "Panel Admin 👑";
            adminSection.style.display = 'block';
            karyawanSection.style.display = 'none';
        } else {
            roleTitle.innerText = "Panel Karyawan 👷";
            karyawanSection.style.display = 'block';
            adminSection.style.display = 'none';
        }
    } else {
        loginPage.style.display = 'flex';
        dashboardPage.style.display = 'none';
        adminSection.style.display = 'none';
        karyawanSection.style.display = 'none';
    }
});

// 2. PROSES LOGIN
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loginError.innerText = "Memverifikasi akun...";
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then(() => { loginError.innerText = ""; })
        .catch(() => { loginError.innerText = "Akses ditolak! Email atau Password salah."; });
});

// 3. PROSES LOGOUT
btnLogout.addEventListener('click', () => {
    signOut(auth).then(() => { alert("Berhasil keluar dari sistem."); });
});

// 4. LOGIKA FITUR ABSENSI KARYAWAN
function getWaktuSekarang() {
    const d = new Date();
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + " WIB";
}

if (btnAbsenMasuk) {
    btnAbsenMasuk.addEventListener('click', () => {
        const jamMasuk = getWaktuSekarang();
        absenStatus.innerText = `Sudah Masuk (${jamMasuk})`;
        absenStatus.style.color = "green";
        absenFeedback.innerText = "Absen masuk berhasil dicatat!";
        btnAbsenMasuk.disabled = true;
        btnAbsenPulang.disabled = false;
    });
}

if (btnAbsenPulang) {
    btnAbsenPulang.addEventListener('click', () => {
        const jamPulang = getWaktuSekarang();
        absenStatus.innerText = `Sudah Pulang (${jamPulang})`;
        absenStatus.style.color = "#dc3545";
        absenFeedback.innerText = "Absen pulang berhasil! Selamat beristirahat.";
        btnAbsenPulang.disabled = true;
    });
}

// 5. BUKA TUTUP SLIDE MONITOR ABSENSI ADMIN
if (menuPantauAbsensi && halamanDetailAbsensi && btnTutupAbsensi) {
    menuPantauAbsensi.addEventListener('click', () => {
        halamanDetailAbsensi.style.display = 'block';
    });
    btnTutupAbsensi.addEventListener('click', () => {
        halamanDetailAbsensi.style.display = 'none';
    });
}
