import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// CONFIG DATA FIREBASE KAMU
const firebaseConfig = {
    apiKey: "PASTE_API_KEY_KAMU",
    authDomain: "PASTE_AUTH_DOMAIN_KAMU",
    databaseURL: "PASTE_DATABASE_URL_KAMU",
    projectId: "PASTE_PROJECT_ID_KAMU",
    storageBucket: "PASTE_STORAGE_BUCKET_KAMU",
    messagingSenderId: "PASTE_MESSAGING_SENDER_ID_KAMU",
    appId: "PASTE_APP_ID_KAMU"
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

// Registrasi Akun Mandiri
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
                alert(`Pendaftaran berhasil! Hubungi Admin Pusat untuk aktivasi.`);
                signOut(auth);
                document.getElementById('form-daftar-karyawan').style.display = 'none';
                loginForm.reset();
            });
        }).catch((err) => alert(err.message));
};

// Login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value).catch((err) => {
        document.getElementById('login-error').textContent = "Login Gagal: " + err.message;
    });
});

btnLogout.addEventListener('click', () => { signOut(auth); });

// Routing Sistem Utama
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserUID = user.uid;
        onValue(ref(db, `users_profile/${currentUserUID}`), (snapshot) => {
            const profil = snapshot.val();
            if (profil && (profil.status === "Aktif" || profil.status === "Nonaktif (Masa Tenggang)")) {
                
                if(profil.status === "Nonaktif (Masa Tenggang)") {
                    alert(`Akun Anda masuk masa tenggang data gaji 3 bulan.`);
                    signOut(auth); return;
                }

                userRoleKunci = profil.role; 
                userGedungKunci = profil.gedung;
                userShiftKunci = profil.shift;

                loginPage.style.display = 'none';
                mainHeader.style.display = 'none'; 

                if (userRoleKunci === "Karyawan") {
                    mainHeader.style.display = 'block';
                    userDisplayEmail.textContent = `${profil.nama} [${userGedungKunci.replace(/_-_/g, ' ')}]`;
                    roleTitle.innerHTML = `Smart Clean Hub - Karyawan`;
                    karyawanSection.style.display = 'block'; 
                    adminSection.style.display = 'none';
                    resetHalamanKaryawan();
                    aktifkanFiturKaryawan(profil.nama);
                } else {
                    mainHeader.style.display = 'block'; 
                    userDisplayEmail.textContent = `${profil.nama} [Pusat Control]`;
                    roleTitle.innerHTML = userRoleKunci === "Admin Pusat" ? 'Smart Clean Hub - Pusat ⭐' : 'Smart Clean Hub - Admin Gedung 🏢';
                    adminSection.style.display = 'block'; 
                    karyawanSection.style.display = 'none';
                    aktifkanFiturAdmin();
                }
            } else if (profil && profil.status === "Pending") {
                alert("Akun Anda belum disetujui."); signOut(auth);
            } else {
                if(user.email.includes("admin")) {
                    set(ref(db, `users_profile/${user.uid}`), { nama: "Admin Utama", email: user.email, status: "Aktif", role: "Admin Pusat", gedung: "Semua", shift: "-", tgl_status: "-" });
                } else { signOut(auth); }
            }
        });
    } else {
        loginPage.style.display = 'block'; mainHeader.style.display = 'none';
        adminSection.style.display = 'none'; karyawanSection.style.display = 'none';
    }
});

// ================= MODUL OPERASIONAL DASHBOARD KARYAWAN =================

function resetHalamanKaryawan() {
    document.getElementById('karyawan-menu-grup').style.display = 'block';
    document.getElementById('page-tugas-rutin').style.display = 'none';
    document.getElementById('page-laporan-isu').style.display = 'none';
    document.getElementById('page-stok-chemical').style.display = 'none';
    document.getElementById('page-kirim-bukti').style.display = 'none';
}

