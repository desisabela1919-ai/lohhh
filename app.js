import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ================================================================= */
// KONFIGURASI DATABASE FIREBASE CLEAN ISABEL APP
// ================================================================= */
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

// ================================================================= */
// DOM ELEMENT IDENTIFIER GLOBAL
// ================================================================= */
const loginPage = document.getElementById('login-page');
const loginForm = document.getElementById('login-form');
const mainHeader = document.getElementById('main-header');
const userDisplayEmail = document.getElementById('user-display-email');
const btnLogout = document.getElementById('btn-logout');
const karyawanSection = document.getElementById('karyawan-section');
const adminSection = document.getElementById('admin-section');

let currentUserUID = "";
let userGedungKunci = "";
let userShiftKunci = "Shift 1"; 
let userRoleKunci = ""; 
let userNamaKunci = "";
let flagAbsenMode = "masuk";
let idTargetPekerjaanKlik = "";

// Trigger Modal Registrasi Karyawan
if(document.getElementById('link-buka-daftar')) {
    document.getElementById('link-buka-daftar').onclick = (e) => { e.preventDefault(); document.getElementById('form-daftar-karyawan').style.display = 'block'; };
}
if(document.getElementById('btn-batal-daftar')) {
    document.getElementById('btn-batal-daftar').onclick = () => { document.getElementById('form-daftar-karyawan').style.display = 'none'; };
}

// ================================================================= */
// MASTER DATA ENGINE: REALTIME AMBIL DAFTAR GEDUNG KONTRAK
// ================================================================= */
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
                tr.innerHTML = `<td><b>${namaTampil}</b></td><td><button class="btn-action-danger" style="background:var(--danger); color:white; padding:4px 8px; border-radius:4px;" onclick="hapusGedungMaster('${idGedung}')">Hapus Kontrak</button></td>`;
                tbodyGedungMaster.appendChild(tr);
            }
        }
    }
});

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
                    nama: nama, email: email, gedung: lokasi, shift: "Shift 1", status: "Pending", role: roleDipilih, tgl_status: "-"
                }).then(() => {
                    alert(`Pendaftaran Berhasil! Menunggu persetujuan admin gedung.`);
                    signOut(auth);
                    document.getElementById('form-daftar-karyawan').style.display = 'none';
                    loginForm.reset();
                });
            }).catch((err) => alert(err.message));
    };
}

// HANDLER LOGIN SISTEM UTAMA
if(loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value).catch((err) => {
            document.getElementById('login-error').textContent = "Identifikasi Akun Gagal: " + err.message;
        });
    });
}

if(btnLogout) {
    btnLogout.addEventListener('click', () => { signOut(auth); });
}

// Global window function untuk hapus data gedung master
window.hapusGedungMaster = function(idGedung) {
    if(confirm(`Hapus kontrak gedung ${idGedung.replace(/_-_/g, ' ')}? Semua data monitoring area ini akan terhapus.`)) {
        remove(ref(db, `daftar_gedung/${idGedung}`)).then(() => alert("Gedung sukses dihapus dari sistem."));
    }
}

