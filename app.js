import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ==========================================
// 🛠️ MASUKKAN CONFIG FIREBASE ASLI KAMU DI SINI
// ==========================================
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

// DOM Elemen Target
const loginPage = document.getElementById('login-page');
const loginForm = document.getElementById('login-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginError = document.getElementById('login-error');
const roleTitle = document.getElementById('role-title');
const userDisplayEmail = document.getElementById('user-display-email');
const btnLogout = document.getElementById('btn-logout');
const karyawanSection = document.getElementById('karyawan-section');
const adminSection = document.getElementById('admin-section');

// Sesi Variabel Aktif
let currentUserEmail = "";
let currentUserUID = "";
let userGedungKunci = "";
let userShiftKunci = "";
let flagAudioPertama = true;

// Alur Tampilan Registrasi Karyawan
document.getElementById('link-buka-daftar').onclick = (e) => {
    e.preventDefault();
    document.getElementById('form-daftar-karyawan').style.display = 'block';
};
document.getElementById('btn-batal-daftar').onclick = () => {
    document.getElementById('form-daftar-karyawan').style.none = 'none';
};

// ==========================================
// 🏢 LOGIKA SYNC KAWASAN & SUB-TOWER DINAMIS
// ==========================================
document.getElementById('btn-submit-gedung-baru').onclick = () => {
    const kawasanRaw = document.getElementById('input-kawasan-utama').value.trim();
    const subTowerRaw = document.getElementById('input-sub-tower').value.trim();
    
    // Ganti spasi dengan underscore demi keamanan path Firebase
    const kawasan = kawasanRaw.replace(/\s+/g, '_');
    const subTower = subTowerRaw.replace(/\s+/g, '_');

    if (!kawasan || !subTower) { alert("Nama Kawasan & Tower tidak boleh ada yang kosong, boy!"); return; }

    const keyKombinasi = `${kawasan}_-_${subTower}`;

    // Simpan ke node master daftar_gedung
    set(ref(db, `daftar_gedung/${keyKombinasi}`), {
        kawasan: kawasan.replace(/_/g, ' '),
        tower: subTower.replace(/_/g, ' '),
        namaLengkap: `${kawasan.replace(/_/g, ' ')} - ${subTower.replace(/_/g, ' ')}`
    }).then(() => {
        alert(`Sukses! ${kawasan.replace(/_/g, ' ')} (${subTower.replace(/_/g, ' ')}) berhasil didaftarkan.`);
        document.getElementById('input-sub-tower').value = "";
    }).catch((err) => alert("Gagal simpan data gedung: " + err.message));
};

// Fungsi Otomatis Mengisi Semua Pilihan Dropdown dari Firebase
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
    } else {
        // Inisialisasi awal bawaan sistem jika kosong
        const defaultGedungInit = "CS_Isabela_-_Tower_A_Gedung_Biru";
        set(ref(db, `daftar_gedung/${defaultGedungInit}`), {
            kawasan: "CS Isabela", tower: "Tower A Gedung Biru", namaLengkap: "CS Isabela - Tower A Gedung Biru"
        });
    }
});

// 📝 PROSES PENDAFTARAN MANDIRI KARYAWAN
document.getElementById('btn-submit-daftar').onclick = () => {
    const nama = document.getElementById('reg-nama').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-password').value.trim();
    const lokasi = document.getElementById('reg-lokasi').value;

    if (!nama || !email || !pass) { alert("Semua kolom registrasi wajib diisi ya, boy!"); return; }

    createUserWithEmailAndPassword(auth, email, pass)
        .then((userCredential) => {
            const uid = userCredential.user.uid;
            set(ref(db, `users_profile/${uid}`), {
                nama: nama, email: email, gedung: lokasi, shift: "Pagi", status: "Pending", role: "Karyawan"
            }).then(() => {
                alert("Pendaftaran Sukses! Akun kamu sedang diverifikasi Admin Clean Solution.");
                signOut(auth);
                document.getElementById('form-daftar-karyawan').style.display = 'none';
                loginForm.reset();
            });
        })
        .catch((err) => alert("Gagal Daftar Akun: " + err.message));
};

// ==========================================
// 🔑 PROSES OTENTIKASI & SECURITY LOCK AKSES
// ==========================================
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value)
        .then(() => { loginError.textContent = ""; })
        .catch((err) => { loginError.textContent = "Akses Ditolak: " + err.message; });
});

