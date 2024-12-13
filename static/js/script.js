let socket;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Socket.IO with mode parameter
    const isServerMode = document.querySelector('.server-mode-active') !== null;
    socket = io({
        query: {
            mode: isServerMode ? 'server' : 'client'
        }
    });

    socket.on('connect', () => {
        console.log('Connected to server');
        addLogEntry('Connected to server');
        updateConnectionStatus('Connected', true);
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        addLogEntry('Disconnected from server');
        updateConnectionStatus('Disconnected', false);
        updateClientInfo(null);
    });

    // Server-specific events
    if (isServerMode) {
        socket.on('server_connected', (data) => {
            console.log('Server mode initialized');
            addLogEntry('Server mode initialized');
            // Update server device info
            updateDeviceInfo(data.server);
        });

        socket.on('client_connected', (data) => {
            console.log('Client connected:', data);
            addLogEntry(`Client connected: ${data.client.name} (${data.client.ip})`);
            updateClientInfo(data.client);
            updateConnectionStatus('Client Connected', true);
        });

        socket.on('client_disconnected', (data) => {
            addLogEntry(`Client disconnected: ${data.client.name} (${data.client.ip})`);
            updateClientInfo(null);
            updateConnectionStatus('Waiting for client...', false);
        });

        socket.on('update_clients', (data) => {
            updateClientList(data.clients);
        });

        socket.on('refresh_files', () => {
            refreshFileList();
        });
    } 
    // Client-specific events
    else {
        socket.on('connection_established', (data) => {
            console.log('Connected to server:', data);
            addLogEntry(`Connected to server: ${data.server.name} (${data.server.ip})`);
            updateConnectionStatus('Connected to Server', true);
        });

        socket.on('update_files', (data) => {
            const availableFiles = document.getElementById('availableFiles');
            if (!data || data.length === 0) {
                availableFiles.innerHTML = '<p>No files available</p>';
                return;
            }
            
            availableFiles.innerHTML = '';
            data.forEach(file => {
                const fileSize = formatFileSize(file.size);
                availableFiles.innerHTML += `
                    <div class="file-item">
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">${fileSize}</span>
                        <a href="${file.url}" class="download-button" download>Download</a>
                    </div>
                `;
            });
        });
    }

    // Toggle sidebar
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            sidebarToggle.classList.toggle('active');
        });
    }

    // Get device info
    if (isServerMode) {
        fetch('/get_device_info')
            .then(response => response.json())
            .then(data => {
                document.getElementById('deviceName').textContent = data.name;
                document.getElementById('deviceIp').textContent = data.ip;
            });
    }

    // File upload handling
    const fileInput = document.getElementById('fileInput');
    const dropzone = document.getElementById('fileDropzone');
    
    if (fileInput && dropzone) {
        // Handle file input change
        fileInput.addEventListener('change', function(e) {
            const files = e.target.files;
            Array.from(files).forEach(file => {
                uploadFile(file);
            });
        });

        // Handle dropzone click
        dropzone.addEventListener('click', function() {
            fileInput.click();
        });

        // Handle drag and drop
        dropzone.addEventListener('dragover', function(e) {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', function(e) {
            e.preventDefault();
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', function(e) {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            Array.from(files).forEach(file => {
                uploadFile(file);
            });
        });
    }

    // Client connection handling
    const connectButton = document.getElementById('connectButton');
    const serverIpInput = document.getElementById('serverIp');
    
    if (connectButton && serverIpInput) {
        connectButton.addEventListener('click', function() {
            const serverIp = serverIpInput.value.trim();
            if (serverIp) {
                connectToServer(serverIp);
            }
        });
    }

    // Initial file list refresh
    if (document.querySelector('.server-mode-active')) {
        refreshFileList();
    }
});