// ================================================================= */
// MONITORING STATUS LOGIN USER & SUNTIK INFO HEADER BARU
// ================================================================= */
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

                const labelGedungHeader = document.getElementById('header-lokasi-label');
                const labelShiftHeader = document.getElementById('header-shift-label');
                
                if (labelGedungHeader) labelGedungHeader.textContent = userGedungKunci.replace(/_-_/g, ' ');
                if (labelShiftHeader) labelShiftHeader.textContent = userShiftKunci;

                if (userRoleKunci === "Karyawan") {
                    userDisplayEmail.textContent = `${profil.nama} [Karyawan]`;
                    karyawanSection.style.display = 'block'; adminSection.style.display = 'none';
                    resetHalamanKaryawan();
                    aktifkanFiturKaryawan();
                } else {
                    userDisplayEmail.textContent = `${profil.nama} [Dashboard Pengawas]`;
                    if (labelGedungHeader && userRoleKunci === "Admin Pusat") labelGedungHeader.textContent = "Semua Area Kontrak";
                    if (labelShiftHeader) labelShiftHeader.textContent = "All Shift";
                    
                    adminSection.style.display = 'block'; karyawanSection.style.display = 'none';
                    aktifkanFiturAdmin();
                }
            } else if (profil && profil.status === "Pending") {
                alert("Akun anda belum disetujui Pengawas!"); signOut(auth);
            } else {
                if(user.email.includes("admin")) {
                    set(ref(db, `users_profile/${user.uid}`), { nama: "Administrator Utama", email: user.email, status: "Aktif", role: "Admin Pusat", gedung: "Semua", shift: "-", tgl_status: "-" });
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
    document.getElementById('page-rekap-arsip').style.display = 'none';
}

// ================================================================= */
// MODUL KARYAWAN: ABSENSI DENGAN TIMING DAN KAMERA HP
// ================================================================= */
function aktifkanFiturKaryawan() {
    const d = new Date();
    const todayStr = d.toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);

    onValue(ref(db, `absensi_global/${userGedungKunci}/${currentMonthStr}`), (snapshot) => {
        const dataBulanIni = snapshot.val() || {};
        let totalHariMasuk = 0;
        let sudahAbsenMasuk = false;
        let sudahAbsenPulang = false;
        let waktuAbsenMasukMili = 0;

        for (let tgl in dataBulanIni) {
            if (dataBulanIni[tgl][currentUserUID]) {
                totalHariMasuk++;
                if (tgl === todayStr) {
                    sudahAbsenMasuk = true;
                    waktuAbsenMasukMili = dataBulanIni[tgl][currentUserUID].timestampMasuk || 0;
                    if (dataBulanIni[tgl][currentUserUID].pulangLog) sudahAbsenPulang = true;
                }
            }
        }

        if(document.getElementById('total-hari-kerja')) {
            document.getElementById('total-hari-kerja').textContent = `${totalHariMasuk} Hari`;
        }
        const labelHadirHeader = document.getElementById('header-hadir-label');
        if (labelHadirHeader) labelHadirHeader.textContent = `${totalHariMasuk} H`;

        const kartuAbsenContainer = document.getElementById('kartu-presisi-absensi-box'); 
        const stateLabel = document.getElementById('absen-status');
        const btnMasuk = document.getElementById('btn-trigger-absen-masuk');
        const btnPulang = document.getElementById('btn-trigger-absen-pulang');

        if (sudahAbsenMasuk && sudahAbsenPulang) {
            if(kartuAbsenContainer) kartuAbsenContainer.style.display = 'block';
            if(stateLabel) { stateLabel.className = "status-sudah-pulang"; stateLabel.textContent = `Shift Selesai (Sudah Absen Pulang)`; }
            if(btnMasuk) btnMasuk.disabled = true; 
            if(btnPulang) btnPulang.disabled = true;
        } else if (sudahAbsenMasuk) {
            const sekarangMili = Date.now();
            const selisihJam = (sekarangMili - waktuAbsenMasukMili) / (1000 * 60 * 60);

            if (selisihJam >= 8) {
                if(kartuAbsenContainer) kartuAbsenContainer.style.display = 'block';
                if(stateLabel) { stateLabel.className = "status-sudah-masuk"; stateLabel.textContent = `Waktu Kerja Selesai (Silakan Absen Pulang)`; }
                if(btnMasuk) btnMasuk.disabled = true; 
                if(btnPulang) btnPulang.disabled = false;
            } else {
                if(kartuAbsenContainer) kartuAbsenContainer.style.display = 'none';
            }
        } else {
            if(kartuAbsenContainer) kartuAbsenContainer.style.display = 'block';
            if(stateLabel) { stateLabel.className = "status-belum-absen"; stateLabel.textContent = `Belum Melakukan Absen Masuk`; }
            if(btnMasuk) btnMasuk.disabled = false; 
            if(btnPulang) btnPulang.disabled = true;
        }
    });

    const inputCamAbsen = document.getElementById('camera-absen-input');
    
    if(document.getElementById('btn-trigger-absen-masuk')) {
        document.getElementById('btn-trigger-absen-masuk').onclick = () => { flagAbsenMode = "masuk"; inputCamAbsen.click(); };
    }
    
    if(document.getElementById('btn-trigger-absen-pulang')) {
        document.getElementById('btn-trigger-absen-pulang').onclick = () => {
            const tNow = new Date();
            const opsiWaktu = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
            const stampWaktuLengkap = tNow.toLocaleDateString('id-ID', opsiWaktu);

            update(ref(db, `absensi_global/${userGedungKunci}/${currentMonthStr}/${todayStr}/${currentUserUID}`), {
                pulangLog: stampWaktuLengkap
            }).then(() => alert("Absen Pulang Berhasil! Sampai jumpa di shift berikutnya, Boy."));
        };
    }

    if(inputCamAbsen) {
        inputCamAbsen.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Gambar = reader.result;
                const tNow = new Date();
                const opsiWaktu = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
                const stampWaktuLengkap = tNow.toLocaleDateString('id-ID', opsiWaktu);

                if (flagAbsenMode === "masuk") {
                    set(ref(db, `absensi_global/${userGedungKunci}/${currentMonthStr}/${todayStr}/${currentUserUID}`), {
                        nama: userNamaKunci,
                        masukLog: stampWaktuLengkap,
                        fotoMasuk: base64Gambar,
                        shift: userShiftKunci,
                        gedung: userGedungKunci,
                        timestampMasuk: Date.now()
                    }).then(() => alert("Absen Masuk Berhasil Terverifikasi!"));
                }
            };
            reader.readAsDataURL(file);
        };
    }

    if(document.getElementById('btn-sos-karyawan')) {
        document.getElementById('btn-sos-karyawan').onclick = () => {
            if(confirm("Kirim Sinyal SOS Darurat ke Ruang Pengawas Gedung Ini?")) {
                const idSos = `sos_${Date.now()}`;
                set(ref(db, `laporan_emergency/${userGedungKunci}/${idSos}`), {
                    oleh: userNamaKunci, gedung: userGedungKunci, waktu: new Date().toLocaleTimeString('id-ID'), status: "CRITICAL"
                }).then(() => alert("Sinyal SOS Disebarkan ke Pengawas Gedung!"));
            }
        };
    }

    if(document.getElementById('nav-tugas-rutin')) {
        document.getElementById('nav-tugas-rutin').onclick = () => { document.getElementById('karyawan-menu-grup').style.display = 'none'; document.getElementById('page-tugas-rutin').style.display = 'block'; renderPenugasanSisiKaryawan(todayStr); };
    }
    if(document.getElementById('nav-panduan-digital')) {
        document.getElementById('nav-panduan-digital').onclick = () => { document.getElementById('karyawan-menu-grup').style.display = 'none'; document.getElementById('page-panduan-digital').style.display = 'block'; };
    }
    if(document.getElementById('nav-laporan-isu')) {
        document.getElementById('nav-laporan-isu').onclick = () => { document.getElementById('karyawan-menu-grup').style.display = 'none'; document.getElementById('page-laporan-isu').style.display = 'block'; };
    }
    if(document.getElementById('nav-stok-chemical')) {
        document.getElementById('nav-stok-chemical').onclick = () => { document.getElementById('karyawan-menu-grup').style.display = 'none'; document.getElementById('page-stok-chemical').style.display = 'block'; };
    }
    if(document.getElementById('nav-rekap-arsip')) {
        document.getElementById('nav-rekap-arsip').onclick = () => { document.getElementById('karyawan-menu-grup').style.display = 'none'; document.getElementById('page-rekap-arsip').style.display = 'block'; renderArsipHistoryKaryawan(); };
    }
    document.querySelectorAll('.btn-kembali').forEach(btn => { btn.onclick = () => resetHalamanKaryawan(); });

    if(document.getElementById('btn-submit-isu')) {
        document.getElementById('btn-submit-isu').onclick = () => {
            const lok = document.getElementById('isu-nama-lokasi').value.trim();
            const desk = document.getElementById('isu-deskripsi').value.trim();
            if(!lok || !desk) { alert("Semua form isu wajib diisi lengkap!"); return; }
            const idIsu = `isu_${Date.now()}`;
            set(ref(db, `laporan_isu_global/${currentMonthStr}/${idIsu}`), { waktu: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toLocaleTimeString('id-ID'), pelapor: userNamaKunci, gedung: userGedungKunci, lokasiSpesifik: lok, deskripsi: desk }).then(() => { alert("Laporan Kendala Berhasil Dikirim!"); resetHalamanKaryawan(); });
        };
    }

    if(document.getElementById('btn-submit-log-chemical')) {
        document.getElementById('btn-submit-log-chemical').onclick = () => {
            const chemNama = document.getElementById('input-log-chem-nama').value;
            const chemVol = document.getElementById('input-log-chem-vol').value.trim();
            if(!chemVol) { alert("Masukkan jumlah volume pemakaian!"); return; }
            const idLog = `chem_${Date.now()}`;
            set(ref(db, `log_chemical_global/${idLog}`), { waktu: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toLocaleTimeString('id-ID'), namaSkuad: userNamaKunci, chemical: chemNama, volume: chemVol + " ml", gedung: userGedungKunci }).then(() => { alert("Buku material terupdate!"); resetHalamanKaryawan(); });
        };
    }

    const inputCamPekerjaan = document.getElementById('camera-pekerjaan-input');
    if(inputCamPekerjaan) {
        inputCamPekerjaan.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64FotoKerja = reader.result;
                const jamSelesai = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

                update(ref(db, `monitoring_area/${userGedungKunci}/${todayStr}/${idTargetPekerjaanKlik}`), {
                    status: "Butuh Pengecekan",
                    fotoBukti: base64FotoKerja,
                    jamLapor: jamSelesai
                }).then(() => alert("Foto hasil pembersihan sukses terkirim!"));
            };
            reader.readAsDataURL(file);
        };
    }
}

