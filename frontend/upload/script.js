const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const startBtn = document.getElementById('startBtn');
const processingOverlay = document.getElementById('processingOverlay');
const closeBtn = document.getElementById('closeBtn');
const processingContent = document.getElementById('processingContent');
const successContent = document.getElementById('successContent');

uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('active');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('active');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('active');
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

function handleFiles(files) {
    if (files.length > 0) {
        const fileNames = Array.from(files).map(f => f.name).join(', ');
        fileName.textContent = `Selected: ${fileNames}`;
        fileName.classList.add('show');
        startBtn.disabled = false;
        uploadArea.classList.add('active');
    }
}

startBtn.addEventListener('click', () => {
    processingOverlay.classList.add('show');
    simulateProcessing();
});

closeBtn.addEventListener('click', () => {
    processingOverlay.classList.remove('show');
    resetProcessing();
});

function simulateProcessing() {
    const steps = ['step1', 'step2', 'step3', 'step4'];
    let currentStep = 0;

    steps.forEach(step => {
        document.getElementById(step).classList.remove('active', 'complete');
    });

    const interval = setInterval(() => {
        if (currentStep > 0) {
            document.getElementById(steps[currentStep - 1]).classList.remove('active');
            document.getElementById(steps[currentStep - 1]).classList.add('complete');
        }

        if (currentStep < steps.length) {
            document.getElementById(steps[currentStep]).classList.add('active');
            currentStep++;
        } else {
            clearInterval(interval);
            showSuccess();
        }
    }, 2000);
}

function showSuccess() {
    processingContent.style.display = 'none';
    successContent.style.display = 'block';
    
    setTimeout(() => {
        window.location.href = 'page2.html';
    }, 2000);
}

function resetProcessing() {
    processingContent.style.display = 'block';
    successContent.style.display = 'none';
}