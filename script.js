const video = document.getElementById('videoInput');
const canvas = document.getElementById('canvasOutput');
const startBtn = document.getElementById('start-btn');
const bpmDisplay = document.getElementById('bpm');
const infoDisplay = document.getElementById('info');
const loadingStatus = document.getElementById('loading-status');

let rgb_buffer = [];
const BUFFER_SIZE = 120; // Versi cepat biar tidak menunggu lama

// 1. Pastikan OpenCV.js Siap Beroperasi
document.getElementById('opencv-js').addEventListener('load', () => {
    loadingStatus.innerText = "OpenCV.js Berhasil Dimuat!";
    startBtn.disabled = false;
});

startBtn.addEventListener('click', () => {
    infoDisplay.innerText = "Meminta izin kamera...";
    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false })
        .then((stream) => {
            video.srcObject = stream;
            video.play();
            infoDisplay.innerText = "Kamera aktif. Memulai pemrosesan...";
            // Jalankan core pemrosesan setelah video siap diputar
            video.addEventListener('canplay', startOpenCVProcessing, { once: true });
        })
        .catch((err) => {
            infoDisplay.innerText = "Gagal akses kamera: " + err.message;
        });
});

function startOpenCVProcessing() {
    // Alokasi memori OpenCV (Hanya dilakukan SEKALI di luar loop)
    let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
    let gray = new cv.Mat();
    let faces = new cv.RectVector();
    let classifier = new cv.CascadeClassifier();

    // Mengambil file xml pencari wajah langsung dari repositori resmi OpenCV
    let faceCascadeUrl = 'https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml';
    
    infoDisplay.innerText = "Mengunduh modul deteksi wajah...";
    
    fetch(faceCascadeUrl)
        .then(response => response.arrayBuffer())
        .then(buffer => {
            // Trik menulis file XML ke memori virtual OpenCV.js
            let data = new Uint8Array(buffer);
            cv.FS_createDataFile('/', 'haarcascade.xml', data, true, false, false);
            classifier.load('haarcascade.xml');
            
            infoDisplay.innerText = "Sistem Ready! Diam selama 5 detik...";
            processFrame(); // Mulai loop utama gambar!
        });

    // 2. Loop Utama Menggunakan requestAnimationFrame (Anti-Freeze)
    function processFrame() {
        try {
            if (video.paused || video.ended) {
                requestAnimationFrame(processFrame);
                return;
            }

            // Baca frame video saat ini masuk ke objek Mat 'src'
            let cap = new cv.VideoCapture(video);
            cap.read(src);

            // Proses Deteksi Wajah
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
            classifier.detectMultiScale(gray, faces, 1.2, 3, 0);

            if (faces.size() > 0) {
                let face = faces.get(0); // Ambil wajah pertama yang terdeteksi

                // Hitung ROI Dahi secara manual
                let roiX = face.x + Math.floor(face.width * 0.35);
                let roiY = face.y + Math.floor(face.height * 0.1);
                let roiW = Math.floor(face.width * 0.3);
                let roiH = Math.floor(face.height * 0.12);

                // Gambar Kotak Wajah (Biru) dan Kotak Dahi (Hijau)
                cv.rectangle(src, new cv.Point(face.x, face.y), new cv.Point(face.x + face.width, face.y + face.height), [255, 0, 0, 255], 2);
                cv.rectangle(src, new cv.Point(roiX, roiY), new cv.Point(roiX + roiW, roiY + roiH), [0, 255, 0, 255], 1);

                // Ambil Nilai Pixel ROI Dahi untuk vPPG
                let rect = new cv.Rect(roiX, roiY, roiW, roiH);
                let roiMat = src.roi(rect);
                let meanColor = cv.mean(roiMat); // Mengembalikan array [R, G, B, A]

                // Masukkan Kanal Green (index 1) ke buffer
                rgb_buffer.push(meanColor[1]); 
                roiMat.delete(); // Langsung hapus sub-matriks dari memori

                // Manajemen Buffer
                if (rgb_buffer.length > BUFFER_SIZE) {
                    rgb_buffer.shift();
                    calculateSimpleBPM();
                } else {
                    let progress = Math.round((rgb_buffer.length / BUFFER_SIZE) * 100);
                    bpmDisplay.innerText = `Loading: ${progress}%`;
                }
            } else {
                infoDisplay.innerText = "Wajah tidak terdeteksi!";
            }

            // TAMPILKAN MATRIKS KE CANVAS (Ini yang membuat gambar muncul di layar)
            cv.imshow('canvasOutput', src);

            // Lanjut ke frame berikutnya
            requestAnimationFrame(processFrame);

        } catch (err) {
            console.error("Error di dalam loop: ", err);
            infoDisplay.innerText = "Loop Error. Re-centering wajah Anda.";
            requestAnimationFrame(processFrame);
        }
    }

    function calculateSimpleBPM() {
        // Deteksi puncak (Peak-to-Peak) sederhana di JS
        let peaks = 0;
        for (let i = 1; i < rgb_buffer.length - 1; i++) {
            if (rgb_buffer[i] > rgb_buffer[i-1] && rgb_buffer[i] > rgb_buffer[i+1]) {
                peaks++;
            }
        }
        // Asumsi rata-rata FPS browser stabil di ~30 FPS
        let duration = BUFFER_SIZE / 30;
        let calculatedBPM = Math.round((peaks / duration) * 60 / 2);

        if(calculatedBPM > 50 && calculatedBPM < 160) {
            bpmDisplay.innerText = `${calculatedBPM} BPM`;
            infoDisplay.innerText = "Sinyal Stabil";
        }
    }
}
