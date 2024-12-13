let socket;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Socket.IO
    socket = io();

    socket.on('connect', () => {
        console.log('Connected to server');
        addLogEntry('Connected to server');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        addLogEntry('Disconnected from server');
    });

    socket.on('client_connected', (data) => {
        addLogEntry(`Client connected: ${data.client.name} (${data.client.ip})`);
    });

    socket.on('client_disconnected', (data) => {
        addLogEntry(`Client disconnected: ${data.client.name} (${data.client.ip})`);
    });

    socket.on('update_clients', (data) => {
        updateClientList(data.clients);
    });

    socket.on('refresh_files', () => {
        refreshFileList();
    });

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
    fetch('/get_device_info')
        .then(response => response.json())
        .then(data => {
            document.getElementById('deviceName').textContent = data.name;
            document.getElementById('deviceIp').textContent = data.ip;
        });

    // File upload handling
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const files = e.target.files;
            Array.from(files).forEach(file => {
                uploadFile(file);
            });
        });
    }

    // Client connection handling
    const connectButton = document.getElementById('connectButton');
    const serverIpInput = document.getElementById('serverIp');
    const availableFiles = document.getElementById('availableFiles');
    
    if (connectButton && serverIpInput) {
        connectButton.addEventListener('click', function() {
            const serverIp = serverIpInput.value.trim();
            if (serverIp) {
                connectToServer(serverIp);
            }
        });
    }

    // Initial file list refresh
    if (document.querySelector('.server-mode-active') || document.querySelector('.client-mode-active')) {
        refreshFileList();
    }
});

function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        addLogEntry(`File uploaded: ${data.filename}`);
        socket.emit('file_uploaded', { filename: data.filename });
    })
    .catch(error => {
        addLogEntry(`Error uploading file: ${error}`);
    });
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

function refreshFileList() {
    const fileList = document.getElementById('fileList');
    const availableFiles = document.getElementById('availableFiles');
    
    fetch('/files')
        .then(response => response.json())
        .then(files => {
            if (fileList) {
                fileList.innerHTML = files.length ? '' : '<p>No files shared yet</p>';
                files.forEach(file => {
                    const fileSize = formatFileSize(file.size);
                    fileList.innerHTML += `
                        <div class="file-item">
                            <span class="file-name">${file.name}</span>
                            <span class="file-size">${fileSize}</span>
                        </div>
                    `;
                });
            }
            
            if (availableFiles) {
                availableFiles.innerHTML = files.length ? '' : '<p>No files available</p>';
                files.forEach(file => {
                    const fileSize = formatFileSize(file.size);
                    availableFiles.innerHTML += `
                        <div class="file-item">
                            <span class="file-name">${file.name}</span>
                            <span class="file-size">${fileSize}</span>
                            <a href="${file.url}" class="download-button" download>Download</a>
                        </div>
                    `;
                });
            }
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