function aktifkanFiturKaryawan(namaKaryawan) {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);

    // 1. LOGIKA ABSENSI DAN HITUNG HARI KERJA BULANAN REAL-TIME
    onValue(ref(db, `absensi_global/${userGedungKunci}/${currentMonthStr}`), (snapshot) => {
        const dataBulanIni = snapshot.val() || {};
        let totalHariMasuk = 0;
        let sudahAbsenHariIni = false;
        let sudahPulangHariIni = false;

        for (let tanggal in dataBulanIni) {
            if (dataBulanIni[tanggal][currentUserUID]) {
                totalHariMasuk++;
                if (tanggal === todayStr) {
                    sudahAbsenHariIni = true;
                    if (dataBulanIni[tanggal][currentUserUID].pulang) {
                        sudahPulangHariIni = true;
                    }
                }
            }
        }

        document.getElementById('total-hari-kerja').textContent = `${totalHariMasuk} Hari Kerja`;
        const absenStatus = document.getElementById('absen-status');

        if (sudahAbsenHariIni && sudahPulangHariIni) {
            absenStatus.className = "status-sudah-pulang";
            absenStatus.textContent = `Selesai Kerja Hari Ini`;
            document.getElementById('btn-absen-masuk').disabled = true;
            document.getElementById('btn-absen-pulang').disabled = true;
        } else if (sudahAbsenHariIni) {
            absenStatus.className = "status-sudah-masuk";
            absenStatus.textContent = `Aktif Kerja (Sudah Masuk)`;
            document.getElementById('btn-absen-masuk').disabled = true;
            document.getElementById('btn-absen-pulang').disabled = false;
        } else {
            absenStatus.className = "status-belum-absen";
            absenStatus.textContent = `Belum Melakukan Absen Masuk`;
            document.getElementById('btn-absen-masuk').disabled = false;
            document.getElementById('btn-absen-pulang').disabled = true;
        }
    });

    document.getElementById('btn-absen-masuk').onclick = () => {
        const jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        set(ref(db, `absensi_global/${userGedungKunci}/${currentMonthStr}/${todayStr}/${currentUserUID}`), {
            nama: namaKaryawan, masuk: jam, shift: userShiftKunci, gedung: userGedungKunci
        }).then(() => alert("Absen Masuk Berhasil Dikirim!"));
    };

    document.getElementById('btn-absen-pulang').onclick = () => {
        const jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        update(ref(db, `absensi_global/${userGedungKunci}/${currentMonthStr}/${todayStr}/${currentUserUID}`), {
            pulang: jam
        }).then(() => alert("Absen Keluar Berhasil Dikirim!"));
    };

    // 2. NAVIGASI PINDAH HALAMAN BERSIH (SUB-DASHBOARD)
    document.getElementById('nav-tugas-rutin').onclick = () => {
        document.getElementById('karyawan-menu-grup').style.display = 'none';
        document.getElementById('page-tugas-rutin').style.display = 'block';
        renderPekerjaanTerfilter(todayStr);
    };
    document.getElementById('nav-laporan-isu').onclick = () => {
        document.getElementById('karyawan-menu-grup').style.display = 'none';
        document.getElementById('page-laporan-isu').style.display = 'block';
    };
    document.getElementById('nav-stok-chemical').onclick = () => {
        document.getElementById('karyawan-menu-grup').style.display = 'none';
        document.getElementById('page-stok-chemical').style.display = 'block';
        renderChemicalList();
    };
    document.getElementById('nav-kirim-bukti').onclick = () => {
        document.getElementById('karyawan-menu-grup').style.display = 'none';
        document.getElementById('page-kirim-bukti').style.display = 'block';
    };

    // Tombol Kembali Ke Menu Utama Karyawan
    document.querySelectorAll('.btn-kembali').forEach(btn => {
        btn.onclick = () => { resetHalamanKaryawan(); };
    });

    // 3. LOGIKA AKSI FORM (ISU & DOKUMENTASI)
    document.getElementById('btn-submit-isu').onclick = () => {
        const lok = document.getElementById('isu-nama-lokasi').value.trim();
        const desk = document.getElementById('isu-deskripsi').value.trim();
        if(!lok || !desk) return;
        const idIsu = `isu_${Date.now()}`;
        set(ref(db, `laporan_isu_gedung/${userGedungKunci}/${todayStr}/${idIsu}`), {
            pelapor: namaKaryawan, lokasi: lok, kendala: desk, status: "Pending Keluhan", gedung: userGedungKunci
        }).then(() => {
            alert("Laporan Isu Terkirim Berdasarkan Gedung Asal!");
            document.getElementById('isu-nama-lokasi').value = "";
            document.getElementById('isu-deskripsi').value = "";
            resetHalamanKaryawan();
        });
    };

    document.getElementById('btn-submit-bukti').onclick = () => {
        const linkBukti = document.getElementById('input-link-bukti').value.trim();
        if(!linkBukti) return;
        set(ref(db, `laporan_bukti_dokumentasi/${userGedungKunci}/${todayStr}/bukti_${Date.now()}`), {
            oleh: namaKaryawan, link: linkBukti, gedung: userGedungKunci
        }).then(() => {
            alert("Link Dokumentasi Berhasil Disimpan!");
            document.getElementById('input-link-bukti').value = "";
            resetHalamanKaryawan();
        });
    };
}

