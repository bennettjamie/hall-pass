/**
 * Photo Extract — Extract student faces and names from MyEd class photo
 * Optimized for MyEd BC export format:
 * - Grid layout (typically 6 columns)
 * - Names ABOVE photos (Last, First format)
 * - Header row at top
 */

const PhotoExtract = {
    extractedStudents: [],
    originalImage: null,
    
    // Grid configuration for MyEd exports (auto-detected)
    config: {
        headerHeight: 0.04,    // Top header is ~4% of image
        nameHeight: 0.035,     // Name text is ~3.5% of cell height  
        photoPadding: 0.05,    // Padding around photo
    },
    
    init() {
        const importBtn = document.getElementById('importClassPhotoBtn');
        const fileInput = document.getElementById('classPhotoInput');
        const closeBtn = document.getElementById('closePhotoPreview');
        const cancelBtn = document.getElementById('cancelPhotoImport');
        const saveBtn = document.getElementById('saveExtractedStudents');
        
        if (importBtn) {
            importBtn.addEventListener('click', () => fileInput.click());
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveStudents());
        }
    },
    
    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.showProcessing('Loading image...');
        
        try {
            const imageData = await this.loadImage(file);
            this.originalImage = imageData;
            
            this.showProcessing('Extracting students...');
            const students = await this.extractStudentsFromGrid(imageData);
            
            this.extractedStudents = students;
            
            this.hideProcessing();
            this.showPreview();
            
        } catch (error) {
            console.error('Photo extraction error:', error);
            this.hideProcessing();
            alert('Failed to process image: ' + error.message);
        }
        
        event.target.value = '';
    },
    
    loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    resolve({
                        dataUrl: e.target.result,
                        width: img.width,
                        height: img.height,
                        image: img
                    });
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    },
    
    // Auto-detect grid dimensions based on image size and typical class layouts
    detectGridSize(width, contentHeight) {
        // Typical cell aspect ratio in MyEd is roughly 1:1.3 (width:height)
        // We'll try common grid sizes and pick the best fit
        
        const cellAspectRatio = 0.75; // width/height of a typical cell
        
        // Common class sizes and their grid layouts
        const commonGrids = [
            { cols: 5, rows: 4 },  // 20 students
            { cols: 5, rows: 5 },  // 25 students
            { cols: 6, rows: 4 },  // 24 students
            { cols: 6, rows: 5 },  // 30 students
            { cols: 6, rows: 6 },  // 36 students
            { cols: 7, rows: 5 },  // 35 students
            { cols: 4, rows: 4 },  // 16 students
            { cols: 4, rows: 5 },  // 20 students
        ];
        
        let bestGrid = { cols: 6, rows: 5 }; // Default
        let bestScore = Infinity;
        
        for (const grid of commonGrids) {
            const cellWidth = width / grid.cols;
            const cellHeight = contentHeight / grid.rows;
            const actualRatio = cellWidth / cellHeight;
            
            // Score based on how close to expected aspect ratio
            const score = Math.abs(actualRatio - cellAspectRatio);
            
            if (score < bestScore) {
                bestScore = score;
                bestGrid = grid;
            }
        }
        
        return bestGrid;
    },
    
    async extractStudentsFromGrid(imageData) {
        const { image, width, height } = imageData;
        const { headerHeight } = this.config;
        
        // Skip header row
        const contentTop = Math.floor(height * headerHeight);
        const contentHeight = height - contentTop;
        
        // Auto-detect grid size based on image aspect ratio and typical class sizes
        const { cols, rows } = this.detectGridSize(width, contentHeight);
        console.log(`Detected grid: ${cols} cols × ${rows} rows`);
        
        // Calculate cell dimensions
        const cellWidth = Math.floor(width / cols);
        const cellHeight = Math.floor(contentHeight / rows);
        
        // MyEd layout: name text is at BOTTOM of cell (below photo)
        // Name area is roughly bottom 15-18% of cell
        const nameAreaHeight = Math.floor(cellHeight * 0.18);
        const photoHeight = cellHeight - nameAreaHeight;
        
        // Create canvas for cropping faces
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Canvas for extracting name regions
        const nameCanvas = document.createElement('canvas');
        const nameCtx = nameCanvas.getContext('2d');
        
        // Also create a canvas for content checking
        const ocrCanvas = document.createElement('canvas');
        ocrCanvas.width = width;
        ocrCanvas.height = height;
        const ocrCtx = ocrCanvas.getContext('2d');
        ocrCtx.drawImage(image, 0, 0);
        
        const students = [];
        
        // Crop size for face (square)
        const cropSize = Math.min(cellWidth * 0.85, photoHeight * 0.85);
        canvas.width = cropSize;
        canvas.height = cropSize;
        
        // Initialize Tesseract worker once for efficiency
        let tesseractWorker = null;
        if (typeof Tesseract !== 'undefined') {
            try {
                this.showProcessing('Initializing OCR...');
                tesseractWorker = await Tesseract.createWorker('eng');
            } catch (e) {
                console.error('Failed to create Tesseract worker:', e);
            }
        }
        
        let processedCells = 0;
        const totalCells = rows * cols;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Calculate cell position (accounting for header)
                const cellX = col * cellWidth;
                const cellY = contentTop + (row * cellHeight);
                
                // Check if this cell has content (not empty/white)
                const hasContent = this.checkCellHasContent(ocrCtx, cellX, cellY, cellWidth, cellHeight);
                
                if (!hasContent) {
                    continue; // Skip empty cells
                }
                
                processedCells++;
                this.showProcessing(`Processing student ${processedCells}...`);
                
                // Photo is in upper portion of cell, centered
                const photoX = cellX + (cellWidth - cropSize) / 2;
                const photoY = cellY + (photoHeight - cropSize) / 2;
                
                // Crop the face
                ctx.clearRect(0, 0, cropSize, cropSize);
                ctx.save();
                
                // Create circular clip
                ctx.beginPath();
                ctx.arc(cropSize / 2, cropSize / 2, cropSize / 2, 0, Math.PI * 2);
                ctx.clip();
                
                // Draw the cropped region
                ctx.drawImage(
                    image,
                    photoX, photoY, cropSize, cropSize,
                    0, 0, cropSize, cropSize
                );
                
                ctx.restore();
                
                // Extract name from this cell's name region (bottom of cell)
                let studentName = null;
                
                if (tesseractWorker) {
                    try {
                        // Extract the name region for this cell
                        const nameX = cellX;
                        const nameY = cellY + photoHeight; // Name is below photo
                        const nameW = cellWidth;
                        const nameH = nameAreaHeight;
                        
                        // Draw name region to temp canvas with preprocessing
                        nameCanvas.width = nameW * 2; // Scale up for better OCR
                        nameCanvas.height = nameH * 2;
                        nameCtx.fillStyle = 'white';
                        nameCtx.fillRect(0, 0, nameCanvas.width, nameCanvas.height);
                        nameCtx.drawImage(
                            image,
                            nameX, nameY, nameW, nameH,
                            0, 0, nameW * 2, nameH * 2
                        );
                        
                        // Run OCR on just this name region
                        const result = await tesseractWorker.recognize(nameCanvas);
                        const text = result.data.text.trim();
                        
                        if (text) {
                            studentName = this.parseNameFromText(text);
                            console.log(`Cell [${row},${col}] OCR: "${text}" -> `, studentName);
                        }
                    } catch (e) {
                        console.error(`OCR failed for cell [${row},${col}]:`, e);
                    }
                }
                
                // Mark WITHDRAWN students but keep them in layout
                const isWithdrawn = studentName && studentName.isWithdrawn;
                
                // If withdrawn, draw overlay text
                if (isWithdrawn) {
                    ctx.save();
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
                    ctx.font = `bold ${Math.floor(cropSize / 6)}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    // Rotate text diagonally
                    ctx.translate(cropSize / 2, cropSize / 2);
                    ctx.rotate(-Math.PI / 6);
                    ctx.fillText('WITHDRAWN', 0, 0);
                    ctx.restore();
                }
                
                const faceDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                
                if (!studentName) {
                    studentName = {
                        firstName: `Student`,
                        lastName: `${students.length + 1}`,
                        lastInitial: `${students.length + 1}`,
                        displayName: `Student ${students.length + 1}`
                    };
                }
                
                students.push({
                    id: `extracted-${Date.now()}-${students.length}`,
                    firstName: isWithdrawn ? 'WITHDRAWN' : studentName.firstName,
                    lastName: studentName.lastName || '',
                    lastInitial: studentName.lastInitial || '?',
                    displayName: isWithdrawn ? 'WITHDRAWN' : studentName.displayName,
                    caricature: faceDataUrl,
                    gridPosition: { row, col },
                    isWithdrawn: isWithdrawn
                });
            }
        }
        
        // Cleanup Tesseract worker
        if (tesseractWorker) {
            await tesseractWorker.terminate();
        }
        
        return students;
    },
    
    // Parse a single name from OCR text
    parseNameFromText(text) {
        // Clean up the text
        const cleaned = text.replace(/[^\w\s,\-']/g, '').trim();
        
        // Check for WITHDRAWN
        const isWithdrawn = cleaned.toUpperCase().includes('WITHDRAWN');
        
        // Try "Last, First" format first
        const commaMatch = cleaned.match(/^([A-Za-z\-']+),?\s+([A-Za-z\-']+)/);
        
        if (commaMatch) {
            const lastName = commaMatch[1].trim();
            const firstName = commaMatch[2].trim();
            
            if (firstName.length >= 2 && lastName.length >= 2) {
                const lastInitial = lastName.charAt(0).toUpperCase();
                return {
                    firstName,
                    lastName,
                    lastInitial,
                    displayName: `${firstName} ${lastInitial}.`,
                    isWithdrawn
                };
            }
        }
        
        // Try "First Last" format
        const spaceMatch = cleaned.match(/^([A-Za-z\-']+)\s+([A-Za-z\-']+)/);
        
        if (spaceMatch) {
            const firstName = spaceMatch[1].trim();
            const lastName = spaceMatch[2].trim();
            
            if (firstName.length >= 2 && lastName.length >= 2) {
                const lastInitial = lastName.charAt(0).toUpperCase();
                return {
                    firstName,
                    lastName,
                    lastInitial,
                    displayName: `${firstName} ${lastInitial}.`,
                    isWithdrawn
                };
            }
        }
        
        return null;
    },
    
    // Check if a cell has actual content (not empty)
    checkCellHasContent(ctx, x, y, width, height) {
        try {
            const imageData = ctx.getImageData(
                Math.floor(x + width * 0.3),
                Math.floor(y + height * 0.3),
                Math.floor(width * 0.4),
                Math.floor(height * 0.4)
            );
            
            const data = imageData.data;
            let nonWhitePixels = 0;
            
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // Check if pixel is not white/light gray
                if (r < 240 || g < 240 || b < 240) {
                    nonWhitePixels++;
                }
            }
            
            // If more than 10% non-white pixels, has content
            return nonWhitePixels > (data.length / 4) * 0.1;
        } catch (e) {
            return true; // Assume has content if can't check
        }
    },
    
    // Parse names from OCR text (MyEd format: "Last, First")
    parseNamesFromOCR(text) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const names = [];
        
        for (const line of lines) {
            // Skip header/metadata lines
            if (line.includes('Schedule') || line.includes('Term') || 
                line.includes('EDUCATION') || line.includes('MCLE') ||
                line.includes('P1') || line.includes('P2') ||
                line.match(/^S\d/) || line.match(/^\d+$/)) {
                continue;
            }
            
            // Check for WITHDRAWN
            const isWithdrawn = line.toUpperCase().includes('WITHDRAWN');
            
            // Match "Last, First" pattern
            const commaMatch = line.match(/^([A-Za-z\-']+),?\s+([A-Za-z\-']+)/);
            
            if (commaMatch) {
                let lastName = commaMatch[1].trim();
                let firstName = commaMatch[2].trim();
                
                // Handle hyphenated names that might span lines
                if (firstName.length < 2) continue;
                
                const lastInitial = lastName.charAt(0).toUpperCase();
                
                names.push({
                    firstName,
                    lastName,
                    lastInitial,
                    displayName: `${firstName} ${lastInitial}.`,
                    isWithdrawn
                });
            }
        }
        
        return names;
    },
    
    showProcessing(text) {
        const status = document.getElementById('photoProcessingStatus');
        const textEl = document.getElementById('processingText');
        if (status) {
            status.style.display = 'flex';
            if (textEl) textEl.textContent = text;
        }
    },
    
    hideProcessing() {
        const status = document.getElementById('photoProcessingStatus');
        if (status) status.style.display = 'none';
    },
    
    showPreview() {
        const modal = document.getElementById('photoPreviewModal');
        const grid = document.getElementById('extractedStudentsGrid');
        
        if (!modal || !grid) return;
        
        grid.innerHTML = this.extractedStudents.map((student, index) => `
            <div class="extracted-student-card" data-index="${index}">
                <img src="${student.caricature}" alt="${student.displayName}">
                <input type="text" value="${student.displayName}" 
                       data-field="displayName" 
                       placeholder="First L.">
                <button class="remove-btn" onclick="PhotoExtract.removeStudent(${index})">✕ Remove</button>
            </div>
        `).join('');
        
        grid.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.closest('.extracted-student-card').dataset.index);
                this.updateStudentName(index, e.target.value);
            });
        });
        
        modal.classList.add('active');
    },
    
    closeModal() {
        const modal = document.getElementById('photoPreviewModal');
        if (modal) modal.classList.remove('active');
        this.extractedStudents = [];
    },
    
    updateStudentName(index, displayName) {
        if (this.extractedStudents[index]) {
            const parts = displayName.trim().split(/\s+/);
            const firstName = parts[0] || 'Student';
            const lastInitial = parts.length > 1 ? parts[parts.length - 1].replace('.', '')[0] : '?';
            
            this.extractedStudents[index].firstName = firstName;
            this.extractedStudents[index].lastInitial = lastInitial.toUpperCase();
            this.extractedStudents[index].displayName = `${firstName} ${lastInitial}.`;
        }
    },
    
    removeStudent(index) {
        this.extractedStudents.splice(index, 1);
        this.showPreview();
    },
    
    async saveStudents() {
        if (this.extractedStudents.length === 0) {
            alert('No students to save!');
            return;
        }
        
        try {
            const confirmClear = confirm(
                `This will add ${this.extractedStudents.length} students. ` +
                `Clear existing students first?`
            );
            
            if (confirmClear) {
                await DB.clearStudents();
            }
            
            for (const student of this.extractedStudents) {
                await DB.addStudent({
                    displayName: student.displayName,
                    firstName: student.firstName,
                    lastInitial: student.lastInitial,
                    caricature: student.caricature,
                    sortKey: `${student.lastInitial.toLowerCase()}_${student.firstName.toLowerCase()}`
                });
            }
            
            state.students = await DB.getStudents();
            renderGrid();
            updateStats();
            
            this.closeModal();
            
            alert(`Imported ${this.extractedStudents.length} students!`);
            
        } catch (error) {
            console.error('Failed to save:', error);
            alert('Failed to save: ' + error.message);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    PhotoExtract.init();
});
