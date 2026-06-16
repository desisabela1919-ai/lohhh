import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

document.getElementById('link-buka-daftar').onclick = (e) => { e.preventDefault(); document.getElementById('form-daftar-karyawan').style.display = 'block'; };
document.getElementById('btn-batal-daftar').onclick = () => { document.getElementById('form-daftar-karyawan').style.display = 'none'; };

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
                tr.innerHTML = `<td><b>${namaTampil}</b></td><td><button class="btn-action-danger" onclick="hapusGedungMaster('${idGedung}')">Hapus Kontrak</button></td>`;
                tbodyGedungMaster.appendChild(tr);
            }
        }
    }
});

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

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    signInWithEmailAndPassword(auth, document.getElementById('login-email').value, document.getElementById('login-password').value).catch((err) => {
        document.getElementById('login-error').textContent = "Identifikasi Akun Gagal: " + err.message;
    });
});

btnLogout.addEventListener('click', () => { signOut(auth); });

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
                    karyawanSection.style.display = 'block'; adminSection.style.display = 'none';
                    resetHalamanKaryawan();
                    aktifkanFiturKaryawan();
                } else {
                    userDisplayEmail.textContent = `${profil.nama} [Dashboard Pengawas Operasional]`;
                    adminSection.style.display = 'block'; karyawanSection.style.display = 'none';
                    aktifkanFiturAdmin();
                }
            } else if (profil && profil.status === "Pending") {
                alert("Akun anda dikunci atau belum disetujui Pengawas!"); signOut(auth);
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

function aktifkanFiturKaryawan() {
    const d = new Date();
    const todayStr = d.toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);

    document.getElementById('karyawan-shift-label').textContent = userShiftKunci;

    onValue(ref(db, `absensi_global/${userGedungKunci}/${currentMonthStr}`), (snapshot) => {
        const dataBulanIni = snapshot.val() || {};
        let totalHariMasuk = 0;
        let sudahAbsenMasuk = false;
        let sudahAbsenPulang = false;

        for (let tgl in dataBulanIni) {
            if (dataBulanIni[tgl][currentUserUID]) {
                totalHariMasuk++;
                if (tgl === todayStr) {
                    sudahAbsenMasuk = true;
                    if (dataBulanIni[tgl][currentUserUID].pulangLog) sudahAbsenPulang = true;
                }
            }
        }

        document.getElementById('total-hari-kerja').textContent = `${totalHariMasuk} Hari`;
        const stateLabel = document.getElementById('absen-status');

        if (sudahAbsenMasuk && sudahAbsenPulang) {
            stateLabel.className = "status-sudah-pulang"; stateLabel.textContent = `Shift Selesai (Sudah Absen Pulang)`;
            document.getElementById('btn-trigger-absen-masuk').disabled = true; document.getElementById('btn-trigger-absen-pulang').disabled = true;
        } else if (sudahAbsenMasuk) {
            stateLabel.className = "status-sudah-masuk"; stateLabel.textContent = `Status: Aktif Bekerja (Shift Jalan)`;
            document.getElementById('btn-trigger-absen-masuk').disabled = true; document.getElementById('btn-trigger-absen-pulang').disabled = false;
        } else {
            stateLabel.className = "status-belum-absen"; stateLabel.textContent = `Belum Melakukan Absen Masuk`;
            document.getElementById('btn-trigger-absen-masuk').disabled = false; document.getElementById('btn-trigger-absen-pulang').disabled = true;
        }
    });

    const inputCamAbsen = document.getElementById('camera-absen-input');
    
    document.getElementById('btn-trigger-absen-masuk').onclick = () => { flagAbsenMode = "masuk"; inputCamAbsen.click(); };
    document.getElementById('btn-trigger-absen-pulang').onclick = () => { flagAbsenMode = "pulang"; inputCamAbsen.click(); };

    inputCamAbsen.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        navigator.geolocation.getCurrentPosition((pos) => {
            const geoString = `Lat: ${pos.coords.latitude.toFixed(5)}, Lon: ${pos.coords.longitude.toFixed(5)}`;
            
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
                        masukGeo: geoString,
                        fotoMasuk: base64Gambar,
                        shift: userShiftKunci,
                        gedung: userGedungKunci
                    }).then(() => alert("Absen Masuk + Potret Wajah Sukses Berhasil Terverifikasi!"));
                } else {
                    update(ref(db, `absensi_global/${userGedungKunci}/${currentMonthStr}/${todayStr}/${currentUserUID}`), {
                        pulangLog: stampWaktuLengkap,
                        pulangGeo: geoString,
                        fotoPulang: base64Gambar
                    }).then(() => alert("Absen Pulang + Potret Wajah Akhir Shift Berhasil Disimpan!"));
                }
            };
            reader.readAsDataURL(file);
        }, (err) => {
            alert("Gagal absen: Tolong aktifkan izin lokasi GPS pada browser tablet/HP Anda.");
        });
    };

    document.getElementById('btn-sos-karyawan').onclick = () => {
        if(confirm("Kirim Sinyal SOS Darurat ke Ruang Pengawas Gedung Sekarang?")) {
            const idSos = `sos_${Date.now()}`;
            set(ref(db, `laporan_emergency/${userGedungKunci}/${idSos}`), {
                oleh: userNamaKunci, gedung: userGedungKunci, waktu: new Date().toLocaleTimeString('id-ID'), status: "CRITICAL"
            }).then(() => alert("Sinyal SOS Disebarkan! Tetap tenang di area, team HSE segera merapat."));
        }
    };

    document.getElementById('nav-tugas-rutin').onclick = () => {
        document.getElementById('karyawan-menu-grup').style.display = 'none';
        document.getElementById('page-tugas-rutin').style.display = 'block';
        renderPenugasanSisiKaryawan(todayStr);
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
    document.getElementById('nav-rekap-arsip').onclick = () => {
        document.getElementById('karyawan-menu-grup').style.display = 'none';
        document.getElementById('page-rekap-arsip').style.display = 'block';
        renderArsipHistoryKaryawan();
    };

    document.querySelectorAll('.btn-kembali').forEach(btn => { btn.onclick = () => resetHalamanKaryawan(); });

    document.getElementById('btn-submit-isu').onclick = () => {
        const lok = document.getElementById('isu-nama-lokasi').value.trim();
        const desk = document.getElementById('isu-deskripsi').value.trim();
        if(!lok || !desk) { alert("Semua form isu wajib diisi lengkap!"); return; }

        const idIsu = `isu_${Date.now()}`;
        set(ref(db, `laporan_isu_global/${currentMonthStr}/${idIsu}`), {
            waktu: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toLocaleTimeString('id-ID'),
            pelapor: userNamaKunci,
            gedung: userGedungKunci,
            lokasiSpesifik: lok,
            deskripsi: desk
        }).then(() => {
            alert("Laporan Kendala Fasilitas Gedung Berhasil Diarsip!");
            document.getElementById('isu-nama-lokasi').value = "";
            document.getElementById('isu-deskripsi').value = "";
            resetHalamanKaryawan();
        });
    };

    document.getElementById('btn-submit-log-chemical').onclick = () => {
        const chemNama = document.getElementById('input-log-chem-nama').value;
        const chemVol = document.getElementById('input-log-chem-vol').value.trim();
        if(!chemVol) { alert("Masukkan jumlah volume pemakaian!"); return; }

        const idLog = `chem_${Date.now()}`;
        set(ref(db, `log_chemical_global/${idLog}`), {
            waktu: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toLocaleTimeString('id-ID'),
            namaSkuad: userNamaKunci,
            chemical: chemNama,
            volume: chemVol + " ml",
            gedung: userGedungKunci
        }).then(() => {
            alert("Buku pemakaian material kimia terupdate!");
            document.getElementById('input-log-chem-vol').value = "";
            resetHalamanKaryawan();
        });
    };

    const inputCamPekerjaan = document.getElementById('camera-pekerjaan-input');
    inputCamPekerjaan.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64FotoKerja = reader.result;
            const jamSelesai = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

            update(ref(db, `monitoring_area/${userGedungKunci}/${todayStr}/${idTargetPekerjaanKlik}`), {
                status: "Menunggu Verifikasi Evaluasi Admin",
                fotoBukti: base64FotoKerja,
                jamLapor: jamSelesai
            }).then(() => {
                alert("Bukti Hasil Potret Kamera Berhasil Terkirim ke Supervisor Gedung!");
            });
        };
        reader.readAsDataURL(file);
    };
}

