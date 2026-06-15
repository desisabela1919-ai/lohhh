import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// CONFIG DATA FIREBASE ASLI KAMU
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
let userShiftKunci = "Shift 1"; 
let userRoleKunci = ""; 
let userNamaKunci = "";
let tempFotoArrayList = [];

document.getElementById('link-buka-daftar').onclick = (e) => { e.preventDefault(); document.getElementById('form-daftar-karyawan').style.display = 'block'; };
document.getElementById('btn-batal-daftar').onclick = () => { document.getElementById('form-daftar-karyawan').style.display = 'none'; };

// Render List Master Gedung Dinamis
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
                tr.innerHTML = `<td><b>${namaTampil}</b></td><td><button class="btn-action-danger" onclick="hapusGedungDanPekerjaan('${idGedung}')">Hapus</button></td>`;
                tbodyGedungMaster.appendChild(tr);
            }
        }
    }
});

// Registrasi Mandiri
document.getElementById('btn-submit-daftar').onclick = () => {
    const nama = document.getElementById('reg-nama').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-password').value.trim();
    const roleDipilih = document.getElementById('reg-role').value;
    const lokasi = document.getElementById('reg-lokasi').value;

    if (!nama || !email || !pass) { alert("Wajib diisi!"); return; }

    createUserWithEmailAndPassword(auth, email, pass)
        .then((userCredential) => {
            set(ref(db, `users_profile/${userCredential.user.uid}`), {
                nama: nama, email: email, gedung: lokasi, shift: "Shift 1", status: "Pending", role: roleDipilih, tgl_status: "-"
            }).then(() => {
                alert(`Pendaftaran sukses! Menunggu approval admin pusat.`);
                signOut(auth);
                document.getElementById('form-daftar-karyawan').style.display = 'none';
                loginForm.reset();
            });
        }).catch((err) => alert(err.message));
};

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value).catch((err) => {
        document.getElementById('login-error').textContent = "Login Gagal: " + err.message;
    });
});

btnLogout.addEventListener('click', () => { signOut(auth); });

