import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// GANTI DENGAN CONFIG DATA FIREBASE KAMU SENDIRI
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

const loginPage = document.getElementById('login-page');
const loginForm = document.getElementById('login-form');
const mainHeader = document.getElementById('main-header');
const roleTitle = document.getElementById('role-title');
const userDisplayEmail = document.getElementById('user-display-email');
const btnLogout = document.getElementById('btn-logout');
const karyawanSection = document.getElementById('karyawan-section');
const adminSection = document.getElementById('admin-section');

let currentUserUID = "";
let userGedungKunci = "";
let userShiftKunci = "";
let userRoleKunci = ""; 

document.getElementById('link-buka-daftar').onclick = (e) => { e.preventDefault(); document.getElementById('form-daftar-karyawan').style.display = 'block'; };
document.getElementById('btn-batal-daftar').onclick = () => { document.getElementById('form-daftar-karyawan').style.display = 'none'; };

// Render Dropdown Gedung Dinamis
onValue(ref(db, 'daftar_gedung'), (snapshot) => {
    const listGedung = snapshot.val();
    const selectRegLokasi = document.getElementById('reg-lokasi');
    const selectAdminInputArea = document.getElementById('input-area-pilih-gedung');
    if(selectRegLokasi) selectRegLokasi.innerHTML = "";
    if(selectAdminInputArea) selectAdminInputArea.innerHTML = "";

    if (listGedung) {
        for (let idGedung in listGedung) {
            const namaTampil = idGedung.replace(/_-_/g, ' - ').replace(/_/g, ' ');
            if(selectRegLokasi) selectRegLokasi.innerHTML += `<option value="${idGedung}">${namaTampil}</option>`;
            if(selectAdminInputArea) selectAdminInputArea.innerHTML += `<option value="${idGedung}">${namaTampil}</option>`;
        }
    }
});

// Registrasi Akun Mandiri (Menyimpan Jabatan Request)
document.getElementById('btn-submit-daftar').onclick = () => {
    const nama = document.getElementById('reg-nama').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-password').value.trim();
    const roleDipilih = document.getElementById('reg-role').value;
    const lokasi = document.getElementById('reg-lokasi').value;

    if (!nama || !email || !pass) { alert("Semua form wajib diisi!"); return; }

    createUserWithEmailAndPassword(auth, email, pass)
        .then((userCredential) => {
            set(ref(db, `users_profile/${userCredential.user.uid}`), {
                nama: nama, email: email, gedung: lokasi, shift: "Pagi", status: "Pending", role: roleDipilih
            }).then(() => {
                alert(`Pendaftaran sebagai [${roleDipilih}] berhasil! Hubungi Admin Pusat untuk aktivasi.`);
                signOut(auth);
                document.getElementById('form-daftar-karyawan').style.display = 'none';
                loginForm.reset();
            });
        }).catch((err) => alert(err.message));
};

// Login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('login-email').value;
    const passInput = document.getElementById('login-password').value;
    signInWithEmailAndPassword(auth, emailInput, passInput).catch((err) => {
        document.getElementById('login-error').textContent = "Login Gagal: " + err.message;
    });
});

btnLogout.addEventListener('click', () => { signOut(auth); });

// Routing Sistem 3 Tingkat Jabatan
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserUID = user.uid;
        onValue(ref(db, `users_profile/${currentUserUID}`), (snapshot) => {
            const profil = snapshot.val();
            if (profil && profil.status === "Aktif") {
                userRoleKunci = profil.role; 
                userGedungKunci = profil.gedung;
                userShiftKunci = profil.shift;

                loginPage.style.display = 'none';
                mainHeader.style.display = 'block'; 
                userDisplayEmail.textContent = `${profil.nama} [${profil.role}]`;

                if (userRoleKunci === "Karyawan") {
                    roleTitle.innerHTML = `Smart Clean Hub - Karyawan`;
                    karyawanSection.style.display = 'block'; adminSection.style.display = 'none';
                    aktifkanFiturKaryawan();
                } else {
                    roleTitle.innerHTML = userRoleKunci === "Admin Pusat" ? 'Smart Clean Hub - Pusat ⭐' : 'Smart Clean Hub - Admin Gedung 🏢';
                    adminSection.style.display = 'block'; karyawanSection.style.display = 'none';
                    aktifkanFiturAdmin();
                }
            } else if (profil && profil.status === "Pending") {
                alert("Akun Anda belum disetujui/di-approve oleh Admin Pusat."); signOut(auth);
            } else {
                if(user.email.includes("admin")) {
                    set(ref(db, `users_profile/${user.uid}`), { nama: "Admin Utama", email: user.email, status: "Aktif", role: "Admin Pusat", gedung: "Semua", shift: "-" });
                } else { signOut(auth); }
            }
        });
    } else {
        loginPage.style.display = 'block'; mainHeader.style.display = 'none';
        adminSection.style.display = 'none'; karyawanSection.style.display = 'none';
    }
});