function renderPenugasanSisiKaryawan(todayStr) {
    onValue(ref(db, `monitoring_area/${userGedungKunci}/${todayStr}`), (snapshot) => {
        const data = snapshot.val() || {};
        const bBelum = document.getElementById('box-belum-dikerjakan'); bBelum.innerHTML = "";
        const bExtra = document.getElementById('box-extra-job-skuad'); bExtra.innerHTML = "";
        const bSelesai = document.getElementById('box-selesai-clean'); bSelesai.innerHTML = "";

        for (let id in data) {
            const item = data[id];
            if(item.skuadTarget !== userNamaKunci) continue;

            const card = document.createElement('div');
            card.style = "background:#ffffff; padding:10px; border-radius:6px; font-size:12px; border:1px solid #cbd5e1; margin-bottom:4px;";

            if (item.status === "Belum Dikerjakan") {
                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between;">
                        <strong>📍 ${item.area}</strong>
                        <span class="badge-status" style="background:var(--danger); font-size:9px;">${userShiftKunci}</span>
                    </div>
                    <button class="btn-success" style="font-size:11px; padding:4px 8px; width:100%; margin-top:8px;" onclick="bukaKameraTugas('${id}')"><i class="fa-solid fa-camera"></i> Ambil Foto Pekerjaan (Kamera Perangkat)</button>
                `;
                if(item.kategori === "Extra") bExtra.appendChild(card);
                else bBelum.appendChild(card);
            } else {
                let textBadgeStatus = item.status === "Area Resmi Bersih" ? `<span style="color:green; font-weight:bold;"><i class="fa-solid fa-square-check"></i> Selesai (Lulus Cek)</span>` : `<span style="color:#d39e00;"><i class="fa-solid fa-spinner fa-spin"></i> Menunggu Dinilai</span>`;
                if(item.status === "Kurang Bersih") {
                    textBadgeStatus = `<span style="color:red; font-weight:bold;"><i class="fa-solid fa-circle-exclamation"></i> Kurang Bersih: ${item.catatan || ''}</span><br><button class="btn-danger" style="font-size:10px; width:100%; margin-top:5px;" onclick="bukaKameraTugas('${id}')"><i class="fa-solid fa-camera"></i> Foto Ulang Pembersihan</button>`;
                }
                card.innerHTML = `<strong>📍 ${item.area}</strong><br><small style="color:#666;">Kategori: ${item.kategori || 'Rutin'}</small><br>${textBadgeStatus}`;
                bSelesai.appendChild(card);
            }
        }
    });
}

window.bukaKameraTugas = function(id) {
    idTargetPekerjaanKlik = id;
    document.getElementById('camera-pekerjaan-input').click();
};

function renderArsipHistoryKaryawan() {
    onValue(ref(db, `monitoring_area/${userGedungKunci}`), (snapshot) => {
        const rootGedung = snapshot.val() || {};
        const containerArsip = document.getElementById('box-list-history-tugas-karyawan'); containerArsip.innerHTML = "";
        let hitungRutin = 0; let hitungExtra = 0;

        for (let tgl in rootGedung) {
            for (let id in rootGedung[tgl]) {
                const item = rootGedung[tgl][id];
                if (item.skuadTarget === userNamaKunci && item.status === "Area Resmi Bersih") {
                    if (item.kategori === "Extra") hitungExtra++; else hitungRutin++;

                    const logRow = document.createElement('div');
                    logRow.style = "background:#ffffff; padding:6px; border-radius:4px; border-left:3px solid var(--success); margin-bottom:3px; display:flex; justify-content:space-between;";
                    logRow.innerHTML = `<span>📅 ${tgl} | <b>${item.area}</b></span> <span style="color:green; font-weight:bold;">COMPLETED</span>`;
                    containerArsip.appendChild(logRow);
                }
            }
        }
        document.getElementById('karyawan-stat-rutin').textContent = hitungRutin;
        document.getElementById('karyawan-stat-extra').textContent = hitungExtra;
    });
}

function aktifkanFiturAdmin() {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);

    if (userRoleKunci === "Admin Pusat") document.getElementById('block-admin-pusat-only').style.display = 'block';
    else document.getElementById('block-admin-pusat-only').style.display = 'none';

    document.getElementById('menu-pantau-absensi').onclick = () => document.getElementById('halaman-detail-absensi').style.display = 'block';
    document.getElementById('btn-tutup-absensi').onclick = () => document.getElementById('halaman-detail-absensi').style.display = 'none';
    document.getElementById('menu-admin-pantau-kerja').onclick = () => document.getElementById('halaman-pantau-kerja-admin').style.display = 'block';
    document.getElementById('btn-tutup-pantau-kerja').onclick = () => document.getElementById('halaman-pantau-kerja-admin').style.display = 'none';
    document.getElementById('menu-admin-rekap-isu').onclick = () => { document.getElementById('halaman-pantau-isu-admin').style.display = 'block'; renderBukuRekapIsuAdmin(); };
    document.getElementById('btn-tutup-pantau-isu').onclick = () => document.getElementById('halaman-pantau-isu-admin').style.display = 'none';

    document.getElementById('btn-submit-gedung-baru').onclick = () => {
        const kw = document.getElementById('input-kawasan-utama').value.trim();
        const tw = document.getElementById('input-sub-tower').value.trim();
        if(!kw || !tw) return;
        set(ref(db, `daftar_gedung/${kw}_-_${tw}`), { kawasan: kw, tower: tw });
        alert("Pendaftaran Master Gedung Berhasil Diarsip!");
    };

    if(userRoleKunci === "Admin Gedung") {
        document.getElementById('input-area-pilih-gedung').value = userGedungKunci;
        document.getElementById('input-area-pilih-gedung').disabled = true;
    }

    document.getElementById('btn-submit-area-baru').onclick = () => {
        const gd = document.getElementById('input-area-pilih-gedung').value;
        const targetSkuad = document.getElementById('input-target-nama-skuad').value.trim();
        const namaArea = document.getElementById('input-nama-area-baru').value.trim();
        const kat = document.getElementById('input-jenis-tugas-kategori').value;

        if(!targetSkuad || !namaArea) { alert("Isi Target Skuad & Rincian Area Tugas!"); return; }
        
        set(ref(db, `monitoring_area/${gd}/${todayStr}/task_${Date.now()}`), {
            area: namaArea,
            status: "Belum Dikerjakan",
            skuadTarget: targetSkuad,
            kategori: kat,
            jamLapor: "-"
        });
        alert("Instruksi Tugas Resmi Berhasil Dikirim Ke Skuad Lapangan!");
        document.getElementById('input-nama-area-baru').value = "";
    };

    onValue(ref(db, `laporan_emergency`), (snap) => {
        const rootSos = snap.val() || {};
        for(let gd in rootSos){
            if(userRoleKunci === "Admin Gedung" && gd !== userGedungKunci) continue;
            for(let id in rootSos[gd]){
                if(rootSos[gd][id].status === "CRITICAL") {
                    alert(`🚨 NOTIFIKASI EMERGENSI CRITICAL 🚨\n\nKaryawan ${rootSos[gd][id].oleh} memicu tombol SOS di area Gedung ${gd.replace(/_-_/g,' ')}!\n\nHarap hubungi Tim K3 dan Pengawas Gedung Segera!`);
                    update(ref(db, `laporan_emergency/${gd}/${id}`), { status: "HANDLED" });
                }
            }
        }
    });

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
                        
                        let tagFoto = r.fotoMasuk ? `<img src="${r.fotoMasuk}" class="img-bukti-kamera-render" onclick="window.open('${r.fotoMasuk}','_blank')">` : 'Tidak Ada Foto';

                        tr.innerHTML = `
                            <td><b>${r.nama}</b><br><small style="color:#666;">Gedung: ${idGedung.replace(/_-_/g,' ')}</small></td>
                            <td><span class="badge-status" style="background:var(--primary); font-size:10px;">${r.shift}</span></td>
                            <td>${tagFoto}</td>
                            <td>
                                <small>
                                    <b>Masuk:</b> ${r.masukLog || '-'}<br>
                                    <b>GPS Masuk:</b> ${r.masukGeo || '-'}<br><br>
                                    <b>Pulang:</b> ${r.pulangLog || '-'}<br>
                                    <b>GPS Pulang:</b> ${r.pulangGeo || '-'}
                                </small>
                            </td>
                        `;
                        tbodyAbsen.appendChild(tr);
                    }
                }
            }
        }
    });

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
                    
                    let tagFotoKerja = item.fotoBukti ? `<img src="${item.fotoBukti}" class="img-bukti-kamera-render" onclick="window.open('${item.fotoBukti}','_blank')">` : '<span style="color:#aaa;">Belum Foto Kamera</span>';
                    let noteEvaluasi = item.catatan ? `<br><small style="color:var(--danger); font-weight:bold;">Koreksi: ${item.catatan}</small>` : '';

                    tr.innerHTML = `
                        <td><b>${item.skuadTarget || '-'}</b><br><span class="badge-status" style="background:purple; font-size:9px;">Kategori: ${item.kategori || 'Rutin'}</span></td>
                        <td><b>${item.area}</b>${noteEvaluasi}<br><small style="color:#666;">Jam Lapor: ${item.jamLapor || '-'}</small></td>
                        <td>${tagFotoKerja}</td>
                        <td>
                            <div style="display:flex; flex-direction:column; gap:4px;">
                                <button style="background:green; color:white; font-size:10px; padding:4px;" onclick="evalPekerjaanLuar('${gd}','${id}','Area Resmi Bersih')">Bersih</button>
                                <button style="background:red; color:white; font-size:10px; padding:4px;" onclick="evalPekerjaanLuar('${gd}','${id}','Kurang Bersih')">Koreksi</button>
                            </div>
                        </td>
                    `;
                    tbodyEval.appendChild(tr);
                }
            });
        }
    });

    function renderBukuRekapIsuAdmin() {
        onValue(ref(db, `laporan_isu_global/${currentMonthStr}`), (snap) => {
            const data = snap.val() || {};
            const tbody = document.getElementById('table-rekap-isu-body'); tbody.innerHTML = "";
            for (let id in data) {
                if(userRoleKunci === "Admin Gedung" && data[id].gedung !== userGedungKunci) continue;
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${data[id].waktu}</td><td><b>${data[id].pelapor}</b><br><small>${data[id].gedung.replace(/_-_/g,' ')}</small></td><td><b>${data[id].lokasiSpesifik}</b></td><td>${data[id].deskripsi}</td>`;
                tbody.appendChild(tr);
            }
        });
    }

    document.getElementById('btn-export-excel-absensi').onclick = () => {
        onValue(ref(db, 'absensi_global'), (snapshot) => {
            const root = snapshot.val() || {};
            let csvContent = "data:text/csv;charset=utf-8,NAMA SKUAD,SHIFT,GEDUNG,LOG JAM MASUK,GPS LOKASI MASUK,LOG JAM PULANG,GPS LOKASI PULANG\n";

            for(let gd in root) {
                if(userRoleKunci === "Admin Gedung" && gd !== userGedungKunci) continue;
                for(let bln in root[gd]) {
                    for(let tgl in root[gd][bln]) {
                        for(let uid in root[gd][bln][tgl]) {
                            const r = root[gd][bln][tgl][uid];
                            csvContent += `"${r.nama}","${r.shift}","${gd.replace(/_-_/g,' ')}","${r.masukLog || '-'}","${r.masukGeo || '-'}","${r.pulangLog || '-'}","${r.pulangGeo || '-'}"\n`;
                        }
                    }
                }
            }
            unduhCSVFile(csvContent, `Rekap_Absensi_Skuad_${currentMonthStr}.csv`);
        }, { onlyOnce: true });
    };

    document.getElementById('btn-export-laporan-foto').onclick = () => {
        onValue(ref(db, 'monitoring_area'), (snapshot) => {
            const root = snapshot.val() || {};
            let csvContent = "data:text/csv;charset=utf-8,TANGGAL,GEDUNG,NAMA SKUAD,KATEGORI TUGAS,RINCIAN AREA KERJA,JAM LAPOR STATUS,STATUS EVALUASI SUPERVISOR\n";

            for(let gd in root) {
                if(userRoleKunci === "Admin Gedung" && gd !== userGedungKunci) continue;
                for(let tgl in root[gd]) {
                    for(let id in root[gd][tgl]) {
                        const item = root[gd][tgl][id];
                        csvContent += `"${tgl}","${gd.replace(/_-_/g,' ')}","${item.skuadTarget || '-'}","${item.kategori || 'Rutin'}","${item.area}","${item.jamLapor || '-'}","${item.status}"\n`;
                    }
                }
            }
            unduhCSVFile(csvContent, `Rekap_Evaluasi_Kerja_${currentMonthStr}.csv`);
        }, { onlyOnce: true });
    };

    document.getElementById('btn-export-excel-isu').onclick = () => {
        onValue(ref(db, `laporan_isu_global/${currentMonthStr}`), (snapshot) => {
            const data = snapshot.val() || {};
            let csvContent = "data:text/csv;charset=utf-8,WAKTU LAPORAN,NAMA PELAPOR,GEDUNG MITRA,LOKASI FASILITAS SPESIFIK,LOKASI FASILITAS SPESIFIK,URAIAN KENDALA ISU LAPANGAN\n";

            for(let id in data) {
                if(userRoleKunci === "Admin Gedung" && data[id].gedung !== userGedungKunci) continue;
                csvContent += `"${data[id].waktu}","${data[id].pelapor}","${data[id].gedung.replace(/_-_/g,' ')}","${data[id].lokasiSpesifik}","${data[id].deskripsi}"\n`;
            }
            unduhCSVFile(csvContent, `Rekap_Isu_Gedung_${currentMonthStr}.csv`);
        }, { onlyOnce: true });
    };

    document.getElementById('btn-export-excel-chemical').onclick = () => {
        onValue(ref(db, 'log_chemical_global'), (snapshot) => {
            const data = snapshot.val() || {};
            let csvContent = "data:text/csv;charset=utf-8,WAKTU INPUT,GEDUNG,NAMA SKUAD,NAMA LARUTAN CHEMICAL,VOLUME TERPAKAI\n";

            for(let id in data) {
                if(userRoleKunci === "Admin Gedung" && data[id].gedung !== userGedungKunci) continue;
                csvContent += `"${data[id].waktu}","${data[id].gedung.replace(/_-_/g,' ')}","${data[id].namaSkuad}","${data[id].chemical}","${data[id].volume}"\n`;
            }
            unduhCSVFile(csvContent, `Log_Pemakaian_Chemical_${currentMonthStr}.csv`);
        }, { onlyOnce: true });
    };

    function unduhCSVFile(content, namaFile) {
        const encodedUri = encodeURI(content);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", namaFile);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    onValue(ref(db, 'users_profile'), (snapshot) => {
        const users = snapshot.val(); 
        const tbody = document.getElementById('table-approval-karyawan-body'); tbody.innerHTML = "";
        
        for (let uid in users) {
            if(users[uid].role === "Admin Pusat") continue;
            if(userRoleKunci === "Admin Gedung" && users[uid].gedung !== userGedungKunci) continue;

            const u = users[uid]; const tr = document.createElement('tr');
            let sAktif = u.shift || "Shift 1";

            tr.innerHTML = `
                <td><b>${u.nama}</b><br><small>${u.email}</small></td>
                <td><small>${u.gedung.replace(/_-_/g,' ')}</small></td>
                <td>
                    <select onchange="aturJadwalShiftDinamis('${uid}', this.value)" style="font-size:11px; padding:2px;">
                        <option value="Shift 1" ${sAktif === "Shift 1" ? "selected" : ""}>Shift 1</option>
                        <option value="Shift 2" ${sAktif === "Shift 2" ? "selected" : ""}>Shift 2</option>
                        <option value="Shift 3" ${sAktif === "Shift 3" ? "selected" : ""}>Shift 3</option>
                        <option value="Shift 4" ${sAktif === "Shift 4" ? "selected" : ""}>Shift 4</option>
                    </select>
                </td>
                <td>
                    <button class="${u.status === "Pending" ? "btn-action-success" : "btn-action-danger"}" onclick="toggleStatusPersetujuan('${uid}', '${u.status}')">
                        ${u.status === "Pending" ? "Approve" : "Suspend"}
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        }
    });
}

window.toggleStatusPersetujuan = function(uid, statusSekarang) {
    const statusBaru = statusSekarang === "Pending" ? "Aktif" : "Pending";
    update(ref(db, `users_profile/${uid}`), { status: statusBaru, tgl_status: new Date().toISOString().split('T')[0] });
};

window.aturJadwalShiftDinamis = function(uid, shiftBaru) {
    update(ref(db, `users_profile/${uid}`), { shift: shiftBaru });
    alert("Pola Shift Anggota Lapangan Berhasil Diubah!");
};

window.evalPekerjaanLuar = function(gedung, id, status) {
    const todayStr = new Date().toISOString().split('T')[0];
    if (status === "Kurang Bersih") {
        const pesanKoreksi = prompt("Tuliskan poin catatan koreksi pembersihan:");
        if (pesanKoreksi === null) return;
        if (pesanKoreksi.trim() === "") { alert("Alasan wajib ditulis!"); return; }
        update(ref(db, `monitoring_area/${gedung}/${todayStr}/${id}`), { status: status, catatan: pesanKoreksi.trim() });
    } else {
        update(ref(db, `monitoring_area/${gedung}/${todayStr}/${id}`), { status: status, catatan: null });
    }
};

window.hapusGedungMaster = function(idGedung) {
    if(confirm("Hapus total kontrak gedung master ini beserta seluruh datanya?")) {
        remove(ref(db, `daftar_gedung/${idGedung}`));
        remove(ref(db, `monitoring_area/${idGedung}`));
    }
};
