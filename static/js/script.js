document.addEventListener('DOMContentLoaded', function() {
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

    // If we're on the server page, start refreshing the file list
    if (document.querySelector('.server-mode-active')) {
        refreshFileList();
        setInterval(refreshFileList, 5000); // Refresh every 5 seconds
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
        refreshFileList();
    })
    .catch(error => {
        addLogEntry(`Error uploading file: ${error}`);
    });
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
    fetch(`${baseUrl}/files`)
        .then(response => response.json())
        .then(files => {
            addLogEntry(`Connected to server at ${serverIp}`);
            const availableFiles = document.getElementById('availableFiles');
            availableFiles.innerHTML = files.length ? '' : '<p>No files available</p>';
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
            addLogEntry(`Error connecting to server: ${error}`);
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
