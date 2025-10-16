const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const startBtn = document.getElementById('startBtn');
const processingOverlay = document.getElementById('processingOverlay');
const closeBtn = document.getElementById('closeBtn');
const processingContent = document.getElementById('processingContent');
const successContent = document.getElementById('successContent');

// =========================
// === MODAL FUNCTIONS ===
// =========================
function showModal(title, message, type = 'alert', onConfirm = null) {
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalFooter = document.getElementById('modalFooter');
    const modalClose = document.getElementById('modalClose');

    modalTitle.textContent = title;
    modalMessage.textContent = message;

    // Clear existing buttons
    modalFooter.innerHTML = '';

    if (type === 'confirm') {
        // Add Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = () => {
            modalOverlay.classList.remove('show');
            if (onConfirm) onConfirm(false);
        };
        modalFooter.appendChild(cancelBtn);

        // Add Confirm button
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn btn-primary';
        confirmBtn.textContent = 'Confirm';
        confirmBtn.onclick = () => {
            modalOverlay.classList.remove('show');
            if (onConfirm) onConfirm(true);
        };
        modalFooter.appendChild(confirmBtn);
    } else {
        // Add OK button for alerts
        const okBtn = document.createElement('button');
        okBtn.className = 'btn btn-primary';
        okBtn.textContent = 'OK';
        okBtn.onclick = () => {
            modalOverlay.classList.remove('show');
        };
        modalFooter.appendChild(okBtn);
    }

    // Close button functionality
    modalClose.onclick = () => {
        modalOverlay.classList.remove('show');
        if (type === 'confirm' && onConfirm) onConfirm(false);
    };

    // Close on overlay click
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.classList.remove('show');
            if (type === 'confirm' && onConfirm) onConfirm(false);
        }
    };

    // Show modal
    modalOverlay.classList.add('show');
}

// Helper functions to replace alert() and confirm()
function showAlert(message, title = 'Information') {
    showModal(title, message, 'alert');
}

function showConfirm(message, onConfirm, title = 'Confirm Action') {
    showModal(title, message, 'confirm', onConfirm);
}

// =========================
// 🔹 Toggle API Config Panel
// =========================
const apiHeader = document.getElementById('apiHeader');
const apiBody = document.getElementById('apiBody');
const toggleIcon = document.getElementById('toggleIcon');

apiHeader.addEventListener('click', () => {
    apiBody.classList.toggle('open');
    toggleIcon.classList.toggle('rotate');
});

// =========================
// 🔹 Element References
// =========================
const endpointInput = document.getElementById('endpointInput');
const tokenInput = document.getElementById('tokenInput');

// =========================
// 🔹 Helper Functions
// =========================
function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function getCookie(name) {
    return document.cookie.split('; ').reduce((r, v) => {
        const parts = v.split('=');
        return parts[0] === name ? decodeURIComponent(parts[1]) : r;
    }, '');
}

// =========================
// 🔹 Load Saved Settings
// =========================
window.addEventListener('DOMContentLoaded', () => {
    const savedEndpoint = localStorage.getItem('apiEndpoint') || getCookie('apiEndpoint');
    const savedToken = localStorage.getItem('apiToken') || getCookie('apiToken');

    if (savedEndpoint) endpointInput.value = savedEndpoint;
    if (savedToken) tokenInput.value = savedToken;
});

// =========================
// 🔹 Save Settings on Change
// =========================
function saveSettings() {
    const endpoint = endpointInput.value.trim();
    const token = tokenInput.value.trim();

    // Simpan ke localStorage
    localStorage.setItem('apiEndpoint', endpoint);
    localStorage.setItem('apiToken', token);

    // Simpan juga ke cookie (bertahan 7 hari)
    setCookie('apiEndpoint', endpoint, 7);
    setCookie('apiToken', token, 7);
}

endpointInput.addEventListener('input', saveSettings);
tokenInput.addEventListener('input', saveSettings);


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
    const files = Array.from(fileInput.files);
    if (files.length === 0) return showAlert("Please upload a file first!", "Warning");

    // Buat overlay baru dinamis
    createProcessingOverlay(files[0].name);

    // Ambil ulang referensi setelah overlay dibuat
    const overlay = document.getElementById('processingOverlay');
    overlay.classList.add('show');

    // Jalankan simulasi
    simulateProcessing();
});
closeBtn.addEventListener('click', () => {
    processingOverlay.classList.remove('show');
    resetProcessing();
});

