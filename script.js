const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const startBtn = document.getElementById('startBtn');
const processingOverlay = document.getElementById('processingOverlay');
const closeBtn = document.getElementById('closeBtn');
const processingContent = document.getElementById('processingContent');
const successContent = document.getElementById('successContent');
const bearer_token = ""
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

async function simulateProcessing() {
    const files = Array.from(fileInput.files);
    const totalFiles = files.length;

    if (totalFiles === 0) {
        alert("Please upload at least one file before starting the process.");
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
            const response = await fetch("http://localhost:4545/api/v1/walacakra/process", {
                method: "POST",
                body: formData,
                headers: {"Authorization": "Bearer " + bearer_token}
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

    // Simpan semua hasil ke localStorage biar bisa diakses dari result.html
    localStorage.setItem("walacakra_results", JSON.stringify(results));

    // Ubah tampilan jadi sukses
    stepDiv.classList.remove("active");
    stepDiv.classList.add("complete");
    stepDiv.querySelector("#processing-status").textContent =
        `✅ All ${totalFiles} files processed successfully`;

    showSuccess();
}

function showSuccess() {
    processingContent.style.display = 'none';
    successContent.style.display = 'block';
    
    setTimeout(() => {
        window.location.href = './result/result.html';
    }, 2000);
}


function resetProcessing() {
    processingContent.style.display = 'block';
    successContent.style.display = 'none';
}