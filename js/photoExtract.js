/**
 * Photo Extract v3 — AI-Powered Extraction
 * 
 * Flow:
 * 1. User uploads class photo
 * 2. AI (Gemini Vision) extracts names + grid automatically
 * 3. User selects avatar style (Original, Disney, Anime, Ghibli, etc.)
 * 4. AI generates styled avatars
 * 5. Import complete!
 */

const PhotoExtract = {
    originalImage: null,
    extractedData: null,
    selectedStyle: 'original',
    
    // Gender-neutral placeholder avatar (simple silhouette)
    placeholderAvatar: `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="50" fill="#e5e7eb"/>
            <circle cx="50" cy="38" r="18" fill="#9ca3af"/>
            <ellipse cx="50" cy="85" rx="30" ry="25" fill="#9ca3af"/>
        </svg>
    `)}`,
    
    // Available avatar styles - all are pre-generated on import for instant switching
    // Chosen to be flattering, fun, and appealing to students
    styles: [
        { id: 'original', name: 'Original Photo', icon: '📷', desc: 'Your actual photo', pregenerate: true },
        { id: 'disney', name: 'Disney/Pixar', icon: '✨', desc: 'Friendly 3D animated', pregenerate: true },
        { id: 'anime', name: 'Anime Hero', icon: '🎌', desc: 'Japanese anime style', pregenerate: true },
        { id: 'ghibli', name: 'Studio Ghibli', icon: '🍃', desc: 'Soft & magical', pregenerate: true },
        { id: 'superhero', name: 'Superhero', icon: '🦸', desc: 'Heroic comic style', pregenerate: true },
        { id: 'videogame', name: 'Video Game', icon: '🎮', desc: 'Game character style', pregenerate: true },
        { id: 'popart', name: 'Pop Art', icon: '🌈', desc: 'Colorful Warhol vibes', pregenerate: true },
        { id: 'watercolor', name: 'Watercolor', icon: '🌸', desc: 'Soft artistic painting', pregenerate: true },
        { id: 'sketch', name: 'Pencil Sketch', icon: '✏️', desc: 'Classic artistic drawing', pregenerate: true },
        { id: 'fantasy', name: 'Fantasy', icon: '🔮', desc: 'Magical & enchanting', pregenerate: true },
    ],
    
    // All styles pre-generated (except original which is free)
    pregenerateStyles: ['original', 'disney', 'anime', 'ghibli', 'superhero', 'videogame', 'popart', 'watercolor', 'sketch', 'fantasy'],
    
    init() {
        const importBtn = document.getElementById('importClassPhotoBtn');
        const fileInput = document.getElementById('classPhotoInput');
        
        if (importBtn) {
            importBtn.addEventListener('click', () => fileInput.click());
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        
        this.addStyles();
    },
    
    addStyles() {
        if (document.getElementById('photoExtractStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'photoExtractStyles';
        style.textContent = `
            .ai-extract-modal .modal-content {
                max-width: 900px;
            }
            
            .ai-processing {
                text-align: center;
                padding: 3rem;
            }
            
            .ai-processing .spinner {
                width: 60px;
                height: 60px;
                border: 4px solid #e5e7eb;
                border-top-color: #6366f1;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 1.5rem;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            .ai-processing h3 {
                margin-bottom: 0.5rem;
                color: #1f2937;
            }
            
            .ai-processing p {
                color: #6b7280;
            }
            
            .style-selector {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                gap: 1rem;
                margin: 1.5rem 0;
            }
            
            .style-option {
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                padding: 1rem;
                text-align: center;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .style-option:hover {
                border-color: #a5b4fc;
                background: #f5f3ff;
            }
            
            .style-option.selected {
                border-color: #6366f1;
                background: #eef2ff;
            }
            
            .style-option .style-icon {
                font-size: 2rem;
                margin-bottom: 0.5rem;
            }
            
            .style-option .style-name {
                font-weight: 600;
                color: #1f2937;
                font-size: 0.9rem;
            }
            
            .style-option .style-desc {
                font-size: 0.75rem;
                color: #6b7280;
                margin-top: 0.25rem;
            }
            
            .extracted-preview {
                max-height: 400px;
                overflow-y: auto;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 1rem;
                background: #fafafa;
            }
            
            .student-preview-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                gap: 1rem;
            }
            
            .student-preview-item {
                text-align: center;
            }
            
            .student-preview-item img {
                width: 70px;
                height: 70px;
                border-radius: 50%;
                object-fit: cover;
                border: 2px solid #e5e7eb;
            }
            
            .student-preview-item .student-name {
                font-size: 0.8rem;
                margin-top: 0.5rem;
                color: #374151;
                word-break: break-word;
            }
            
            .student-preview-item .student-name input {
                width: 100%;
                text-align: center;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 2px 4px;
                font-size: 0.75rem;
            }
            
            .student-preview-item.withdrawn img {
                opacity: 0.5;
            }
            
            .student-preview-item.withdrawn .student-name {
                color: #ef4444;
                text-decoration: line-through;
            }
            
            .extract-stats {
                display: flex;
                gap: 2rem;
                margin-bottom: 1rem;
                padding: 1rem;
                background: #f0fdf4;
                border-radius: 8px;
            }
            
            .extract-stat {
                text-align: center;
            }
            
            .extract-stat .stat-value {
                font-size: 1.5rem;
                font-weight: bold;
                color: #16a34a;
            }
            
            .extract-stat .stat-label {
                font-size: 0.8rem;
                color: #6b7280;
            }
            
            .style-generating {
                position: relative;
            }
            
            .style-generating::after {
                content: '';
                position: absolute;
                inset: 0;
                background: rgba(255,255,255,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
            }
        `;
        document.head.appendChild(style);
    },
    
    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const imageData = await this.loadImage(file);
            this.originalImage = imageData;
            this.showProcessingModal();
            await this.extractWithAI();
        } catch (error) {
            console.error('Failed to process image:', error);
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
    
    showProcessingModal() {
        let modal = document.getElementById('aiExtractModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'aiExtractModal';
            modal.className = 'modal ai-extract-modal';
            document.body.appendChild(modal);
        }
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="ai-processing">
                    <div class="spinner"></div>
                    <h3>🤖 AI is analyzing your class photo...</h3>
                    <p>Extracting student names and faces</p>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    },
    
    async extractWithAI() {
        try {
            // Call our extraction API
            const response = await fetch('/api/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: this.originalImage.dataUrl })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Extraction failed');
            }
            
            this.extractedData = data;
            
            // Extract face crops from original image
            await this.extractFaceCrops();
            
            // Show results
            this.showResults();
            
        } catch (error) {
            console.error('AI extraction failed:', error);
            this.showError(error.message);
        }
    },
    
    async extractFaceCrops() {
        const { grid, students } = this.extractedData;
        const { image, width, height } = this.originalImage;
        
        // Calculate cell dimensions based on detected grid
        const cols = grid.cols;
        const rows = grid.rows;
        
        // Estimate header and margins
        const headerHeight = height * 0.04;
        const contentHeight = height - headerHeight;
        
        const cellWidth = width / cols;
        const cellHeight = contentHeight / rows;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Face crop size
        const faceSize = Math.min(cellWidth, cellHeight) * 0.65;
        canvas.width = faceSize;
        canvas.height = faceSize;
        
        this.extractedData.studentFaces = [];
        
        for (let i = 0; i < students.length; i++) {
            const studentName = students[i];
            
            // Check if this is a blank/placeholder student
            if (!studentName || studentName.trim() === '' || studentName.includes('[BLANK]')) {
                this.extractedData.studentFaces.push(this.placeholderAvatar);
                continue;
            }
            
            // Check if WITHDRAWN - we'll add overlay after cropping
            const isWithdrawn = studentName.toUpperCase().includes('WITHDRAWN');
            
            const row = Math.floor(i / cols);
            const col = i % cols;
            
            const cellX = col * cellWidth;
            const cellY = headerHeight + (row * cellHeight);
            
            // Face is in lower-middle of cell (name is at top)
            const faceX = cellX + (cellWidth - faceSize) / 2;
            const faceY = cellY + (cellHeight * 0.35); // Start below name area
            
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
            
            // Add WITHDRAWN overlay if applicable
            if (isWithdrawn) {
                // Semi-transparent dark overlay
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.beginPath();
                ctx.arc(faceSize / 2, faceSize / 2, faceSize / 2, 0, Math.PI * 2);
                ctx.fill();
                
                // WITHDRAWN text - large, diagonal, red
                ctx.save();
                ctx.translate(faceSize / 2, faceSize / 2);
                ctx.rotate(-Math.PI / 6); // Diagonal angle
                ctx.fillStyle = '#ef4444';
                ctx.font = `bold ${Math.floor(faceSize / 5)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('WITHDRAWN', 0, 0);
                ctx.restore();
            }
            
            this.extractedData.studentFaces.push(canvas.toDataURL('image/jpeg', 0.85));
        }
    },
    
    // Generate avatar from text description (for students without photos)
    async generateAvatarFromDescription(studentId, description) {
        try {
            const response = await fetch('/api/stylize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: description,
                    style: 'disney', // Default to friendly Disney style
                    generateFromDescription: true
                })
            });
            
            const data = await response.json();
            if (data.success && data.image) {
                // Update student's avatar
                await DB.updateStudent(studentId, {
                    caricature: data.image,
                    avatars: { ...((await DB.getStudent(studentId))?.avatars || {}), generated: data.image }
                });
                
                state.students = await DB.getStudents();
                renderGrid();
                return true;
            }
        } catch (e) {
            console.error('Failed to generate avatar:', e);
        }
        return false;
    },
    
    showResults() {
        const modal = document.getElementById('aiExtractModal');
        const { grid, students, studentFaces } = this.extractedData;
        
        const studentsHtml = students.map((name, i) => {
            const isWithdrawn = name.includes('[WITHDRAWN]');
            const cleanName = name.replace('[WITHDRAWN]', '').trim();
            
            return `
                <div class="student-preview-item ${isWithdrawn ? 'withdrawn' : ''}">
                    <img src="${studentFaces[i] || ''}" alt="${cleanName}">
                    <div class="student-name">
                        <input type="text" value="${cleanName}" data-index="${i}" ${isWithdrawn ? 'disabled' : ''}>
                    </div>
                </div>
            `;
        }).join('');
        
        const stylesHtml = this.styles.map(s => `
            <div class="style-option ${s.id === this.selectedStyle ? 'selected' : ''}" 
                 onclick="PhotoExtract.selectStyle('${s.id}')">
                <div class="style-icon">${s.icon}</div>
                <div class="style-name">${s.name}</div>
                <div class="style-desc">${s.desc}</div>
            </div>
        `).join('');
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>✨ AI Extraction Complete!</h2>
                    <button class="modal-close" onclick="PhotoExtract.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="extract-stats">
                        <div class="extract-stat">
                            <div class="stat-value">${students.length}</div>
                            <div class="stat-label">Students Found</div>
                        </div>
                        <div class="extract-stat">
                            <div class="stat-value">${grid.rows} × ${grid.cols}</div>
                            <div class="stat-label">Grid Detected</div>
                        </div>
                    </div>
                    
                    <h3>Choose Avatar Style</h3>
                    <p class="help-text">Pick a fun style for student avatars! You can change this anytime.</p>
                    <div class="style-selector">
                        ${stylesHtml}
                    </div>
                    
                    <h3>Review Students</h3>
                    <p class="help-text">Edit names if needed. Click a name to change it.</p>
                    <div class="extracted-preview">
                        <div class="student-preview-grid">
                            ${studentsHtml}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="secondary-btn" onclick="PhotoExtract.closeModal()">Cancel</button>
                    <button class="primary-btn" onclick="PhotoExtract.saveStudents()">
                        ✓ Import ${students.length} Students
                    </button>
                </div>
            </div>
        `;
    },
    
    showError(message) {
        const modal = document.getElementById('aiExtractModal');
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>❌ Extraction Failed</h2>
                    <button class="modal-close" onclick="PhotoExtract.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Sorry, the AI couldn't extract students from this image.</p>
                    <p><strong>Error:</strong> ${message}</p>
                    <p>Try a clearer image or contact support.</p>
                </div>
                <div class="modal-footer">
                    <button class="primary-btn" onclick="PhotoExtract.closeModal()">Close</button>
                </div>
            </div>
        `;
    },
    
    selectStyle(styleId) {
        this.selectedStyle = styleId;
        
        // Update UI
        document.querySelectorAll('.style-option').forEach(el => {
            el.classList.toggle('selected', el.querySelector('.style-name').textContent.toLowerCase().includes(
                this.styles.find(s => s.id === styleId)?.name.toLowerCase().split('/')[0] || ''
            ) || el.onclick.toString().includes(styleId));
        });
        
        // Re-render to update selection
        document.querySelectorAll('.style-option').forEach(el => {
            const isSelected = el.getAttribute('onclick')?.includes(`'${styleId}'`);
            el.classList.toggle('selected', isSelected);
        });
    },
    
    closeModal() {
        const modal = document.getElementById('aiExtractModal');
        if (modal) modal.classList.remove('active');
    },
    
    async saveStudents() {
        const { students, studentFaces } = this.extractedData;
        
        // Collect edited names from inputs
        const inputs = document.querySelectorAll('.student-preview-item input');
        const finalNames = Array.from(inputs).map(input => input.value.trim());
        
        // Include ALL students (including withdrawn) to preserve layout positions
        // Withdrawn students are marked but kept for MyEd sync
        const allStudents = finalNames
            .map((name, i) => ({ 
                name: name.replace('[WITHDRAWN]', '').trim(), 
                face: studentFaces[i], 
                index: i,
                isWithdrawn: students[i]?.toUpperCase().includes('WITHDRAWN') || false
            }))
            .filter(s => s.name); // Only filter out completely empty names
        
        if (allStudents.length === 0) {
            alert('No valid students to import.');
            return;
        }
        
        try {
            const confirmClear = confirm(
                `Import ${allStudents.length} students?\n\nThis will:\n• Clear existing students\n• Generate 4 avatar styles per student (Original, Disney, Anime, Ghibli)\n\nThis may take a few minutes.`
            );
            
            if (!confirmClear) return;
            
            await DB.clearStudents();
            
            // Show processing
            this.showProcessingModal();
            document.querySelector('.ai-processing h3').textContent = '🎨 Generating avatar styles...';
            
            const stylesToGenerate = this.pregenerateStyles.filter(s => s !== 'original');
            let completed = 0;
            const total = allStudents.length;
            
            for (const student of allStudents) {
                completed++;
                document.querySelector('.ai-processing p').textContent = 
                    `Processing ${student.name} (${completed}/${total})...`;
                
                // Parse name into first/last
                const parts = student.name.split(/\s+/);
                const firstName = parts[0] || 'Student';
                const lastInitial = parts.length > 1 ? parts[parts.length - 1].replace('.', '').charAt(0).toUpperCase() : '?';
                
                // WITHDRAWN students - just save with overlay, no style generation
                if (student.isWithdrawn) {
                    await DB.addStudent({
                        displayName: student.name,
                        firstName,
                        lastInitial,
                        caricature: student.face, // Already has WITHDRAWN overlay
                        avatars: { original: student.face },
                        activeStyle: 'original',
                        isWithdrawn: true,
                        sortKey: `${lastInitial.toLowerCase()}_${firstName.toLowerCase()}`
                    });
                    continue;
                }
                
                // Start with original
                const avatars = {
                    original: student.face
                };
                
                // Generate other styles in parallel (but limit concurrency)
                const stylePromises = stylesToGenerate.map(async (styleId) => {
                    try {
                        const styleResponse = await fetch('/api/stylize', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                image: student.face,
                                style: styleId,
                                name: student.name
                            })
                        });
                        
                        const styleData = await styleResponse.json();
                        if (styleData.success && styleData.image && !styleData.fallback) {
                            return { styleId, image: styleData.image };
                        }
                        return { styleId, image: student.face }; // Fallback to original
                    } catch (e) {
                        console.error(`Style ${styleId} failed for ${student.name}:`, e);
                        return { styleId, image: student.face }; // Fallback
                    }
                });
                
                const styleResults = await Promise.all(stylePromises);
                styleResults.forEach(result => {
                    avatars[result.styleId] = result.image;
                });
                
                await DB.addStudent({
                    displayName: student.name,
                    firstName,
                    lastInitial,
                    caricature: avatars[this.selectedStyle] || avatars.original,
                    avatars: avatars, // Store ALL generated styles
                    activeStyle: this.selectedStyle,
                    isWithdrawn: false,
                    sortKey: `${lastInitial.toLowerCase()}_${firstName.toLowerCase()}`
                });
            }
            
            state.students = await DB.getStudents();
            renderGrid();
            updateStats();
            
            this.closeModal();
            alert(`✨ Imported ${allStudents.length} students!\n\n4 avatar styles generated per student. Use Settings to swap styles anytime!`);
            
        } catch (error) {
            console.error('Failed to save:', error);
            alert('Failed to save: ' + error.message);
        }
    },

    // Switch all students to a different pre-generated style
    async switchClassStyle(styleId) {
        if (!this.pregenerateStyles.includes(styleId)) {
            alert('This style was not pre-generated. Only Original, Disney, Anime, and Ghibli are available for instant switching.');
            return;
        }
        
        const students = await DB.getStudents();
        let updated = 0;
        
        for (const student of students) {
            if (student.avatars && student.avatars[styleId]) {
                student.caricature = student.avatars[styleId];
                student.activeStyle = styleId;
                await DB.updateStudent(student.id, {
                    caricature: student.caricature,
                    activeStyle: styleId
                });
                updated++;
            }
        }
        
        if (updated > 0) {
            state.students = await DB.getStudents();
            renderGrid();
            const styleName = this.styles.find(s => s.id === styleId)?.name || styleId;
            alert(`✨ Switched ${updated} students to ${styleName} style!`);
        } else {
            alert('No students have pre-generated styles. Re-import your class photo to generate styles.');
        }
    },
    
    // Show style switcher modal
    showStyleSwitcher() {
        let modal = document.getElementById('styleSwitcherModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'styleSwitcherModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        
        const pregenStyles = this.styles.filter(s => s.pregenerate);
        const stylesHtml = pregenStyles.map(s => `
            <div class="style-option" onclick="PhotoExtract.switchClassStyle('${s.id}'); PhotoExtract.closeStyleSwitcher();">
                <div class="style-icon">${s.icon}</div>
                <div class="style-name">${s.name}</div>
                <div class="style-desc">${s.desc}</div>
            </div>
        `).join('');
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>🎨 Change Avatar Style</h2>
                    <button class="modal-close" onclick="PhotoExtract.closeStyleSwitcher()">&times;</button>
                </div>
                <div class="modal-body">
                    <p class="help-text">Instantly switch all student avatars to a different style. These were pre-generated during import!</p>
                    <div class="style-selector">
                        ${stylesHtml}
                    </div>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    },
    
    closeStyleSwitcher() {
        const modal = document.getElementById('styleSwitcherModal');
        if (modal) modal.classList.remove('active');
    }
};

// Make switchClassStyle available globally for settings menu
window.switchClassStyle = (styleId) => PhotoExtract.switchClassStyle(styleId);
window.showStyleSwitcher = () => PhotoExtract.showStyleSwitcher();

document.addEventListener('DOMContentLoaded', () => {
    PhotoExtract.init();
});
