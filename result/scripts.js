// =========================
// === CONFIGURABLE LIST ===
// =========================
const DOCUMENT_TYPES = ["KTP", "KK", "Sertificate", "Unclassified"];

// ===================
// === LOAD RESULT ===
// ===================

const stored = JSON.parse(localStorage.getItem("walacakra_results")) || [];
const statusText = document.getElementById("statusText");
const fileOptions = document.getElementById("fileOptions");
const selectedFile = document.getElementById("selectedFile");
const pageItemContainer = document.getElementById("pageItemContainer");
const apiEndpoint = localStorage.getItem("apiEndpoint")
const bearerToken = localStorage.getItem("apiToken")

if (stored.length === 0) {
    alert("No processed file found. Please process a document first.");
} else {
    statusText.textContent = `Processed ${stored.length} file${stored.length > 1 ? "s" : ""} successfully`;

    // Populate dropdown options
    fileOptions.innerHTML = "";
    stored.forEach((item, index) => {
        const span = document.createElement("span");
        span.textContent = item.filename;
        span.addEventListener("click", () => loadFile(index));
        fileOptions.appendChild(span);
    });

    // Load first file by default
    loadFile(0);
}


async function fetchStorageFile(path, token) {
    if (!path) return "";

    try {
        // Pastikan URL lengkap
        const url = path.startsWith("http")
            ? path
            : `${api_endpoint}/storage/${path}`;

        const headers = token
            ? { Authorization: `Bearer ${token}` }
            : {};

        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`Failed to fetch file: ${res.status} ${res.statusText}`);

        const blob = await res.blob();
        return URL.createObjectURL(blob);
    } catch (err) {
        console.error("❌ Error fetching storage file:", err);
        return "";
    }
}

// ===========================
// === LOAD SINGLE FILE UI ===
// ===========================
async function loadFile(index) {
    const item = stored[index];
    const data = item.response?.data;
    const meta = item.response?.metadata;

    selectedFile.textContent = item.filename;

    const photoUrl = await fetchStorageFile(data.photo, bearerToken);
    console.log(photoUrl)
    document.getElementById("profileImage").src = photoUrl || "../assets/default-avatar.png";

    // Show first page in preview
    const firstPage = data.pages[0];
    const previewImg = document.getElementById("previewImage");
    const magnifierImg = document.querySelector(".magnifier-content");
    previewImg.src = meta.document.url || "";
    magnifierImg.src = meta.document.url || "";

    // Name & NIK
    // need to change this shit to canvas
    document.getElementById("fieldName").textContent = firstPage.name?.reading || "-";
    document.getElementById("fieldNIK").textContent = firstPage.nik?.reading || "-";
    document.getElementById("nikReading").textContent = firstPage.nik?.reading || "-";

    // Summary pages
    pageItemContainer.innerHTML = "";
    data.pages.forEach((page) => {
        const pageItem = document.createElement("div");
        pageItem.classList.add("page-item");

        const matchStatus = page.docType.isMatched ? "match" : (page.docType.isCorrected ? "warning" : "error");
        const matchText = page.docType.isMatched
            ? "match"
            : page.docType.isCorrected
            ? "exist, but not match"
            : "not exist";

            pageItem.innerHTML = `
                <div class="page-header">• Page ${page.pageNumber}</div>
                <div class="data-row">
                    <span class="data-label">○ Type:</span>
                    <select class="data-value type-select">
                        ${DOCUMENT_TYPES.map(
                            type => `<option value="${type}" ${
                                (page.docType.correction || page.docType.reading) === type ? "selected" : ""
                            }>${type}</option>`
                        ).join("")}
                    </select>
                </div>
                <div class="data-row">
                    <span class="data-label">○ NIK:</span>
                    <span class="data-value">${page.nik.reading || "-"}</span>
                    <div class="status-indicator">
                        <span class="status-icon ${matchStatus}"></span>
                        <span class="status-text">${matchText}</span>
                    </div>
                </div>
            `;
        pageItemContainer.appendChild(pageItem);
    });
}

// ===========================
// === DROPDOWN BEHAVIOR ====
// ===========================
const dropdown = document.getElementById("fileDropdown");
dropdown.addEventListener("click", () => {
    fileOptions.classList.toggle("show");
});
document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && !fileOptions.contains(e.target)) {
        fileOptions.classList.remove("show");
    }
});

const historyContainer = document.createElement("div");
historyContainer.classList.add("history-container");
historyContainer.style.display = "none"; // disembunyikan dulu
document.querySelector(".right-panel").prepend(historyContainer);

