document.addEventListener('DOMContentLoaded', function() {
    // Current path in S3 bucket (starts with empty prefix)
    let currentPath = '';
    
    // Elements
    const fileList = document.getElementById('file-list');
    const fileUpload = document.getElementById('file-upload');
    const uploadBtn = document.getElementById('upload-btn');
    const createFolderBtn = document.getElementById('create-folder-btn');
    const createFolderConfirmBtn = document.getElementById('create-folder-confirm');
    const folderNameInput = document.getElementById('folder-name');
    const breadcrumbContainer = document.getElementById('breadcrumb-container');
    const currentFolderDisplay = document.getElementById('current-folder-display');
    const loadingSpinner = document.getElementById('loading-spinner');
    
    // Bootstrap Modal
    const createFolderModal = new bootstrap.Modal(document.getElementById('createFolderModal'));
    
    // Initialize the file explorer
    loadFiles();
    
    // Event listeners
    uploadBtn.addEventListener('click', () => fileUpload.click());
    fileUpload.addEventListener('change', uploadFiles);
    createFolderBtn.addEventListener('click', () => createFolderModal.show());
    createFolderConfirmBtn.addEventListener('click', createFolder);
    
    // Set up drag and drop
    setupDragAndDrop();
    
    // Function to load files from S3
    function loadFiles() {
        showLoading(true);
        
        fetch(`/api/list?prefix=${encodeURIComponent(currentPath)}`)
            .then(response => response.json())
            .then(data => {
                renderFileList(data);
                updateBreadcrumb();
                showLoading(false);
            })
            .catch(error => {
                showToast('Error loading files', 'danger');
                console.error('Error loading files:', error);
                showLoading(false);
            });
    }
    
    // Function to render file list
    function renderFileList(data) {
        fileList.innerHTML = '';
        currentFolderDisplay.textContent = currentPath ? `Folder: ${currentPath}` : 'Files & Folders';
        
        // Handle empty folder
        if (data.folders.length === 0 && data.files.length === 0) {
            fileList.innerHTML = `
                <tr>
                    <td colspan="4">
                        <div class="empty-folder-message">
                            <i class="fas fa-folder-open fa-3x mb-3"></i>
                            <p>This folder is empty</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Add parent folder navigation (if not in root)
        if (currentPath) {
            const parentFolder = document.createElement('tr');
            parentFolder.className = 'folder-row';
            parentFolder.innerHTML = `
                <td>
                    <i class="fas fa-arrow-up file-icon"></i>
                    <span>Parent Directory</span>
                </td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
            `;
            parentFolder.addEventListener('click', navigateToParent);
            fileList.appendChild(parentFolder);
        }
        
        // Add folders
        data.folders.forEach(folder => {
            const folderRow = document.createElement('tr');
            folderRow.className = 'folder-row';
            
            // Extract folder name from the path
            const folderName = folder.replace(currentPath, '').replace('/', '');
            
            folderRow.innerHTML = `
                <td>
                    <i class="fas fa-folder file-icon folder-icon"></i>
                    <span>${folderName}</span>
                </td>
                <td>-</td>
                <td>-</td>
                <td>
                    <i class="fas fa-trash action-btn text-danger" title="Delete folder"></i>
                </td>
            `;
            
            // Navigate into folder
            folderRow.addEventListener('click', (e) => {
                if (!e.target.classList.contains('action-btn')) {
                    navigateToFolder(folder);
                }
            });
            
            // Delete folder
            folderRow.querySelector('.fa-trash').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Delete folder "${folderName}" and all its contents?`)) {
                    deleteFolder(folder);
                }
            });
            
            fileList.appendChild(folderRow);
        });
        
        // Add files
        data.files.forEach(file => {
            const fileRow = document.createElement('tr');
            fileRow.className = 'file-row';
            
            // Extract file name from the key
            const fileName = file.key.replace(currentPath, '');
            
            // Format file size
            const formattedSize = formatFileSize(file.size);
            
            // Format date
            const formattedDate = new Date(file.lastModified).toLocaleString();
            
            // Determine file icon
            const fileIconClass = getFileIconClass(fileName);
            
            fileRow.innerHTML = `
                <td>
                    <i class="fas ${fileIconClass} file-icon"></i>
                    <span>${fileName}</span>
                </td>
                <td>${formattedSize}</td>
                <td>${formattedDate}</td>
                <td>
                    <i class="fas fa-download action-btn text-primary" title="Download file"></i>
                    <i class="fas fa-trash action-btn text-danger" title="Delete file"></i>
                </td>
            `;
            
            // Download file
            fileRow.querySelector('.fa-download').addEventListener('click', (e) => {
                e.stopPropagation();
                downloadFile(file.key);
            });
            
            // Delete file
            fileRow.querySelector('.fa-trash').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Delete file "${fileName}"?`)) {
                    deleteFile(file.key);
                }
            });
            
            fileList.appendChild(fileRow);
        });
    }
    
    // Function to update breadcrumb navigation
    function updateBreadcrumb() {
        breadcrumbContainer.innerHTML = '';
        
        // Add home link
        const homeItem = document.createElement('li');
        homeItem.className = 'breadcrumb-item';
        
        if (currentPath === '') {
            homeItem.classList.add('active');
            homeItem.setAttribute('aria-current', 'page');
            homeItem.textContent = 'Home';
        } else {
            const homeLink = document.createElement('a');
            homeLink.href = '#';
            homeLink.textContent = 'Home';
            homeLink.addEventListener('click', (e) => {
                e.preventDefault();
                currentPath = '';
                loadFiles();
            });
            homeItem.appendChild(homeLink);
        }
        
        breadcrumbContainer.appendChild(homeItem);
        
        // Add path segments
        if (currentPath) {
            const segments = currentPath.split('/').filter(Boolean);
            let currentSegmentPath = '';
            
            segments.forEach((segment, index) => {
                currentSegmentPath += segment + '/';
                
                const item = document.createElement('li');
                item.className = 'breadcrumb-item';
                
                if (index === segments.length - 1) {
                    item.classList.add('active');
                    item.setAttribute('aria-current', 'page');
                    item.textContent = segment;
                } else {
                    const link = document.createElement('a');
                    link.href = '#';
                    link.textContent = segment;
                    
                    // Capture the path to navigate to
                    const pathToNavigate = currentSegmentPath;
                    
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        currentPath = pathToNavigate;
                        loadFiles();
                    });
                    
                    item.appendChild(link);
                }
                
                breadcrumbContainer.appendChild(item);
            });
        }
    }
    
    // Function to navigate to a folder
    function navigateToFolder(folderPath) {
        currentPath = folderPath;
        loadFiles();
    }
    
    // Function to navigate to parent folder
    function navigateToParent() {
        // Remove the last folder from the path
        const pathSegments = currentPath.split('/').filter(Boolean);
        pathSegments.pop();
        currentPath = pathSegments.length ? pathSegments.join('/') + '/' : '';
        loadFiles();
    }
    
    // Function to upload files
    function uploadFiles() {
        const files = fileUpload.files;
        
        if (files.length === 0) return;
        
        for (const file of files) {
            uploadFile(file);
        }
        
        // Reset file input
        fileUpload.value = '';
    }
    
    // Function to upload a single file
    function uploadFile(file) {
        // Create a unique ID for toast notification
        const uploadId = 'upload-' + new Date().getTime() + '-' + Math.random().toString(36).substr(2, 9);
        
        // Show upload progress toast
        const toastElement = showProgressToast(file.name, uploadId);
        const progressBar = toastElement.querySelector('.progress-bar');
        
        // Prepare FormData
        const formData = new FormData();
        formData.append('file', file);
        formData.append('prefix', currentPath);
        
        // Upload the file
        fetch('/api/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            // Update progress to 100%
            progressBar.style.width = '100%';
            progressBar.textContent = 'Completed';
            
            // Show success message after a short delay
            setTimeout(() => {
                showToast(`File "${file.name}" uploaded successfully`, 'success');
                
                // Remove the progress toast
                bootstrap.Toast.getInstance(toastElement).hide();
                
                // Reload files
                loadFiles();
            }, 1000);
        })
        .catch(error => {
            console.error('Error uploading file:', error);
            progressBar.classList.remove('bg-primary');
            progressBar.classList.add('bg-danger');
            progressBar.textContent = 'Failed';
            showToast(`Error uploading file "${file.name}"`, 'danger');
        });
    }
    
    // Function to create a folder
    function createFolder() {
        const folderName = folderNameInput.value.trim();
        
        if (!folderName) {
            showToast('Please enter a folder name', 'warning');
            return;
        }
        
        // Add trailing slash to make it a folder in S3
        const fullPath = currentPath + folderName + '/';
        
        fetch('/api/create-folder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: fullPath })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast(`Folder "${folderName}" created successfully`, 'success');
                folderNameInput.value = '';
                createFolderModal.hide();
                loadFiles();
            } else {
                showToast(`Error: ${data.message}`, 'danger');
            }
        })
        .catch(error => {
            console.error('Error creating folder:', error);
            showToast('Error creating folder', 'danger');
        });
    }
    
    // Function to download a file
    function downloadFile(key) {
        window.location.href = `/api/download?key=${encodeURIComponent(key)}`;
    }
    
    // Function to delete a file
    function deleteFile(key) {
        fetch('/api/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ key: key })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('File deleted successfully', 'success');
                loadFiles();
            } else {
                showToast(`Error: ${data.message}`, 'danger');
            }
        })
        .catch(error => {
            console.error('Error deleting file:', error);
            showToast('Error deleting file', 'danger');
        });
    }
    
    // Function to delete a folder
    function deleteFolder(path) {
        fetch('/api/delete-folder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path: path })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('Folder deleted successfully', 'success');
                loadFiles();
            } else {
                showToast(`Error: ${data.message}`, 'danger');
            }
        })
        .catch(error => {
            console.error('Error deleting folder:', error);
            showToast('Error deleting folder', 'danger');
        });
    }
    
    // Function to set up drag and drop
    function setupDragAndDrop() {
        const dropArea = document.body;
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, unhighlight, false);
        });
        
        function highlight() {
            // Create a dropzone if it doesn't exist
            if (!document.querySelector('.dropzone')) {
                const dropzone = document.createElement('div');
                dropzone.className = 'dropzone';
                dropzone.innerHTML = `
                    <i class="fas fa-cloud-upload-alt fa-3x mb-3"></i>
                    <p>Drop files here to upload</p>
                `;
                document.querySelector('.col-md-9').prepend(dropzone);
            }
            
            document.querySelector('.dropzone').classList.add('highlight');
        }
        
        function unhighlight() {
            const dropzone = document.querySelector('.dropzone');
            if (dropzone) {
                dropzone.classList.remove('highlight');
                
                // Remove the dropzone after a short delay
                setTimeout(() => {
                    dropzone.remove();
                }, 300);
            }
        }
        
        dropArea.addEventListener('drop', handleDrop, false);
        
        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            for (const file of files) {
                uploadFile(file);
            }
        }
    }
    
    // Utility function to get file icon class based on file type
    function getFileIconClass(fileName) {
        const extension = fileName.split('.').pop().toLowerCase();
        
        const iconMap = {
            // Images
            'jpg': 'fa-file-image',
            'jpeg': 'fa-file-image',
            'png': 'fa-file-image',
            'gif': 'fa-file-image',
            'svg': 'fa-file-image',
            'webp': 'fa-file-image',
            // Documents
            'doc': 'fa-file-word',
            'docx': 'fa-file-word',
            'xls': 'fa-file-excel',
            'xlsx': 'fa-file-excel',
            'ppt': 'fa-file-powerpoint',
            'pptx': 'fa-file-powerpoint',
            'txt': 'fa-file-alt',
            'pdf': 'fa-file-pdf',
            // Code
            'html': 'fa-file-code',
            'css': 'fa-file-code',
            'js': 'fa-file-code',
            'json': 'fa-file-code',
            'php': 'fa-file-code',
            'py': 'fa-file-code',
            // Archives
            'zip': 'fa-file-archive',
            'rar': 'fa-file-archive',
            'tar': 'fa-file-archive',
            'gz': 'fa-file-archive',
            // Audio
            'mp3': 'fa-file-audio',
            'wav': 'fa-file-audio',
            'ogg': 'fa-file-audio',
            // Video
            'mp4': 'fa-file-video',
            'avi': 'fa-file-video',
            'mov': 'fa-file-video',
            'wmv': 'fa-file-video'
        };
        
        return iconMap[extension] || 'fa-file';
    }
    
    // Utility function to format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Function to show loading spinner
    function showLoading(show) {
        if (show) {
            loadingSpinner.classList.remove('d-none');
        } else {
            loadingSpinner.classList.add('d-none');
        }
    }
    
    // Function to show a toast notification
    function showToast(message, type = 'primary') {
        const toastContainer = document.getElementById('toast-container');
        const toastId = 'toast-' + new Date().getTime();
        
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.setAttribute('id', toastId);
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast, {
            animation: true,
            autohide: true,
            delay: 3000
        });
        
        bsToast.show();
        
        // Remove the toast element when hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
        
        return toast;
    }
    
    // Function to show a progress toast for file uploads
    function showProgressToast(fileName, id) {
        const toastContainer = document.getElementById('toast-container');
        
        const toast = document.createElement('div');
        toast.className = 'toast align-items-center text-white bg-secondary border-0';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.setAttribute('id', id);
        toast.setAttribute('data-bs-autohide', 'false');
        
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    Uploading: ${fileName}
                    <div class="progress upload-progress">
                        <div class="progress-bar" role="progressbar" style="width: 0%"></div>
                    </div>
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        return toast;
    }
});