btnLogout.addEventListener('click', () => { signOut(auth); });

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserEmail = user.email;
        currentUserUID = user.uid;
        
        onValue(ref(db, `users_profile/${currentUserUID}`), (snapshot) => {
            const profil = snapshot.val();
            
            if (currentUserEmail.includes('admin')) {
                userDisplayEmail.textContent = currentUserEmail;
                loginPage.style.display = 'none';
                roleTitle.innerHTML = 'Panel Admin Super <i class="fa-solid fa-crown" style="color: #ffd700;"></i>';
                adminSection.style.display = 'block'; karyawanSection.style.display = 'none';
                aktifkanFiturAdmin();
            } else if (profil && profil.status === "Aktif") {
                userGedungKunci = profil.gedung;
                userShiftKunci = profil.shift;

                userDisplayEmail.textContent = `${profil.nama} [${userGedungKunci.replace(/_-_/g,' - ').replace(/_/g,' ')}]`;
                loginPage.style.display = 'none';
                roleTitle.innerHTML = `Panel Karyawan - Shift ${userShiftKunci} <i class="fa-solid fa-user-tie"></i>`;
                karyawanSection.style.display = 'block'; adminSection.style.display = 'none';
                aktifkanFiturKaryawan();
            } else {
                alert("Akses Dikunci: Akun belum di-Approve oleh Admin!");
                signOut(auth);
            }
        });
    } else {
        loginPage.style.display = 'block';
        adminSection.style.display = 'none'; karyawanSection.style.display = 'none';
    }
});

// ==========================================
// 👷 OPERASIONAL KARYAWAN & ALARM AUDIO HP
// ==========================================
function aktifkanFiturKaryawan() {
    const todayStr = new Date().toISOString().split('T')[0];
    const btnMasuk = document.getElementById('btn-absen-masuk');
    const btnPulang = document.getElementById('btn-absen-pulang');
    const absenStatus = document.getElementById('absen-status');
    const selectShift = document.getElementById('pilih-shift');

    selectShift.value = userShiftKunci;
    selectShift.disabled = true;

    onValue(ref(db, `absensi/${userGedungKunci}/${todayStr}/${currentUserUID}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            if (data.masuk && data.pulang) {
                absenStatus.className = "status-sudah-pulang"; absenStatus.textContent = `Selesai Kerja`;
                btnMasuk.disabled = true; btnPulang.disabled = true;
            } else if (data.masuk) {
                absenStatus.className = "status-sudah-masuk"; absenStatus.textContent = `Sudah Masuk Kerja (${data.masuk})`;
                btnMasuk.disabled = true; btnPulang.disabled = false;
            }
        } else {
            absenStatus.className = "status-belum-absen"; absenStatus.textContent = "Belum Absen";
            btnMasuk.disabled = false; btnPulang.disabled = true;
        }
    });

    btnMasuk.onclick = () => {
        const jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        set(ref(db, `absensi/${userGedungKunci}/${todayStr}/${currentUserUID}`), { 
            nama: currentUserEmail, masuk: jam, status: "Aktif", shift: userShiftKunci 
        });
    };

    btnPulang.onclick = () => {
        const jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        update(ref(db, `absensi/${userGedungKunci}/${todayStr}/${currentUserUID}`), { pulang: jam, status: "Selesai" });
    };

    renderGridAreaKaryawan(todayStr);
}

function renderGridAreaKaryawan(todayStr) {
    const gridAreaKaryawan = document.getElementById('grid-area-karyawan');
    const judulArea = document.getElementById('judul-monitoring-area');
    const boxNotif = document.getElementById('box-notif-suara');

    judulArea.innerText = `Monitoring Area - ${userGedungKunci.replace(/_-_/g,' - ').replace(/_/g,' ')} (${userShiftKunci})`;

    onValue(ref(db, `monitoring_area/${userGedungKunci}/${todayStr}`), (snapshot) => {
        const dataHariIni = snapshot.val() || {};
        gridAreaKaryawan.innerHTML = ""; 
        
        let adaKotor = false;
        let namaAreaKotor = "";
        let statusKotor = "";
        let hitungTugas = 0;

        for (let id in dataHariIni) {
            const item = dataHariIni[id];
            const cocokShift = (userShiftKunci === "Middle" && item.tipe === "Project") || (userShiftKunci !== "Middle" && item.tipe === "Daily");
            
            if (cocokShift) {
                hitungTugas++;
                let statusClass = "badge-belum";
                if (item.status === "Butuh Check Admin") statusClass = "badge-proses";
                if (item.status === "Area Bersih") statusClass = "badge-bersih";
                if (item.status === "Kurang Bersih" || item.status === "Masih Kotor") {
                    statusClass = "badge-kotor"; adaKotor = true; namaAreaKotor = item.area; statusKotor = item.status;
                }

                const card = document.createElement('div');
                card.className = "card-grid-area";
                card.innerHTML = `
                    <h4>${item.area}</h4>
                    <p>Status: <span class="badge-status ${statusClass}">${item.status}</span></p>
                    <p>Catatan Admin: <i>${item.keterangan || '-'}</i></p>
                    <p><small>Oleh: ${item.oleh || '-'}</small></p>
                    <button class="btn-lapor-area" id="btn-lapor-${id}">Laporkan Selesai</button>
                `;
                gridAreaKaryawan.appendChild(card);

                const btnLapor = document.getElementById(`btn-lapor-${id}`);
                if (item.status === "Area Bersih" || item.status === "Butuh Check Admin") {
                    btnLapor.disabled = true; btnLapor.innerText = "Sudah Dilaporkan";
                }

                btnLapor.onclick = () => {
                    const jamStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                    update(ref(db, `monitoring_area/${userGedungKunci}/${todayStr}/${id}`), {
                        oleh: currentUserEmail.split('@')[0], waktu: jamStr, status: "Butuh Check Admin"
                    });
                };
            }
        }

        if (hitungTugas === 0) {
            gridAreaKaryawan.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:20px; color:#999;">Belum ada tugas diinput admin hari ini.</div>`;
        }

        if (adaKotor && !flagAudioPertama) {
            boxNotif.style.backgroundColor = "#f8d7da"; boxNotif.style.color = "#721c24";
            boxNotif.innerHTML = `<strong>⚠️ EVALUASI:</strong> Area <b>${namaAreaKotor}</b> dinilai <b>${statusKotor}</b>!`;
            bunyikanSuaraPeringatan(namaAreaKotor, statusKotor);
        } else if (!adaKotor) {
            boxNotif.style.backgroundColor = "#e3f2fd"; boxNotif.style.color = "#0d47a1";
            boxNotif.innerHTML = `✨ Semua area kerja terkonfirmasi bersih & kondusif.`;
        }
        flagAudioPertama = false;
    });
}

