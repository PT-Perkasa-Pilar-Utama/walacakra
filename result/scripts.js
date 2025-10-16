// =========================
// === CONFIGURABLE LIST ===
// =========================
const DOCUMENT_TYPES = [
  "",
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
  "UNCLASSIFIED",
];

// =========================
// === MODAL FUNCTIONS ===
// =========================
function showModal(title, message, type = "alert", onConfirm = null) {
  const modalOverlay = document.getElementById("modalOverlay");
  const modalTitle = document.getElementById("modalTitle");
  const modalMessage = document.getElementById("modalMessage");
  const modalFooter = document.getElementById("modalFooter");
  const modalClose = document.getElementById("modalClose");

  modalTitle.textContent = title;
  modalMessage.textContent = message;

  // Clear existing buttons
  modalFooter.innerHTML = "";

  if (type === "confirm") {
    // Add Cancel button
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn btn-secondary";
    cancelBtn.textContent = "Cancel";
    cancelBtn.onclick = () => {
      modalOverlay.classList.remove("show");
      if (onConfirm) onConfirm(false);
    };
    modalFooter.appendChild(cancelBtn);

    // Add Confirm button
    const confirmBtn = document.createElement("button");
    confirmBtn.className = "btn btn-primary";
    confirmBtn.textContent = "Confirm";
    confirmBtn.onclick = () => {
      modalOverlay.classList.remove("show");
      if (onConfirm) onConfirm(true);
    };
    modalFooter.appendChild(confirmBtn);
  } else {
    // Add OK button for alerts
    const okBtn = document.createElement("button");
    okBtn.className = "btn btn-primary";
    okBtn.textContent = "OK";
    okBtn.onclick = () => {
      modalOverlay.classList.remove("show");
    };
    modalFooter.appendChild(okBtn);
  }

  // Close button functionality
  modalClose.onclick = () => {
    modalOverlay.classList.remove("show");
    if (type === "confirm" && onConfirm) onConfirm(false);
  };

  // Close on overlay click
  modalOverlay.onclick = (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.classList.remove("show");
      if (type === "confirm" && onConfirm) onConfirm(false);
    }
  };

  // Show modal
  modalOverlay.classList.add("show");
}

// Helper functions to replace alert() and confirm()
function showAlert(message, title = "Information") {
  showModal(title, message, "alert");
}

function showConfirm(message, onConfirm, title = "Confirm Action") {
  showModal(title, message, "confirm", onConfirm);
}

// ===================
// === LOAD RESULT ===
// ===================

const storedData = JSON.parse(localStorage.getItem("walacakra_results")) || {};
const stored = storedData.files || [];
const metadata = storedData.metadata || {};
const statusText = document.getElementById("statusText");
const fileOptions = document.getElementById("fileOptions");
const selectedFile = document.getElementById("selectedFile");
const pageItemContainer = document.getElementById("pageItemContainer");
const apiEndpoint = localStorage.getItem("apiEndpoint");
const bearerToken = localStorage.getItem("apiToken");
let currentFileIndex = 0;

