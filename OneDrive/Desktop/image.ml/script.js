const API_URL = "http://localhost:8000";

// Element selectors
const tabUpload = document.getElementById('tab-upload');
const tabCamera = document.getElementById('tab-camera');
const contentUpload = document.getElementById('content-upload');
const contentCamera = document.getElementById('content-camera');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const webcam = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('capture-btn');
const previewContainer = document.getElementById('preview-container');
const imagePreview = document.getElementById('image-preview');
const predictBtn = document.getElementById('predict-btn');
const resultContainer = document.getElementById('result-container');
const resultLabel = document.getElementById('result-label');
const resultConfidence = document.getElementById('result-confidence');
const confidenceFill = document.getElementById('confidence-fill');
const loader = document.getElementById('loader');
const resetBtn = document.getElementById('reset-btn');

let currentStream = null;
let currentBlob = null;

// Tab Switching
tabUpload.addEventListener('click', () => {
    tabUpload.classList.add('active');
    tabCamera.classList.remove('active');
    contentUpload.classList.remove('hidden');
    contentCamera.classList.add('hidden');
    stopCamera();
});

tabCamera.addEventListener('click', () => {
    tabCamera.classList.add('active');
    tabUpload.classList.remove('active');
    contentCamera.classList.remove('hidden');
    contentUpload.classList.add('hidden');
    startCamera();
});

// Upload Logic
dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "#00d4ff";
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = "rgba(255, 255, 255, 0.2)";
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
});

// ... (existing camera and capture logic)
async function startCamera() {
    try {
        currentStream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcam.srcObject = currentStream;
    } catch (err) {
        console.error("Camera error:", err);
        alert("Could not access camera. Please check permissions.");
    }
}

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
}

captureBtn.addEventListener('click', () => {
    const context = canvas.getContext('2d');
    canvas.width = webcam.videoWidth;
    canvas.height = webcam.videoHeight;
    context.drawImage(webcam, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
        currentBlob = blob;
        const url = URL.createObjectURL(blob);
        imagePreview.src = url;
        previewContainer.classList.remove('hidden');
        contentCamera.classList.add('hidden');
        stopCamera();
        // Auto-predict after capture
        setTimeout(() => predictBtn.click(), 500);
    }, 'image/jpeg');
});

function handleFile(file) {
    console.log("Handling file:", file.name);
    currentBlob = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.src = e.target.result;
        previewContainer.classList.remove('hidden');
        contentUpload.classList.add('hidden');
        contentCamera.classList.add('hidden');
        console.log("Preview updated");
        // Auto-predict after upload
        setTimeout(() => predictBtn.click(), 500);
    };
    reader.readAsDataURL(file);
}

// Prediction Logic
predictBtn.addEventListener('click', async () => {
    if (!currentBlob) {
        console.warn("No image blob found!");
        return;
    }

    console.log("Predicting...");
    previewContainer.classList.add('hidden');
    loader.classList.remove('hidden');

    const formData = new FormData();
    formData.append('file', currentBlob, 'capture.jpg');

    try {
        console.log("Sending request to:", `${API_URL}/predict`);
        const response = await fetch(`${API_URL}/predict`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("Response data:", data);

        if (data.error) {
            alert("Error from server: " + data.error);
            resetApp();
            return;
        }

        displayResult(data);
    } catch (err) {
        console.error("API error details:", err);
        alert("Failed to connect to backend: " + err.message + "\n\nMake sure main.py is running and you have internet access.");
        resetApp();
    } finally {
        loader.classList.add('hidden');
    }
});

function displayResult(data) {
    resultContainer.classList.remove('hidden');
    resultLabel.innerText = data.result;
    resultLabel.style.color = data.is_cat ? "#00d4ff" : "#ff0055";
    resultConfidence.innerText = `${data.confidence}% Confidence`;
    confidenceFill.style.width = `${data.confidence}%`;
    
    if (data.is_cat) {
        resultLabel.classList.add('glitch');
    } else {
        resultLabel.classList.remove('glitch');
    }
}

resetBtn.addEventListener('click', resetApp);

function resetApp() {
    resultContainer.classList.add('hidden');
    previewContainer.classList.add('hidden');
    contentUpload.classList.remove('hidden');
    tabUpload.click();
    fileInput.value = "";
    currentBlob = null;
}
