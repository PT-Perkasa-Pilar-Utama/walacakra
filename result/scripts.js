// =========================
// === CONFIGURABLE LIST ===
// =========================
const DOCUMENT_TYPES = [  "",
  "KTP",
  "KK",
  "SHM",
  "SHGB",
  "BPKB",
  "STNK",
  "FAKTUR KENDARAAN",
  "SERTIFIKAT DEPOSITO",
  "SPK",
  "SURAT BERHARGA",
  "UNCLASSIFIED",];

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
let currentFileIndex = 0;

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


async function fetchFile(path, token) {
    if (!path) return "";

    try {
        // Pastikan URL lengkap
        const url = path.startsWith("http")
            ? path
            : `${api_endpoint}${path}`;

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
    currentFileIndex = index; // simpan file yang sedang aktif
    const item = stored[index];
    const data = item.response.data;
    const meta = item.response.metadata;

    selectedFile.textContent = item.filename;

    // === Update assessment badge ===
    const assessmentStatus = document.getElementById("assessmentStatus");
    const assessment = data.assessment?.toLowerCase() || "pending";
    let editable = false
    if (assessment == "pending") {
        editable = true
    }

    console.log(editable)

    assessmentStatus.textContent = assessment.toUpperCase();
    assessmentStatus.className = `assessment-status ${assessment}`;

    // === Hide or show action buttons ===
    const actionButtons = document.querySelector(".action-buttons");
    if (["approved", "rejected"].includes(assessment)) {
        actionButtons.style.display = "none";
    } else {
        actionButtons.style.display = "flex";
    }

    // === Update profile photo ===
    const photoUrl = await fetchFile(meta.document.photo, bearerToken);
    document.getElementById("profileImage").src = photoUrl || "../assets/default-avatar.png";

    // === PDF preview ===
    try {
        if (meta?.document?.url) {
            await loadPDFViewer(meta.document.url);
        } else {
            console.warn("No PDF URL found in metadata");
        }
    } catch (err) {
        console.error("❌ Error loading PDF preview:", err);
    }

    // === Update name & NIK fields langsung dari stored data ===
    const firstPage = data.pages?.[0] || {};
    document.getElementById("fieldName").textContent = firstPage.name.correction || firstPage.name.reading || "-";
    document.getElementById("fieldNIK").textContent = firstPage.nik.correction || firstPage.nik.reading || "-";

    // === Summary pages ===
    pageItemContainer.innerHTML = "";
    data.pages.forEach((page) => {
        const pageItem = document.createElement("div");
        pageItem.classList.add("page-item");

        // === Tentukan status match ===
        let matchStatus, matchText;
        if ((page.nik.correction || page.nik.reading) === ( firstPage.nik.correction ||firstPage.nik.reading)) {
            matchText = "match";
            matchStatus = "match";
        } else if ((page.nik.correction || page.nik.reading) && page.nik.reading.trim() !== "") {
            matchText = "exist, but not match";
            matchStatus = "warning";
        } else {
            matchText = "not exist";
            matchStatus = "error";
        }

        // === Buat markup awal ===
        let innerHTML = `
            <div class="page-header">• Page ${page.pageNumber + 1}</div>
            <div class="data-row">
                <span class="data-label">○ Type:</span>
                <select class="data-value type-select" ${editable ? "" : "disabled"}>
                    ${DOCUMENT_TYPES.map(
                        type => `<option value="${type}" ${
                            (page.docType.correction || page.docType.reading) === type ? "selected" : ""
                        }>${type}</option>`
                    ).join("")}
                </select>
            </div>
        `;

        // === Tambahkan kolom NIK (selalu tampil) ===
        innerHTML += `
            <div class="data-row">
                <span class="data-label">○ NIK:</span>
                <span class="data-value nik-field" contenteditable="${editable}" style="background:white;">
                    ${page.nik.correction || page.nik.reading || "-"}
                </span>
                <div class="status-indicator">
                    <span class="status-icon ${matchStatus}"></span>
                    <span class="status-text">${matchText}</span>
                </div>  
            </div>
        `;

        pageItem.innerHTML = innerHTML;
        pageItemContainer.appendChild(pageItem);
    });

    // === Hitung summary match berdasarkan rule ===
    const ktpPage = data.pages.find(p => p.docType.reading === "KTP");
    const ktpNik = ktpPage?.nik?.reading || "";

    let totalPages = data.pages.length;
    let nikAvailable = 0;
    let nikMatch = 0;

    data.pages.forEach(p => {
        const nik = p.nik?.reading || "";
        if (nik.trim()) {
            nikAvailable++;
            if (nik === ktpNik) nikMatch++;
        }
    });

    document.getElementById("matchSummary").textContent =
        `🔍 ${nikMatch}/${totalPages} pages have NIK matching the main KTP`;
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

// ===========================
// === HISTORY CODE ====
// ===========================

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
                    <tr data-hash="${item.hash}" class="history-row">
                        <td>${item.filename}</td>
                        <td>${item.pages}</td>
                        <td><span class="status ${item.assessment.toLowerCase()}">${item.assessment}</span></td>
                        <td>${new Date(item.processedAt).toLocaleString()}</td>
                    </tr>
                `).join("")}
            </tbody>
        `;

        // === Make rows clickable ===
        table.querySelectorAll(".history-row").forEach(row => {
            row.addEventListener("click", async () => {
                const hash = row.getAttribute("data-hash");
                const url = `${apiEndpoint}/api/v1/walacakra/history/${hash}`;

                try {
                    const res = await fetch(url, {
                        headers: { Authorization: `Bearer ${bearerToken}` }
                    });
                    if (!res.ok) throw new Error(`Failed to fetch history detail: ${res.status}`);

                    const json = await res.json();

                    // Simpan ke localStorage dengan format yang sama seperti hasil processing biasa
                    const stored = [{
                        filename: json.metadata.document.filename,
                        response: {
                            metadata: json.metadata,
                            data: json.data
                        }
                    }];

                    localStorage.setItem("walacakra_results", JSON.stringify(stored));

                    // Redirect ke halaman result.html
                    window.location.href = "result.html";

                } catch (err) {
                    console.error("❌ Error loading history detail:", err);
                    alert("Failed to load this document’s detail.");
                }
            });
        });

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
// ========= TAB SWITCH ==========
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
            // === Update assessment badge ===
            const assessmentStatus = document.getElementById("assessmentStatus");
            const assessment = assessmentStatus.innerText.toLowerCase() || "pending";

            // === Hide or show action buttons ===
            const actionButtons = document.querySelector(".action-buttons");
            if (["approved", "rejected"].includes(assessment)) {
                actionButtons.style.display = "none";
            } else {
                actionButtons.style.display = "flex";
            }
            historyContainer.style.display = "none";
        } else if (tabName === "History") {
            // sembunyikan konten analisis
            document.querySelector(".summary-title").style.display = "none";
            document.getElementById("pageItemContainer").style.display = "none";
            document.getElementById("matchSummary").style.display = "none";
            document.querySelector(".info-box").style.display = "none";
            document.querySelector(".action-buttons").style.display = "none";
            historyContainer.style.display = "block";
            loadHistory();
        }
    });
});

