// Konfigurasi API
const API_BASE = "https://shinai.onrender.com";
const API_KEY = 'nvcdnxvandecim';

// State management
let state = {
    filesUploaded: 0,
    urlsCreated: 0
};

// Variables for upload tracking
let uploadStartTime = null;
let progressInterval = null;
let xhrInstance = null;

// Inisialisasi
document.addEventListener('DOMContentLoaded', function() {
    checkApiStatus();
    setupEventListeners();
    loadStats();
});

// Setup event listeners
function setupEventListeners() {
    // Drag and drop untuk file upload
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-blue-500', 'bg-blue-50');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-blue-500', 'bg-blue-50');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500', 'bg-blue-50');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelect(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });
}

// Handle file selection
function handleFileSelect(file) {
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('selectedFileName');
    const fileSize = document.getElementById('selectedFileSize');

    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileInfo.classList.remove('hidden');

    // Validasi ukuran file
    if (file.size > 25 * 1024 * 1024) {
        showNotification('Ukuran file melebihi 25MB', 'error');
        fileInfo.classList.add('hidden');
        fileInput.value = '';
    }
}

/*

// Fungsi untuk menampilkan notifikasi
function showNotification(message, type = 'info') {
    // Hapus notifikasi sebelumnya
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500'
    };

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-triangle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation'
    };

    const notification = document.createElement('div');
    notification.className = `notification fixed top-6 right-6 ${colors[type]} text-white px-6 py-4 rounded-2xl shadow-2xl transform transition-all duration-500 translate-x-32 opacity-0 z-50`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${icons[type]} mr-3 text-lg"></i>
            <span class="font-medium">${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    // Animasi masuk
    setTimeout(() => {
        notification.classList.remove('translate-x-32', 'opacity-0');
        notification.classList.add('translate-x-0', 'opacity-100');
    }, 100);

    // Animasi keluar setelah 4 detik
    setTimeout(() => {
        notification.classList.remove('translate-x-0', 'opacity-100');
        notification.classList.add('translate-x-32', 'opacity-0');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 500);
    }, 4000);
}

*/

// Fungsi untuk cek status API
async function checkApiStatus() {
    const statusElement = document.getElementById('apiStatus');
    try {
        const response = await fetch(`${API_BASE}/health`);
        if (response.ok) {
            statusElement.innerHTML = '<span class="inline-flex items-center"><i class="fas fa-circle mr-2 text-green-500"></i>Online</span>';
        } else {
            throw new Error('API tidak merespon');
        }
    } catch (error) {
        statusElement.innerHTML = '<span class="inline-flex items-center"><i class="fas fa-circle mr-2 text-red-500"></i>Offline</span>';
    }
}

// Fungsi untuk upload file dengan progress bar realistis
async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadResult = document.getElementById('uploadResult');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    const progressPercent = document.getElementById('progressPercent');

    if (!fileInput.files[0]) {
        showNotification('Pilih file terlebih dahulu', 'error');
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    // Cancel upload yang sedang berjalan
    if (xhrInstance) {
        xhrInstance.abort();
        xhrInstance = null;
    }

    try {
        // Setup tracking
        uploadStartTime = Date.now();
        
        // Estimasi waktu upload berdasarkan ukuran file
        // 2MB = ~3 detik, 10MB = ~8 detik, 25MB = ~15 detik
        const baseTime = 5000; // Waktu dasar untuk request kecil
        const sizeFactor = file.size / (1024 * 1024); // Size in MB
        const estimatedTime = baseTime + (sizeFactor * 500); // +500ms per MB
        
        // Tampilkan progress bar
        uploadProgress.classList.remove('hidden');
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Uploading...';
        
        // Reset progress bar
        progressBar.style.width = '0%';
        progressBar.className = 'h-full bg-blue-500 rounded-lg transition-all duration-300';
        progressPercent.textContent = '0%';

        // Mulai animasi progress simulasi (untuk UI feedback)
        startSimulatedProgress(estimatedTime);

        xhrInstance = new XMLHttpRequest();
        
        // Real progress dari XHR
        xhrInstance.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && uploadStartTime) {
                const elapsedTime = Date.now() - uploadStartTime;
                const realPercent = (e.loaded / e.total) * 100;
                
                // Estimasi waktu tersisa berdasarkan progress aktual
                if (realPercent > 0 && elapsedTime > 0) {
                    const estimatedTotalTime = (elapsedTime / realPercent) * 100;
                    const timeLeft = estimatedTotalTime - elapsedTime;
                    
                    // Update progress dengan logika realistis
                    updateProgressBar(realPercent, timeLeft);
                }
            }
        });

        xhrInstance.addEventListener('load', () => {
            // Hentikan progress simulasi
            if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }
            
            if (xhrInstance.status === 200) {
                try {
                    const response = JSON.parse(xhrInstance.responseText);
                    if (response.success) {
                        // Langsung ke 100%
                        updateProgressBar(100, 0);
                        
                        // Delay sedikit untuk menunjukkan 100%
                        setTimeout(() => {
                            // Tampilkan hasil
                            document.getElementById('fileUrl').value = response.data.url;
                            document.getElementById('fileName').textContent = response.data.filename;
                            document.getElementById('fileSize').textContent = formatFileSize(response.data.size);
                            
                            uploadResult.classList.remove('hidden');
                            state.filesUploaded++;
                            updateStats();
                            showNotification('File berhasil diupload!', 'success');
                            
                            // Reset form
                            fileInput.value = '';
                            document.getElementById('fileInfo').classList.add('hidden');
                            xhrInstance = null;
                        }, 500);
                    } else {
                        throw new Error(response.message || 'Upload gagal');
                    }
                } catch (e) {
                    throw new Error('Gagal parsing response');
                }
            } else {
                throw new Error(`Upload gagal - Status: ${xhrInstance.status}`);
            }
        });

        xhrInstance.addEventListener('error', () => {
            if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }
            updateProgressBar(0, 0);
            throw new Error('Terjadi kesalahan jaringan');
        });

        xhrInstance.addEventListener('abort', () => {
            if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }
            updateProgressBar(0, 0);
            showNotification('Upload dibatalkan', 'warning');
        });

        xhrInstance.addEventListener('loadend', () => {
            // Reset button setelah delay
            setTimeout(() => {
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = '<i class="fas fa-upload mr-2"></i>Upload';
                uploadProgress.classList.add('hidden');
            }, 1000);
        });

        xhrInstance.open('POST', `${API_BASE}/upload`);
        xhrInstance.setRequestHeader('x-api-key', API_KEY);
        xhrInstance.send(formData);

    } catch (error) {
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
        showNotification(error.message, 'error');
        
        // Reset button
        setTimeout(() => {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload mr-2"></i>Upload';
            uploadProgress.classList.add('hidden');
        }, 1000);
    }
}

