let video = document.getElementById('videoInput');
let canvasFrame = document.getElementById('canvasOutput');
let context = canvasFrame.getContext('2d');
let rgb_buffer = [];
const BUFFER_SIZE = 150; // Versi cepat (5 detik)

// Memulai Kamera
navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    .then(function(stream) {
        video.srcObject = stream;
        video.play();
        startProcessing();
    })
    .catch(function(err) {
        console.log("An error occurred! " + err);
    });

function startProcessing() {
    let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
    let gray = new cv.Mat();
    let cap = new cv.VideoCapture(video);
    let faces = new cv.RectVector();
    let classifier = new cv.CascadeClassifier();

    // Memuat Haar Cascade (Membutuhkan file XML di direktori yang sama atau via URL)
    let utils = new Utils('error-message');
    utils.createFileFromUrl('haarcascade_frontalface_default.xml', 'https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml', () => {
        classifier.load('haarcascade_frontalface_default.xml');
        document.getElementById('status').innerText = "Ready";
        processVideo();
    });

    function processVideo() {
        try {
            cap.read(src);
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
            classifier.detectMultiScale(gray, faces, 1.1, 3, 0);

            for (let i = 0; i < faces.size(); ++i) {
                let face = faces.get(i);
                // ROI Dahi (estimasi koordinat)
                let roiX = face.x + (face.width * 0.35);
                let roiY = face.y + (face.height * 0.1);
                let roiW = face.width * 0.3;
                let roiH = face.height * 0.15;

                // Gambar Kotak
                cv.rectangle(src, new cv.Point(face.x, face.y), new cv.Point(face.x + face.width, face.y + face.height), [255, 0, 0, 255]);
                cv.rectangle(src, new cv.Point(roiX, roiY), new cv.Point(roiX + roiW, roiY + roiH), [0, 255, 0, 255]);

                // Ekstraksi Warna Rata-rata (Metode Sederhana untuk JS)
                let rect = new cv.Rect(roiX, roiY, roiW, roiH);
                let roiMat = src.roi(rect);
                let mean = cv.mean(roiMat); // RGBA
                rgb_buffer.push(mean[0]); // Ambil kanal Red (sebagai dasar vPPG simpel)
                roiMat.delete();

                if (rgb_buffer.length > BUFFER_SIZE) {
                    rgb_buffer.shift();
                    calculateBPM();
                }
            }
            cv.imshow('canvasOutput', src);
            requestAnimationFrame(processVideo);
        } catch (err) {
            console.error(err);
        }
    }
}

function calculateBPM() {
    // Di sini Anda bisa mengimplementasikan FFT sederhana menggunakan library dsp.js 
    // atau hitung manual Peak-to-Peak untuk versi Web yang ringan.
    document.getElementById('bpmDisplay').innerText = "Processing...";
}