// Routing Sistem Router Pro Utama
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

                loginPage.style.display = 'none';
                mainHeader.style.display = 'block'; 

                if (userRoleKunci === "Karyawan") {
                    userDisplayEmail.textContent = `${profil.nama} [${userGedungKunci.replace(/_-_/g, ' ')}]`;
                    roleTitle.innerHTML = `Smart Clean Hub - Skuad Lapangan`;
                    karyawanSection.style.display = 'block'; adminSection.style.display = 'none';
                    resetHalamanKaryawan();
                    aktifkanFiturKaryawan();
                } else {
                    userDisplayEmail.textContent = `${profil.nama} [Pusat Kontrol Operational]`;
                    roleTitle.innerHTML = userRoleKunci === "Admin Pusat" ? 'Smart Clean Hub - Owner ⭐' : 'Smart Clean Hub - Supervisor 🏢';
                    adminSection.style.display = 'block'; karyawanSection.style.display = 'none';
                    aktifkanFiturAdmin();
                }
            } else if (profil && profil.status === "Pending") {
                alert("Akun belum di-Approve."); signOut(auth);
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

function resetHalamanKaryawan() {
    document.getElementById('karyawan-menu-grup').style.display = 'block';
    document.getElementById('page-tugas-rutin').style.display = 'none';
    document.getElementById('page-panduan-digital').style.display = 'none';
    document.getElementById('page-laporan-isu').style.display = 'none';
    document.getElementById('page-stok-chemical').style.display = 'none';
    document.getElementById('page-kirim-bukti').style.display = 'none';
}

// ================= MODULE KARYAWAN (PRESISI & MULTI LOG) =================
function aktifkanFiturKaryawan() {
    const d = new Date();
    const todayStr = d.toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);

    document.getElementById('karyawan-shift-label').textContent = userShiftKunci;

    // Absensi Waktu Lengkap (Hari, Tanggal, Jam, Menit, Detik)
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
                    if (dataBulanIni[tanggal][currentUserUID].pulang) sudahPulangHariIni = true;
                }
            }
        }

        document.getElementById('total-hari-kerja').textContent = `${totalHariMasuk} Hari`;
        const absenStatus = document.getElementById('absen-status');

        if (sudahAbsenHariIni && sudahPulangHariIni) {
            absenStatus.className = "status-sudah-pulang"; absenStatus.textContent = `Selesai Kerja Hari Ini`;
            document.getElementById('btn-absen-masuk').disabled = true; document.getElementById('btn-absen-pulang').disabled = true;
        } else if (sudahAbsenHariIni) {
            absenStatus.className = "status-sudah-masuk"; absenStatus.textContent = `Aktif Kerja`;
            document.getElementById('btn-absen-masuk').disabled = true; document.getElementById('btn-absen-pulang').disabled = false;
        } else {
            absenStatus.className = "status-belum-absen"; absenStatus.textContent = `Belum Absen Masuk`;
            document.getElementById('btn-absen-masuk').disabled = false; document.getElementById('btn-absen-pulang').disabled = true;
        }
    });

    document.getElementById('btn-absen-masuk').onclick = () => {
        const tNow = new Date();
        const opsi = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        const stringPresisi = tNow.toLocaleDateString('id-ID', opsi);
        
        set(ref(db, `absensi_global/${userGedungKunci}/${currentMonthStr}/${todayStr}/${currentUserUID}`), {
            nama: userNamaKunci, masuk: stringPresisi, shift: userShiftKunci, gedung: userGedungKunci
        }).then(() => alert("Absen Masuk Berhasil Direkam Sempurna!"));
    };

    document.getElementById('btn-absen-pulang').onclick = () => {
        const tNow = new Date();
        const opsi = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
        const stringPresisi = tNow.toLocaleDateString('id-ID', opsi);

        update(ref(db, `absensi_global/${userGedungKunci}/${currentMonthStr}/${todayStr}/${currentUserUID}`), {
            pulang: stringPresisi
        }).then(() => alert("Absen Keluar Berhasil Direkam Sempurna!"));
    };

    // SOS BUTTON ACTION
    document.getElementById('btn-sos-karyawan').onclick = () => {
        if(confirm("Kirim sinyal DARURAT (SOS) ke ruang Admin sekarang?")) {
            const idSos = `sos_${Date.now()}`;
            set(ref(db, `laporan_emergency/${userGedungKunci}/${idSos}`), {
                oleh: userNamaKunci, gedung: userGedungKunci, waktu: new Date().toLocaleTimeString('id-ID'), status: "CRITICAL"
            }).then(() => alert("Sinyal SOS Terkirim. Tetap Tenang, Pengawas Segera Menuju Lokasi!"));
        }
    };

    // Navigasi Sub Halaman Menu
    document.getElementById('nav-tugas-rutin').onclick = () => {
        document.getElementById('karyawan-menu-grup').style.display = 'none';
        document.getElementById('page-tugas-rutin').style.display = 'block';
        renderPekerjaanTerpersonalisasi(todayStr);
    };
    document.getElementById('nav-panduan-digital').onclick = () => {
        document.getElementById('karyawan-menu-grup').style.display = 'none';
        document.getElementById('page-panduan-digital').style.display = 'block';
    };
    document.getElementById('nav-laporan-isu').onclick = () => {
        document.getElementById('karyawan-menu-grup').style.display = 'none';
        document.getElementById('page-laporan-isu').style.display = 'block';
    };
    document.getElementById('nav-stok-chemical').onclick = () => {
        document.getElementById('karyawan-menu-grup').style.display = 'none';
        document.getElementById('page-stok-chemical').style.display = 'block';
    };
    document.getElementById('nav-kirim-bukti').onclick = () => {
        document.getElementById('karyawan-menu-grup').style.display = 'none';
        document.getElementById('page-kirim-bukti').style.display = 'block';
        
        // Load Dropdown list area tugas milik dia sendiri untuk upload foto progres
        onValue(ref(db, `monitoring_area/${userGedungKunci}/${todayStr}`), (snap) => {
            const areas = snap.val() || {};
            const select = document.getElementById('select-bukti-area'); select.innerHTML = "";
            for(let id in areas) {
                if(areas[id].skuadTarget === userNamaKunci) {
                    select.innerHTML += `<option value="${id}">${areas[id].area}</option>`;
                }
            }
        });
    };

    document.querySelectorAll('.btn-kembali').forEach(btn => { btn.onclick = () => resetHalamanKaryawan(); });

    // LOG REAL-TIME PEMAKAIAN CHEMICAL PER TANGGAL
    document.getElementById('btn-submit-log-chemical').onclick = () => {
        const cNama = document.getElementById('input-log-chem-nama').value;
        const cVol = document.getElementById('input-log-chem-vol').value.trim();
        if(!cVol) return;
        
        const idLogChem = `chem_${Date.now()}`;
        const timestamp = new Date().toLocaleDateString('id-ID') + ' ' + new Date().toLocaleTimeString('id-ID');
        
        set(ref(db, `log_chemical_global/${idLogChem}`), {
            waktu: timestamp, namaSkuad: userNamaKunci, chemical: cNama, volume: cVol + " ml", gedung: userGedungKunci
        }).then(() => {
            alert("Log pemakaian terarsip ke sistem admin!");
            document.getElementById('input-log-chem-vol').value = "";
            resetHalamanKaryawan();
        });
    };

    // MULTI FOTO PROGRES ENGINE (5-15 FOTO)
    document.getElementById('btn-tambah-foto-list').onclick = () => {
        const urlFoto = document.getElementById('input-multi-link-foto').value.trim();
        if(!urlFoto) return;
        tempFotoArrayList.push(urlFoto);
        document.getElementById('input-multi-link-foto').value = "";
        
        // Render preview kecil
        const pList = document.getElementById('preview-list-tautan');
        pList.innerHTML = tempFotoArrayList.map((l, idx) => `<div>Foto ${idx+1}: <a href="${l}" target="_blank">${l.substring(0,30)}...</a></div>`).join('');
    };

    document.getElementById('btn-submit-multi-bukti').onclick = () => {
        const areaID = document.getElementById('select-bukti-area').value;
        if(tempFotoArrayList.length === 0 || !areaID) { alert("Tambahkan foto terlebih dahulu!"); return; }

        const jamKirim = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        
        update(ref(db, `monitoring_area/${userGedungKunci}/${todayStr}/${areaID}`), {
            status: "Menunggu Cek Admin",
            fotoProgres: tempFotoArrayList,
            jamLapor: jamKirim
        }).then(() => {
            alert(`Berhasil mengirimkan ${tempFotoArrayList.length} Foto Progres Kerja!`);
            tempFotoArrayList = [];
            document.getElementById('preview-list-tautan').innerHTML = "";
            resetHalamanKaryawan();
        });
    };
}

