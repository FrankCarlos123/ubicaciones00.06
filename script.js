let folders = {};
let currentFolder = null;
let rotationInterval = null;
let scanner = null;
let scannerMode = 'add'; // 'add' o 'createFolder'

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    renderFolders();
});

// Gestión de datos
function loadData() {
    const savedData = localStorage.getItem('folders');
    if (savedData) {
        folders = JSON.parse(savedData);
    }
}

function saveData() {
    localStorage.setItem('folders', JSON.stringify(folders));
}

// Renderizado de carpetas
function renderFolders() {
    const grid = document.getElementById('qrGrid');
    grid.innerHTML = '';
    
    Object.keys(folders).forEach(folderId => {
        const div = document.createElement('div');
        div.className = 'qr-item';
        div.onclick = () => openFolder(folderId);
        
        // Agregar botón de eliminar
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if(confirm('¿Estás seguro de que deseas eliminar esta carpeta?')) {
                deleteFolder(folderId);
            }
        };
        
        const qrDiv = document.createElement('div');
        new QRCode(qrDiv, {
            text: folderId,
            width: 128,
            height: 128
        });
        
        const label = document.createElement('div');
        label.className = 'qr-label';
        label.textContent = folderId;
        
        div.appendChild(deleteBtn);
        div.appendChild(qrDiv);
        div.appendChild(label);
        grid.appendChild(div);
    });
}

function deleteFolder(folderId) {
    delete folders[folderId];
    saveData();
    renderFolders();
}

function openFolder(folderId) {
    currentFolder = folderId;
    document.getElementById('mainView').classList.add('hidden');
    document.getElementById('folderView').classList.remove('hidden');
    document.getElementById('viewTitle').textContent = 'Ventana dentro de carpeta';
    startRotation();
}

async function searchProductImage(code) {
    try {
        const searchUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.google.com/search?q=${code}&tbm=isch`)}`;
        
        const response = await fetch(searchUrl);
        const html = await response.text();
        
        const imgRegex = /"(https?:\/\/[^"]+\.(?:jpg|jpeg|png))"/gi;
        const matches = [...html.matchAll(imgRegex)];
        
        if (matches.length > 0) {
            const validUrls = matches
                .map(match => match[1])
                .filter(url => !url.includes('gstatic') && !url.includes('google'));
            
            if (validUrls.length > 0) {
                return {
                    imageUrl: validUrls[0],
                    title: code
                };
            }
        }
        throw new Error('No se encontraron imágenes');
    } catch (error) {
        console.error('Error en la búsqueda de imagen:', error);
        throw error;
    }
}

function startScanner() {
    document.getElementById('scannerView').classList.remove('hidden');
    
    if (scanner) {
        stopScanner();
    }
    
    scanner = new Html5QrcodeScanner("reader", {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    });
    
    scanner.render(handleScanSuccess, handleScanError);
}

async function handleScanSuccess(decodedText) {
    if (scannerMode === 'createFolder') {
        if (folders[decodedText]) {
            alert('Esta carpeta ya existe');
        } else {
            folders[decodedText] = {
                items: []
            };
            saveData();
            renderFolders();
        }
    } else {
        const exists = folders[currentFolder].items.some(item => 
            typeof item === 'object' ? item.code === decodedText : item === decodedText
        );

        if (!exists) {
            try {
                console.log('Buscando imagen para:', decodedText);
                const searchResult = await searchProductImage(decodedText);
                
                folders[currentFolder].items.push({
                    code: decodedText,
                    imageUrl: searchResult.imageUrl,
                    title: searchResult.title
                });
                
                console.log('Imagen encontrada:', searchResult.imageUrl);
                
                saveData();
                stopRotation();
                startRotation();
            } catch (error) {
                console.error('Error al buscar la imagen:', error);
                folders[currentFolder].items.push({
                    code: decodedText,
                    imageUrl: '',
                    title: decodedText
                });
                saveData();
                stopRotation();
                startRotation();
            }
        }
    }
    stopScanner();
}

function handleScanError(error) {
    if (error?.name === 'NotAllowedError') {
        alert('No se pudo acceder a la cámara. Por favor, permite el acceso.');
        stopScanner();
    }
}

function stopScanner() {
    if (scanner) {
        scanner.clear().catch(error => {
            console.error('Error al detener el scanner:', error);
        }).finally(() => {
            scanner = null;
            document.getElementById('scannerView').classList.add('hidden');
            scannerMode = 'add';
        });
    } else {
        document.getElementById('scannerView').classList.add('hidden');
        scannerMode = 'add';
    }
}

function startRotation() {
    stopRotation();
    
    const folder = folders[currentFolder];
    let currentIndex = -1;
    const qrDisplay = document.getElementById('qrDisplay');
    
    async function showNext() {
        if (!folder.items.length) {
            qrDisplay.innerHTML = '';
            const itemContainer = document.createElement('div');
            itemContainer.className = 'item-container';
            
            new QRCode(itemContainer, {
                text: currentFolder,
                width: 256,
                height: 256
            });
            
            const label = document.createElement('div');
            label.className = 'qr-label';
            label.textContent = currentFolder;
            itemContainer.appendChild(label);
            
            qrDisplay.appendChild(itemContainer);
            return;
        }
        
        currentIndex = (currentIndex + 1) % (folder.items.length * 2);
        qrDisplay.innerHTML = '';
        
        if (currentIndex % 2 === 0) {
            const itemContainer = document.createElement('div');
            itemContainer.className = 'item-container';
            
            new QRCode(itemContainer, {
                text: currentFolder,
                width: 256,
                height: 256
            });
            
            const label = document.createElement('div');
            label.className = 'qr-label';
            label.textContent = currentFolder;
            itemContainer.appendChild(label);
            
            qrDisplay.appendChild(itemContainer);
        } else {
            const itemIndex = Math.floor(currentIndex / 2);
            const item = folder.items[itemIndex];
            const itemCode = typeof item === 'object' ? item.code : item;
            
            const itemContainer = document.createElement('div');
            itemContainer.className = 'item-container';
            
            if (item.imageUrl) {
                const productImage = document.createElement('img');
                productImage.className = 'product-image';
                productImage.src = item.imageUrl;
                productImage.alt = item.title || itemCode;
                productImage.onerror = () => {
                    productImage.style.display = 'none';
                };
                itemContainer.appendChild(productImage);
            }
            
            new QRCode(itemContainer, {
                text: itemCode,
                width: 256,
                height: 256
            });
            
            const label = document.createElement('div');
            label.className = 'qr-label';
            label.textContent = item.title || itemCode;
            itemContainer.appendChild(label);
            
            qrDisplay.appendChild(itemContainer);
        }
    }
    
    showNext();
    rotationInterval = setInterval(showNext, 3000);
}

function stopRotation() {
    if (rotationInterval) {
        clearInterval(rotationInterval);
        rotationInterval = null;
    }
}

function backToMain() {
    currentFolder = null;
    stopRotation();
    document.getElementById('folderView').classList.add('hidden');
    document.getElementById('mainView').classList.remove('hidden');
    document.getElementById('viewTitle').textContent = 'Ventana Principal';
}

// Event Listeners
window.addEventListener('beforeunload', () => {
    stopRotation();
    stopScanner();
});
