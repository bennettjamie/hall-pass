/**
 * Photo Extract v2 — User-Assisted Grid Extraction
 * 
 * Flow:
 * 1. User uploads class photo
 * 2. User sets grid dimensions (rows × cols)
 * 3. User can adjust crop area by dragging corners
 * 4. Faces extracted based on user-defined grid
 * 5. User pastes names OR types them manually
 */

const PhotoExtract = {
    originalImage: null,
    extractedStudents: [],
    
    // Grid settings (user-configurable)
    gridConfig: {
        cols: 5,
        rows: 4,
        // Crop area as percentages (0-1)
        cropTop: 0.08,      // Skip header (start lower)
        cropBottom: 0.98,
        cropLeft: 0.01,
        cropRight: 0.99,
    },
    
    init() {
        const importBtn = document.getElementById('importClassPhotoBtn');
        const fileInput = document.getElementById('classPhotoInput');
        
        if (importBtn) {
            importBtn.addEventListener('click', () => fileInput.click());
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
    },
    
    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const imageData = await this.loadImage(file);
            this.originalImage = imageData;
            this.showGridSetup();
        } catch (error) {
            console.error('Failed to load image:', error);
            alert('Failed to load image: ' + error.message);
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
    
    showGridSetup() {
        // Create or get the setup modal
        let modal = document.getElementById('gridSetupModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'gridSetupModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        
        modal.innerHTML = `
            <div class="modal-content modal-xlarge">
                <div class="modal-header">
                    <h2>📐 Step 1: Define Grid</h2>
                    <button class="modal-close" onclick="PhotoExtract.closeSetup()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="grid-setup-container">
                        <div class="grid-controls">
                            <div class="control-group">
                                <label>Columns (students per row)</label>
                                <select id="gridCols" onchange="PhotoExtract.updatePreview()">
                                    ${[3,4,5,6,7,8].map(n => 
                                        `<option value="${n}" ${n === this.gridConfig.cols ? 'selected' : ''}>${n}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="control-group">
                                <label>Rows</label>
                                <select id="gridRows" onchange="PhotoExtract.updatePreview()">
                                    ${[2,3,4,5,6,7,8].map(n => 
                                        `<option value="${n}" ${n === this.gridConfig.rows ? 'selected' : ''}>${n}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="control-group">
                                <label>Total students: <strong id="totalStudents">${this.gridConfig.cols * this.gridConfig.rows}</strong></label>
                            </div>
                            <hr>
                            <div class="control-group">
                                <label>Adjust crop area (skip headers/margins)</label>
                                <div class="crop-sliders">
                                    <label>Top: <input type="range" id="cropTop" min="0" max="40" value="${this.gridConfig.cropTop * 100}" oninput="PhotoExtract.updatePreview()">
                                    <span id="cropTopVal">${Math.round(this.gridConfig.cropTop * 100)}%</span></label>
                                    <label>Bottom: <input type="range" id="cropBottom" min="60" max="100" value="${this.gridConfig.cropBottom * 100}" oninput="PhotoExtract.updatePreview()">
                                    <span id="cropBottomVal">${Math.round(this.gridConfig.cropBottom * 100)}%</span></label>
                                    <label>Left: <input type="range" id="cropLeft" min="0" max="20" value="${this.gridConfig.cropLeft * 100}" oninput="PhotoExtract.updatePreview()">
                                    <span id="cropLeftVal">${Math.round(this.gridConfig.cropLeft * 100)}%</span></label>
                                    <label>Right: <input type="range" id="cropRight" min="80" max="100" value="${this.gridConfig.cropRight * 100}" oninput="PhotoExtract.updatePreview()">
                                    <span id="cropRightVal">${Math.round(this.gridConfig.cropRight * 100)}%</span></label>
                                </div>
                            </div>
                        </div>
                        <div class="grid-preview-container">
                            <p class="help-text">Grid preview — adjust until boxes align with faces</p>
                            <div class="grid-preview" id="gridPreview">
                                <img id="previewImage" src="${this.originalImage.dataUrl}" alt="Class photo">
                                <div class="grid-overlay" id="gridOverlay"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="secondary-btn" onclick="PhotoExtract.closeSetup()">Cancel</button>
                    <button class="primary-btn" onclick="PhotoExtract.extractFaces()">Extract Faces →</button>
                </div>
            </div>
        `;
        
        // Add styles if not present
        this.addStyles();
        
        modal.classList.add('active');
        this.updatePreview();
    },
    
    addStyles() {
        if (document.getElementById('photoExtractStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'photoExtractStyles';
        style.textContent = `
            .modal-xlarge .modal-content { max-width: 1000px; }
            .modal-xlarge { max-width: 95vw; }
            
            .grid-setup-container {
                display: flex;
                gap: 2rem;
            }
            
            .grid-controls {
                min-width: 200px;
            }
            
            .control-group {
                margin-bottom: 1rem;
            }
            
            .control-group label {
                display: block;
                margin-bottom: 0.5rem;
                font-weight: 500;
            }
            
            .control-group select {
                width: 100%;
                padding: 0.5rem;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 1rem;
            }
            
            .crop-sliders label {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 0.5rem;
            }
            
            .crop-sliders input[type="range"] {
                flex: 1;
            }
            
            .grid-preview-container {
                flex: 1;
                min-width: 0;
            }
            
            .grid-preview {
                position: relative;
                border: 2px solid #ddd;
                border-radius: 8px;
                overflow: hidden;
                background: #f5f5f5;
            }
            
            .grid-preview img {
                width: 100%;
                height: auto;
                display: block;
            }
            
            .grid-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                pointer-events: none;
            }
            
            .grid-cell {
                position: absolute;
                border: 2px solid rgba(99, 102, 241, 0.7);
                background: rgba(99, 102, 241, 0.1);
                box-sizing: border-box;
            }
            
            .grid-cell-number {
                position: absolute;
                top: 2px;
                left: 4px;
                background: rgba(99, 102, 241, 0.9);
                color: white;
                font-size: 10px;
                padding: 1px 4px;
                border-radius: 3px;
            }
            
            .grid-cell-adjustable {
                border-color: rgba(255, 100, 100, 0.9);
                border-width: 3px;
                background: rgba(255, 100, 100, 0.15);
            }
            
            .cell-resize-handle {
                position: absolute;
                bottom: -6px;
                right: -6px;
                width: 14px;
                height: 14px;
                background: #ff6464;
                border: 2px solid white;
                border-radius: 3px;
                cursor: nwse-resize;
                pointer-events: auto;
                z-index: 10;
            }
            
            .cell-resize-handle:hover {
                background: #ff4444;
                transform: scale(1.2);
            }
            
            .crop-area {
                position: absolute;
                border: 3px dashed rgba(255, 100, 100, 0.8);
                background: rgba(255, 100, 100, 0.05);
            }
            
            /* Names input modal */
            .names-input-container {
                display: flex;
                gap: 2rem;
            }
            
            .names-input-left {
                flex: 1;
            }
            
            .names-input-right {
                flex: 1;
                max-height: 500px;
                overflow-y: auto;
            }
            
            .names-textarea {
                width: 100%;
                height: 300px;
                font-family: monospace;
                font-size: 14px;
                padding: 1rem;
                border: 1px solid #ddd;
                border-radius: 8px;
                resize: vertical;
            }
            
            .extracted-face {
                display: inline-flex;
                flex-direction: column;
                align-items: center;
                margin: 0.5rem;
                width: 100px;
            }
            
            .extracted-face img {
                width: 70px;
                height: 70px;
                border-radius: 50%;
                object-fit: cover;
                border: 2px solid #ddd;
            }
            
            .extracted-face input {
                width: 100%;
                text-align: center;
                margin-top: 0.5rem;
                padding: 0.25rem;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 12px;
            }
            
            .extracted-face .face-number {
                font-size: 10px;
                color: #666;
            }
        `;
        document.head.appendChild(style);
    },
    
    updatePreview() {
        const cols = parseInt(document.getElementById('gridCols').value);
        const rows = parseInt(document.getElementById('gridRows').value);
        const cropTop = parseInt(document.getElementById('cropTop').value) / 100;
        const cropBottom = parseInt(document.getElementById('cropBottom').value) / 100;
        const cropLeft = parseInt(document.getElementById('cropLeft')?.value || this.gridConfig.cropLeft * 100) / 100;
        const cropRight = parseInt(document.getElementById('cropRight')?.value || this.gridConfig.cropRight * 100) / 100;
        
        // Update config
        this.gridConfig.cols = cols;
        this.gridConfig.rows = rows;
        this.gridConfig.cropTop = cropTop;
        this.gridConfig.cropBottom = cropBottom;
        this.gridConfig.cropLeft = cropLeft;
        this.gridConfig.cropRight = cropRight;
        
        // Update display values
        document.getElementById('totalStudents').textContent = cols * rows;
        document.getElementById('cropTopVal').textContent = Math.round(cropTop * 100) + '%';
        document.getElementById('cropBottomVal').textContent = Math.round(cropBottom * 100) + '%';
        if (document.getElementById('cropLeftVal')) {
            document.getElementById('cropLeftVal').textContent = Math.round(cropLeft * 100) + '%';
        }
        if (document.getElementById('cropRightVal')) {
            document.getElementById('cropRightVal').textContent = Math.round(cropRight * 100) + '%';
        }
        
        // Update grid overlay
        const overlay = document.getElementById('gridOverlay');
        
        const cellWidth = (cropRight - cropLeft) / cols * 100;
        const cellHeight = (cropBottom - cropTop) / rows * 100;
        
        let html = '';
        let cellNum = 1;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const left = (cropLeft + col * (cropRight - cropLeft) / cols) * 100;
                const top = (cropTop + row * (cropBottom - cropTop) / rows) * 100;
                
                // First cell gets draggable corner handle
                const isFirstCell = row === 0 && col === 0;
                
                html += `
                    <div class="grid-cell ${isFirstCell ? 'grid-cell-adjustable' : ''}" style="
                        left: ${left}%;
                        top: ${top}%;
                        width: ${cellWidth}%;
                        height: ${cellHeight}%;
                    ">
                        <span class="grid-cell-number">${cellNum}</span>
                        ${isFirstCell ? '<div class="cell-resize-handle" id="cellResizeHandle"></div>' : ''}
                    </div>
                `;
                cellNum++;
            }
        }
        
        overlay.innerHTML = html;
        
        // Setup drag handler for first cell
        this.setupCellDrag();
    },
    
    setupCellDrag() {
        const handle = document.getElementById('cellResizeHandle');
        const overlay = document.getElementById('gridOverlay');
        if (!handle || !overlay) return;
        
        let isDragging = false;
        let startX, startY, startWidth, startHeight;
        
        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = overlay.getBoundingClientRect();
            startWidth = this.gridConfig.cropRight - this.gridConfig.cropLeft;
            startHeight = this.gridConfig.cropBottom - this.gridConfig.cropTop;
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const rect = document.getElementById('gridPreview').getBoundingClientRect();
            const deltaX = (e.clientX - startX) / rect.width;
            const deltaY = (e.clientY - startY) / rect.height;
            
            // Adjust cell size by changing crop bounds
            const cols = this.gridConfig.cols;
            const rows = this.gridConfig.rows;
            
            // Delta per cell
            const cellDeltaX = deltaX;
            const cellDeltaY = deltaY;
            
            // New crop right/bottom based on drag
            let newRight = this.gridConfig.cropLeft + (startWidth + cellDeltaX * cols);
            let newBottom = this.gridConfig.cropTop + (startHeight + cellDeltaY * rows);
            
            // Clamp
            newRight = Math.min(1, Math.max(this.gridConfig.cropLeft + 0.3, newRight));
            newBottom = Math.min(1, Math.max(this.gridConfig.cropTop + 0.3, newBottom));
            
            this.gridConfig.cropRight = newRight;
            this.gridConfig.cropBottom = newBottom;
            
            // Update slider to match
            document.getElementById('cropBottom').value = newBottom * 100;
            document.getElementById('cropBottomVal').textContent = Math.round(newBottom * 100) + '%';
            
            this.updatePreviewWithoutDrag();
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    },
    
    updatePreviewWithoutDrag() {
        // Same as updatePreview but doesn't re-setup drag (prevents recursion)
        const { cols, rows, cropTop, cropBottom, cropLeft, cropRight } = this.gridConfig;
        
        const overlay = document.getElementById('gridOverlay');
        const cellWidth = (cropRight - cropLeft) / cols * 100;
        const cellHeight = (cropBottom - cropTop) / rows * 100;
        
        let html = '';
        let cellNum = 1;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const left = (cropLeft + col * (cropRight - cropLeft) / cols) * 100;
                const top = (cropTop + row * (cropBottom - cropTop) / rows) * 100;
                const isFirstCell = row === 0 && col === 0;
                
                html += `
                    <div class="grid-cell ${isFirstCell ? 'grid-cell-adjustable' : ''}" style="
                        left: ${left}%;
                        top: ${top}%;
                        width: ${cellWidth}%;
                        height: ${cellHeight}%;
                    ">
                        <span class="grid-cell-number">${cellNum}</span>
                        ${isFirstCell ? '<div class="cell-resize-handle" id="cellResizeHandle"></div>' : ''}
                    </div>
                `;
                cellNum++;
            }
        }
        
        overlay.innerHTML = html;
        this.setupCellDrag();
    },
    
    closeSetup() {
        const modal = document.getElementById('gridSetupModal');
        if (modal) modal.classList.remove('active');
    },
    
    extractFaces() {
        const { cols, rows, cropTop, cropBottom, cropLeft, cropRight } = this.gridConfig;
        const { image, width, height } = this.originalImage;
        
        // Calculate actual pixel positions
        const startX = Math.floor(width * cropLeft);
        const startY = Math.floor(height * cropTop);
        const endX = Math.floor(width * cropRight);
        const endY = Math.floor(height * cropBottom);
        
        const cellWidth = (endX - startX) / cols;
        const cellHeight = (endY - startY) / rows;
        
        // Create canvas for face extraction
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Face crop size (square, 80% of cell width to leave margin)
        const faceSize = Math.min(cellWidth, cellHeight) * 0.75;
        canvas.width = faceSize;
        canvas.height = faceSize;
        
        this.extractedStudents = [];
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const cellX = startX + col * cellWidth;
                const cellY = startY + row * cellHeight;
                
                // Center the face crop in the cell
                // Names are at TOP of cell, faces are BELOW — so offset downward
                const faceX = cellX + (cellWidth - faceSize) / 2;
                const faceY = cellY + (cellHeight - faceSize) * 0.55; // Lower in cell (below name text)
                
                // Clear and draw
                ctx.clearRect(0, 0, faceSize, faceSize);
                ctx.save();
                
                // Circular clip
                ctx.beginPath();
                ctx.arc(faceSize / 2, faceSize / 2, faceSize / 2, 0, Math.PI * 2);
                ctx.clip();
                
                ctx.drawImage(
                    image,
                    faceX, faceY, faceSize, faceSize,
                    0, 0, faceSize, faceSize
                );
                
                ctx.restore();
                
                const faceDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                
                this.extractedStudents.push({
                    id: `student-${Date.now()}-${this.extractedStudents.length}`,
                    faceDataUrl,
                    gridPosition: { row, col },
                    displayName: ''
                });
            }
        }
        
        this.closeSetup();
        this.showNamesInput();
    },
    
    showNamesInput() {
        let modal = document.getElementById('namesInputModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'namesInputModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        
        const facesHtml = this.extractedStudents.map((s, i) => `
            <div class="extracted-face">
                <span class="face-number">#${i + 1}</span>
                <img src="${s.faceDataUrl}" alt="Student ${i + 1}">
                <input type="text" id="name-${i}" placeholder="First L." value="${s.displayName}">
            </div>
        `).join('');
        
        modal.innerHTML = `
            <div class="modal-content modal-xlarge">
                <div class="modal-header">
                    <h2>✏️ Step 2: Add Names</h2>
                    <button class="modal-close" onclick="PhotoExtract.closeNames()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="names-input-container">
                        <div class="names-input-left">
                            <p class="help-text"><strong>Option A:</strong> Paste names below (one per line, in order)</p>
                            <textarea id="namesPaste" class="names-textarea" placeholder="Ahmad A.
Evans A.
Neda A.
Grayer A.
...

Paste from MyEd or type names, one per line.
Order: left-to-right, top-to-bottom."></textarea>
                            <button class="secondary-btn" onclick="PhotoExtract.applyPastedNames()" style="margin-top: 1rem;">
                                Apply Names →
                            </button>
                            <p class="help-text" style="margin-top: 1rem;"><strong>Option B:</strong> Or type directly in the boxes on the right →</p>
                        </div>
                        <div class="names-input-right">
                            <p class="help-text">Extracted faces (${this.extractedStudents.length} students)</p>
                            <div class="extracted-faces-grid">
                                ${facesHtml}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="secondary-btn" onclick="PhotoExtract.backToGrid()">← Back to Grid</button>
                    <button class="secondary-btn" onclick="PhotoExtract.closeNames()">Cancel</button>
                    <button class="primary-btn" onclick="PhotoExtract.saveStudents()">✓ Save All Students</button>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    },
    
    applyPastedNames() {
        const textarea = document.getElementById('namesPaste');
        const names = textarea.value.split('\n').map(n => n.trim()).filter(n => n.length > 0);
        
        names.forEach((name, i) => {
            if (i < this.extractedStudents.length) {
                this.extractedStudents[i].displayName = name;
                const input = document.getElementById(`name-${i}`);
                if (input) input.value = name;
            }
        });
        
        if (names.length < this.extractedStudents.length) {
            alert(`Applied ${names.length} names. ${this.extractedStudents.length - names.length} students still need names.`);
        } else if (names.length > this.extractedStudents.length) {
            alert(`Applied ${this.extractedStudents.length} names. ${names.length - this.extractedStudents.length} extra names were ignored.`);
        } else {
            alert(`Applied ${names.length} names!`);
        }
    },
    
    closeNames() {
        const modal = document.getElementById('namesInputModal');
        if (modal) modal.classList.remove('active');
    },
    
    backToGrid() {
        this.closeNames();
        this.showGridSetup();
    },
    
    async saveStudents() {
        // Collect names from inputs
        this.extractedStudents.forEach((student, i) => {
            const input = document.getElementById(`name-${i}`);
            if (input && input.value.trim()) {
                student.displayName = input.value.trim();
            }
        });
        
        // Filter out students without names (empty cells)
        const validStudents = this.extractedStudents.filter(s => s.displayName);
        
        if (validStudents.length === 0) {
            alert('Please add at least one student name.');
            return;
        }
        
        try {
            const confirmClear = confirm(
                `This will add ${validStudents.length} students. Clear existing students first?`
            );
            
            if (confirmClear) {
                await DB.clearStudents();
            }
            
            for (const student of validStudents) {
                // Parse display name into first/last
                const parts = student.displayName.split(/\s+/);
                const firstName = parts[0] || 'Student';
                const lastInitial = parts.length > 1 ? parts[parts.length - 1].replace('.', '').charAt(0).toUpperCase() : '?';
                
                await DB.addStudent({
                    displayName: student.displayName,
                    firstName,
                    lastInitial,
                    caricature: student.faceDataUrl,
                    sortKey: `${lastInitial.toLowerCase()}_${firstName.toLowerCase()}`
                });
            }
            
            state.students = await DB.getStudents();
            renderGrid();
            updateStats();
            
            this.closeNames();
            alert(`Imported ${validStudents.length} students!`);
            
        } catch (error) {
            console.error('Failed to save:', error);
            alert('Failed to save: ' + error.message);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    PhotoExtract.init();
});
