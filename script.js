window.onload = function() {
const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const bpmDisplay = document.querySelector('.bpm-value');
const statusDisplay = document.getElementById('status');

let rgb_buffer = [];
const BUFFER_SIZE = 150; // Sekitar 5 detik data

function onResults(results) {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    const landmarks = results.multiFaceLandmarks[0];
    statusDisplay.innerText = "Status: Wajah Terdeteksi";

    // Titik Landmark 10 adalah Dahi Tengah
    // Titik 151 dan 9 adalah batas vertikal dahi
    const dahi = landmarks[10];
    
    // Konversi koordinat normalisasi ke pixel
    const x = dahi.x * canvasElement.width;
    const y = dahi.y * canvasElement.height;

    // Ambil sample warna di sekitar dahi (kotak 20x20 pixel)
    const pixelData = canvasCtx.getImageData(x - 10, y - 10, 20, 20).data;
    
    let rSum = 0, gSum = 0, bSum = 0;
    for (let i = 0; i < pixelData.length; i += 4) {
      rSum += pixelData[i];
      gSum += pixelData[i+1];
      bSum += pixelData[i+2];
    }
    
    const rAvg = rSum / (pixelData.length / 4);
    const gAvg = gSum / (pixelData.length / 4);
    const bAvg = bSum / (pixelData.length / 4);

    rgb_buffer.push({r: rAvg, g: gAvg, b: bAvg});

    // Visualisasi area deteksi
    canvasCtx.strokeStyle = "#00ff00";
    canvasCtx.strokeRect(x - 10, y - 10, 20, 20);

    if (rgb_buffer.length > BUFFER_SIZE) {
      rgb_buffer.shift();
      calculateBPM();
    } else {
      const progress = Math.round((rgb_buffer.length / BUFFER_SIZE) * 100);
      bpmDisplay.innerText = `${progress}%`;
    }
  } else {
    statusDisplay.innerText = "Status: Cari Wajah...";
  }
  canvasCtx.restore();
}

function calculateBPM() {
  // Logika sederhana: Hitung Zero-Crossing atau Peak-to-Peak pada kanal Green
  // Karena Green channel memiliki kontras sinyal vPPG paling kuat
  const greenSinyal = rgb_buffer.map(d => d.g);
  
  // Deteksi puncak sederhana (Peak Detection)
  let peaks = 0;
  for (let i = 1; i < greenSinyal.length - 1; i++) {
    if (greenSinyal[i] > greenSinyal[i-1] && greenSinyal[i] > greenSinyal[i+1]) {
      peaks++;
    }
  }
  
  // Estimasi BPM (Sangat dasar, sebaiknya gunakan FFT untuk produksi)
  const durationInSeconds = BUFFER_SIZE / 30; // Asumsi 30 FPS
  const bpm = (peaks / durationInSeconds) * 60 / 2; // Dibagi 2 karena biasanya ada noise puncak ganda
  
  if(bpm > 40 && bpm < 180) {
    bpmDisplay.innerText = Math.round(bpm);
  }
}

const faceMesh = new FaceMesh({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
}});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
faceMesh.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await faceMesh.send({image: videoElement});
  },
  width: 640,
  height: 480
});
camera.start();

};