// FILTER AREA TERPERSONALISASI SISI KARYAWAN (Multi-User)
function renderPekerjaanTerpersonalisasi(todayStr) {
    onValue(ref(db, `monitoring_area/${userGedungKunci}/${todayStr}`), (snapshot) => {
        const data = snapshot.val() || {};
        const bBelum = document.getElementById('box-belum-dikerjakan'); bBelum.innerHTML = "";
        const bCek = document.getElementById('box-menunggu-cek'); bCek.innerHTML = "";
        const bClean = document.getElementById('box-selesai-clean'); bClean.innerHTML = "";
        const bKotor = document.getElementById('box-kurang-bersih'); bKotor.innerHTML = "";

        for (let id in data) {
            const item = data[id];
            // Proteksi: Hanya tampilkan jika tugas ini dicantolkan ke namanya dia saja!
            if(item.skuadTarget !== userNamaKunci) continue;

            const div = document.createElement('div');
            div.style = "background:white; padding:8px; border-radius:6px; font-size:12px; border:1px solid #e3e6f0;";
            
            if (item.status === "Belum Dikerjakan") {
                div.innerHTML = `<b>${item.area}</b><br><small style="color:#858796;">Gunakan menu "Kirim Bukti Multi-Foto" untuk menyelesaikan area ini.</small>`;
                bBelum.appendChild(div);
            } else if (item.status === "Menunggu Cek Admin") {
                div.innerHTML = `<b>${item.area}</b><br><small style="color:#d39e00;"><i class="fa-solid fa-spinner fa-spin"></i> Menunggu dinilai Supervisor...</small>`;
                bCek.appendChild(div);
            } else if (item.status === "Area Resmi Bersih") {
                div.innerHTML = `<b>${item.area}</b><br><small style="color:green; font-weight:bold;"><i class="fa-solid fa-check"></i> Sudah Bersih</small>`;
                bClean.appendChild(div);
            } else if (item.status === "Kurang Bersih") {
                div.innerHTML = `<b>${item.area}</b><br><small style="color:red;"><b>Koreksi:</b> ${item.catatan || 'Periksa kembali.'}</small><br><button class="btn-danger" style="font-size:10px; padding:2px 5px; margin-top:5px; width:100%;" id="re-${id}">Kerjakan Ulang</button>`;
                bKotor.appendChild(div);
                document.getElementById(`re-${id}`).onclick = () => { update(ref(db, `monitoring_area/${userGedungKunci}/${todayStr}/${id}`), { status: "Belum Dikerjakan" }); };
            }
        }
    });
}