// ================================================================= */
// RENDER PENUGASAN SISI KARYAWAN
// ================================================================= */
function renderPenugasanSisiKaryawan(todayStr) {
    onValue(ref(db, `monitoring_area/${userGedungKunci}/${todayStr}`), (snapshot) => {
        const data = snapshot.val() || {};
        const bBelum = document.getElementById('box-belum-dikerjakan'); if(bBelum) bBelum.innerHTML = "";
        const bExtra = document.getElementById('box-extra-job-skuad'); if(bExtra) bExtra.innerHTML = "";
        const bSelesai = document.getElementById('box-selesai-clean'); if(bSelesai) bSelesai.innerHTML = "";

        for (let id in data) {
            const item = data[id];
            if(item.skuadTarget !== userNamaKunci) continue;

            let rincianJobHtml = "";
            if(item.detailJob) {
                const arrJob = item.detailJob.split(',');
                rincianJobHtml = "<ul style='margin:5px 0; padding-left:15px; color:#475569; line-height:1.4;'>";
                arrJob.forEach((j, i) => { rincianJobHtml += `<li>${i+1}. ${j.trim()}</li>`; });
                rincianJobHtml += "</ul>";
            }

            const card = document.createElement('div');
            card.style = "background:#ffffff; padding:12px; border-radius:6px; font-size:12px; border:1px solid #cbd5e1; margin-bottom:6px;";

            if (item.status === "Belum Dikerjakan" || item.status === "Kurang Bersih") {
                let badgeKoreksi = item.status === "Kurang Bersih" ? `<br><span style="color:red; font-weight:bold;">⚠️ Koreksi: ${item.catatan || ''}</span>` : '';
                
                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong>📍 Area: ${item.area}</strong>
                        <span class="badge-status" style="background:#4f46e5; color:white; font-size:9px; padding:2px 6px; border-radius:4px; font-weight:bold;">${item.shiftKerja || 'General'}</span>
                    </div>
                    ${rincianJobHtml}
                    ${badgeKoreksi}
                    <button class="btn-success" style="font-size:11px; padding:6px; width:100%; margin-top:8px; border-radius:4px; font-weight:bold;" onclick="bukaKameraTugas('${id}')"><i class="fa-solid fa-camera"></i> Minta Pengecekan (Kirim Foto)</button>
                `;
                if(item.kategori === "Extra" && bExtra) bExtra.appendChild(card);
                else if(bBelum) bBelum.appendChild(card);
            } else if(bSelesai) {
                let textBadgeStatus = item.status === "Area Resmi Bersih" ? `<span style="color:green; font-weight:bold;"><i class="fa-solid fa-square-check"></i> Bersih (Lulus Cek)</span>` : `<span style="color:#d39e00; font-weight:bold;"><i class="fa-solid fa-spinner fa-spin"></i> Menunggu Pengecekan...</span>`;
                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between;">
                        <strong>📍 ${item.area}</strong>
                        <span style="font-size:10px; color:#666; font-weight:bold;">${item.shiftKerja || 'General'}</span>
                    </div>
                    ${rincianJobHtml}
                    <div style="margin-top:6px;">${textBadgeStatus}</div>
                `;
                bSelesai.appendChild(card);
            }
        }
    });
}

