import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { auth, db } from "./firebase-config.js";

// ================================================================= */
// DOM ELEMENT IDENTIFIER UTAMA UNTUK AUTENTIKASI
// ================================================================= */
const loginPage = document.getElementById('login-page');
const loginForm = document.getElementById('login-form');
const mainHeader = document.getElementById('main-header');
const userDisplayEmail = document.getElementById('user-display-email');
const btnLogout = document.getElementById('btn-logout');
const karyawanSection = document.getElementById('karyawan-section');
const adminSection = document.getElementById('admin-section');

// Variable State Global yang akan di-share ke modul lain jika diperlukan
export let currentUserUID = "";
export let userGedungKunci = "";
export let userShiftKunci = "Shift 1"; 
export let userRoleKunci = ""; 
export let userNamaKunci = "";

// Trigger Modal Registrasi Karyawan
if(document.getElementById('link-buka-daftar')) {
    document.getElementById('link-buka-daftar').onclick = (e) => { 
        e.preventDefault(); 
        document.getElementById('form-daftar-karyawan').style.display = 'block'; 
    };
}
if(document.getElementById('btn-batal-daftar')) {
    document.getElementById('btn-batal-daftar').onclick = () => { 
        document.getElementById('form-daftar-karyawan').style.display = 'none'; 
    };
}

// SUBMIT REGISTRASI KARYAWAN BARU
if(document.getElementById('btn-submit-daftar')) {
    document.getElementById('btn-submit-daftar').onclick = () => {
        const nama = document.getElementById('reg-nama').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const pass = document.getElementById('reg-password').value.trim();
        const roleDipilih = document.getElementById('reg-role').value;
        const lokasi = document.getElementById('reg-lokasi').value;

        if (!nama || !email || !pass) { alert("Data wajib diisi semua!"); return; }

        createUserWithEmailAndPassword(auth, email, pass)
            .then((userCredential) => {
                set(ref(db, `users_profile/${userCredential.user.uid}`), {
                    nama: nama, 
                    email: email, 
                    gedung: lokasi, 
                    shift: "Shift 1", 
                    status: "Pending", 
                    role: roleDipilih, 
                    tgl_status: "-"
                }).then(() => {
                    alert(`Pendaftaran Berhasil! Menunggu persetujuan admin gedung.`);
                    signOut(auth);
                    document.getElementById('form-daftar-karyawan').style.display = 'none';
                    if(loginForm) loginForm.reset();
                });
            }).catch((err) => alert(err.message));
    };
}

// HANDLER LOGIN SISTEM UTAMA
if(loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        
        signInWithEmailAndPassword(auth, email, pass).catch((err) => {
            const errLabel = document.getElementById('login-error');
            if(errLabel) errLabel.textContent = "Identifikasi Akun Gagal: " + err.message;
        });
    });
}

// HANDLER LOGOUT
if(btnLogout) {
    btnLogout.addEventListener('click', () => { signOut(auth); });
}

// MONITORING STATUS LOGIN USER & SUNTIK INFO HEADER
import { resetHalamanKaryawan, aktifkanFiturKaryawan } from "./karyawan.js";
import { aktifkanFiturAdmin } from "./admin.js";

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserUID = user.uid;
        onValue(ref(db, `users_profile/${currentUserUID}`), (snapshot) => {
            const profil = snapshot.val();
            if (profil && profil.status === "Aktif") {
                userRoleKunci = profil.role; 
                userGedungKunci = profil.gedung;
                userShiftKunci = profil.shift || "Shift 1";
                userNamaKunci = profil.nama;

                if(loginPage) loginPage.style.display = 'none';
                if(mainHeader) mainHeader.style.display = 'block'; 

                const labelGedungHeader = document.getElementById('header-lokasi-label');
                const labelShiftHeader = document.getElementById('header-shift-label');
                
                if (labelGedungHeader) labelGedungHeader.textContent = userGedungKunci.replace(/_-_/g, ' ');
                if (labelShiftHeader) labelShiftHeader.textContent = userShiftKunci;

                if (userRoleKunci === "Karyawan") {
                    if(userDisplayEmail) userDisplayEmail.textContent = `${profil.nama} [Karyawan]`;
                    if(karyawanSection) karyawanSection.style.display = 'block'; 
                    if(adminSection) adminSection.style.display = 'none';
                    resetHalamanKaryawan();
                    aktifkanFiturKaryawan();
                } else {
                    if(userDisplayEmail) userDisplayEmail.textContent = `${profil.nama} [Dashboard Pengawas]`;
                    if (labelGedungHeader && userRoleKunci === "Admin Pusat") labelGedungHeader.textContent = "Semua Area Kontrak";
                    if (labelShiftHeader) labelShiftHeader.textContent = "All Shift";
                    
                    if(adminSection) adminSection.style.display = 'block'; 
                    if(karyawanSection) karyawanSection.style.display = 'none';
                    aktifkanFiturAdmin();
                }
            } else if (profil && profil.status === "Pending") {
                alert("Akun anda belum disetujui Pengawas!"); 
                signOut(auth);
            } else {
                if(user.email && user.email.includes("admin")) {
                    set(ref(db, `users_profile/${user.uid}`), { 
                        nama: "Administrator Utama", 
                        email: user.email, 
                        status: "Aktif", 
                        role: "Admin Pusat", 
                        gedung: "Semua", 
                        shift: "-", 
                        tgl_status: "-" 
                    });
                } else { 
                    signOut(auth); 
                }
            }
        });
    } else {
        currentUserUID = "";
        userGedungKunci = "";
        userRoleKunci = "";
        userNamaKunci = "";
        if(loginPage) loginPage.style.display = 'block'; 
        if(mainHeader) mainHeader.style.display = 'none';
        if(adminSection) adminSection.style.display = 'none'; 
        if(karyawanSection) karyawanSection.style.display = 'none';
    }
});