function bunyikanSuaraPeringatan(area, status) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode); gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine'; oscillator.frequency.value = 880;
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        oscillator.start(); oscillator.stop(audioCtx.currentTime + 0.25);

        setTimeout(() => {
            const pesanSuara = new SpeechSynthesisUtterance(`Perhatian area ${area} statusnya ${status}. Segera bersihkan ulang!`);
            pesanSuara.lang = 'id-ID'; window.speechSynthesis.speak(pesanSuara);
        }, 350);
    } catch (e) { console.log("Audio diblokir."); }
}

// ==========================================
// 👑 PANEL UTAMA CONTROL ADMIN SUPER
// ==========================================
function aktifkanFiturAdmin() {
    const todayStr = new Date().toISOString().split('T')[0];

    document.getElementById('menu-pantau-absensi').onclick = () => document.getElementById('halaman-detail-absensi').style.display = 'block';
    document.getElementById('btn-tutup-absensi').onclick = () => document.getElementById('halaman-detail-absensi').style.display = 'none';
    document.getElementById('menu-admin-pantau-kerja').onclick = () => document.getElementById('halaman-pantau-kerja-admin').style.display = 'block';
    document.getElementById('btn-tutup-pantau-kerja').onclick = () => document.getElementById('halaman-pantau-kerja-admin').style.display = 'none';

    // A. SUBMIT AREA KERJA HARIAN ROUTINE (DAILY)
    document.getElementById('btn-submit-area-baru').onclick = () => {
        const gedungPilih = document.getElementById('input-area-pilih-gedung').value;
        const namaArea = document.getElementById('input-nama-area-baru').value.trim();
        if (!namaArea) { alert("Isi nama areanya dulu, boy!"); return; }

        const idArea = "daily_" + Date.now();
        set(ref(db, `monitoring_area/${gedungPilih}/${todayStr}/${idArea}`), {
            area: namaArea, status: "Belum Dikerjakan", keterangan: "-", oleh: "-", waktu: "-", tipe: "Daily"
        }).then(() => {
            alert("Area Daily Berhasil Ditambahkan!");
            document.getElementById('input-nama-area-baru').value = "";
        });
    };

    // B. SUBMIT PROJECT BARU (SHIFT MIDDLE)
    document.getElementById('btn-submit-project-baru').onclick = () => {
        const gedungPilih = document.getElementById('input-area-pilih-gedung').value;
        const namaProj = document.getElementById('input-nama-project-baru').value.trim();
        if (!namaProj) { alert("Isi keterangan project dulu, boy!"); return; }

        const idProj = "proj_" + Date.now();
        set(ref(db, `monitoring_area/${gedungPilih}/${todayStr}/${idProj}`), {
            area: namaProj, status: "Belum Dikerjakan", keterangan: "-", oleh: "-", waktu: "-", tipe: "Project"
        }).then(() => {
            alert("Tugas Project Berhasil Ditambahkan!");
            document.getElementById('input-nama-project-baru').value = "";
        });
    };

    // C. MANAGEMENT ROLLING SHIFT BULANAN & APPROVAL
    onValue(ref(db, 'users_profile'), (snapshotUsers) => {
        const users = snapshotUsers.val();
        const tbody = document.getElementById('table-approval-karyawan-body');
        tbody.innerHTML = "";

        onValue(ref(db, 'daftar_gedung'), (snapshotGedung) => {
            const listGedung = snapshotGedung.val() || {};
            
            if (users) {
                for (let uid in users) {
                    if (users[uid].role === "Admin") continue;
                    const u = users[uid];
                    const isPending = u.status === "Pending";

                    let opsiGedungHtml = "";
                    for (let keyGedung in listGedung) {
                        const labelTampil = keyGedung.replace(/_-_/g, ' - ').replace(/_/g, ' ');
                        opsiGedungHtml += `<option value="${keyGedung}" ${u.gedung===keyGedung?'selected':''}>${labelTampil}</option>`;
                    }

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><b>${u.nama}</b><br><small>${u.email}</small></td>
                        <td><select id="set-gedung-${uid}" ${!isPending ? 'disabled':''}>${opsiGedungHtml}</select></td>
                        <td>
                            <select id="set-shift-${uid}">
                                <option value="Pagi" ${u.shift==='Pagi'?'selected':''}>Pagi (Daily)</option>
                                <option value="Middle" ${u.shift==='Middle'?'selected':''}>Middle (Project)</option>
                                <option value="Sore" ${u.shift==='Sore'?'selected':''}>Sore (Daily)</option>
                            </select>
                        </td>
                        <td>
                            ${isPending ? `<button style="background:green; color:white; font-size:11px;" onclick="prosesApproval('${uid}', 'Aktif')">Approve</button>` : ''}
                            <button style="background:#4e73df; color:white; font-size:11px;" onclick="updatePlottingKaryawan('${uid}')">Update Shift</button>
                            <button style="background:red; color:white; font-size:11px;" onclick="prosesApproval('${uid}', 'Nonaktif')">Blokir</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                }
            }
        });
    });

    // D. MONITOR EVALUASI GABUNGAN MULTI-GEDUNG & MULTI-TOWER REAL-TIME
    onValue(ref(db, 'daftar_gedung'), (snapshotGedung) => {
        const listGedungMasyarakat = snapshotGedung.val() || {};
        const daftarGedungTerbaca = Object.keys(listGedungMasyarakat);
        
        const tbodyEvaluasi = document.getElementById('table-pantau-area-body');
        tbodyEvaluasi.innerHTML = "";

        daftarGedungTerbaca.forEach(gedung => {
            onValue(ref(db, `monitoring_area/${gedung}/${todayStr}`), (snapshotArea) => {
                const dataGedung = snapshotArea.val();
                if (dataGedung) {
                    for (let id in dataGedung) {
                        const barisLama = document.getElementById(`rowAdmin-${id}`);
                        if (barisLama) barisLama.remove();

                        const item = dataGedung[id];
                        let statusClass = "text-warning-clean";
                        if (item.status === "Area Bersih") statusClass = "text-success-clean";
                        if (item.status === "Kurang Bersih" || item.status === "Masih Kotor") statusClass = "text-danger-clean";

                        const labelGedungCantik = gedung.replace(/_-_/g, ' - ').replace(/_/g, ' ');

                        const tr = document.createElement('tr');
                        tr.id = `rowAdmin-${id}`;
                        tr.innerHTML = `
                            <td><small>Oleh: ${item.oleh || '-'}<br>Jam: ${item.waktu || '-'}</small></td>
                            <td><b>${item.area}</b><br><small style="color:#4e73df; font-weight:bold;">📍 ${labelGedungCantik} [${item.tipe}]</small></td>
                            <td><span class="${statusClass}">${item.status}</span><br><small>Ket: ${item.keterangan}</small></td>
                            <td>
                                <input type="text" id="input-ket-${id}" placeholder="Catatan..." value="${item.keterangan !== '-' ? item.keterangan : ''}" style="width:90px; font-size:11px;"><br>
                                <button style="background:green; color:white; font-size:10px;" onclick="adminEvaluasiMulti('${gedung}', '${id}', 'Area Bersih')">Clean</button>
                                <button style="background:orange; color:white; font-size:10px;" onclick="adminEvaluasiMulti('${gedung}', '${id}', 'Kurang Bersih')">Miss</button>
                                <button style="background:red; color:white; font-size:10px;" onclick="adminEvaluasiMulti('${gedung}', '${id}', 'Masih Kotor')">Dirty</button>
                            </td>
                        `;
                        tbodyEvaluasi.appendChild(tr);
                    }
                }
            });
        });

        // E. REKAP ABSENSI REAL-TIME MULTI-GEDUNG
        const tbodyAbsen = document.getElementById('table-absensi-body');
        tbodyAbsen.innerHTML = "";
        daftarGedungTerbaca.forEach(gedung => {
            onValue(ref(db, `absensi/${gedung}/${todayStr}`), (snapshotAbsen) => {
                const dataAbsen = snapshotAbsen.val();
                if (dataAbsen) {
                    for (let uid in dataAbsen) {
                        const rowLama = document.getElementById(`rowAbsen-${uid}`);
                        if (rowLama) rowLama.remove();

                        const item = dataAbsen[uid];
                        const labelGedungCantik = gedung.replace(/_-_/g, ' - ').replace(/_/g, ' ');
                        const tr = document.createElement('tr');
                        tr.id = `rowAbsen-${uid}`;
                        tr.innerHTML = `
                            <td><b>${item.nama.split('@')[0]}</b><br><small>📍 ${labelGedungCantik} [${item.shift}]</small></td>
                            <td>${item.masuk || '-'}</td>
                            <td>${item.pulang || '-'}</td>
                            <td><span style="color:green; font-weight:bold;">${item.status}</span></td>
                        `;
                        tbodyAbsen.appendChild(tr);
                    }
                }
            });
        });
    });
}

