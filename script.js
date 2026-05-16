// Deklarasikan variabel di scope global (luar window.onload)
let video, canvas, startBtn, bpmDisplay, infoDisplay, loadingStatus;

window.onload = function() {
    // Inisialisasi elemen HTML
    video = document.getElementById('videoInput');
    canvas = document.getElementById('canvasOutput');
    startBtn = document.getElementById('start-btn');
    bpmDisplay = document.getElementById('bpm');
    infoDisplay = document.getElementById('info');
    loadingStatus = document.getElementById('loading-status');

    // KODE PENGAMAN: Cek apakah canvas benar-benar ada di HTML
    if (!canvas) {
        console.error("ERROR: Elemen dengan id 'canvasOutput' tidak ditemukan di HTML Anda!");
        alert("Kritis: Elemen Canvas tidak ditemukan di halaman web.");
        return; // Hentikan script agar tidak memicu error getContext
    }

    // Jika aman, baru ambil konteks grafisnya
    const ctx = canvas.getContext('2d');
    console.log("Canvas berhasil dimuat dengan konteks:", ctx);

    // Jalankan listener OpenCV (Sisa kode Anda di bawah)
    let openCvScript = document.getElementById('opencv-js');
    if (openCvScript) {
        openCvScript.addEventListener('load', () => {
            if (loadingStatus) loadingStatus.innerText = "OpenCV.js Berhasil Dimuat!";
            if (startBtn) startBtn.disabled = false;
        });
    }
};