function aktifkanFiturKaryawan() {
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('pilih-shift').value = userShiftKunci;
    document.getElementById('pilih-shift').disabled = true;

    onValue(ref(db, `absensi/${userGedungKunci}/${todayStr}/${currentUserUID}`), (snapshot) => {
        const data = snapshot.val();
        const absenStatus = document.getElementById('absen-status');
        if (data) {
            if (data.masuk && data.pulang) { absenStatus.className = "status-sudah-pulang"; absenStatus.textContent = `Selesai Kerja`; }
            else if (data.masuk) { absenStatus.className = "status-sudah-masuk"; absenStatus.textContent = `Aktif Kerja (${data.masuk})`; document.getElementById('btn-absen-pulang').disabled = false; }
        }
    });

    document.getElementById('btn-absen-masuk').onclick = () => {
        const jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        set(ref(db, `absensi/${userGedungKunci}/${todayStr}/${currentUserUID}`), { nama: auth.currentUser.email, masuk: jam, status: "Aktif", shift: userShiftKunci });
    };
    document.getElementById('btn-absen-pulang').onclick = () => {
        const jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        update(ref(db, `absensi/${userGedungKunci}/${todayStr}/${currentUserUID}`), { pulang: jam, status: "Selesai" });
    };
    renderGridAreaKaryawan(todayStr);
}

function renderGridAreaKaryawan(todayStr) {
    const grid = document.getElementById('grid-area-karyawan');
    onValue(ref(db, `monitoring_area/${userGedungKunci}/${todayStr}`), (snapshot) => {
        const data = snapshot.val() || {}; grid.innerHTML = "";
        for (let id in data) {
            const item = data[id];
            const card = document.createElement('div'); card.className = "card-grid-area";
            card.innerHTML = `<h4>${item.area}</h4><p>Status: <span class="badge-status">${item.status}</span></p><button class="btn-lapor-area" id="lpr-${id}">Selesai</button>`;
            grid.appendChild(card);
            document.getElementById(`lpr-${id}`).onclick = () => {
                update(ref(db, `monitoring_area/${userGedungKunci}/${todayStr}/${id}`), { oleh: auth.currentUser.email.split('@')[0], status: "Butuh Check Admin" });
            };
        }
    });
}