// Fungsi untuk progress simulasi
function startSimulatedProgress(estimatedTime) {
    let progress = 0;
    
    // Clear interval sebelumnya
    if (progressInterval) {
        clearInterval(progressInterval);
    }
    
    // Progress simulasi hanya untuk efek visual awal
    progressInterval = setInterval(() => {
        if (progress >= 85) { // Hentikan di 85%, sisanya dari real progress
            clearInterval(progressInterval);
            return;
        }
        
        // Kurva percepatan: cepat di awal, lambat di tengah
        let increment;
        if (progress < 30) {
            increment = 0.8; // Cepat di awal
        } else if (progress < 60) {
            increment = 0.4; // Sedang
        } else {
            increment = 0.2; // Lambat
        }
        
        progress += increment;
        updateProgressBar(progress, null);
    }, estimatedTime / 100); // Sesuaikan interval dengan estimasi waktu
}

// Update progress bar dengan warna dinamis
function updateProgressBar(percent, timeLeft) {
    const progressBar = document.getElementById('progressBar');
    const progressPercent = document.getElementById('progressPercent');
    
    const roundedPercent = Math.min(100, Math.max(0, Math.round(percent)));
    progressBar.style.width = roundedPercent + '%';
    
    // Format waktu tersisa jika ada
    let timeText = '';
    if (timeLeft !== null && timeLeft > 0 && percent < 95) {
        const seconds = Math.ceil(timeLeft / 1000);
        timeText = ` • ${seconds}s`;
    }
    
    progressPercent.textContent = `${roundedPercent}%${timeText}`;
    
    // Update warna berdasarkan progress
    if (roundedPercent < 30) {
        progressBar.className = 'h-full bg-blue-500 rounded-lg transition-all duration-300';
    } else if (roundedPercent < 70) {
        progressBar.className = 'h-full bg-blue-600 rounded-lg transition-all duration-300';
    } else if (roundedPercent < 90) {
        progressBar.className = 'h-full bg-green-500 rounded-lg transition-all duration-300';
    } else {
        progressBar.className = 'h-full bg-green-600 rounded-lg transition-all duration-300';
    }
}

// Fungsi untuk membatalkan upload
function cancelUpload() {
    if (xhrInstance) {
        xhrInstance.abort();
        xhrInstance = null;
    }
    
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadProgress = document.getElementById('uploadProgress');
    
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = '<i class="fas fa-upload mr-2"></i>Upload';
    uploadProgress.classList.add('hidden');
    
    updateProgressBar(0, 0);
}

// Fungsi untuk copy ke clipboard
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    element.select();
    element.setSelectionRange(0, 99999);
    
    try {
        navigator.clipboard.writeText(element.value);
        showNotification('URL disalin ke clipboard!', 'success');
    } catch (err) {
        // Fallback untuk browser lama
        document.execCommand('copy');
        showNotification('URL disalin!', 'success');
    }
}

// Fungsi untuk format ukuran file
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Fungsi untuk load dan update stats
function loadStats() {
    // Load dari localStorage jika ada
    const savedStats = localStorage.getItem('cdnStats');
    if (savedStats) {
        state = { ...state, ...JSON.parse(savedStats) };
    }
    updateStats();
}

function updateStats() {
    document.getElementById('filesCount').textContent = state.filesUploaded;
    document.getElementById('urlsCount').textContent = state.urlsCreated;
    
    // Save ke localStorage
    localStorage.setItem('cdnStats', JSON.stringify(state));
}