async function simulateProcessing() {
    const startTime = Date.now(); // ⏱️ waktu mulai
    const files = Array.from(fileInput.files);
    const totalFiles = files.length;
    const endpoint = endpointInput.value.trim();
    const token = tokenInput.value.trim();

    
    if (totalFiles === 0) {
        showAlert("Please upload at least one file before starting the process.", "Warning");
        return;
    }

    const stepsContainer = document.querySelector(".processing-steps");
    stepsContainer.innerHTML = "";
    
    // Tambahkan satu baris step dinamis
    const stepDiv = document.createElement("div");
    stepDiv.classList.add("processing-step", "active");
    stepDiv.innerHTML = `
    <span class="step-icon"></span>
    <span id="processing-status">Processing 0/${totalFiles} files...</span>
    `;
    stepsContainer.appendChild(stepDiv);
        
        const results = []; // tempat nyimpen hasil tiap file
        
        // Kirim semua file ke API
        const promises = files.map(async (file, index) => {
            const formData = new FormData();
            formData.append("file", file);
            
            try {
            const response = await fetch(`${endpoint}/api/v1/walacakra/process`, {
                method: "POST",
                body: formData,
                headers: {"Authorization": "Bearer " + token}
            });

            if (!response.ok) {
                throw new Error(`Error processing ${file.name}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log(`✅ Processed: ${file.name}`, result);
            
            // Simpan ke array hasil
            results.push({
                filename: file.name,
                response: result,
            });
        } catch (error) {
            console.error(`❌ Failed: ${file.name}`, error);
            results.push({
                filename: file.name,
                error: error.message,
            });
        }
        
        // Update tampilan progress
        document.getElementById("processing-status").textContent =
            `Processing ${index + 1}/${totalFiles} files...`;
    });

    await Promise.all(promises);

    // Setelah await Promise.all(promises);
    const overlay = document.getElementById('processingOverlay');
    const stepsContainer_overlay = overlay.querySelector('.processing-steps');

    // Buat isi hasil tiap file dari results[]
    results.forEach((r) => {
        const div = document.createElement('div');
        div.classList.add('processing-step');
        div.innerHTML = `
            <div class="file-summary">
                <strong>${r.filename}</strong><br>
                ${r.error ? `<span class="error">❌ ${r.error}</span>` :
                `<span class="ok">✅ ${r.response.status}</span><br>
                <span>Assessment: ${r.response.data.assessment}</span><br>
                <span>Pages: ${r.response.metadata.document.pages}</span>`}
            </div>
        `;
        stepsContainer_overlay.appendChild(div);
    });

    // Simpan semua hasil ke localStorage biar bisa diakses dari result.html
    localStorage.setItem("walacakra_results", JSON.stringify(results));

    // Ubah tampilan jadi sukses
    stepDiv.classList.remove("active");
    stepDiv.classList.add("complete");
    stepDiv.querySelector("#processing-status").textContent =
    `✅ All ${totalFiles} files processed successfully`;

    showSuccess(startTime);
}

function showSuccess(startTime) {
    const overlay = document.getElementById('processingOverlay');
    const processingContent = overlay.querySelector('#processingContent');
    const successContent = overlay.querySelector('#successContent');
    const successTime = overlay.querySelector('#successTime');

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1); // ⏱️ hitung durasi real

    processingContent.style.display = 'none';
    successContent.style.display = 'block';
    successTime.textContent = `Done in ${durationSec} s`;
    window.location.href = './result/result.html';
}


function resetProcessing() {
    processingContent.style.display = 'block';
    successContent.style.display = 'none';
}


// =========================
// 🔹 Generate Overlay Dinamis
// =========================
function createProcessingOverlay(filename) {
    // Hapus overlay lama jika ada
    const oldOverlay = document.getElementById('processingOverlay');
    if (oldOverlay) oldOverlay.remove();

    // Buat elemen overlay utama
    const overlay = document.createElement('div');
    overlay.classList.add('processing-overlay');
    overlay.id = 'processingOverlay';

    overlay.innerHTML = `
        <div class="processing-modal">
            <button class="close-btn" id="closeBtn">×</button>
            <div id="processingContent">
                <div class="processing-filename">${filename}</div>
                <div class="processing-steps"></div>
                <div class="progress-text" id="progressText">Processing...</div>
            </div>
            <div id="successContent" style="display:none;">
                <div class="success-icon">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="success-message">All set. Redirecting...</div>
                <div class="success-time" id="successTime"></div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Rebind elemen dan event listener-nya
    const closeBtn = overlay.querySelector('#closeBtn');
    closeBtn.addEventListener('click', () => {
        overlay.classList.remove('show');
        resetProcessing();
    });

    // Simpan referensi ke global variabel
    window.processingOverlay = overlay;
    window.processingContent = overlay.querySelector('#processingContent');
    window.successContent = overlay.querySelector('#successContent');
}