if (stored.length === 0) {
  showAlert("No processed file found. Please process a document first.");
} else {
  // Display status with duration information
  const durationText = metadata.durationSeconds
    ? ` in ${metadata.durationSeconds} seconds`
    : "";
  statusText.textContent = `Processed ${stored.length} file${
    stored.length > 1 ? "s" : ""
  }${durationText} successfully`;

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
    const url = path.startsWith("http") ? path : `${apiEndpoint}${path}`;

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const res = await fetch(url, { headers });
    if (!res.ok)
      throw new Error(`Failed to fetch file: ${res.status} ${res.statusText}`);

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

  // Check if item.response exists (might be undefined if there was an error)
  if (!item.response) {
    showAlert(
      "File data is corrupted or missing. Please process the file again.",
      "Error"
    );
    return;
  }

  const data = item.response.data;
  const meta = item.response.metadata;

  selectedFile.textContent = item.filename;

  // === Update assessment badge ===
  const assessmentStatus = document.getElementById("assessmentStatus");
  const assessment = data.assessment?.toLowerCase() || "pending";
  let editable = false;
  if (assessment == "pending") {
    editable = true;
  }

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
  document.getElementById("profileImage").src =
    photoUrl || "../assets/default-avatar.png";

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
  document.getElementById("fieldName").textContent =
    firstPage.name?.correction || firstPage.name?.reading || "-";
  document.getElementById("fieldNIK").textContent =
    firstPage.nik?.correction || firstPage.nik?.reading || "-";

  // === Summary pages ===
  pageItemContainer.innerHTML = "";
  data.pages.forEach((page) => {
    const pageItem = document.createElement("div");
    pageItem.classList.add("page-item");

    // === Tentukan status match ===
    let matchStatus, matchText;
    if (
      (page.nik.correction || page.nik.reading) ===
      (firstPage.nik.correction || firstPage.nik.reading)
    ) {
      matchText = "match";
      matchStatus = "match";
    } else if (
      (page.nik.correction || page.nik.reading) &&
      page.nik.reading.trim() !== ""
    ) {
      matchText = "exist, but not match";
      matchStatus = "warning";
    } else {
      matchText = "not exist";
      matchStatus = "error";
    }

    // === Buat markup awal dengan accordion ===
    let innerHTML = `
            <div class="page-header-wrapper" data-page="${page.pageNumber}">
                <div class="page-header">
                    • Page ${page.pageNumber + 1}
                    <div class="status-indicator">
                        <span class="status-icon ${matchStatus}"></span>
                        <span class="status-text">${matchText}</span>
                    </div>
                </div>
                <button class="accordion-toggle" data-page="${page.pageNumber}">
                    <svg class="accordion-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
            <div class="accordion-content collapsed" data-page="${
              page.pageNumber
            }">
                <div class="data-row">
                    <span class="data-label">○ Type:</span>
                    <select class="data-value type-select" ${
                      editable ? "" : "disabled"
                    }>
                        ${DOCUMENT_TYPES.map(
                          (type) =>
                            `<option value="${type}" ${
                              (page.docType.correction ||
                                page.docType.reading) === type
                                ? "selected"
                                : ""
                            }>${type}</option>`
                        ).join("")}
                    </select>
                </div>
                <div class="data-row">
                    <span class="data-label">○ NIK:</span>
                    <span class="data-value nik-field" contenteditable="${editable}" style="background:white;">
                        ${page.nik.correction || page.nik.reading || "-"}
                    </span>
                </div>
            </div>
        `;

    pageItem.innerHTML = innerHTML;
    pageItemContainer.appendChild(pageItem);
  });

  // Add accordion functionality
  setupAccordionListeners();

  // === Hitung summary match berdasarkan rule ===
  const ktpPage = data.pages.find((p) => p.docType.reading === "KTP");
  const ktpNik = ktpPage?.nik?.reading || "";

  let totalPages = data.pages.length;
  let nikAvailable = 0;
  let nikMatch = 0;

  data.pages.forEach((p) => {
    const nik = p.nik?.reading || "";
    if (nik.trim()) {
      nikAvailable++;
      if (nik === ktpNik) nikMatch++;
    }
  });

  document.getElementById(
    "matchSummary"
  ).textContent = `${nikMatch}/${totalPages} pages have NIK matching the main KTP`;
}

