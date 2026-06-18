import { ref, onValue, update, remove, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { db } from "./firebase-config.js";
import { userGedungKunci, userRoleKunci } from "./auth.js";

// ================================================================= */
// MODUL MANAGEMENT CONTROL BACK-OFFICE SUPERVISOR / ADMIN 
// ================================================================= */
export function aktifkanFiturAdmin() {
    // SINKRONISASI TANGGAL LOKAL (WIB / id-ID) - Menghindari Bug ISO String beda hari
    const dLocal = new Date();
    const tglLokal = dLocal.getDate().toString().padStart(2, '0');
    const blnLokal = (dLocal.getMonth() + 1).toString().padStart(2, '0');
    const thnLokal = dLocal.getFullYear();
    const todayStr = `${thnLokal}-${blnLokal}-${tglLokal}`; // Format: YYYY-MM-DD sesuai Firebase

    // Batasi hak akses menu khusus Admin Pusat
    const blockPusat = document.getElementById('block-admin-pusat-only');
    if (blockPusat) {
        blockPusat.style.display = (userRoleKunci === "Admin Pusat") ? 'block' : 'none';
    }

    // Navigasi Router internal Sub-Menu Admin
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

    // REALTIME LISTENER EVALUASI LAPANGAN (UNTUK ADMIN / SUPERVISOR)
    onValue(ref(db, `monitoring_area/${userGedungKunci}/${todayStr}`), (snapshot) => {
        const dataKerja = snapshot.val() || {};
        const tbodyEvaluasi = document.getElementById('table-pantau-area-body');
        
        if(tbodyEvaluasi) {
            tbodyEvaluasi.innerHTML = "";
            let adaDataEvaluasi = false;

            for(let idKerja in dataKerja) {
                const item = dataKerja[idKerja];
                
                // Hanya memproses kerjaan yang sedang menunggu verifikasi admin
                if(item.status === "Menunggu Pengecekan") {
                    adaDataEvaluasi = true;
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><b>${item.skuadTarget}</b><br><small style="color:#64748b;">${item.shiftKerja || 'General'}</small></td>
                        <td><b>${item.area}</b></td>
                        <td>
                            <a href="${item.fotoBukti}" target="_blank">
                                <img src="${item.fotoBukti}" style="width:45px; height:45px; object-fit:cover; border-radius:4px; border:1px solid #cbd5e1;" alt="Bukti"/>
                            </a>
                        </td>
                        <td>
                            <div style="display:flex; gap:4px;">
                                <button style="background:var(--success); color:white; padding:4px 6px; font-size:11px; border-radius:4px; width:auto; border:none; cursor:pointer;" onclick="adminApproveKerja('${userGedungKunci}', '${todayStr}', '${idKerja}')">Lulus Cek</button>
                                <button style="background:var(--danger); color:white; padding:4px 6px; font-size:11px; border-radius:4px; width:auto; border:none; cursor:pointer;" onclick="adminTolakKerja('${userGedungKunci}', '${todayStr}', '${idKerja}')">Koreksi</button>
                            </div>
                        </td>
                    `;
                    tbodyEvaluasi.appendChild(tr);
                }
            }

            if(!adaDataEvaluasi) {
                tbodyEvaluasi.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8; font-style:italic; padding:15px;">Semua area clear / Belum ada laporan masuk.</td></tr>`;
            }
        }
    });

    // AMBIL KARYAWAN AKTIF UNTUK DROPDOWN PENUGASAN
    onValue(ref(db, 'users_profile'), (snapshot) => {
        const users = snapshot.val() || {};
        const selectSkuad = document.getElementById('input-target-nama-skuad');
        
        if (selectSkuad) {
            selectSkuad.innerHTML = `<option value="">-- Pilih Anggota Skuad --</option>`;
            for (let uid in users) {
                const u = users[uid];
                if (u.status === "Aktif" && u.role === "Karyawan" && (u.gedung === userGedungKunci || userRoleKunci === "Admin Pusat")) {
                    selectSkuad.innerHTML += `<option value="${u.nama}">${u.nama}</option>`;
                }
            }
        }
    });

    // INTERSEPSI ENGINE: TOMBOL KIRIM TUGAS RESMI (DENGAN BEBERAPA PILIHAN FALLBACK ID ELEMENT)
    const btnSubmitTugas = document.getElementById('btn-submit-area-baru-v2') || document.getElementById('btn-submit-area-baru');
    if (btnSubmitTugas) {
        btnSubmitTugas.onclick = function() {
            // Deteksi ID area pilih gedung
            const elGedung = document.getElementById('input-area-pilih-gedung') || document.getElementById('input-area-gedung');
            const areaPilih = elGedung ? elGedung.value : userGedungKunci;

            // Deteksi ID input area spesifik (Mendeteksi ID lu yang mungkin 'input-nama-area' atau sejenisnya)
            const elAreaSpesifik = document.getElementById('input-nama-area-spesifik') || document.getElementById('input-nama-area') || document.querySelector('input[placeholder*="Toilet"]');
            const namaAreaSpesifik = elAreaSpesifik ? elAreaSpesifik.value.trim() : "";

            // Deteksi ID target skuad
            const elSkuad = document.getElementById('input-target-nama-skuad') || document.getElementById('input-target-skuad');
            const skuadTarget = elSkuad ? elSkuad.value : "";

            // Deteksi ID shift kerja
            const elShift = document.getElementById('input-shift-kerja-tugas') || document.getElementById('input-shift-kerja');
            const shiftKerja = elShift ? elShift.value : "Shift 1";

            // Deteksi ID rincian checklist tugas
            const elDetailJob = document.getElementById('input-rincian-tugas-checklist') || document.getElementById('input-rincian-tugas') || document.querySelector('textarea');
            const detailJobText = elDetailJob ? elDetailJob.value.trim() : "";

            // LOG VALIDASI DIAGNOSTIK KE KONSOL BROWSER JIKA MASIH GAGAL
            console.log("Data Input Kirim:", { areaPilih, namaAreaSpesifik, skuadTarget, shiftKerja, detailJobText });

            if (!namaAreaSpesifik || !skuadTarget || !detailJobText) {
                alert("Gagal Kirim! Nama Area, Skuad Pelaksana, & Rincian Tugas wajib diisi!\n\nPeriksa kembali isi form Anda.");
                return;
            }

            const idTugas = `task_${Date.now()}`;
            set(ref(db, `monitoring_area/${areaPilih}/${todayStr}/${idTugas}`), {
                id: idTugas,
                area: namaAreaSpesifik,
                skuadTarget: skuadTarget,
                shiftKerja: shiftKerja,
                detailJob: detailJobText,
                status: "Belum Dikerjakan",
                kategori: "Rutin",
                catatan: "-",
                fotoBukti: "-",
                jamLapor: "-"
            }).then(() => {
                alert(`Tugas sukses dikirim ke ${skuadTarget}! Karyawan bisa langsung cek aplikasi.`);
                if(elAreaSpesifik) elAreaSpesifik.value = "";
                if(elDetailJob) elDetailJob.value = "";
            }).catch((err) => alert("Firebase Error: " + err.message));
        };
    }

    // INTERSEPSI ENGINE: TOMBOL TAMBAH MASTER KONTRAK GEDUNG BARU (ADMIN PUSAT ONLY)
    const btnTambahGedung = document.getElementById('btn-submit-gedung-master');
    if (btnTambahGedung) {
        btnTambahGedung.onclick = function() {
            const namaGedungBaru = document.getElementById('input-nama-gedung-master') ? document.getElementById('input-nama-gedung-master').value.trim() : "";
            if (!namaGedungBaru) { alert("Masukkan nama gedung terlebih dahulu!"); return; }
            
            const idGedungFormat = namaGedungBaru.replace(/\s+/g, '_-_');
            set(ref(db, `daftar_gedung/${idGedungFormat}`), {
                namaGedung: namaGedungBaru,
                tglKontrak: new Date().toLocaleDateString('id-ID')
            }).then(() => {
                alert("Gedung Kontrak Baru Berhasil Terdaftar!");
                if(document.getElementById('input-nama-gedung-master')) document.getElementById('input-nama-gedung-master').value = "";
            });
        };
    }
}

// ================================================================= */
// REALTIME AMBIL DAFTAR GEDUNG KONTRAK (MASTER DATA ENGINE)
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

// RENDER REKAP LAPORAN ISU LAPANGAN PADA PANEL ADMIN
function renderBukuRekapIsuAdmin() {
    const currentMonthStr = new Date().toISOString().substring(0, 7);
    onValue(ref(db, `laporan_isu_global/${currentMonthStr}`), (snapshot) => {
        const dataIsu = snapshot.val() || {};
        const tbodyIsu = document.getElementById('table-rekap-isu-body');
        if (tbodyIsu) {
            tbodyIsu.innerHTML = "";
            let adaIsu = false;
            for (let id in dataIsu) {
                const item = dataIsu[id];
                if (item.gedung === userGedungKunci || userRoleKunci === "Admin Pusat") {
                    adaIsu = true;
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><small>${item.waktu}</small></td>
                        <td><b>${item.pelapor}</b><br><small>${item.gedung.replace(/_-_/g, ' ')}</small></td>
                        <td><u>${item.lokasiSpesifik}</u></td>
                        <td><span style="color:var(--danger); font-weight:500;">${item.deskripsi}</span></td>
                    `;
                    tbodyIsu.appendChild(tr);
                }
            }
            if (!adaIsu) {
                tbodyIsu.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8; font-style:italic; padding:10px;">Aman! Belum ada kendala/isu dilaporkan bulan ini.</td></tr>`;
            }
        }
    });
}

// ================================================================= */
// BIND GLOBAL METHOD KE WINDOW ENGINE AGAR ATTRIBUTE ONCLICK DI HTML BERFUNGSI
// ================================================================= */
globalThis.hapusGedungMaster = function(idGedung) {
    if(confirm(`Hapus kontrak gedung ${idGedung.replace(/_-_/g, ' ')}? Semua data monitoring area ini akan terhapus.`)) {
        remove(ref(db, `daftar_gedung/${idGedung}`)).then(() => alert("Gedung sukses dihapus dari sistem."));
    }
}

globalThis.prosesAksiApproval = function(uid, aksi, namaKaryawan) {
    if(confirm(`${aksi} pendaftaran akun ${namaKaryawan}?`)) {
        if(aksi === "Setujui") {
            update(ref(db, `users_profile/${uid}`), { status: "Aktif", tgl_status: new Date().toLocaleDateString('id-ID') })
            .then(() => alert("Karyawan berhasil diaktifkan!"));
        } else {
            remove(ref(db, `users_profile/${uid}`))
            .then(() => alert("Data pendaftaran berhasil ditolak & dihapus."));
        }
    }
}

globalThis.adminApproveKerja = function(gedung, tgl, idKerja) {
    update(ref(db, `monitoring_area/${gedung}/${tgl}/${idKerja}`), {
        status: "Area Resmi Bersih"
    }).then(() => alert("Status berhasil diupdate: Bersih (Lulus Cek)!"));
}

globalThis.adminTolakKerja = function(gedung, tgl, idKerja) {
    const catatan = prompt("Masukkan alasan koreksi / area mana yang kurang bersih:");
    if (catatan === null) return; 
    update(ref(db, `monitoring_area/${gedung}/${tgl}/${idKerja}`), {
        status: "Kurang Bersih",
        catatan: catatan || "Periksa kembali sapuan dan pel lantai!"
    }).then(() => alert("Laporan dikembalikan ke karyawan untuk dikoreksi."));
}