// ================= MODULE CONTROL PANEL CONTROL ADMIN (2 LEVEL) =================
function aktifkanFiturAdmin() {
    const todayStr = new Date().toISOString().split('T')[0];

    if (userRoleKunci === "Admin Pusat") document.getElementById('block-admin-pusat-only').style.display = 'block';
    else document.getElementById('block-admin-pusat-only').style.display = 'none';

    document.getElementById('menu-pantau-absensi').onclick = () => document.getElementById('halaman-detail-absensi').style.display = 'block';
    document.getElementById('btn-tutup-absensi').onclick = () => document.getElementById('halaman-detail-absensi').style.display = 'none';
    document.getElementById('menu-admin-pantau-kerja').onclick = () => document.getElementById('halaman-pantau-kerja-admin').style.display = 'block';
    document.getElementById('btn-tutup-pantau-kerja').onclick = () => document.getElementById('halaman-pantau-kerja-admin').style.display = 'none';

    // Simpan Kontrak Mitra Baru (Pusat Only)
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

    // Distribusi Target Harian Personalisasi Skuad
    document.getElementById('btn-submit-area-baru').onclick = () => {
        const gd = document.getElementById('input-area-pilih-gedung').value;
        const targetSkuad = document.getElementById('input-target-nama-skuad').value.trim();
        const namaArea = document.getElementById('input-nama-area-baru').value.trim();
        if(!targetSkuad || !namaArea) { alert("Isi nama skuad & area!"); return; }
        
        set(ref(db, `monitoring_area/${gd}/${todayStr}/daily_${Date.now()}`), {
            area: namaArea, status: "Belum Dikerjakan", skuadTarget: targetSkuad, oleh: "-", jamLapor: "-"
        });
        alert("Target Berhasil Didistribusikan!");
        document.getElementById('input-nama-area-baru').value = "";
    };

    // Load Log Chemical Global Ke Layar Monitor Admin
    onValue(ref(db, 'log_chemical_global'), (snap) => {
        const data = snap.val() || {};
        const tbody = document.getElementById('table-admin-chemical-log-body'); tbody.innerHTML = "";
        for(let id in data) {
            if(userRoleKunci === "Admin Gedung" && data[id].gedung !== userGedungKunci) continue;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${data[id].waktu}</td><td><b>${data[id].namaSkuad}</b></td><td>${data[id].chemical}</td><td><span style="color:var(--danger); font-weight:bold;">${data[id].volume}</span></td>`;
            tbody.appendChild(tr);
        }
    });

    // Real-Time Listener SOS Emergency Notification
    onValue(ref(db, `laporan_emergency`), (snapshotSos) => {
        const rootSos = snapshotSos.val() || {};
        for(let gd in rootSos){
            if(userRoleKunci === "Admin Gedung" && gd !== userGedungKunci) continue;
            for(let id in rootSos[gd]){
                if(rootSos[gd][id].status === "CRITICAL") {
                    alert(`🚨 ALARM EMERGENSI 🚨\n\nKru ${rootSos[gd][id].oleh} mengirim sinyal SOS dari Gedung ${gd.replace(/_-_/g,' ')}!\nJam: ${rootSos[gd][id].waktu}.\n\nSegera cek lokasi sekarang!`);
                    update(ref(db, `laporan_emergency/${gd}/${id}`), { status: "HANDLED" });
                }
            }
        }
    });

    // Real-Time Monitor Absensi Presisi
    onValue(ref(db, 'absensi_global'), (snapshotGedungAbsen) => {
        const rootAbsen = snapshotGedungAbsen.val() || {};
        const tbodyAbsen = document.getElementById('table-rekap-absen-body'); tbodyAbsen.innerHTML = "";

        for(let idGedung in rootAbsen) {
            if (userRoleKunci === "Admin Gedung" && idGedung !== userGedungKunci) continue;
            for(let bln in rootAbsen[idGedung]) {
                for(let tgl in rootAbsen[idGedung][bln]) {
                    for(let uid in rootAbsen[idGedung][bln][tgl]) {
                        const r = rootAbsen[idGedung][bln][tgl][uid];
                        const tr = document.createElement('tr');
                        tr.innerHTML = `<td><b>${r.nama}</b></td><td>${idGedung.replace(/_-_/g,' ')}</td><td><span class="badge-status" style="background:var(--primary); font-size:10px;">${r.shift}</span></td><td><small>Masuk: ${r.masuk || '-'}<br>Pulang: ${r.pulang || '-'}</small></td>`;
                        tbodyAbsen.appendChild(tr);
                    }
                }
            }
        }
    });

    // Real-Time Evaluasi Kebersihan + Loop Render Gambar Grid Progres Multi-Foto
    onValue(ref(db, 'daftar_gedung'), (snapshotGedung) => {
        const listGedung = snapshotGedung.val() || {};
        const tbodyEval = document.getElementById('table-pantau-area-body'); tbodyEval.innerHTML = "";
        
        for (let gd in listGedung) {
            if(userRoleKunci === "Admin Gedung" && gd !== userGedungKunci) continue;

            onValue(ref(db, `monitoring_area/${gd}/${todayStr}`), (snapshotArea) => {
                const areas = snapshotArea.val() || {};
                for (let id in areas) {
                    const item = areas[id];
                    const tr = document.createElement('tr');
                    
                    let statusColor = item.status === "Area Resmi Bersih" ? "green" : (item.status === "Kurang Bersih" ? "red" : "#d39e00");
                    let statusTampilText = item.status === "Area Resmi Bersih" ? "Bersih" : (item.status === "Kurang Bersih" ? "Kurang Bersih" : item.status);

                    // Buat Loop Gambar Grid Progres jika ada fotonya
                    let htmlGridFoto = `<span style="color:#aaa;">Belum kirim foto</span>`;
                    if (item.fotoProgres && item.fotoProgres.length > 0) {
                        htmlGridFoto = `<div class="admin-grid-foto-preview">`;
                        item.fotoProgres.forEach(urlImg => {
                            htmlGridFoto += `<img src="${urlImg}" class="img-progres-mini" onclick="window.open('${urlImg}','_blank')">`;
                        });
                        htmlGridFoto += `</div>`;
                    }

                    let noteText = item.catatan ? `<br><small style="color:red;">Note: ${item.catatan}</small>` : '';

                    tr.innerHTML = `
                        <td><b>${item.skuadTarget || '-'}</b><br><small style="color:#666;">Jam Lapor: ${item.jamLapor || '-'}</small></td>
                        <td><b>${item.area}</b>${noteText}<br><small style="color:purple;">Gedung: ${gd.replace(/_-_/g,' ')}</small></td>
                        <td>${htmlGridFoto}</td>
                        <td>
                            <div style="display:flex; flex-direction:column; gap:4px;">
                                <button style="background:green; color:white; font-size:10px; padding:3px;" onclick="evalArea('${gd}','${id}','Area Resmi Bersih')">Bersih</button>
                                <button style="background:red; color:white; font-size:10px; padding:3px;" onclick="evalArea('${gd}','${id}','Kurang Bersih')">Kurang</button>
                            </div>
                        </td>
                    `;
                    tbodyEval.appendChild(tr);
                }
            });
        }
    });

    // DOWNLOAD EXPORT LAPORAN BUKTI FOTO KARYAWAN (Akhir Bulan)
    document.getElementById('btn-export-laporan-foto').onclick = () => {
        onValue(ref(db, `monitoring_area`), (snapshot) => {
            const allData = snapshot.val() || {};
            let textLogLaporan = "=== DAFTAR REKAPAN BUKTI FOTO PROGRESS BULANAN SMART CLEAN HUB ===\n\n";
            
            for(let gd in allData) {
                if(userRoleKunci === "Admin Gedung" && gd !== userGedungKunci) continue;
                textLogLaporan += `GEDUNG: ${gd.replace(/_-_/g, ' ')}\n`;
                for(let tgl in allData[gd]) {
                    textLogLaporan += `Tanggal kerja: ${tgl}\n`;
                    for(let id in allData[gd][tgl]) {
                        const item = allData[gd][tgl][id];
                        if(item.fotoProgres) {
                            textLogLaporan += ` - Area: ${item.area} | Skuad: ${item.skuadTarget} | Jam Selesai: ${item.jamLapor}\n`;
                            item.fotoProgres.forEach((url, i) => {
                                textLogLaporan += `   [Foto ${i+1}]: ${url}\n`;
                            });
                        }
                    }
                }
                textLogLaporan += "\n----------------------------------------\n";
            }
            
            // Generate File Dokumen Download (.txt log link agar gampang di-copy ke Word/Excel Laporan)
            const blob = new Blob([textLogLaporan], { type: "text/plain;charset=utf-8" });
            const linkDownload = document.createElement("a");
            linkDownload.href = URL.createObjectURL(blob);
            linkDownload.download = `Laporan_Foto_Progres_Clean_Hub_${new Date().toISOString().substring(0,7)}.txt`;
            linkDownload.click();
        }, { onlyOnce: true });
    };

    // Render Approval Skuad & Setting 4 Shift Dinamis
    onValue(ref(db, 'users_profile'), (snapshot) => {
        const users = snapshot.val(); 
        const tbody = document.getElementById('table-approval-karyawan-body'); tbody.innerHTML = "";
        
        for (let uid in users) {
            if(users[uid].role === "Admin Pusat") continue;
            if(userRoleKunci === "Admin Gedung" && users[uid].gedung !== userGedungKunci) continue;

            const u = users[uid];
            const tr = document.createElement('tr');
            
            let currentShift = u.shift || "Shift 1";

            tr.innerHTML = `
                <td><b>${u.nama}</b><br><small style="color:#666;">${u.email}</small></td>
                <td><small>${u.gedung.replace(/_-_/g,' ')}</small></td>
                <td>
                    <select onchange="gantiJadwalShiftSkuad('${uid}', this.value)" style="font-size:11px; padding:2px;">
                        <option value="Shift 1" ${currentShift === "Shift 1" ? "selected" : ""}>Shift 1</option>
                        <option value="Shift 2" ${currentShift === "Shift 2" ? "selected" : ""}>Shift 2</option>
                        <option value="Shift 3" ${currentShift === "Shift 3" ? "selected" : ""}>Shift 3</option>
                        <option value="Shift 4" ${currentShift === "Shift 4" ? "selected" : ""}>Shift 4</option>
                    </select>
                </td>
                <td>
                    <button class="${u.status === "Pending" ? "btn-action-success" : "btn-action-danger"}" onclick="toggleStatusAkun('${uid}', '${u.status}')">
                        ${u.status === "Pending" ? "Approve" : "Suspend"}
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        }
    });
}