// Global Window Actions Controller
window.prosesApproval = function(uid, statusBaru) {
    const gedungSet = document.getElementById(`set-gedung-${uid}`).value;
    const shiftSet = document.getElementById(`set-shift-${uid}`).value;
    update(ref(db, `users_profile/${uid}`), { status: statusBaru, gedung: gedungSet, shift: shiftSet })
        .then(() => alert("Status Verifikasi Karyawan Berhasil Disimpan!"));
};

window.updatePlottingKaryawan = function(uid) {
    const shiftSet = document.getElementById(`set-shift-${uid}`).value;
    update(ref(db, `users_profile/${uid}`), { shift: shiftSet })
        .then(() => alert("Rotasi Rolling Shift Bulanan Sukses Diupdate!"));
};

window.adminEvaluasiMulti = function(gedung, idArea, statusBaru) {
    const todayStr = new Date().toISOString().split('T')[0];
    const catatanManual = document.getElementById(`input-ket-${idArea}`).value || "-";
    update(ref(db, `monitoring_area/${gedung}/${todayStr}/${idArea}`), { status: statusBaru, keterangan: catatanManual })
        .then(() => alert(`Evaluasi disimpan untuk area di ${gedung.replace(/_-_/g, ' - ').replace(/_/g, ' ')}!`));
};