window.bukaKameraTugas = function(id) { idTargetPekerjaanKlik = id; document.getElementById('camera-pekerjaan-input').click(); };

function renderArsipHistoryKaryawan() {
    onValue(ref(db, `monitoring_area/${userGedungKunci}`), (snapshot) => {
        const rootGedung = snapshot.val() || {};
        const containerArsip = document.getElementById('box-list-history-tugas-karyawan'); if(containerArsip) containerArsip.innerHTML = "";
        let hitungRutin = 0; let hitungExtra = 0;

        for (let tgl in rootGedung) {
            for (let id in rootGedung[tgl]) {
                const item = rootGedung[tgl][id];
                if (item.skuadTarget === userNamaKunci && item.status === "Area Resmi Bersih") {
                    if (item.kategori === "Extra") hitungExtra++; else hitungRutin++;
                    if(containerArsip) {
                        const logRow = document.createElement('div');
                        logRow.style = "background:#ffffff; padding:6px; border-radius:4px; border-left:3px solid var(--success); margin-bottom:3px; display:flex; justify-content:space-between;";
                        logRow.innerHTML = `<span>📅 ${tgl} | <b>${item.area}</b> (${item.shiftKerja || '-'})</span> <span style="color:green; font-weight:bold;">COMPLETED</span>`;
                        containerArsip.appendChild(logRow);
                    }
                }
            }
        }
        if(document.getElementById('karyawan-stat-rutin')) document.getElementById('karyawan-stat-rutin').textContent = hitungRutin;
        if(document.getElementById('karyawan-stat-extra')) document.getElementById('karyawan-stat-extra').textContent = hitungExtra;
    });
}