// ===========================
// === ACCORDION FUNCTIONALITY ===
// ===========================
function setupAccordionListeners() {
  const pageHeaders = document.querySelectorAll(".page-header-wrapper");
  const accordionToggles = document.querySelectorAll(".accordion-toggle");

  // Add click event to entire page header (not just the toggle button)
  pageHeaders.forEach((header, index) => {
    header.addEventListener("click", function (e) {
      // Prevent event from firing twice if toggle button was clicked
      e.stopPropagation();

      const pageNumber = this.getAttribute("data-page");
      const content = document.querySelector(
        `.accordion-content[data-page="${pageNumber}"]`
      );
      const icon = this.querySelector(".accordion-icon");
      const toggle = this.querySelector(".accordion-toggle");

      if (content.classList.contains("collapsed")) {
        // Expand
        content.classList.remove("collapsed");
        icon.style.transform = "rotate(0deg)";
      } else {
        // Collapse
        content.classList.add("collapsed");
        icon.style.transform = "rotate(-90deg)";
      }
    });
  });

  // Keep toggle button functionality but stop propagation
  accordionToggles.forEach((toggle) => {
    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
    });
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
    const res = await fetch(
      `${apiEndpoint}/api/v1/walacakra/history?page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) throw new Error(`Failed to fetch history (${res.status})`);
    const json = await res.json();
    const items = json?.data?.items || [];
    const pagination = json?.metadata?.pagination || {};

    if (items.length === 0) {
      historyContainer.innerHTML = `<p class="no-history">No history records found.</p>`;
      return;
    }

    const cardsContainer = document.createElement("div");
    cardsContainer.classList.add("history-cards");

    cardsContainer.innerHTML = items
      .map(
        (item) => `
        <div class="history-card ${item.assessment.toLowerCase()}" data-hash="${
          item.hash
        }">
            <div class="history-card-header">
                <h3 class="history-card-filename">${item.filename}</h3>
                <span class="history-card-status ${item.assessment.toLowerCase()}">${
          item.assessment
        }</span>
            </div>
            <div class="history-card-meta">
                <div class="history-card-pages">${item.pages} pages</div>
                <div class="history-card-date">${new Date(
                  item.processedAt
                ).toLocaleString()}</div>
            </div>
        </div>
    `
      )
      .join("");

    // === Make cards clickable ===
    cardsContainer.querySelectorAll(".history-card").forEach((card) => {
      card.addEventListener("click", async () => {
        const hash = card.getAttribute("data-hash");
        const url = `${apiEndpoint}/api/v1/walacakra/history/${hash}`;

        try {
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${bearerToken}` },
          });
          if (!res.ok)
            throw new Error(`Failed to fetch history detail: ${res.status}`);

          const json = await res.json();

          // Simpan ke localStorage dengan format yang sama seperti hasil processing biasa
          const stored = [
            {
              filename: json.metadata.document.filename,
              response: {
                metadata: json.metadata,
                data: json.data,
              },
            },
          ];

          const resultsWithMeta = {
            files: stored,
            metadata: {
              totalFiles: 1,
              processedAt:
                json.metadata.document.processedAt || new Date().toISOString(),
              duration: 0,
              durationSeconds: 0,
            },
          };

          localStorage.setItem(
            "walacakra_results",
            JSON.stringify(resultsWithMeta)
          );

          // Redirect ke halaman result/index.html
          window.location.href = "index.html";
        } catch (err) {
          console.error("❌ Error loading history detail:", err);
          showAlert("Failed to load this document's detail.", "Error");
        }
      });
    });

    // Pagination controls
    const paginationDiv = document.createElement("div");
    paginationDiv.classList.add("pagination-controls");
    paginationDiv.innerHTML = `
            <button class="page-btn" id="prevPage" ${
              !pagination.hasPrev ? "disabled" : ""
            }>◀</button>
            <span class="page-info">Page ${pagination.page} of ${
      pagination.totalPages
    }</span>
            <button class="page-btn" id="nextPage" ${
              !pagination.hasNext ? "disabled" : ""
            }>▶</button>
        `;

    paginationDiv.querySelector("#prevPage").addEventListener("click", () => {
      if (pagination.hasPrev) loadHistory(pagination.page - 1);
    });
    paginationDiv.querySelector("#nextPage").addEventListener("click", () => {
      if (pagination.hasNext) loadHistory(pagination.page + 1);
    });

    // Replace content
    historyContainer.innerHTML = "";
    historyContainer.appendChild(cardsContainer);

    // Move pagination controls outside the history container
    document.querySelector(".right-panel").appendChild(paginationDiv);
  } catch (err) {
    console.error("❌ Error loading history:", err);
    historyContainer.innerHTML = `<p class="error">Failed to load history data.</p>`;
  }
}

// ===============================
// ========= TAB SWITCH ==========
// ===============================
const tabs = document.querySelectorAll(".tab");
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");

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
  } else {
    // atur lokasi worker
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  }

  const token = localStorage.getItem("apiToken");
  const res = await fetch(fileUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok)
    throw new Error(`Gagal fetch PDF: ${res.status} ${res.statusText}`);
  const pdfData = await res.arrayBuffer();

  // init PDF.js
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

  // setup state
  let currentPage = 1;
  const canvas = document.getElementById("pdfCanvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
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
const magnifierCtx = magnifierCanvas.getContext("2d", {
  willReadFrequently: true,
});
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
  if (!hash) return showAlert("⚠️ Hash tidak ditemukan.", "Warning");

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

    showAlert(`✅ ${type} success!`, "Success");

    // === Update state lokal ===
    current.response.data = json.data; // update hasil baru
    current.response.data.assessment = payload.assessment; // pastikan assessment sinkron

    // simpan ke array global stored (bukan cuma 1 item)
    stored[currentFileIndex] = current;

    // update localStorage seluruh stored dengan format baru
    const resultsWithMeta = {
      files: stored,
      metadata: metadata,
    };
    localStorage.setItem("walacakra_results", JSON.stringify(resultsWithMeta));

    // refresh tampilan
    await loadFile(currentFileIndex);
  } catch (err) {
    console.error("❌ Error:", err);
    showAlert(`Failed to ${type.toLowerCase()} document.`, "Error");
  }
}

// === Tombol aksi ===
document.querySelector(".btn-reject")?.addEventListener("click", async () => {
  showConfirm(
    "Are you sure you want to reject this document?",
    async (confirmed) => {
      if (confirmed) {
        await updateAssessment("REJECTED");
      }
    },
    "Reject Document"
  );
});

document.querySelector(".btn-approve")?.addEventListener("click", async () => {
  showConfirm(
    "Are you sure you want to approve this document?",
    async (confirmed) => {
      if (confirmed) {
        await updateAssessment("APPROVED");
      }
    },
    "Approve Document"
  );
});

document
  .querySelector(".btn-recalculate")
  ?.addEventListener("click", async () => {
    showConfirm(
      "Recalculate document analysis with corrected fields?",
      async (confirmed) => {
        if (confirmed) {
          await updateAssessment("PENDING");
        }
      },
      "Recalculate Document"
    );
  });
