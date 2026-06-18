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

globalThis.hapusGedungMaster = function(idGedung) {
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
                alert("Akun anda belum disetujui Pengawas!"); signOut(auth);
            } else {
                if(user.email && user.email.includes("admin")) {
                    set(ref(db, `users_profile/${user.uid}`), { nama: "Administrator Utama", email: user.email, status: "Aktif", role: "Admin Pusat", gedung: "Semua", shift: "-", tgl_status: "-" });
                } else { signOut(auth); }
            }
        });
    } else {
        if(loginPage) loginPage.style.display = 'block'; 
        if(mainHeader) mainHeader.style.display = 'none';
        if(adminSection) adminSection.style.display = 'none'; 
        if(karyawanSection) karyawanSection.style.display = 'none';
    }
});

function resetHalamanKaryawan() {
    if(document.getElementById('karyawan-menu-grup')) document.getElementById('karyawan-menu-grup').style.display = 'block';
    if(document.getElementById('page-tugas-rutin')) document.getElementById('page-tugas-rutin').style.display = 'none';
    if(document.getElementById('page-panduan-digital')) document.getElementById('page-panduan-digital').style.display = 'none';
    if(document.getElementById('page-laporan-isu')) document.getElementById('page-laporan-isu').style.display = 'none';
    if(document.getElementById('page-stok-chemical')) document.getElementById('page-stok-chemical').style.display = 'none';
    if(document.getElementById('page-rekap-arsip')) document.getElementById('page-rekap-arsip').style.display = 'none';
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
        document.getElementById('btn-trigger-absen-masuk').onclick = () => { flagAbsenMode = "masuk"; if(inputCamAbsen) inputCamAbsen.click(); };
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
            const target = e.target;
            const file = target.files ? target.files[0] : null;
            if (!file) return;

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Gambar = reader.result;
                const tNow = new Date();
                const opsiWaktu = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
                const stampWaktuLengkap = tNow.toLocaleDateString('id-ID', opsiWaktu);

                if (flagAbsenMode === "masuk" && typeof base64Gambar === 'string') {
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
        document.getElementById('nav-tugas-rutin').onclick = () => { if(document.getElementById('karyawan-menu-grup')) document.getElementById('karyawan-menu-grup').style.display = 'none'; if(document.getElementById('page-tugas-rutin')) document.getElementById('page-tugas-rutin').style.display = 'block'; renderPenugasanSisiKaryawan(todayStr); };
    }
    if(document.getElementById('nav-panduan-digital')) {
        document.getElementById('nav-panduan-digital').onclick = () => { if(document.getElementById('karyawan-menu-grup')) document.getElementById('karyawan-menu-grup').style.display = 'none'; if(document.getElementById('page-panduan-digital')) document.getElementById('page-panduan-digital').style.display = 'block'; };
    }
    if(document.getElementById('nav-laporan-isu')) {
        document.getElementById('nav-laporan-isu').onclick = () => { if(document.getElementById('karyawan-menu-grup')) document.getElementById('karyawan-menu-grup').style.display = 'none'; if(document.getElementById('page-laporan-isu')) document.getElementById('page-laporan-isu').style.display = 'block'; };
    }
    if(document.getElementById('nav-stok-chemical')) {
        document.getElementById('nav-stok-chemical').onclick = () => { if(document.getElementById('karyawan-menu-grup')) document.getElementById('karyawan-menu-grup').style.display = 'none'; if(document.getElementById('page-stok-chemical')) document.getElementById('page-stok-chemical').style.display = 'block'; };
    }
    if(document.getElementById('nav-rekap-arsip')) {
        document.getElementById('nav-rekap-arsip').onclick = () => { if(document.getElementById('karyawan-menu-grup')) document.getElementById('karyawan-menu-grup').style.display = 'none'; if(document.getElementById('page-rekap-arsip')) document.getElementById('page-rekap-arsip').style.display = 'block'; renderArsipHistoryKaryawan(); };
    }
    document.querySelectorAll('.btn-kembali').forEach(btn => { 
        (btn).onclick = () => resetHalamanKaryawan(); 
    });

    if(document.getElementById('btn-submit-isu')) {
        document.getElementById('btn-submit-isu').onclick = () => {
            const lokElement = document.getElementById('isu-nama-lokasi');
            const deskElement = document.getElementById('isu-deskripsi');
            const lok = lokElement ? (lokElement).value.trim() : "";
            const desk = deskElement ? (deskElement).value.trim() : "";
            if(!lok || !desk) { alert("Semua form isu wajib diisi lengkap!"); return; }
            const idIsu = `isu_${Date.now()}`;
            set(ref(db, `laporan_isu_global/${currentMonthStr}/${idIsu}`), { waktu: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toLocaleTimeString('id-ID'), pelapor: userNamaKunci, gedung: userGedungKunci, lokasiSpesifik: lok, deskripsi: desk }).then(() => { alert("Laporan Kendala Berhasil Dikirim!"); resetHalamanKaryawan(); });
        };
    }

    if(document.getElementById('btn-submit-log-chemical')) {
        document.getElementById('btn-submit-log-chemical').onclick = () => {
            const chemNamaElement = document.getElementById('input-log-chem-nama');
            const chemVolElement = document.getElementById('input-log-chem-vol');
            const chemNama = chemNamaElement ? (chemNamaElement).value : "";
            const chemVol = chemVolElement ? (chemVolElement).value.trim() : "";
            if(!chemVol) { alert("Masukkan jumlah volume pemakaian!"); return; }
            const idLog = `chem_${Date.now()}`;
            set(ref(db, `log_chemical_global/${idLog}`), { waktu: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toLocaleTimeString('id-ID'), namaSkuad: userNamaKunci, chemical: chemNama, volume: chemVol + " ml", gedung: userGedungKunci }).then(() => { alert("Buku material terupdate!"); resetHalamanKaryawan(); });
        };
    }

    const inputCamPekerjaan = document.getElementById('camera-pekerjaan-input');
    if(inputCamPekerjaan) {
        inputCamPekerjaan.onchange = (e) => {
            const target = e.target;
            const file = target.files ? target.files[0] : null;
            if (!file) return;

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64FotoKerja = reader.result;
                const jamSelesai = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

                if (typeof base64FotoKerja === 'string') {
                    update(ref(db, `monitoring_area/${userGedungKunci}/${todayStr}/${idTargetPekerjaanKlik}`), {
                        status: "Butuh Pengecekan",
                        fotoBukti: base64FotoKerja,
                        jamLapor: jamSelesai
                    }).then(() => alert("Foto hasil pembersihan sukses terkirim!"));
                }
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
                const arrJob = Array.isArray(item.detailJob) ? item.detailJob : item.detailJob.split(',');
                rincianJobHtml = "<ul style='margin:5px 0; padding-left:15px; color:#475569; line-height:1.4;'>";
                arrJob.forEach((j, i) => { rincianJobHtml += `<li>${i+1}. ${j.trim()}</li>`; });
                rincianJobHtml += "</ul>";
            }

            const card = document.createElement('div');
            card.style.cssText = "background:#ffffff; padding:12px; border-radius:6px; font-size:12px; border:1px solid #cbd5e1; margin-bottom:6px;";

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

globalThis.bukaKameraTugas = function(id) { idTargetPekerjaanKlik = id; const cam = document.getElementById('camera-pekerjaan-input'); if(cam) cam.click(); };

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
                        logRow.style.cssText = "background:#ffffff; padding:6px; border-radius:4px; border-left:3px solid var(--success); margin-bottom:3px; display:flex; justify-content:space-between;";
                        logRow.innerHTML = `<span>📅 ${tgl} | <b>${item.area}</b> (${item.shiftKerja || '-'})</span> <span style="color:green; font-weight:bold;">COMPLETED</span>`;
                        containerArsip.appendChild(logRow);
                    }
                }
            }
        }
        if(document.getElementById('karyawan-stat-rutin')) document.getElementById('karyawan-stat-rutin').textContent = String(hitungRutin);
        if(document.getElementById('karyawan-stat-extra')) document.getElementById('karyawan-stat-extra').textContent = String(hitungExtra);
    });
}

