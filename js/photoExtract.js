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
    
    // Grid configuration for MyEd exports
    config: {
        cols: 6,
        rows: 5,
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
    
    async extractStudentsFromGrid(imageData) {
        const { image, width, height } = imageData;
        const { cols, rows, headerHeight, nameHeight, photoPadding } = this.config;
        
        // Skip header row
        const contentTop = Math.floor(height * headerHeight);
        const contentHeight = height - contentTop;
        
        // Calculate cell dimensions
        const cellWidth = Math.floor(width / cols);
        const cellHeight = Math.floor(contentHeight / rows);
        
        // Name area is at top of each cell
        const nameAreaHeight = Math.floor(cellHeight * nameHeight);
        
        // Photo area starts after name
        const photoTop = nameAreaHeight;
        const photoHeight = cellHeight - nameAreaHeight;
        
        // Create canvas for cropping
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Also create a canvas for OCR on the full image
        const ocrCanvas = document.createElement('canvas');
        ocrCanvas.width = width;
        ocrCanvas.height = height;
        const ocrCtx = ocrCanvas.getContext('2d');
        ocrCtx.drawImage(image, 0, 0);
        
        // Run OCR on the full image to get names
        let names = [];
        if (typeof Tesseract !== 'undefined') {
            try {
                this.showProcessing('Running OCR...');
                const result = await Tesseract.recognize(imageData.dataUrl, 'eng', {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            this.showProcessing(`OCR: ${Math.round(m.progress * 100)}%`);
                        }
                    }
                });
                names = this.parseNamesFromOCR(result.data.text);
                console.log('OCR found names:', names);
            } catch (e) {
                console.error('OCR failed:', e);
            }
        }
        
        const students = [];
        let nameIndex = 0;
        
        // Crop size for face (square)
        const cropSize = Math.min(cellWidth * 0.85, photoHeight * 0.9);
        canvas.width = cropSize;
        canvas.height = cropSize;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Calculate cell position (accounting for header)
                const cellX = col * cellWidth;
                const cellY = contentTop + (row * cellHeight);
                
                // Photo is in lower portion of cell, centered
                const photoX = cellX + (cellWidth - cropSize) / 2;
                const photoY = cellY + photoTop + (photoHeight - cropSize) / 2;
                
                // Check if this cell has content (not empty/white)
                const hasContent = this.checkCellHasContent(ocrCtx, cellX, cellY, cellWidth, cellHeight);
                
                if (!hasContent) {
                    continue; // Skip empty cells
                }
                
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
                
                const faceDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                
                // Get name from OCR results or use placeholder
                let studentName = names[nameIndex] || null;
                
                // Skip WITHDRAWN students
                if (studentName && studentName.isWithdrawn) {
                    nameIndex++;
                    continue;
                }
                
                if (!studentName) {
                    studentName = {
                        firstName: `Student`,
                        lastName: `${nameIndex + 1}`,
                        lastInitial: `${nameIndex + 1}`,
                        displayName: `Student ${nameIndex + 1}`
                    };
                }
                
                students.push({
                    id: `extracted-${Date.now()}-${students.length}`,
                    firstName: studentName.firstName,
                    lastName: studentName.lastName,
                    lastInitial: studentName.lastInitial,
                    displayName: studentName.displayName,
                    caricature: faceDataUrl,
                    gridPosition: { row, col }
                });
                
                nameIndex++;
            }
        }
        
        return students;
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