// ================================================================= */
// MODUL MANAGEMENT CONTROL BACK-OFFICE SUPERVISOR / ADMIN 
// ================================================================= */
function aktifkanFiturAdmin() {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);

    if (userRoleKunci === "Admin Pusat") document.getElementById('block-admin-pusat-only').style.display = 'block';
    else document.getElementById('block-admin-pusat-only').style.display = 'none';

    document.getElementById('menu-pantau-absensi').onclick = () => document.getElementById('halaman-detail-absensi').style.display = 'block';
    document.getElementById('btn-tutup-absensi').onclick = () => document.getElementById('halaman-detail-absensi').style.display = 'none';
    document.getElementById('menu-admin-pantau-kerja').onclick = () => document.getElementById('halaman-pantau-kerja-admin').style.display = 'block';
    document.getElementById('btn-tutup-pantau-kerja').onclick = () => document.getElementById('halaman-pantau-kerja-admin').style.display = 'none';
    
    if(document.getElementById('menu-admin-rekap-isu')) {
        document.getElementById('menu-admin-rekap-isu').onclick = () => { document.getElementById('halaman-pantau-isu-admin').style.display = 'block'; renderBukuRekapIsuAdmin(); };
    }
    if(document.getElementById('btn-tutup-pantau-isu')) {
        document.getElementById('btn-tutup-pantau-isu').onclick = () => document.getElementById('halaman-pantau-isu-admin').style.display = 'none';
    }

    // AMBIL KARYAWAN AKTIF UNTUK DROPDOWN INPUT TUGAS AUTOMATIS (SCOPED)
    onValue(ref(db, 'users_profile'), (snapshot) => {
        const users = snapshot.val() || {};
        const selectSkuad = document.getElementById('input-target-nama-skuad');
        if(selectSkuad) {
            selectSkuad.innerHTML = '<option value="">-- Pilih Skuad Lapangan --</option>';
            for(let uid in users) {
                if(users[uid].role === "Karyawan" && users[uid].status === "Aktif") {
                    if(userRoleKunci === "Admin Gedung" && users[uid].gedung !== userGedungKunci) continue;
                    selectSkuad.innerHTML += `<option value="${users[uid].nama}">${users[uid].nama} (${users[uid].shift})</option>`;
                }
            }
        }
    });

    // LOGIC CHECKLIST DAFTAR TUGAS DINAMIS (NO 5)
    const selectArea = document.getElementById('select-area-template');
    if(selectArea) {
        selectArea.onchange = () => {
            const areaDipilih = selectArea.value;
            const containerChecklist = document.getElementById('container-checklist-job-step');
            const textareaDetailJob = document.getElementById('input-detail-job-step');
            
            if(containerChecklist && textareaDetailJob) {
                containerChecklist.innerHTML = "";
                textareaDetailJob.value = "";

                // Master SOP Step Berdasarkan Area Pilihan
                const masterSOP = {
                    "Lobby Utama": ["Sweeping & Mopping Lantai", "Cleaning Kaca Pintu Utama", "Sanitasi Handle Pintu", "Dusting Meja Resepsionis", "Empty Trash Bin"],
                    "Toilet Pria": ["Cleaning Urinal & Kloset", "Mopping Lantai Disinfektan", "Pembersihan Wastafel & Cermin", "Refill Sabun & Tissue", "Empty Trash Bin"],
                    "Toilet Wanita": ["Cleaning Kloset Duduk", "Mopping Lantai Disinfektan", "Pembersihan Wastafel & Cermin", "Refill Sabun & Tissue", "Empty Trash Bin"],
                    "Ruang Kantor / Kerja": ["Dusting Meja Kerja & Kursi", "Sweeping & Mopping Lantai", "Empty Trash Bin Sisi Karyawan", "Vacuum Karpet (Jika Ada)"],
                    "Tangga Darurat & Koridor": ["Sweeping & Mopping Lantai Koridor", "Dusting Handrail Tangga", "Pembersihan Plafon dari Sarang Laba-Laba"],
                    "Area Parkir / Outdoor": ["Sweeping Daun Kering / Sampah", "Empty Trash Bin Outdoor", "Pembersihan Jalur Drainase Depan"]
                };

                if(masterSOP[areaDipilih]) {
                    masterSOP[areaDipilih].forEach(step => {
                        const div = document.createElement('div');
                        div.className = "checklist-item-box";
                        div.innerHTML = `
                            <input type="checkbox" value="${step}" checked>
                            <span>${step}</span>
                        `;
                        
                        // Pas dicentang / lepas centang, update string textarea
                        const chk = div.querySelector('input');
                        chk.onchange = () => kalkulasiStringChecklist();
                        
                        containerChecklist.appendChild(div);
                    });
                    kalkulasiStringChecklist();
                }
            }
        };
    }

    function kalkulasiStringChecklist() {
        const checkboxes = document.querySelectorAll('#container-checklist-job-step input[type="checkbox"]');
        const textareaDetailJob = document.getElementById('input-detail-job-step');
        let arrHasil = [];
        checkboxes.forEach(cb => {
            if(cb.checked) arrHasil.push(cb.value);
        });
        if(textareaDetailJob) textareaDetailJob.value = arrHasil.join(', ');
    }

    document.getElementById('btn-submit-gedung-baru').onclick = () => {
        const kw = document.getElementById('input-kawasan-utama').value.trim();
        const tw = document.getElementById('input-sub-tower').value.trim();
        if(!kw || !tw) return;
        set(ref(db, `daftar_gedung/${kw}_-_${tw}`), { kawasan: kw, tower: tw });
        alert("Master data area kontrak gedung berhasil disimpan!");
        document.getElementById('input-kawasan-utama').value = "";
        document.getElementById('input-sub-tower').value = "";
    };

    if(userRoleKunci === "Admin Gedung") {
        document.getElementById('input-area-pilih-gedung').value = userGedungKunci;
        document.getElementById('input-area-pilih-gedung').disabled = true;
    }

    document.getElementById('btn-submit-area-baru').onclick = () => {
        const gd = document.getElementById('input-area-pilih-gedung').value;
        const targetSkuad = document.getElementById('input-target-nama-skuad').value;
        const selectAreaVal = document.getElementById('select-area-template').value;
        const customArea = document.getElementById('input-nama-area-baru').value.trim();
        const kat = document.getElementById('input-jenis-tugas-kategori').value; 
        const shiftDipilih = document.getElementById('input-shift-tugas-admin').value; 
        const txtDetailJob = document.getElementById('input-detail-job-step').value.trim(); 

        const namaAreaFinal = customArea || selectAreaVal;

        if(!targetSkuad || !namaAreaFinal) { alert("Pilih Skuad & Tentukan Area Tugas!"); return; }
        
        set(ref(db, `monitoring_area/${gd}/${todayStr}/task_${Date.now()}`), {
            area: namaAreaFinal, status: "Belum Dikerjakan", skuadTarget: targetSkuad, kategori: kat, shiftKerja: shiftDipilih, detailJob: txtDetailJob, jamLapor: "-"
        });
        alert("Instruksi Tugas Resmi Berhasil Dikirim!");
        document.getElementById('input-nama-area-baru').value = "";
        if(document.getElementById('input-detail-job-step')) document.getElementById('input-detail-job-step').value = "";
        
        // Reset checklist visual
        const containerChecklist = document.getElementById('container-checklist-job-step');
        if(containerChecklist) containerChecklist.innerHTML = "";
    };

    window.downloadFotoBukti = function(base64Data, namaFile) {
        const link = document.createElement("a");
        link.href = base64Data;
        link.download = namaFile;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // EVALUASI PENGECEKAN KERJA ADMIN
    window.evalPekerjaanLuar = function(gdId, taskId, statusBaru) {
        let catatanAdmin = "-";
        if(statusBaru === "Kurang Bersih") {
            catatanAdmin = prompt("Masukkan catatan koreksi untuk skuad lapangan:");
            if(!catatanAdmin) return;
        }
        update(ref(db, `monitoring_area/${gdId}/${todayStr}/${taskId}`), {
            status: statusBaru,
            catatan: catatanAdmin
        }).then(() => alert(`Status tugas diperbarui menjadi: ${statusBaru}`));
    };

    onValue(ref(db, 'daftar_gedung'), (snapshotGedung) => {
        const listGedung = snapshotGedung.val() || {};
        const tbodyEval = document.getElementById('table-pantau-area-body'); if(tbodyEval) tbodyEval.innerHTML = "";
        
        for (let gd in listGedung) {
            if(userRoleKunci === "Admin Gedung" && gd !== userGedungKunci) continue;

            onValue(ref(db, `monitoring_area/${gd}/${todayStr}`), (snapshotArea) => {
                const areas = snapshotArea.val() || {};
                if(tbodyEval) tbodyEval.innerHTML = ""; 
                for (let id in areas) {
                    const item = areas[id];
                    const tr = document.createElement('tr');
                    
                    let tagFotoKerja = '<span style="color:#aaa;">Belum Kirim Foto</span>';
                    let btnDownload = '';
                    
                    if(item.fotoBukti) {
                        tagFotoKerja = `<img src="${item.fotoBukti}" style="width:60px; height:60px; object-fit:cover; border-radius:4px; cursor:pointer;" onclick="window.open('${item.fotoBukti}','_blank')">`;
                        btnDownload = `<button style="background:#25d366; color:white; font-size:10px; padding:2px 5px; margin-top:4px; border:none; border-radius:3px;" onclick="downloadFotoBukti('${item.fotoBukti}', 'Bukti_Kerja_${item.area}.jpg')"><i class="fa-solid fa-download"></i> Download WA</button>`;
                    }
                    
                    let noteEvaluasi = item.catatan && item.catatan !== "-" ? `<br><small style="color:var(--danger); font-weight:bold;">Koreksi: ${item.catatan}</small>` : '';

                    tr.innerHTML = `
                        <td>
                            <b>${item.skuadTarget || '-'}</b><br>
                            <span class="badge-status" style="background:purple; font-size:9px; padding:1px 4px; color:white; border-radius:3px;">${item.kategori || 'Rutin'}</span><br>
                            <small style="color:#555;">📌 <b>${item.shiftKerja || 'General'}</b></small>
                        </td>
                        <td><b>${item.area}</b>${noteEvaluasi}<br><small style="color:#666;">Jam Lapor: ${item.jamLapor || '-'}</small><br><small style="color:blue;">Status: ${item.status}</small></td>
                        <td style="text-align:center;">${tagFotoKerja}<br>${btnDownload}</td>
                        <td>
                            <div style="display:flex; flex-direction:column; gap:4px;">
                                <button style="background:var(--success); color:white; font-size:11px; padding:4px; border:none; border-radius:4px; font-weight:600;" onclick="evalPekerjaanLuar('${gd}','${id}','Area Resmi Bersih')">Lulus Cek</button>
                                <button style="background:var(--danger); color:white; font-size:11px; padding:4px; border:none; border-radius:4px; font-weight:600;" onclick="evalPekerjaanLuar('${gd}','${id}','Kurang Bersih')">Koreksi</button>
                            </div>
                        </td>
                    `;
                    tbodyEval.appendChild(tr);
                }
            });
        }
    });
}

function renderBukuRekapIsuAdmin() {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);
    
    onValue(ref(db, `laporan_isu_global/${currentMonthStr}`), (snapshot) => {
        const dataIsu = snapshot.val() || {};
        const tbodyIsu = document.getElementById('table-pantau-isu-body'); if(tbodyIsu) tbodyIsu.innerHTML = "";

        for(let id in dataIsu) {
            const item = dataIsu[id];
            if(userRoleKunci === "Admin Gedung" && item.gedung !== userGedungKunci) continue;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><small>${item.waktu}</small><br><b>${item.gedung.replace(/_-_/g, ' ')}</b></td>
                <td><b>${item.pelapor}</b><br><small>Lokasi: ${item.lokasiSpesifik}</small></td>
                <td><p style="margin:0; font-size:11px; color:#475569;">${item.deskripsi}</p></td>
            `;
            if(tbodyIsu) tbodyIsu.appendChild(tr);
        }
    });
}
