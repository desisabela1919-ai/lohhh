import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// =================================================================
// ⚠️ ISI DENGAN DATA DARI FIREBASE CONSOLE KAMU
// =================================================================
const firebaseConfig = {
    apiKey: "PASTE_API_KEY_KAMU_DI_SINI",
    authDomain: "PROJECT_ID_KAMU.firebaseapp.com",
    projectId: "PROJECT_ID_KAMU",
    storageBucket: "PROJECT_ID_KAMU.appspot.com",
    messagingSenderId: "NOMOR_SENDER_KAMU",
    appId: "APP_ID_KAMU"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// =================================================================
// 📋 DAFTAR EMAIL YANG BERSTATUS SEBAGAI ADMIN
// =================================================================
const listAdminEmail = [
    "adminisabel@gmail.com",
    "adriansyah@gmail.com"
];

// Menghubungkan elemen HTML ke JavaScript
const loginPage = document.getElementById('login-page');
const dashboardPage = document.getElementById('dashboard-page');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const userDisplayEmail = document.getElementById('user-display-email');
const roleTitle = document.getElementById('role-title');
const btnLogout = document.getElementById('btn-logout');
const karyawanSection = document.getElementById('karyawan-section');
const adminSection = document.getElementById('admin-section');

// 1. Cek Realtime Apakah Pengguna Sudah Login & Apa Perannya
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Jika akun terdaftar di Firebase, buka aplikasi
        loginPage.style.display = 'none';
        dashboardPage.style.display = 'block';
        userDisplayEmail.innerText = user.email;

        // Mengecek apakah email terdaftar di listAdminEmail
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
        // Jika tidak/belum login, paksa ke halaman login kembali
        loginPage.style.display = 'flex';
        dashboardPage.style.display = 'none';
        adminSection.style.display = 'none';
        karyawanSection.style.display = 'none';
    }
});

// 2. Proses Verifikasi Akun Saat Tombol Login Diklik
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loginError.innerText = "Memverifikasi akun...";

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            loginError.innerText = ""; 
        })
        .catch((error) => {
            loginError.innerText = "Akses ditolak! Email atau Password salah.";
        });
});

// 3. Proses Keluar Akun (Logout)
btnLogout.addEventListener('click', () => {
    signOut(auth).then(() => {
        alert("Berhasil keluar dari sistem.");
    });
});