function aktifkanFiturAdmin() {
    const todayStr = new Date().toISOString().split('T')[0];

    if (userRoleKunci === "Admin Pusat") {
        document.getElementById('block-admin-pusat-only').style.display = 'block';
    } else {
        document.getElementById('block-admin-pusat-only').style.display = 'none';
    }

    document.getElementById('menu-pantau-absensi').onclick = () => document.getElementById('halaman-detail-absensi').style.display = 'block';
    document.getElementById('btn-tutup-absensi').onclick = () => document.getElementById('halaman-detail-absensi').style.display = 'none';
    document.getElementById('menu-admin-pantau-kerja').onclick = () => document.getElementById('halaman-pantau-kerja-admin').style.display = 'block';
    document.getElementById('btn-tutup-pantau-kerja').onclick = () => document.getElementById('halaman-pantau-kerja-admin').style.display = 'none';

    // Simpan Gedung (Pusat Only)
    document.getElementById('btn-submit-gedung-baru').onclick = () => {
        const kw = document.getElementById('input-kawasan-utama').value.trim().replace(/\s+/g, '_');
        const tw = document.getElementById('input-sub-tower').value.trim().replace(/\s+/g, '_');
        if(!kw || !tw) return;
        set(ref(db, `daftar_gedung/${kw}_-_${tw}`), { kawasan: kw, tower: tw });
        alert("Gedung Master Berhasil Disimpan!");
    };

    if(userRoleKunci === "Admin Gedung") {
        document.getElementById('input-area-pilih-gedung').value = userGedungKunci;
        document.getElementById('input-area-pilih-gedung').disabled = true;
    }

    document.getElementById('btn-submit-area-baru').onclick = () => {
        const gd = document.getElementById('input-area-pilih-gedung').value;
        const ar = document.getElementById('input-nama-area-baru').value.trim();
        if(!ar) return;
        set(ref(db, `monitoring_area/${gd}/${todayStr}/daily_${Date.now()}`), { area: ar, status: "Belum Dikerjakan", keterangan: "-", oleh: "-", tipe: "Daily" });
        alert("Sukses!");
    };

    document.getElementById('btn-submit-project-baru').onclick = () => {
        const gd = document.getElementById('input-area-pilih-gedung').value;
        const pj = document.getElementById('input-nama-project-baru').value.trim();
        if(!pj) return;
        set(ref(db, `monitoring_area/${gd}/${todayStr}/proj_${Date.now()}`), { area: pj, status: "Belum Dikerjakan", keterangan: "-", oleh: "-", tipe: "Project" });
        alert("Sukses!");
    };

    // Render Tabel Approval Pendaftaran Langsung
    onValue(ref(db, 'users_profile'), (snapshot) => {
        const users = snapshot.val(); const tbody = document.getElementById('table-approval-karyawan-body'); tbody.innerHTML = "";
        for (let uid in users) {
            if(users[uid].role === "Admin Pusat") continue;
            if(userRoleKunci === "Admin Gedung" && users[uid].gedung !== userGedungKunci) continue;

            const u = users[uid];
            const statusWarna = u.status === "Pending" ? "color: red; font-weight:bold;" : "color: green;";
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><b>${u.nama}</b><br><small>${u.email}</small></td>
                <td>Jabatan: <b>${u.role}</b><br><small>Gedung: ${u.gedung.replace(/_-_/g, ' ')}</small></td>
                <td style="${statusWarna}">${u.status}</td>
                <td>
                    ${u.status === "Pending" ? 
                    `<button style="background:#1cc88a; color:white; font-size:11px; padding: 4px 8px; border:none; border-radius:4px; cursor:pointer;" onclick="approveAkun('${uid}')"><i class="fa-solid fa-check"></i> Approve</button>` : 
                    `<button style="background:#e74a3b; color:white; font-size:11px; padding: 4px 8px; border:none; border-radius:4px; cursor:pointer;" onclick="suspendAkun('${uid}')">Suspend</button>`}
                </td>
            `;
            tbody.appendChild(tr);
        }
    });

    // Real-time Evaluasi Kebersihan
    onValue(ref(db, 'daftar_gedung'), (snapshotGedung) => {
        const listGedung = snapshotGedung.val() || {};
        const tbodyEval = document.getElementById('table-pantau-area-body'); tbodyEval.innerHTML = "";
        
        for (let gd in listGedung) {
            if(userRoleKunci === "Admin Gedung" && gd !== userGedungKunci) continue;

            onValue(ref(db, `monitoring_area/${gd}/${todayStr}`), (snapshotArea) => {
                const areas = snapshotArea.val();
                for (let id in areas) {
                    const item = areas[id];
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><small>${item.oleh || '-'}</small></td>
                        <td><b>${item.area}</b><br><small>${gd.replace(/_-_/g,' ')}</small></td>
                        <td>${item.status}</td>
                        <td>
                            <button style="background:green; color:white; font-size:10px;" onclick="evalArea('${gd}','${id}','Area Resmi Bersih')">Clean</button>
                            <button style="background:red; color:white; font-size:10px;" onclick="evalArea('${gd}','${id}','Masih Kotor')">Dirty</button>
                        </td>
                    `;
                    tbodyEval.appendChild(tr);
                }
            });
        }
    });
}

// Global Actions untuk Dashboard Control Admin
window.approveAkun = function(uid) {
    update(ref(db, `users_profile/${uid}`), { status: "Aktif" }).then(() => alert("Akun Resmi Di-Approve & Aktif!"));
};
window.suspendAkun = function(uid) {
    update(ref(db, `users_profile/${uid}`), { status: "Pending" }).then(() => alert("Akses Di-Nonaktifkan!"));
};
window.evalArea = function(gedung, id, status) {
    const todayStr = new Date().toISOString().split('T')[0];
    update(ref(db, `monitoring_area/${gedung}/${todayStr}/${id}`), { status: status }).then(() => alert("Evaluasi Tersimpan!"));
};
