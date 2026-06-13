import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// =================================================================
// ⚠️ DATA CONFIG FIREBASE CONSOLE
// =================================================================
const firebaseConfig = {
  apiKey: "AIzaSyBnXFEJjTovKQUGs74ZcziZ6odR6qxYeug",
  authDomain: "clean-isabel-app-eaca6.firebaseapp.com",
  projectId: "clean-isabel-app-eaca6",
  storageBucket: "clean-isabel-app-eaca6.firebasestorage.app",
  messagingSenderId: "929083923327",
  appId: "1:929083923327:web:3ebff1bbdd42eb3494984a",
  databaseURL: "https://clean-isabel-app-eaca6-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// DAFTAR EMAIL ADMIN
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

// FUNGSI TANGGAL & WAKTU (WIB)
function getTanggalSekarang() {
    const d = new Date();
    const tahun = d.getFullYear();
    const bulan = String(d.getMonth() + 1).padStart(2, '0');
    const tanggal = String(d.getDate()).padStart(2, '0');
    return `${tahun}-${bulan}-${tanggal}`; // Hasil pasti: YYYY-MM-DD
}

function getWaktuSekarang() {
    const d = new Date();
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + " WIB";
}

function formatEmailUntukKey(email) {
    return email.replace(/\./g, '_').replace(/@/g, '_');
}

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
            aktifkanMonitorAbsensiAdmin();
        } else {
            roleTitle.innerText = "Panel Karyawan 👷";
            karyawanSection.style.display = 'block';
            adminSection.style.display = 'none';
            cekStatusAbsenKaryawan(user.email);
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

// 4. KARYAWAN: CEK STATUS ABSEN HARI INI
function cekStatusAbsenKaryawan(email) {
    const tanggal = getTanggalSekarang();
    const userKey = formatEmailUntukKey(email);
    const absenRef = ref(database, `absensi/${tanggal}/${userKey}`);

    onValue(absenRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            if (data.jamMasuk && data.jamPulang !== "--") {
                absenStatus.innerText = `Sudah Pulang (${data.jamPulang})`;
                absenStatus.style.color = "#dc3545";
                absenFeedback.innerText = "Absensi hari ini selesai. Selamat beristirahat!";
                btnAbsenMasuk.disabled = true;
                btnAbsenPulang.disabled = true;
            } else if (data.jamMasuk) {
                absenStatus.innerText = `Sudah Masuk (${data.jamMasuk})`;
                absenStatus.style.color = "green";
                absenFeedback.innerText = "Jangan lupa absen pulang nanti setelah selesai kerja!";
                btnAbsenMasuk.disabled = true;
                btnAbsenPulang.disabled = false;
            }
        } else {
            absenStatus.innerText = "Belum Absen";
            absenStatus.style.color = "#1a73e8";
            absenFeedback.innerText = "";
            btnAbsenMasuk.disabled = false;
            btnAbsenPulang.disabled = true;
        }
    });
}

// 5. KARYAWAN: TOMBOL ABSEN MASUK & PULANG
if (btnAbsenMasuk) {
    btnAbsenMasuk.addEventListener('click', () => {
        const email = auth.currentUser.email;
        const namaKaryawan = email.split('@')[0].toUpperCase();
        const tanggal = getTanggalSekarang();
        const userKey = formatEmailUntukKey(email);
        const jamMasuk = getWaktuSekarang();

        set(ref(database, `absensi/${tanggal}/${userKey}`), {
            nama: namaKaryawan,
            email: email,
            jamMasuk: jamMasuk,
            jamPulang: "--",
            status: "Hadir"
        }).then(() => {
            alert("Absen masuk berhasil disimpan!");
        });
    });
}

if (btnAbsenPulang) {
    btnAbsenPulang.addEventListener('click', () => {
        const email = auth.currentUser.email;
        const tanggal = getTanggalSekarang();
        const userKey = formatEmailUntukKey(email);
        const jamPulang = getWaktuSekarang();

        set(ref(database, `absensi/${tanggal}/${userKey}/jamPulang`), jamPulang).then(() => {
            alert("Absen pulang berhasil disimpan!");
        });
    });
}

// 6. ADMIN: MONITOR ABSENSI REAL-TIME
function aktifkanMonitorAbsensiAdmin() {
    const tanggal = getTanggalSekarang();
    const listAbsenRef = ref(database, `absensi/${tanggal}`);
    const tableBody = document.getElementById('table-absensi-body');

    if (!tableBody) return; // Mencegah eror jika elemen tabel tidak ada

    onValue(listAbsenRef, (snapshot) => {
        const data = snapshot.val();
        tableBody.innerHTML = ""; 

        if (data) {
            Object.keys(data).forEach((key) => {
                const absen = data[key];
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${absen.nama}</strong><br><span style="font-size:11px; color:#666;">${absen.email}</span></td>
                    <td style="color: green; font-weight: bold;">${absen.jamMasuk}</td>
                    <td style="color: #dc3545; font-weight: bold;">${absen.jamPulang}</td>
                    <td><span style="background-color: #e6f4ea; color: #137333; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${absen.status}</span></td>
                `;
                tableBody.appendChild(tr);
            });
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; color: #888; padding: 20px;">Belum ada data absensi hari ini.</td>
                </tr>
            `;
        }
    });
}

// 7. BUKA TUTUP SLIDE MONITOR ABSENSI ADMIN
if (menuPantauAbsensi && halamanDetailAbsensi && btnTutupAbsensi) {
    menuPantauAbsensi.addEventListener('click', () => {
        halamanDetailAbsensi.style.display = 'block';
    });
    btnTutupAbsensi.addEventListener('click', () => {
        halamanDetailAbsensi.style.display = 'none';
    });
}