window.toggleStatusAkun = function(uid, statusSekarang) {
    const statusBaru = statusSekarang === "Pending" ? "Aktif" : "Pending";
    update(ref(db, `users_profile/${uid}`), { status: statusBaru, tgl_status: new Date().toISOString().split('T')[0] });
};

window.gantiJadwalShiftSkuad = function(uid, shiftBaru) {
    update(ref(db, `users_profile/${uid}`), { shift: shiftBaru });
    alert("Jadwal 4 Shift Skuad Berhasil Diperbarui Dinamis!");
};

window.evalArea = function(gedung, id, status) { 
    const todayStr = new Date().toISOString().split('T')[0]; 
    if (status === "Kurang Bersih") {
        const catatanNote = prompt("Tuliskan catatan koreksi area kotor:");
        if (catatanNote === null) return;
        if (catatanNote.trim() === "") { alert("Wajib diisi!"); return; }
        update(ref(db, `monitoring_area/${gedung}/${todayStr}/${id}`), { status: status, catatan: catatanNote.trim() });
    } else {
        update(ref(db, `monitoring_area/${gedung}/${todayStr}/${id}`), { status: status, catatan: null });
    }
};

window.hapusGedungDanPekerjaan = function(idGedung) {
    if(confirm("Hapus gedung mitra master ini?")) {
        remove(ref(db, `daftar_gedung/${idGedung}`));
        remove(ref(db, `monitoring_area/${idGedung}`));
    }
};