function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    // Add loading indicator to shared files
    const sharedFiles = document.getElementById('sharedFiles');
    const loadingItem = document.createElement('div');
    loadingItem.className = 'file-item loading';
    loadingItem.innerHTML = `
        <span class="file-name">${file.name}</span>
        <span class="upload-status">Uploading...</span>
    `;
    sharedFiles.appendChild(loadingItem);

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        loadingItem.remove();
        addLogEntry(`File uploaded: ${data.filename}`);
        socket.emit('file_uploaded', { filename: data.filename });
        refreshFileList();
    })
    .catch(error => {
        loadingItem.remove();
        addLogEntry(`Error uploading file: ${error}`);
    });
}

function refreshFileList() {
    const sharedFiles = document.getElementById('sharedFiles');
    
    fetch('/files')
        .then(response => response.json())
        .then(files => {
            if (!files || files.length === 0) {
                sharedFiles.innerHTML = '<p>No files shared yet</p>';
                return;
            }
            
            sharedFiles.innerHTML = '';
            files.forEach(file => {
                const fileSize = formatFileSize(file.size);
                sharedFiles.innerHTML += `
                    <div class="file-item">
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">${fileSize}</span>
                        <a href="${file.url}" class="download-button" download>Download</a>
                    </div>
                `;
            });
        });
}

function connectToServer(serverIp) {
    const baseUrl = `http://${serverIp}:8000`;
    
    // First test the connection
    fetch(`${baseUrl}/get_device_info`, {
        method: 'GET',
        mode: 'cors',
        headers: {
            'Accept': 'application/json',
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        addLogEntry(`Connected to server: ${data.name} (${data.ip})`);
        // Now get the file list
        return fetch(`${baseUrl}/files`, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Accept': 'application/json',
            }
        });
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(files => {
        const availableFiles = document.getElementById('availableFiles');
        if (!files || files.length === 0) {
            availableFiles.innerHTML = '<p>No files available</p>';
            return;
        }
        
        availableFiles.innerHTML = '';
        files.forEach(file => {
            const fileSize = formatFileSize(file.size);
            availableFiles.innerHTML += `
                <div class="file-item">
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${fileSize}</span>
                    <a href="${baseUrl}${file.url}" class="download-button" download>Download</a>
                </div>
            `;
        });
    })
    .catch(error => {
        console.error('Connection error:', error);
        addLogEntry(`Error connecting to server: ${error.message}`);
        const availableFiles = document.getElementById('availableFiles');
        availableFiles.innerHTML = '<p class="error-message">Failed to connect to server. Please check the IP address and make sure the server is running.</p>';
    });
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
    if (sidebarContent) {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        sidebarContent.appendChild(entry);
        sidebarContent.scrollTop = sidebarContent.scrollHeight;
    }
}

function updateConnectionStatus(status, isConnected) {
    const statusText = document.querySelector('.status-text');
    const statusDot = document.querySelector('.status-dot');
    
    if (statusText && statusDot) {
        statusText.textContent = status;
        if (isConnected) {
            statusDot.classList.add('connected');
        } else {
            statusDot.classList.remove('connected');
        }
    }
}

function updateClientInfo(client) {
    const clientName = document.getElementById('clientName');
    const clientIp = document.getElementById('clientIp');
    
    if (clientName && clientIp) {
        if (client) {
            clientName.textContent = client.name;
            clientIp.textContent = client.ip;
        } else {
            clientName.textContent = 'No client connected';
            clientIp.textContent = '-';
        }
    }
}

function updateDeviceInfo(device) {
    const deviceName = document.getElementById('deviceName');
    const deviceIp = document.getElementById('deviceIp');
    
    if (deviceName && deviceIp && device) {
        deviceName.textContent = device.name;
        deviceIp.textContent = device.ip;
    }
}

function updateClientList(clients) {
    const clientList = document.getElementById('clientList');
    if (clientList) {
        clientList.innerHTML = clients.length ? '' : '<p>No clients connected</p>';
        clients.forEach(client => {
            clientList.innerHTML += `
                <div class="client-item">
                    <span class="client-name">${client.name}</span>
                    <span class="client-ip">${client.ip}</span>
                </div>
            `;
        });
    }
}
