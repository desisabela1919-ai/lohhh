import { ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { db } from "./firebase-config.js";
import { currentUserUID, userGedungKunci, userShiftKunci, userNamaKunci } from "./auth.js";

let flagAbsenMode = "masuk";
let idTargetPekerjaanKlik = "";

// RE-USEABLE SYSTEM: RESET LAYOUT SUB-MENU KARYAWAN
export function resetHalamanKaryawan() {
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
export function aktifkanFiturKaryawan() {
    const d = new Date();
    const todayStr = d.toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);

    // Listener Realtime Absensi Skuad
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

        // VALIDASI TIMING & LOCK PANEL ABSENSI
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

    // EMERGENCY SOS BUTTON SYSTEM
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

    // INTERNAL PAGE NAVIGATION ROUTER
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
        btn.onclick = () => resetHalamanKaryawan(); 
    });

    // SUBMIT KENDALA / LAPORAN ISU LAPANGAN
    if(document.getElementById('btn-submit-isu')) {
        document.getElementById('btn-submit-isu').onclick = () => {
            const lokElement = document.getElementById('isu-nama-lokasi');
            const deskElement = document.getElementById('isu-deskripsi');
            const lok = lokElement ? lokElement.value.trim() : "";
            const desk = deskElement ? deskElement.value.trim() : "";
            if(!lok || !desk) { alert("Semua form isu wajib diisi lengkap!"); return; }
            const idIsu = `isu_${Date.now()}`;
            set(ref(db, `laporan_isu_global/${currentMonthStr}/${idIsu}`), { waktu: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toLocaleTimeString('id-ID'), pelapor: userNamaKunci, gedung: userGedungKunci, lokasiSpesifik: lok, deskripsi: desk }).then(() => { alert("Laporan Kendala Berhasil Dikirim!"); resetHalamanKaryawan(); });
        };
    }

    // RECORD MATERIAL LOG: BUKU CHEMICAL
    if(document.getElementById('btn-submit-log-chemical')) {
        document.getElementById('btn-submit-log-chemical').onclick = () => {
            const chemNamaElement = document.getElementById('input-log-chem-nama');
            const chemVolElement = document.getElementById('input-log-chem-vol');
            const chemNama = chemNamaElement ? chemNamaElement.value : "";
            const chemVol = chemVolElement ? chemVolElement.value.trim() : "";
            if(!chemVol) { alert("Masukkan jumlah volume pemakaian!"); return; }
            const idLog = `chem_${Date.now()}`;
            set(ref(db, `log_chemical_global/${idLog}`), { waktu: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toLocaleTimeString('id-ID'), namaSkuad: userNamaKunci, chemical: chemNama, volume: chemVol + " ml", gedung: userGedungKunci }).then(() => { alert("Buku material terupdate!"); resetHalamanKaryawan(); });
        };
    }

    // CAPTURE MEDIA: FOTO BUKTI SELESAI PENUGASAN AREA
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
                        status: "Menunggu Pengecekan",
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

// BIND KE GLOBAL ACTION AGAR BISA DIAKSES OLEH ATTRIBUTE ONCLICK DI HTML
globalThis.bukaKameraTugas = function(id) { 
    idTargetPekerjaanKlik = id; 
    const cam = document.getElementById('camera-pekerjaan-input'); 
    if(cam) cam.click(); 
};

// ARSIP COMPLETED JOB HISTORY SISI KARYAWAN
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
