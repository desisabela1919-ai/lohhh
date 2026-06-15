import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// Render Dropdown Gedung Dinamis & Tabel Manajemen Gedung (Admin Pusat)
onValue(ref(db, 'daftar_gedung'), (snapshot) => {
    const listGedung = snapshot.val();
    const selectRegLokasi = document.getElementById('reg-lokasi');
    const selectAdminInputArea = document.getElementById('input-area-pilih-gedung');
    const tbodyGedungMaster = document.getElementById('table-master-gedung-body');
    
    if(selectRegLokasi) selectRegLokasi.innerHTML = "";
    if(selectAdminInputArea) selectAdminInputArea.innerHTML = "";
    if(tbodyGedungMaster) tbodyGedungMaster.innerHTML = "";

    if (listGedung) {
        for (let idGedung in listGedung) {
            const namaTampil = idGedung.replace(/_-_/g, ' - ').replace(/_/g, ' ');
            if(selectRegLokasi) selectRegLokasi.innerHTML += `<option value="${idGedung}">${namaTampil}</option>`;
            if(selectAdminInputArea) selectAdminInputArea.innerHTML += `<option value="${idGedung}">${namaTampil}</option>`;
            
            // Render ke tabel manajemen gedung khusus admin pusat
            if(tbodyGedungMaster) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><b>${namaTampil}</b></td>
                    <td><button class="btn-action-danger" onclick="hapusGedungDanPekerjaan('${idGedung}')"><i class="fa-solid fa-trash"></i> Hapus Mitra</button></td>
                `;
                tbodyGedungMaster.appendChild(tr);
            }
        }
    } else {
        if(tbodyGedungMaster) tbodyGedungMaster.innerHTML = `<tr><td colspan="2" style="text-align:center; color:#999;">Belum ada gedung mitra terdaftar.</td></tr>`;
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
                nama: nama, email: email, gedung: lokasi, shift: "Pagi", status: "Pending", role: roleDipilih, tgl_status: "-"
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

// Routing Sistem - MEMASTIKAN HALAMAN LOGIN HILANG SAAT SUDAH MASUK
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserUID = user.uid;
        onValue(ref(db, `users_profile/${currentUserUID}`), (snapshot) => {
            const profil = snapshot.val();
            if (profil && (profil.status === "Aktif" || profil.status === "Nonaktif (Masa Tenggang)")) {
                
                // Jika dia masuk masa tenggang, blokir akses masuk aplikasi klien
                if(profil.status === "Nonaktif (Masa Tenggang)") {
                    alert(`Akun Anda dinonaktifkan karena pemutusan kemitraan gedung. Masa tenggang data berlaku 3 bulan untuk sisa pembayaran gaji/administrasi. Hubungi Admin Pusat.`);
                    signOut(auth);
                    return;
                }

                userRoleKunci = profil.role; 
                userGedungKunci = profil.gedung;
                userShiftKunci = profil.shift;

                loginPage.style.display = 'none';
                mainHeader.style.display = 'none'; 

                if (userRoleKunci === "Karyawan") {
                    mainHeader.style.display = 'block';
                    userDisplayEmail.textContent = `${profil.nama} [${profil.role}]`;
                    roleTitle.innerHTML = `Smart Clean Hub - Karyawan`;
                    karyawanSection.style.display = 'block'; 
                    adminSection.style.display = 'none';
                    aktifkanFiturKaryawan();
                } else {
                    mainHeader.style.display = 'block'; 
                    userDisplayEmail.textContent = `${profil.nama} [${profil.role}]`;
                    roleTitle.innerHTML = userRoleKunci === "Admin Pusat" ? 'Smart Clean Hub - Pusat ⭐' : 'Smart Clean Hub - Admin Gedung 🏢';
                    adminSection.style.display = 'block'; 
                    karyawanSection.style.display = 'none';
                    aktifkanFiturAdmin();
                }
            } else if (profil && profil.status === "Pending") {
                alert("Akun Anda belum disetujui/di-approve oleh Admin Pusat."); 
                signOut(auth);
            } else {
                if(user.email.includes("admin")) {
                    set(ref(db, `users_profile/${user.uid}`), { nama: "Admin Utama", email: user.email, status: "Aktif", role: "Admin Pusat", gedung: "Semua", shift: "-", tgl_status: "-" });
                } else { signOut(auth); }
            }
        });
    } else {
        loginPage.style.display = 'block'; 
        mainHeader.style.display = 'none';
        adminSection.style.display = 'none'; 
        karyawanSection.style.display = 'none';
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
        document.getElementById('input-kawasan-utama').value = "";
        document.getElementById('input-sub-tower').value = "";
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
        document.getElementById('input-nama-area-baru').value = "";
    };

    document.getElementById('btn-submit-project-baru').onclick = () => {
        const gd = document.getElementById('input-area-pilih-gedung').value;
        const pj = document.getElementById('input-nama-project-baru').value.trim();
        if(!pj) return;
        set(ref(db, `monitoring_area/${gd}/${todayStr}/proj_${Date.now()}`), { area: pj, status: "Belum Dikerjakan", keterangan: "-", oleh: "-", tipe: "Project" });
        alert("Sukses!");
        document.getElementById('input-nama-project-baru').value = "";
    };

    // Render Tabel Staff & Approval Karyawan (Lengkap Hitungan Sisa Masa Tenggang)
    onValue(ref(db, 'users_profile'), (snapshot) => {
        const users = snapshot.val(); const tbody = document.getElementById('table-approval-karyawan-body'); tbody.innerHTML = "";
        for (let uid in users) {
            if(users[uid].role === "Admin Pusat") continue;
            if(userRoleKunci === "Admin Gedung" && users[uid].gedung !== userGedungKunci) continue;

            const u = users[uid];
            let statusBadge = "";
            let actionButton = "";

            if (u.status === "Pending") {
                statusBadge = `<span style="color: #e74a3b; font-weight:bold;">Pending</span>`;
                actionButton = `<button class="btn-action-success" onclick="approveAkun('${uid}')"><i class="fa-solid fa-check"></i> Approve</button>`;
            } else if (u.status === "Aktif") {
                statusBadge = `<span style="color: #1cc88a; font-weight:bold;">Aktif</span>`;
                actionButton = `<button class="btn-action-danger" onclick="suspendAkun('${uid}')">Suspend</button>`;
            } else if (u.status === "Nonaktif (Masa Tenggang)") {
                // Logika hitung sisa hari dari 3 bulan (90 hari) masa tenggang data gaji
                const tglSakit = new Date(u.tgl_status);
                const tglSekarang = new Date();
                const selisihWaktu = tglSekarang.getTime() - tglSakit.getTime();
                const selisihHari = Math.floor(selisihWaktu / (1000 * 3600 * 24));
                const sisaHari = 90 - selisihHari;

                statusBadge = `<span style="color: #f6c23e; font-weight:bold; font-size:11px;">Masa Tenggang Gaji<br>(${sisaHari > 0 ? sisaHari : 0} Hari Sisa)</span>`;
                actionButton = `<button class="btn-action-danger" style="background:#5a5c69;" onclick="hapusKaryawanPermanen('${uid}')">Hapus Permanen</button>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><b>${u.nama}</b><br><small>${u.email}</small></td>
                <td>Jabatan: <b>${u.role}</b><br><small>Gedung: ${u.gedung.replace(/_-_/g, ' ')}</small></td>
                <td>${statusBadge}</td>
                <td>${actionButton}</td>
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
                            <button style="background:green; color:white; font-size:10px; border:none; padding:4px; border-radius:4px; cursor:pointer;" onclick="evalArea('${gd}','${id}','Area Resmi Bersih')">Clean</button>
                            <button style="background:red; color:white; font-size:10px; border:none; padding:4px; border-radius:4px; cursor:pointer;" onclick="evalArea('${gd}','${id}','Masih Kotor')">Dirty</button>
                        </td>
                    `;
                    tbodyEval.appendChild(tr);
                }
            });
        }
    });
}

// ACTION CONTROLLER (TERMASUK LOGIKA PENGAMANAN DATA GAJI 3 BULAN)
window.approveAkun = function(uid) {
    update(ref(db, `users_profile/${uid}`), { status: "Aktif", tgl_status: new Date().toISOString().split('T')[0] }).then(() => alert("Akun Resmi Di-Approve & Aktif!"));
};

window.suspendAkun = function(uid) {
    update(ref(db, `users_profile/${uid}`), { status: "Pending", tgl_status: new Date().toISOString().split('T')[0] }).then(() => alert("Akses Di-Nonaktifkan!"));
};

window.hapusKaryawanPermanen = function(uid) {
    if(confirm("Apakah sisa gaji dan administrasi karyawan ini sudah selesai? Data akan dihapus permanen.")) {
        remove(ref(db, `users_profile/${uid}`)).then(() => alert("Data karyawan resmi dibersihkan dari server pusat."));
    }
};

window.evalArea = function(gedung, id, status) {
    const todayStr = new Date().toISOString().split('T')[0];
    update(ref(db, `monitoring_area/${gedung}/${todayStr}/${id}`), { status: status }).then(() => alert("Evaluasi Tersimpan!"));
};

// FITUR PUSAT: HAPUS MITRA GEDUNG, PEKERJAANNYA & AMANKAN DATA STAF 3 BULAN
window.hapusGedungDanPekerjaan = function(idGedung) {
    const namaBersih = idGedung.replace(/_-_/g, ' ');
    if(confirm(`PERINGATAN UTAMA!\nApakah Anda yakin kontrak gedung "${namaBersih}" sudah tidak berlanjut?\n\nSistem otomatis akan:\n1. Menghapus Gedung Master.\n2. Menghapus seluruh Log Pekerjaan.\n3. Mengamankan data karyawan ke Masa Tenggang Gaji (3 Bulan).`)) {
        
        // 1. Hapus Gedung Master
        remove(ref(db, `daftar_gedung/${idGedung}`)).then(() => {
            // 2. Hapus seluruh pekerjaan monitoring area di gedung itu
            remove(ref(db, `monitoring_area/${idGedung}`));
            
            // 3. Cari karyawan di gedung tersebut dan pindahkan ke status masa tenggang
            onValue(ref(db, 'users_profile'), (snapshot) => {
                const users = snapshot.val();
                for(let uid in users) {
                    if(users[uid].gedung === idGedung && users[uid].role !== "Admin Pusat") {
                        update(ref(db, `users_profile/${uid}`), {
                            status: "Nonaktif (Masa Tenggang)",
                            tgl_status: new Date().toISOString().split('T')[0]
                        });
                    }
                }
            }, { onlyOnce: true });

            alert(`Sukses! Gedung "${namaBersih}" dan log pekerjaan berhasil dihapus. Seluruh data staf gedung tersebut telah diamankan selama 3 bulan untuk keperluan sisa gaji.`);
        });
    }
};