// 4. STRUKTUR TEMPAT BERSIH / KOTOR DI TUGAS RUTIN (SISI KARYAWAN)
function renderPekerjaanTerfilter(todayStr) {
    onValue(ref(db, `monitoring_area/${userGedungKunci}/${todayStr}`), (snapshot) => {
        const data = snapshot.val() || {};
        const bBelum = document.getElementById('box-belum-dikerjakan'); bBelum.innerHTML = "";
        const bCek = document.getElementById('box-menunggu-cek'); bCek.innerHTML = "";
        const bBersih = document.getElementById('box-selesai-bersih'); bBersih.innerHTML = "";
        const bKotor = document.getElementById('box-kurang-bersih'); bKotor.innerHTML = "";

        for (let id in data) {
            const item = data[id];
            const div = document.createElement('div');
            div.style = "background:white; padding:8px; border-radius:6px; margin-bottom:5px; box-shadow:0 1px 3px rgba(0,0,0,0.05); font-size:12px;";
            
            if (item.status === "Belum Dikerjakan") {
                div.innerHTML = `<b>${item.area}</b><br><button class="btn-action-success" style="width:100%; margin-top:5px; font-size:10px;" id="act-${id}">Laporkan Selesai</button>`;
                bBelum.appendChild(div);
                document.getElementById(`act-${id}`).onclick = () => {
                    update(ref(db, `monitoring_area/${userGedungKunci}/${todayStr}/${id}`), { status: "Menunggu Cek Admin", oleh: auth.currentUser.email.split('@')[0] });
                };
            } else if (item.status === "Menunggu Cek Admin") {
                div.innerHTML = `<b>${item.area}</b><br><small style="color:#d39e00;"><i class="fa-solid fa-spinner fa-spin"></i> Menunggu dinilai admin...</small>`;
                bCek.appendChild(div);
            } else if (item.status === "Area Resmi Bersih") {
                div.innerHTML = `<b>${item.area}</b><br><small style="color:green; font-weight:bold;"><i class="fa-solid fa-check"></i> Sudah Bersih</small>`;
                bBersih.appendChild(div);
            } else if (item.status === "Kurang Bersih") {
                // Tampilkan catatan detail dari admin di bagian mana yang kotor
                div.innerHTML = `
                    <b style="color:red;">${item.area}</b><br>
                    <small style="color:#721c24; background:#f8d7da; padding:2px 4px; border-radius:4px; display:inline-block; margin-top:3px;">
                        <b>Koreksi:</b> ${item.catatan || 'Periksa kembali kebersihan area.'}
                    </small><br>
                    <button class="btn-action-danger" style="width:100%; margin-top:5px; font-size:10px; background:#6e707e;" id="re-${id}">Kerjakan Ulang</button>
                `;
                bKotor.appendChild(div);
                document.getElementById(`re-${id}`).onclick = () => {
                    update(ref(db, `monitoring_area/${userGedungKunci}/${todayStr}/${id}`), { status: "Belum Dikerjakan" });
                };
            }
        }
    });
}

