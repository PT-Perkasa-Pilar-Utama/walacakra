// Tab switching
const tabs = document.querySelectorAll('.tab');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
    });
});

// Page navigation
const pageBtns = document.querySelectorAll('.page-btn');
let currentPage = 1;
const totalPages = 10;

pageBtns[0].addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        updatePageInfo();
    }
});

pageBtns[1].addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        updatePageInfo();
    }
});

function updatePageInfo() {
    document.querySelector('.page-info').textContent = `${currentPage} / ${totalPages}`;
}

// Magnifier functionality
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

    // Position magnifier
    magnifier.style.left = (x - 75) + 'px';
    magnifier.style.top = (y - 75) + 'px';

    // Adjust magnified content position
    const magnifierContent = magnifier.querySelector('.magnifier-content');
    magnifierContent.style.transform = `translate(-${x * 2}px, -${y * 2}px) scale(2)`;
});

// Zoom controls
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

// Double click to toggle zoom
previewContainer.addEventListener('dblclick', () => {
    if (currentZoom === 1) {
        currentZoom = 2;
    } else {
        currentZoom = 1;
    }
    previewImage.style.transform = `scale(${currentZoom})`;
});

// Button actions
document.querySelector('.btn-reject').addEventListener('click', () => {
    if (confirm('Are you sure you want to reject this document?')) {
        alert('Document rejected');
    }
});

document.querySelector('.btn-approve').addEventListener('click', () => {
    if (confirm('Are you sure you want to approve this document?')) {
        alert('Document approved');
        // Could redirect to next document or dashboard
    }
});

document.querySelector('.btn-recalculate').addEventListener('click', () => {
    alert('Recalculating document analysis...');
    // Could show loading state and reprocess
});