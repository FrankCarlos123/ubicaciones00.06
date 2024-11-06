async function searchProductImage(code) {
    try {
        // Primero intentamos buscar en Google
        const searchUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.google.com/search?q=${code}&tbm=isch`)}`;
        
        const response = await fetch(searchUrl);
        const html = await response.text();
        
        // Buscar URLs de imágenes en el HTML
        const imgRegex = /"(https?:\/\/[^"]+\.(?:jpg|jpeg|png))"/gi;
        const matches = [...html.matchAll(imgRegex)];
        
        if (matches.length > 0) {
            // Filtrar URLs que parecen ser de productos
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
            
            // Primero agregamos la imagen si existe
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
            
            // Luego agregamos el QR
            const qrDiv = document.createElement('div');
            new QRCode(qrDiv, {
                text: itemCode,
                width: 256,
                height: 256
            });
            itemContainer.appendChild(qrDiv);
            
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