function renderChemicalList() {
    const chemicalData = { "Floor Cleaner Lemon": "4 Galon", "Glass Cleaner": "10 Botol", "Hand Soap Lavender": "2 Galon" };
    const tbody = document.getElementById('table-chemical-body'); tbody.innerHTML = "";
    for(let item in chemicalData) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><b>${item}</b></td><td><span class="badge-status" style="background:#f6c23e; color:#333;">${chemicalData[item]}</span></td><td><button class="btn-action-success" style="font-size:10px; padding:3px 6px;" onclick="alert('Permintaan chemical terkirim!')">Minta</button></td>`;
        tbody.appendChild(tr);
    }
}

// ================= MODUL CONTROL PANEL ADMIN (HAK AKSES GEDUNG + INPUT EVALUASI BAHASA INDONESIA) =================

function aktifkanFiturAdmin() {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);

    if (userRoleKunci === "Admin Pusat") { document.getElementById('block-admin-pusat-only').style.display = 'block'; }
    else { document.getElementById('block-admin-pusat-only').style.display = 'none'; }

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
        set(ref(db, `monitoring_area/${gd}/${todayStr}/daily_${Date.now()}`), { area: ar, status: "Belum Dikerjakan", tipe: "Daily", oleh: "-" });
        alert("Sukses!");
    };

    document.getElementById('btn-submit-project-baru').onclick = () => {
        const gd = document.getElementById('input-area-pilih-gedung').value;
        const pj = document.getElementById('input-nama-project-baru').value.trim();
        if(!pj) return;
        set(ref(db, `monitoring_area/${gd}/${todayStr}/proj_${Date.now()}`), { area: pj, status: "Belum Dikerjakan", tipe: "Project", oleh: "-" });
        alert("Sukses!");
    };

    // 1. Real-time Pantau Absensi Terpisah Per Gedung Asal
    onValue(ref(db, 'absensi_global'), (snapshotGedungAbsen) => {
        const rootAbsen = snapshotGedungAbsen.val() || {};
        const tbodyAbsen = document.getElementById('table-rekap-absen-body'); tbodyAbsen.innerHTML = "";

        for(let idGedung in rootAbsen) {
            if (userRoleKunci === "Admin Gedung" && idGedung !== userGedungKunci) continue;
            
            const dataBulan = rootAbsen[idGedung][currentMonthStr] || {};
            for(let tgl in dataBulan) {
                if(tgl === todayStr) {
                    for(let uid in dataBulan[tgl]) {
                        const r = dataBulan[tgl][uid];
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td><b>${r.nama}</b></td>
                            <td><span style="color:blue; font-weight:bold;">${idGedung.replace(/_-_/g, ' ')}</span></td>
                            <td>${r.shift || 'Pagi'}</td>
                            <td>Masuk: ${r.masuk || '-'} | Pulang: ${r.pulang || '-'}</td>
                        `;
                        tbodyAbsen.appendChild(tr);
                    }
                }
            }
        }
    });

    let listNotifTerbaca = {};

    // 2. Real-time Evaluasi Kebersihan Kerja Terpisah Per Gedung (Tombol Bersih / Kurang Bersih)
    onValue(ref(db, 'daftar_gedung'), (snapshotGedung) => {
        const listGedung = snapshotGedung.val() || {};
        const tbodyEval = document.getElementById('table-pantau-area-body'); tbodyEval.innerHTML = "";
        
        for (let gd in listGedung) {
            if(userRoleKunci === "Admin Gedung" && gd !== userGedungKunci) continue;

            onValue(ref(db, `monitoring_area/${gd}/${todayStr}`), (snapshotArea) => {
                const areas = snapshotArea.val() || {};
                for (let id in areas) {
                    const item = areas[id];
                    
                    if (item.status === "Menunggu Cek Admin" && !listNotifTerbaca[id]) {
                        listNotifTerbaca[id] = true;
                        tampilkanNotifikasiPengecekan(item.oleh, item.area, gd.replace(/_-_/g, ' '));
                    }

                    const tr = document.createElement('tr');
                    let statusTampil = item.status;
                    let statusColor = "#d39e00";
                    if(item.status === "Area Resmi Bersih") { statusTampil = "Bersih"; statusColor = "green"; }
                    if(item.status === "Kurang Bersih") { statusTampil = "Kurang Bersih"; statusColor = "red"; }

                    // Tampilkan info catatan di bawah area jika ada koreksi
                    let infoCatatan = item.catatan ? `<br><small style="color:#c00;"><b>Koreksi Bagian:</b> ${item.catatan}</small>` : '';

                    tr.innerHTML = `
                        <td><small><b>${item.oleh || '-'}</b></small></td>
                        <td><b>${item.area}</b>${infoCatatan}<br><small style="color:purple; font-weight:bold;">Gedung: ${gd.replace(/_-_/g,' ')}</small></td>
                        <td><span class="badge-status" style="background:${statusColor}; color:white;">${statusTampil}</span></td>
                        <td>
                            <button style="background:green; color:white; font-size:10px; border:none; padding:4px 6px; border-radius:4px; cursor:pointer;" onclick="evalArea('${gd}','${id}','Area Resmi Bersih')"><i class="fa-solid fa-check"></i> Bersih</button>
                            <button style="background:red; color:white; font-size:10px; border:none; padding:4px 6px; border-radius:4px; cursor:pointer;" onclick="evalArea('${gd}','${id}','Kurang Bersih')"><i class="fa-solid fa-xmark"></i> Kurang Bersih</button>
                        </td>
                    `;
                    tbodyEval.appendChild(tr);
                }
            });
        }
    });

    // 3. Render Tabel Approval Karyawan
    onValue(ref(db, 'users_profile'), (snapshot) => {
        const users = snapshot.val(); const tbody = document.getElementById('table-approval-karyawan-body'); tbody.innerHTML = "";
        for (let uid in users) {
            if(users[uid].role === "Admin Pusat") continue;
            if(userRoleKunci === "Admin Gedung" && users[uid].gedung !== userGedungKunci) continue;

            const u = users[uid];
            let statusBadge = u.status === "Pending" ? `<span style="color:red; font-weight:bold;">Pending</span>` : `<span style="color:green; font-weight:bold;">Aktif</span>`;
            let btnAction = u.status === "Pending" ? `<button class="btn-action-success" onclick="approveAkun('${uid}')">Approve</button>` : `<button class="btn-action-danger" onclick="suspendAkun('${uid}')">Suspend</button>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `<td><b>${u.nama}</b></td><td>Gedung: ${u.gedung.replace(/_-_/g, ' ')}</td><td>${statusBadge}</td><td>${btnAction}</td>`;
            tbody.appendChild(tr);
        }
    });
}

window.approveAkun = function(uid) { update(ref(db, `users_profile/${uid}`), { status: "Aktif", tgl_status: new Date().toISOString().split('T')[0] }); };
window.suspendAkun = function(uid) { update(ref(db, `users_profile/${uid}`), { status: "Pending", tgl_status: new Date().toISOString().split('T')[0] }); };

// LOGIKA EVALUASI BARU DENGAN KONSTRUKSI ARSIP CATATAN
window.evalArea = function(gedung, id, status) { 
    const todayStr = new Date().toISOString().split('T')[0]; 
    
    if (status === "Kurang Bersih") {
        // Minta input note lokasi spesifik yang masih kotor
        const catatanNote = prompt("Tuliskan catatan koreksi (Contoh: Wastafel bawah masih ada noda air/kerak):");
        
        if (catatanNote === null) return; // Batalkan aksi jika admin klik cancel
        if (catatanNote.trim() === "") {
            alert("Gagal menyimpan! Wajib memberikan catatan jika area dinilai kurang bersih.");
            return;
        }
        
        update(ref(db, `monitoring_area/${gedung}/${todayStr}/${id}`), { 
            status: status,
            catatan: catatanNote.trim()
        });
    } else {
        // Jika statusnya Bersih, hilangkan catatan lama agar bersih kembali
        update(ref(db, `monitoring_area/${gedung}/${todayStr}/${id}`), { 
            status: status,
            catatan: null
        });
    }
};

window.hapusGedungDanPekerjaan = function(idGedung) {
    if(confirm("Hapus gedung mitra ini? Semua data karyawan gedung ini dipindahkan ke masa tenggang sisa gaji 3 bulan.")) {
        remove(ref(db, `daftar_gedung/${idGedung}`)).then(() => {
            remove(ref(db, `monitoring_area/${idGedung}`));
            onValue(ref(db, 'users_profile'), (snapshot) => {
                const users = snapshot.val();
                for(let uid in users) {
                    if(users[uid].gedung === idGedung && users[uid].role !== "Admin Pusat") {
                        update(ref(db, `users_profile/${uid}`), { status: "Nonaktif (Masa Tenggang)", tgl_status: new Date().toISOString().split('T')[0] });
                    }
                }
            }, { onlyOnce: true });
        });
    }
};

function tampilkanNotifikasiPengecekan(karyawan, area, namaGedung) {
    let containerNotif = document.getElementById('ui-notification-container');
    if (!containerNotif) {
        containerNotif = document.createElement('div');
        containerNotif.id = 'ui-notification-container';
        document.body.appendChild(containerNotif);
    }

    const boxNotif = document.createElement('div');
    boxNotif.className = 'toast-notification-clean';
    boxNotif.innerHTML = `
        <div style="display:flex; gap:10px; align-items:center;">
            <i class="fa-solid fa-bell fa-bounce" style="color:#f6c23e; font-size:18px;"></i>
            <div>
                <strong style="font-size:12px; color:#333;">Butuh Verifikasi!</strong>
                <p style="margin:2px 0 0 0; font-size:11px; color:#555;">
                    Kru <b>${karyawan}</b> melaporkan area <b>${area}</b> di <u>${namaGedung}</u> telah selesai.
                </p>
            </div>
        </div>
    `;
    containerNotif.appendChild(boxNotif);
    setTimeout(() => {
        boxNotif.style.animation = 'fadeOutSlide 0.4s ease forwards';
        setTimeout(() => { boxNotif.remove(); }, 400);
    }, 6000);
}
