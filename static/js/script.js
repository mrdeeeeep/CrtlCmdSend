document.addEventListener('DOMContentLoaded', () => {
    // Initialize device information
    initializeDeviceInfo();

    // Initialize connection status
    initializeConnectionStatus();

    // Initialize sidebar
    initializeSidebar();

    // Initialize file handling
    initializeFileHandling();

    // Connection log toggle functionality
    const toggleLog = document.getElementById('toggleLog');
    const connectionLog = document.getElementById('connectionLog');
    
    if (toggleLog && connectionLog) {
        toggleLog.addEventListener('click', () => {
            connectionLog.classList.toggle('active');
        });
    }

    // Client connection functionality
    const connectButton = document.getElementById('connectButton');
    const serverIpInput = document.getElementById('serverIp');
    const connectionStatus = document.getElementById('connectionStatus');
    
    if (connectButton && serverIpInput && connectionStatus) {
        connectButton.addEventListener('click', () => {
            const ipAddress = serverIpInput.value.trim();
            
            if (!ipAddress) {
                showConnectionStatus('Please enter a valid IP address', 'error');
                return;
            }
            
            showConnectionStatus('Connecting...', 'pending');
            
            setTimeout(() => {
                showConnectionStatus('Connected successfully!', 'success');
                addLogEntry('Connected to ' + ipAddress);
            }, 1500);
        });
    }
});

function initializeDeviceInfo() {
    const deviceName = document.getElementById('deviceName');
    const deviceIp = document.getElementById('deviceIp');
    
    if (deviceName && deviceIp) {
        // Get device information from the backend
        fetch('/get_device_info')
            .then(response => response.json())
            .then(data => {
                deviceName.textContent = data.name;
                deviceIp.textContent = data.ip;
            })
            .catch(error => {
                console.error('Error fetching device info:', error);
                deviceName.textContent = 'Error loading device name';
                deviceIp.textContent = 'Error loading IP';
            });
    }
}

function initializeConnectionStatus() {
    const connectButton = document.getElementById('connectButton');
    const serverIp = document.getElementById('serverIp');
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    const clientName = document.getElementById('clientName');
    const clientIp = document.getElementById('clientIp');

    if (connectButton && serverIp) {
        // Client mode
        connectButton.addEventListener('click', () => {
            const ip = serverIp.value.trim();
            if (!ip) {
                updateConnectionStatus('Please enter a valid IP address', 'error');
                return;
            }

            updateConnectionStatus('Connecting...', 'pending');
            addLogEntry(`Attempting to connect to ${ip}...`);

            // Simulate connection attempt
            setTimeout(() => {
                updateConnectionStatus('Connected to server', 'connected');
                addLogEntry('Connected successfully!');
            }, 1500);
        });
    } else if (statusDot && statusText) {
        // Server mode
        updateConnectionStatus('Waiting for client...', 'pending');
        addLogEntry('Server started. Waiting for connections...');

        if (clientName && clientIp) {
            // Simulate client connection after 3 seconds
            setTimeout(() => {
                const simulatedClientInfo = {
                    name: 'Client Device',
                    ip: '192.168.1.2'
                };
                updateClientInfo(simulatedClientInfo);
                updateConnectionStatus('Client connected', 'connected');
                addLogEntry(`Client connected: ${simulatedClientInfo.name} (${simulatedClientInfo.ip})`);
            }, 3000);
        }
    }
}

function updateClientInfo(clientInfo) {
    const clientName = document.getElementById('clientName');
    const clientIp = document.getElementById('clientIp');
    
    if (clientName && clientIp) {
        clientName.textContent = clientInfo.name;
        clientIp.textContent = clientInfo.ip;
    }
}

function updateConnectionStatus(message, status) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');

    if (statusDot && statusText) {
        statusDot.className = 'status-dot ' + status;
        statusText.textContent = message;
    }
}

function initializeSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const mainWrapper = document.querySelector('.main-wrapper');
    
    if (sidebarToggle && sidebar && mainWrapper) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            sidebarToggle.classList.toggle('active');
            mainWrapper.classList.toggle('shifted');
        });
    }
}

function initializeFileHandling() {
    const dropzone = document.getElementById('fileDropzone');
    const filesContainer = document.getElementById('sharedFiles');
    
    if (dropzone && filesContainer) {
        setupFileDropzone(dropzone, filesContainer);
    }
}

function setupFileDropzone(dropzone, filesContainer) {
    dropzone.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.style.display = 'none';
        
        input.addEventListener('change', (e) => {
            handleFiles(Array.from(e.target.files));
        });
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    });

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    });
}

function handleFiles(files) {
    const filesContainer = document.getElementById('sharedFiles');
    const progressContainer = document.getElementById('progressContainer');
    
    files.forEach((file, index) => {
        // Create file item
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span class="file-name">${file.name}</span>
            <span class="file-size">${formatFileSize(file.size)}</span>
        `;
        filesContainer.appendChild(fileItem);

        // Create progress item
        const progressItem = document.createElement('div');
        progressItem.className = 'progress-item';
        progressItem.innerHTML = `
            <div class="progress-info">
                <span class="file-name">${file.name}</span>
                <span class="progress-text">0%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-bar-fill" style="width: 0%"></div>
            </div>
        `;
        progressContainer.appendChild(progressItem);

        // Simulate file upload progress
        simulateFileUpload(progressItem, fileItem);
        addLogEntry(`Started uploading: ${file.name}`);
    });
}

function simulateFileUpload(progressItem, fileItem) {
    const progressBar = progressItem.querySelector('.progress-bar-fill');
    const progressText = progressItem.querySelector('.progress-text');
    let progress = 0;

    const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            addLogEntry('File upload completed: ' + fileItem.querySelector('.file-name').textContent);
        }
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}%`;
    }, 200);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function addLogEntry(message) {
    const sidebarContent = document.querySelector('.sidebar-content');
    if (!sidebarContent) return;

    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    sidebarContent.appendChild(entry);
    sidebarContent.scrollTop = sidebarContent.scrollHeight;
}

function showConnectionStatus(message, status) {
    const connectionStatus = document.getElementById('connectionStatus');
    if (!connectionStatus) return;
    
    const statusDot = connectionStatus.querySelector('.status-dot');
    const statusText = connectionStatus.querySelector('.status-text');
    
    if (statusDot && statusText) {
        statusText.textContent = message;
        
        statusDot.style.backgroundColor = {
            'error': 'var(--error-color)',
            'success': 'var(--success-color)',
            'pending': 'var(--accent-primary)'
        }[status] || 'var(--text-secondary)';
    }
}

// Add smooth page transitions
document.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
        e.preventDefault();
        document.body.style.opacity = '0';
        
        setTimeout(() => {
            window.location = e.target.href;
        }, 300);
    }
});

// Add fade-in effect on page load
window.addEventListener('load', () => {
    document.body.style.opacity = '1';
});