// ================================================================= */
// MODUL MANAGEMENT CONTROL BACK-OFFICE SUPERVISOR / ADMIN 
// ================================================================= */
function aktifkanFiturAdmin() {
    const todayStr = new Date().toISOString().split('T')[0];

    const blockPusat = document.getElementById('block-admin-pusat-only');
    if (blockPusat) {
        blockPusat.style.display = (userRoleKunci === "Admin Pusat") ? 'block' : 'none';
    }

    const menuAbsensi = document.getElementById('menu-pantau-absensi');
    if(menuAbsensi) menuAbsensi.onclick = () => { const h = document.getElementById('halaman-detail-absensi'); if(h) h.style.display = 'block'; };
    
    const btnTutupAbsen = document.getElementById('btn-tutup-absensi');
    if(btnTutupAbsen) btnTutupAbsen.onclick = () => { const h = document.getElementById('halaman-detail-absensi'); if(h) h.style.display = 'none'; };
    
    const menuKerja = document.getElementById('menu-admin-pantau-kerja');
    if(menuKerja) menuKerja.onclick = () => { const h = document.getElementById('halaman-pantau-kerja-admin'); if(h) h.style.display = 'block'; };
    
    const btnTutupKerja = document.getElementById('btn-tutup-pantau-kerja');
    if(btnTutupKerja) btnTutupKerja.onclick = () => { const h = document.getElementById('halaman-pantau-kerja-admin'); if(h) h.style.display = 'none'; };
    
    const menuIsu = document.getElementById('menu-admin-rekap-isu');
    if(menuIsu) menuIsu.onclick = () => { const h = document.getElementById('halaman-pantau-isu-admin'); if(h) h.style.display = 'block'; renderBukuRekapIsuAdmin(); };
    
    const btnTutupIsu = document.getElementById('btn-tutup-pantau-isu');
    if(btnTutupIsu) btnTutupIsu.onclick = () => { const h = document.getElementById('halaman-pantau-isu-admin'); if(h) h.style.display = 'none'; };

    // [FITUR BARU] AMBIL KARYAWAN AKTIF UNTUK DROPDOWN
    onValue(ref(db, 'users_profile'), (snapshot) => {
        const users = snapshot.val() || {};
        const selectSkuadLama = document.getElementById('input-target-nama-skuad');
        const selectSkuadBaru = document.getElementById('input-target-nama-skuad-select');
        
        const opsiDefault = '<option value="">-- Pilih Skuad Lapangan --</option>';
        if(selectSkuadLama) selectSkuadLama.innerHTML = opsiDefault;
        if(selectSkuadBaru) selectSkuadBaru.innerHTML = opsiDefault;
        
        for(let uid in users) {
            if(users[uid].role === "Karyawan" && users[uid].status === "Aktif") {
                if(userRoleKunci === "Admin Gedung" && users[uid].gedung !== userGedungKunci) continue;
                
                const formatOpsi = `<option value="${users[uid].nama}">${users[uid].nama} (${users[uid].shift})</option>`;
                if(selectSkuadLama) selectSkuadLama.innerHTML += formatOpsi;
                if(selectSkuadBaru) selectSkuadBaru.innerHTML += formatOpsi;
            }
        }
    });

    // [FITUR BARU] REALTIME LISTENER TABEL APPROVAL PENDAFTARAN KARYAWAN
    onValue(ref(db, 'users_profile'), (snapshot) => {
        const dataUsers = snapshot.val() || {};
        const tbodyApproval = document.getElementById('table-approval-karyawan-body');
        if(tbodyApproval) {
            tbodyApproval.innerHTML = "";
            let adaDataPending = false;

            for(let uid in dataUsers) {
                const userItem = dataUsers[uid];
                if(userItem.status === "Pending") {
                    if(userRoleKunci === "Admin Gedung" && userItem.gedung !== userGedungKunci) continue;
                    
                    adaDataPending = true;
                    const namaGedungBersih = userItem.gedung ? userItem.gedung.replace(/_-_/g, ' ').replace(/_/g, ' ') : '-';
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><b>${userItem.nama}</b><br><small style="color:#64748b;">${userItem.email}</small></td>
                        <td><span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:600;">${userItem.role}</span></td>
                        <td><small>${namaGedungBersih}</small></td>
                        <td>
                            <div style="display:flex; gap:5px;">
                                <button style="background:var(--success); color:white; padding:5px 8px; font-size:11px; border-radius:4px; width:auto;" onclick="prosesAksiApproval('${uid}', 'Setujui', '${userItem.nama}')">Setujui</button>
                                <button style="background:var(--danger); color:white; padding:5px 8px; font-size:11px; border-radius:4px; width:auto;" onclick="prosesAksiApproval('${uid}', 'Tolak', '${userItem.nama}')">Tolak</button>
                            </div>
                        </td>
                    `;
                    tbodyApproval.appendChild(tr);
                }
            }
            if(!adaDataPending) {
                tbodyApproval.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8; font-style:italic; padding:15px;">Tidak ada pengajuan pendaftaran karyawan baru.</td></tr>`;
            }
        }
    });

    // LOGIC CHECKLIST DAFTAR TUGAS DINAMIS
    const selectArea = document.getElementById('select-area-template');
    if(selectArea) {
        selectArea.onchange = () => {
            const areaDipilih = (selectArea).value;
            const containerChecklist = document.getElementById('container-checklist-job-step');
            const textareaDetailJob = document.getElementById('input-detail-job-step');
            
            if(containerChecklist && textareaDetailJob) {
                containerChecklist.innerHTML = "";
                (textareaDetailJob).value = "";

                const masterSOP = {
                    "Lobby Utama": ["Sweeping & Mopping Lantai", "Cleaning Kaca Pintu Utama", "Sanitasi Handle Pintu", "Dusting Meja Resepsionis", "Empty Trash Bin"],
                    "Toilet Pria": ["Cleaning Urinal & Kloset", "Mopping Lantai Disinfektan", "Pembersihan Wastafel & Cermin", "Refill Sabun & Tissue", "Empty Trash Bin"],
                    "Toilet Wanita": ["Cleaning Kloset Duduk", "Mopping Lantai Disinfektan", "Pembersihan Wastafel & Cermin", "Refill Sabun & Tissue", "Empty Trash Bin"],
                    "Ruang Kantor / Kerja": ["Dusting Meja Kerja & Kursi", "Sweeping & Mopping Lantai", "Empty Trash Bin Sisi Karyawan", "Vacuum Karpet (Jika Ada)"],
                    "Tangga Darurat & Koridor": ["Sweeping & Mopping Lantai Koridor", "Dusting Handrail Tangga", "Pembersihan Plafon dari Sarang Laba-Laba"],
                    "Area Parkir / Outdoor": ["Sweeping Daun Kering / Sampah", "Empty Trash Bin Outdoor", "Pembersihan Jalur Drainase Depan"]
                };

                const currentSOP = masterSOP[areaDipilih];
                if(currentSOP) {
                    currentSOP.forEach(step => {
                        const div = document.createElement('div');
                        div.className = "checklist-item-box";
                        div.innerHTML = `
                            <input type="checkbox" value="${step}" checked>
                            <span>${step}</span>
                        `;
                        const chk = div.querySelector('input');
                        if (chk) chk.onchange = () => kalkulasiStringChecklist();
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
            if((cb).checked) arrHasil.push((cb).value);
        });
        if(textareaDetailJob) (textareaDetailJob).value = arrHasil.join(', ');
    }

    const btnSubmitGedung = document.getElementById('btn-submit-gedung-baru');
    if (btnSubmitGedung) {
        btnSubmitGedung.onclick = () => {
            const kwEl = document.getElementById('input-kawasan-utama');
            const twEl = document.getElementById('input-sub-tower');
            const kw = kwEl ? (kwEl).value.trim() : "";
            const tw = twEl ? (twEl).value.trim() : "";
            if(!kw || !tw) return;
            set(ref(db, `daftar_gedung/${kw}_-_${tw}`), { kawasan: kw, tower: tw });
            alert("Master data area kontrak gedung berhasil disimpan!");
            if (kwEl) (kwEl).value = "";
            if (twEl) (twEl).value = "";
        };
    }

    const inputAreaGedung = document.getElementById('input-area-pilih-gedung');
    if(userRoleKunci === "Admin Gedung" && inputAreaGedung) {
        (inputAreaGedung).value = userGedungKunci;
        (inputAreaGedung).disabled = true;
    }

    const btnSubmitArea = document.getElementById('btn-submit-area-baru');
    if (btnSubmitArea) {
        btnSubmitArea.onclick = () => {
            try {
                const gd = (document.getElementById('input-area-pilih-gedung')).value;
                const targetSkuad = (document.getElementById('input-target-nama-skuad')).value;
                const selectAreaVal = (document.getElementById('select-area-template')).value;
                const customArea = (document.getElementById('input-nama-area-baru')).value.trim();
                const kat = (document.getElementById('input-jenis-tugas-kategori')).value; 
                const shiftDipilih = (document.getElementById('input-shift-tugas-admin')).value; 
                const txtDetailJob = (document.getElementById('input-detail-job-step')).value.trim(); 

                const namaAreaFinal = customArea || selectAreaVal;

                if(!targetSkuad || !namaAreaFinal) { alert("Pilih Skuad & Tentukan Area Tugas!"); return; }
                
                set(ref(db, `monitoring_area/${gd}/${todayStr}/task_${Date.now()}`), {
                    area: namaAreaFinal, status: "Belum Dikerjakan", skuadTarget: targetSkuad, kategori: kat, shiftKerja: shiftDipilih, detailJob: txtDetailJob, jamLapor: "-"
                });
                alert("Instruksi Tugas Resmi Berhasil Dikirim!");
                (document.getElementById('input-nama-area-baru')).value = "";
                const detailJobEl = document.getElementById('input-detail-job-step');
                if(detailJobEl) (detailJobEl).value = "";
                
                const containerChecklist = document.getElementById('container-checklist-job-step');
                if(containerChecklist) containerChecklist.innerHTML = "";
            } catch (e) {
                console.error("Gagal submit area baru v1:", e);
            }
        };
    }

    // [FITUR BARU] SUBMIT DATA TUGAS BARU DENGAN FORMAT ARRAY FIREBASE
    const btnSubmitV2 = document.getElementById('btn-submit-area-baru-v2');
    if(btnSubmitV2) {
        btnSubmitV2.onclick = () => {
            try {
                const gdElement = document.getElementById('input-area-pilih-gedung');
                const targetSkuadElement = document.getElementById('input-target-nama-skuad-select') || document.getElementById('input-target-nama-skuad');
                const customAreaElement = document.getElementById('input-nama-area-manual');
                const katElement = document.getElementById('input-jenis-tugas-kategori-v2');
                const shiftDipilihElement = document.getElementById('input-shift-tugas-admin-v2');
                const txtManualDetailElement = document.getElementById('input-detail-checklist-manual');

                if(!targetSkuadElement || !customAreaElement) return;

                const gd = (gdElement).value;
                const targetSkuad = (targetSkuadElement).value;
                const customArea = (customAreaElement).value.trim();
                const kat = katElement ? (katElement).value : "Rutin";
                const shiftDipilih = shiftDipilihElement ? (shiftDipilihElement).value : "Shift 1";
                const txtManualDetail = txtManualDetailElement ? (txtManualDetailElement).value.trim() : "";

                if(!targetSkuad || !customArea) { alert("Nama Skuad & Lokasi Area Kerja Wajib Ditentukan!"); return; }

                let arrayPekerjaanFinal = [];
                if(txtManualDetail !== "") {
                    arrayPekerjaanFinal = txtManualDetail.split(',').map(item => item.trim()).filter(item => item !== "");
                } else {
                    arrayPekerjaanFinal = ["Pembersihan Area Umum"];
                }

                set(ref(db, `monitoring_area/${gd}/${todayStr}/task_${Date.now()}`), {
                    area: customArea,
                    status: "Belum Dikerjakan",
                    skuadTarget: targetSkuad,
                    kategori: kat,
                    shiftKerja: shiftDipilih,
                    detailJob: arrayPekerjaanFinal,
                    jamLapor: "-"
                }).then(() => {
                    alert("Tugas Manual Berhasil Ditambahkan dengan Format Array!");
                    (customAreaElement).value = "";
                    if(txtManualDetailElement) (txtManualDetailElement).value = "";
                });
            } catch (err) {
                console.error("Terjadi deviasi element pada pengiriman v2:", err);
                alert("Gagal kirim tugas. Cek kembali kelengkapan ID form admin Anda.");
            }
        };
    }
}

// ================================================================= */
// FUNGSI BACKUP UNTUK MEMASTIKAN REKAP ISU AMAN
// ================================================================= */
function renderBukuRekapIsuAdmin() {
    const d = new Date();
    const currentMonthStr = d.toISOString().substring(0, 7);
    onValue(ref(db, `laporan_isu_global/${currentMonthStr}`), (snapshot) => {
        const dataIsu = snapshot.val() || {};
        const tbodyIsu = document.getElementById('table-rekap-isu-body');
        if(tbodyIsu) {
            tbodyIsu.innerHTML = "";
            let adaIsu = false;
            for(let id in dataIsu) {
                adaIsu = true;
                const item = dataIsu[id];
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.waktu || '-'}</td>
                    <td><b>${item.gedung ? item.gedung.replace(/_-_/g, ' ') : '-'}</b><br><small>${item.lokasiSpesifik || '-'}</small></td>
                    <td>${item.deskripsi || '-'}</td>
                    <td><span class="badge" style="background:#fffbeb; color:#b45309;">${item.pelapor || '-'}</span></td>
                `;
                tbodyIsu.appendChild(tr);
            }
            if(!adaIsu) {
                tbodyIsu.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8; font-style:italic; padding:15px;">Belum ada kendala operasional yang dilaporkan bulan ini.</td></tr>`;
            }
        }
    });
}

// [FITUR BARU] WINDOW FUNCTION UNTUK EKSEKUSI APPROVAL KARYAWAN
globalThis.prosesAksiApproval = function(uid, opsi, namaUser) {
    if(opsi === "Setujui") {
        if(confirm(`Setujui pendaftaran akun untuk ${namaUser}?`)) {
            const tglSkrg = new Date().toLocaleDateString('id-ID');
            update(ref(db, `users_profile/${uid}`), {
                status: "Aktif",
                tgl_status: tglSkrg
            }).then(() => alert(`Akun ${namaUser} resmi AKTIF dan bisa login sistem!`));
        }
    } else if(opsi === "Tolak") {
        if(confirm(`Tolak dan hapus data pendaftaran ${namaUser}?`)) {
            remove(ref(db, `users_profile/${uid}`)).then(() => alert(`Data pendaftaran ${namaUser} berhasil dihapus.`));
        }
    }
};

globalThis.downloadFotoBukti = function(base64Data, namaFile) {
    const link = document.createElement('a');
    link.href = base64Data;
    link.download = namaFile;
    link.click();
};