// ==========================
// = PDF JS IMPLEMENTATION ==
// ==========================

async function loadPDFViewer(fileUrl) {

    // pastikan PDF.js ada di global
    if (typeof pdfjsLib === "undefined") {
        console.error("⚠️ PDF.js belum termuat — cek urutan <script> di HTML");
    } 
    else {
    // atur lokasi worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 
    "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
    }
    
  const token = localStorage.getItem("apiToken");
  const res = await fetch(fileUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Gagal fetch PDF: ${res.status} ${res.statusText}`);
  const pdfData = await res.arrayBuffer();

  // init PDF.js
  pdfjsLib.GlobalWorkerOptions.workerSrc = 
    "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

  // setup state
  let currentPage = 1;
  const canvas = document.getElementById("pdfCanvas");
  const ctx = canvas.getContext("2d");
  const pageInfo = document.getElementById("pageInfo");

  async function renderPage(num) {
    const page = await pdf.getPage(num);
    const viewport = page.getViewport({ scale: currentZoom });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;
    pageInfo.textContent = `${num} / ${pdf.numPages}`;
  }

  // first render
  currentZoom = 1;
  await renderPage(currentPage);

  // zoom & nav buttons
  document.getElementById("zoomIn").onclick = async () => {
    currentZoom = Math.min(3, currentZoom + 0.25);
    await renderPage(currentPage);
  };
  document.getElementById("zoomOut").onclick = async () => {
    currentZoom = Math.max(0.5, currentZoom - 0.25);
    await renderPage(currentPage);
  };
  document.getElementById("zoomReset").onclick = async () => {
    currentZoom = 1;
    await renderPage(currentPage);
  };

  const navBtns = document.querySelectorAll(".page-navigation .page-btn");
  navBtns[0].onclick = async () => {
    if (currentPage > 1) {
      currentPage--;
      await renderPage(currentPage);
    }
  };
  navBtns[1].onclick = async () => {
    if (currentPage < pdf.numPages) {
      currentPage++;
      await renderPage(currentPage);
    }
  };
}

// ==========================
// = MAGNIFIER EFFECT == NEED TO BE FIXED LATER
// ==========================
const pdfCanvas = document.getElementById("pdfCanvas");
const magnifierCanvas = document.getElementById("magnifierCanvas");
const magnifierCtx = magnifierCanvas.getContext("2d");
const zoomFactor = 2.0; // seberapa besar pembesaran

pdfCanvas.addEventListener("mousemove", (e) => {
  const rect = pdfCanvas.getBoundingClientRect();
  const scaleX = pdfCanvas.width / rect.width;
  const scaleY = pdfCanvas.height / rect.height;

  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  const size = magnifierCanvas.width / zoomFactor;
  const startX = Math.max(0, x - size / 2);
  const startY = Math.max(0, y - size / 2);

  const imageData = pdfCanvas
    .getContext("2d")
    .getImageData(startX, startY, size, size);

  magnifierCtx.clearRect(0, 0, magnifierCanvas.width, magnifierCanvas.height);
  magnifierCtx.putImageData(imageData, 0, 0);
  magnifierCtx.drawImage(
    pdfCanvas,
    startX,
    startY,
    size,
    size,
    0,
    0,
    magnifierCanvas.width,
    magnifierCanvas.height
  );

pdfCanvas.addEventListener("mouseleave", () => {
  magnifierCanvas.style.display = "none";
});



  // === Posisi kaca pembesar pas di kursor ===
  const parentRect = pdfCanvas.parentElement.getBoundingClientRect();
  const centerX = e.clientX - parentRect.left - magnifierCanvas.width / 2;
  const centerY = e.clientY - parentRect.top - magnifierCanvas.height / 2;

  magnifierCanvas.style.left = `${centerX}px`;
  magnifierCanvas.style.top = `${centerY}px`;

  magnifierCanvas.style.display = "block";
});

// ===========================
// === BUTTON ACTIONS ========
// ===========================
async function updateAssessment(type) {
  const current = stored[currentFileIndex];
  const hash = current?.response?.metadata?.document?.hash;
  if (!hash) return alert("⚠️ Hash tidak ditemukan.");

  const url = `${apiEndpoint}/api/v1/walacakra/process/${hash}`;

  // === Kumpulkan update field (kalau recalculate) ===
  let updates = [];
  if (type === "PENDING") {
    document.querySelectorAll(".page-item").forEach((item, i) => {
      const pageNumber = i + 1;
      const docType = item.querySelector(".type-select")?.value?.trim();
      const nik = item.querySelector(".nik-field")?.textContent.trim();
      const name = item.querySelector(".name-field")?.textContent.trim();

      const updateObj = { pageNumber };

      if (docType) updateObj.docType = { correction: docType };
      if (nik) updateObj.nik = { correction: nik };
      if (name) updateObj.name = { correction: name };

      // hanya push jika ada perubahan berarti
      if (Object.keys(updateObj).length > 1) updates.push(updateObj);
    });
  }

  // === Buat payload berdasarkan tipe ===
  const payload =
    type === "APPROVED"
      ? { assessment: "APPROVED", updates: [] }
      : type === "REJECTED"
      ? { assessment: "REJECTED", updates: [] }
      : { assessment: "PENDING", updates };

  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    alert(`✅ ${type} success!`);

    // === Update state lokal ===
    current.response.data = json.data; // update hasil baru
    current.response.data.assessment = payload.assessment; // pastikan assessment sinkron

    // simpan ke array global stored (bukan cuma 1 item)
    stored[currentFileIndex] = current;

    // update localStorage seluruh stored
    localStorage.setItem("walacakra_results", JSON.stringify(stored));

    // refresh tampilan
    await loadFile(currentFileIndex);
  } catch (err) {
    console.error("❌ Error:", err);
    alert(`Failed to ${type.toLowerCase()} document.`);
  }
}

// === Tombol aksi ===
document.querySelector(".btn-reject")?.addEventListener("click", async () => {
  if (confirm("Are you sure you want to reject this document?")) {
    await updateAssessment("REJECTED");
  }
});

document.querySelector(".btn-approve")?.addEventListener("click", async () => {
  if (confirm("Are you sure you want to approve this document?")) {
    await updateAssessment("APPROVED");
  }
});

document.querySelector(".btn-recalculate")?.addEventListener("click", async () => {
  if (confirm("Recalculate document analysis with corrected fields?")) {
    await updateAssessment("PENDING");
  }
});