async function loadHistory(page = 1) {
    historyContainer.innerHTML = `<div class="loading">Loading history...</div>`;

    try {
        const res = await fetch(`${apiEndpoint}/api/v1/walacakra/history?page=${page}`, {
            headers: {
                Authorization: `Bearer ${bearerToken}`,
                "Content-Type": "application/json"
            }
        });

        if (!res.ok) throw new Error(`Failed to fetch history (${res.status})`);
        const json = await res.json();
        const items = json?.data?.items || [];
        const pagination = json?.metadata?.pagination || {};

        if (items.length === 0) {
            historyContainer.innerHTML = `<p class="no-history">No history records found.</p>`;
            return;
        }

        const table = document.createElement("table");
        table.classList.add("history-table");
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Filename</th>
                    <th>Pages</th>
                    <th>Status</th>
                    <th>Processed At</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => `
                    <tr>
                        <td>${item.filename}</td>
                        <td>${item.pages}</td>
                        <td><span class="status ${item.assessment.toLowerCase()}">${item.assessment}</span></td>
                        <td>${new Date(item.processedAt).toLocaleString()}</td>
                    </tr>
                `).join("")}
            </tbody>
        `;

        // Pagination controls
        const paginationDiv = document.createElement("div");
        paginationDiv.classList.add("pagination-controls");
        paginationDiv.innerHTML = `
            <button class="page-btn" id="prevPage" ${!pagination.hasPrev ? "disabled" : ""}>◀</button>
            <span class="page-info">Page ${pagination.page} of ${pagination.totalPages}</span>
            <button class="page-btn" id="nextPage" ${!pagination.hasNext ? "disabled" : ""}>▶</button>
        `;

        paginationDiv.querySelector("#prevPage").addEventListener("click", () => {
            if (pagination.hasPrev) loadHistory(pagination.page - 1);
        });
        paginationDiv.querySelector("#nextPage").addEventListener("click", () => {
            if (pagination.hasNext) loadHistory(pagination.page + 1);
        });

        // Replace content
        historyContainer.innerHTML = "";
        historyContainer.appendChild(table);
        historyContainer.appendChild(paginationDiv);

    } catch (err) {
        console.error("❌ Error loading history:", err);
        historyContainer.innerHTML = `<p class="error">Failed to load history data.</p>`;
    }
}

// ===============================
// === TAB SWITCH (enhanced) =====
// ===============================
const tabs = document.querySelectorAll('.tab');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const tabName = tab.textContent.trim();

        if (tabName === "Analysis") {
            // tampilkan panel analisis
            document.querySelector(".summary-title").style.display = "block";
            document.getElementById("pageItemContainer").style.display = "block";
            document.querySelector(".info-box").style.display = "block";
            document.querySelector(".action-buttons").style.display = "flex";
            historyContainer.style.display = "none";
        } else if (tabName === "History") {
            // sembunyikan konten analisis
            document.querySelector(".summary-title").style.display = "none";
            document.getElementById("pageItemContainer").style.display = "none";
            document.querySelector(".info-box").style.display = "none";
            document.querySelector(".action-buttons").style.display = "none";
            historyContainer.style.display = "block";
            loadHistory();
        }
    });
});

// ==========================
// === ZOOM + MAGNIFIER ====
// ==========================
const previewContainer = document.getElementById('previewContainer');
const previewImage = document.getElementById('previewImage');
const magnifier = document.getElementById('magnifier');
let isMouseOver = false;
let currentZoom = 1;

previewContainer.addEventListener('mouseenter', () => {
    isMouseOver = true;
    magnifier.classList.add('active');
});
previewContainer.addEventListener('mouseleave', () => {
    isMouseOver = false;
    magnifier.classList.remove('active');
});
previewContainer.addEventListener('mousemove', (e) => {
    if (!isMouseOver) return;
    const rect = previewContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    magnifier.style.left = (x - 75) + 'px';
    magnifier.style.top = (y - 75) + 'px';
    const magnifierContent = magnifier.querySelector('.magnifier-content');
    magnifierContent.style.transform = `translate(-${x * 2}px, -${y * 2}px) scale(2)`;
});

document.getElementById('zoomIn').addEventListener('click', () => {
    if (currentZoom < 3) {
        currentZoom += 0.5;
        previewImage.style.transform = `scale(${currentZoom})`;
    }
});
document.getElementById('zoomOut').addEventListener('click', () => {
    if (currentZoom > 0.5) {
        currentZoom -= 0.5;
        previewImage.style.transform = `scale(${currentZoom})`;
    }
});
document.getElementById('zoomReset').addEventListener('click', () => {
    currentZoom = 1;
    previewImage.style.transform = 'scale(1)';
});

// ===========================
// === BUTTON ACTIONS ========
// ===========================
document.querySelector('.btn-reject').addEventListener('click', () => {
    if (confirm('Are you sure you want to reject this document?')) {
        alert('Document rejected');
    }
});
document.querySelector('.btn-approve').addEventListener('click', () => {
    if (confirm('Are you sure you want to approve this document?')) {
        alert('Document approved');
    }
});
document.querySelector('.btn-recalculate').addEventListener('click', () => {
    alert('Recalculating document analysis...');
});
