/**
 * Photo Extract — Extract student faces and names from class photo
 * Uses Tesseract.js for OCR to get names
 * Grid-based face extraction
 */

const PhotoExtract = {
    // Store extracted data
    extractedStudents: [],
    originalImage: null,
    
    // Initialize photo extraction
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
    
    // Handle file selection
    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Show processing status
        this.showProcessing('Loading image...');
        
        try {
            // Load image
            const imageData = await this.loadImage(file);
            this.originalImage = imageData;
            
            // Run OCR to extract names
            this.showProcessing('Extracting names with OCR...');
            const names = await this.extractNames(imageData);
            
            // Detect grid and create face crops
            this.showProcessing('Detecting faces...');
            const students = await this.createStudentGrid(imageData, names);
            
            this.extractedStudents = students;
            
            // Hide processing, show preview
            this.hideProcessing();
            this.showPreview();
            
        } catch (error) {
            console.error('Photo extraction error:', error);
            this.hideProcessing();
            alert('Failed to process image: ' + error.message);
        }
        
        // Reset file input
        event.target.value = '';
    },
    
    // Load image as data URL and get dimensions
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
    
    // Extract names using Tesseract OCR
    async extractNames(imageData) {
        if (typeof Tesseract === 'undefined') {
            console.warn('Tesseract not loaded, using manual entry');
            return [];
        }
        
        try {
            const result = await Tesseract.recognize(
                imageData.dataUrl,
                'eng',
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            this.showProcessing(`OCR: ${Math.round(m.progress * 100)}%`);
                        }
                    }
                }
            );
            
            // Parse names from OCR result
            const text = result.data.text;
            const names = this.parseNames(text);
            
            console.log('OCR extracted names:', names);
            return names;
            
        } catch (error) {
            console.error('OCR failed:', error);
            return [];
        }
    },
    
    // Parse names from OCR text
    parseNames(text) {
        // Split by newlines and filter
        const lines = text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        const names = [];
        
        for (const line of lines) {
            // Look for name patterns: "First Last" or "First L" or "First L."
            // Common patterns in class rosters
            const namePattern = /^([A-Z][a-z]+)\s+([A-Z]\.?|[A-Z][a-z]+)$/i;
            const match = line.match(namePattern);
            
            if (match) {
                let firstName = match[1];
                let lastInitial = match[2].replace('.', '');
                
                // If last part is a full name, just take first letter
                if (lastInitial.length > 1) {
                    lastInitial = lastInitial[0].toUpperCase();
                }
                
                names.push({
                    firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase(),
                    lastInitial: lastInitial.toUpperCase(),
                    displayName: `${firstName} ${lastInitial}.`
                });
            } else {
                // Try to parse as single name parts
                const words = line.split(/\s+/).filter(w => w.length > 1);
                if (words.length >= 1) {
                    const firstName = words[0];
                    const lastInitial = words.length > 1 ? words[words.length - 1][0] : '?';
                    
                    // Only add if looks like a name (starts with capital)
                    if (/^[A-Z]/.test(firstName)) {
                        names.push({
                            firstName: firstName,
                            lastInitial: lastInitial.toUpperCase(),
                            displayName: `${firstName} ${lastInitial}.`
                        });
                    }
                }
            }
        }
        
        // Remove duplicates
        const seen = new Set();
        return names.filter(n => {
            const key = n.displayName.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    },
    
    // Create student grid by dividing image
    async createStudentGrid(imageData, names) {
        const students = [];
        const { image, width, height } = imageData;
        
        // Try to detect grid dimensions from names count
        const nameCount = names.length || 20; // Default to 20 if no names
        
        // Common class sizes: 20-35 students
        // Try to find a reasonable grid
        let cols, rows;
        
        if (nameCount <= 16) {
            cols = 4; rows = 4;
        } else if (nameCount <= 20) {
            cols = 5; rows = 4;
        } else if (nameCount <= 25) {
            cols = 5; rows = 5;
        } else if (nameCount <= 30) {
            cols = 6; rows = 5;
        } else {
            cols = 6; rows = 6;
        }
        
        // Calculate cell dimensions
        const cellWidth = Math.floor(width / cols);
        const cellHeight = Math.floor(height / rows);
        
        // Create canvas for cropping
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Crop size for face (square, upper portion of cell)
        const cropSize = Math.min(cellWidth, cellHeight) * 0.7;
        canvas.width = cropSize;
        canvas.height = cropSize;
        
        let nameIndex = 0;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Calculate cell position
                const x = col * cellWidth;
                const y = row * cellHeight;
                
                // Crop face from upper-center of cell
                const cropX = x + (cellWidth - cropSize) / 2;
                const cropY = y + cellHeight * 0.05; // Start near top
                
                // Draw cropped region
                ctx.clearRect(0, 0, cropSize, cropSize);
                ctx.drawImage(
                    image,
                    cropX, cropY, cropSize, cropSize, // Source
                    0, 0, cropSize, cropSize // Destination
                );
                
                // Get data URL for this face
                const faceDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                
                // Assign name
                const name = names[nameIndex] || {
                    firstName: `Student`,
                    lastInitial: String(nameIndex + 1),
                    displayName: `Student ${nameIndex + 1}`
                };
                
                students.push({
                    id: `extracted-${Date.now()}-${nameIndex}`,
                    ...name,
                    caricature: faceDataUrl,
                    gridPosition: { row, col }
                });
                
                nameIndex++;
                
                // Stop if we have enough students
                if (nameIndex >= Math.max(names.length, rows * cols)) {
                    break;
                }
            }
            if (nameIndex >= Math.max(names.length, rows * cols)) {
                break;
            }
        }
        
        return students;
    },
    
    // Show processing status
    showProcessing(text) {
        const status = document.getElementById('photoProcessingStatus');
        const textEl = document.getElementById('processingText');
        if (status) {
            status.style.display = 'flex';
            if (textEl) textEl.textContent = text;
        }
    },
    
    // Hide processing status
    hideProcessing() {
        const status = document.getElementById('photoProcessingStatus');
        if (status) {
            status.style.display = 'none';
        }
    },
    
    // Show preview modal
    showPreview() {
        const modal = document.getElementById('photoPreviewModal');
        const grid = document.getElementById('extractedStudentsGrid');
        
        if (!modal || !grid) return;
        
        // Render extracted students
        grid.innerHTML = this.extractedStudents.map((student, index) => `
            <div class="extracted-student-card" data-index="${index}">
                <img src="${student.caricature}" alt="${student.displayName}">
                <input type="text" value="${student.displayName}" 
                       data-field="displayName" 
                       placeholder="First Name L.">
                <button class="remove-btn" onclick="PhotoExtract.removeStudent(${index})">✕ Remove</button>
            </div>
        `).join('');
        
        // Add input change listeners
        grid.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.closest('.extracted-student-card').dataset.index);
                this.updateStudentName(index, e.target.value);
            });
        });
        
        modal.classList.add('active');
    },
    
    // Close modal
    closeModal() {
        const modal = document.getElementById('photoPreviewModal');
        if (modal) {
            modal.classList.remove('active');
        }
        this.extractedStudents = [];
    },
    
    // Update student name
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
    
    // Remove student from list
    removeStudent(index) {
        this.extractedStudents.splice(index, 1);
        this.showPreview(); // Re-render
    },
    
    // Save students to database
    async saveStudents() {
        if (this.extractedStudents.length === 0) {
            alert('No students to save!');
            return;
        }
        
        try {
            // Clear existing students (optional - could merge instead)
            const confirmClear = confirm(
                `This will add ${this.extractedStudents.length} students. ` +
                `Do you want to clear existing students first?`
            );
            
            if (confirmClear) {
                await DB.clearStudents();
            }
            
            // Add each student
            for (const student of this.extractedStudents) {
                await DB.addStudent({
                    displayName: student.displayName,
                    firstName: student.firstName,
                    lastInitial: student.lastInitial,
                    caricature: student.caricature,
                    sortKey: `${student.lastInitial.toLowerCase()}_${student.firstName.toLowerCase()}`
                });
            }
            
            // Refresh the app
            state.students = await DB.getStudents();
            renderGrid();
            updateStats();
            
            // Close modal
            this.closeModal();
            
            alert(`Successfully imported ${this.extractedStudents.length} students!`);
            
        } catch (error) {
            console.error('Failed to save students:', error);
            alert('Failed to save students: ' + error.message);
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    PhotoExtract.init();
});
