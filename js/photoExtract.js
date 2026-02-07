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
    faceApiLoaded: false,
    
    // Gender-neutral placeholder avatar (simple silhouette)
    placeholderAvatar: `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="50" fill="#e5e7eb"/>
            <circle cx="50" cy="38" r="18" fill="#9ca3af"/>
            <ellipse cx="50" cy="85" rx="30" ry="25" fill="#9ca3af"/>
        </svg>
    `)}`,
    
    // Load face-api.js models
    async loadFaceApi() {
        if (this.faceApiLoaded) return true;
        
        try {
            // Load from CDN
            const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            this.faceApiLoaded = true;
            console.log('Face-api.js loaded successfully');
            return true;
        } catch (e) {
            console.warn('Face-api.js failed to load:', e);
            return false;
        }
    },
    
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
            
            .student-preview-item.withdrawn {
                position: relative;
            }
            
            .student-preview-item.withdrawn img {
                opacity: 0.6;
                filter: grayscale(50%);
            }
            
            .student-preview-item.withdrawn::after {
                content: 'WITHDRAWN';
                position: absolute;
                top: 35px;
                left: 50%;
                transform: translateX(-50%) rotate(-15deg);
                background: rgba(239, 68, 68, 0.9);
                color: white;
                font-size: 9px;
                font-weight: bold;
                padding: 2px 6px;
                border-radius: 3px;
                white-space: nowrap;
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
            
            // Update processing message
            const processingH3 = document.querySelector('.ai-processing h3');
            const processingP = document.querySelector('.ai-processing p');
            if (processingH3) processingH3.textContent = '🔍 Detecting faces...';
            if (processingP) processingP.textContent = `Found ${data.students?.length || 0} students, now locating faces`;
            
            // Extract face crops from original image using face detection
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
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Output size for face crops (square)
        const outputSize = 200;
        canvas.width = outputSize;
        canvas.height = outputSize;
        
        // Calculate cell dimensions from grid
        const cols = grid?.cols || 4;
        const rows = grid?.rows || Math.ceil(students.length / cols);
        const cellWidth = width / cols;
        const cellHeight = height / rows;
        
        console.log(`Grid: ${cols}x${rows}, Cell: ${cellWidth.toFixed(0)}x${cellHeight.toFixed(0)}`);
        
        // MyEd BC layout analysis:
        // - Name label at TOP of cell (~18-22% of cell height)
        // - Photo below name (~78-82% of cell height)
        // - Face is in UPPER portion of photo (head/shoulders shot)
        // - Face is typically centered horizontally
        const nameLabelRatio = 0.20;  // Name takes top 20%
        
        this.extractedData.studentFaces = [];
        
        for (let i = 0; i < students.length; i++) {
            const student = students[i];
            const studentName = typeof student === 'string' ? student : student?.name;
            
            // Skip blank entries
            if (!studentName || studentName.trim() === '' || studentName.includes('[BLANK]')) {
                this.extractedData.studentFaces.push(null);
                continue;
            }
            
            const row = Math.floor(i / cols);
            const col = i % cols;
            
            // Calculate cell position
            const cellX = col * cellWidth;
            const cellY = row * cellHeight;
            
            // Photo area within cell (below name label)
            const photoX = cellX;
            const photoY = cellY + (cellHeight * nameLabelRatio);
            const photoWidth = cellWidth;
            const photoHeight = cellHeight * (1 - nameLabelRatio);
            
            // For school photos, face is typically:
            // - Horizontally centered
            // - In the upper 60% of the photo (head & shoulders)
            // - Taking up about 50-60% of the photo width
            
            // Crop a square from the upper-center of the photo
            const cropSize = Math.min(photoWidth, photoHeight) * 0.75;
            const cropX = photoX + (photoWidth - cropSize) / 2;  // Center horizontally
            const cropY = photoY + photoHeight * 0.05;  // Start near top of photo area
            
            // Draw face with circular clip
            ctx.clearRect(0, 0, outputSize, outputSize);
            ctx.save();
            ctx.beginPath();
            ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
            ctx.clip();
            
            ctx.drawImage(
                image,
                cropX, cropY, cropSize, cropSize,
                0, 0, outputSize, outputSize
            );
            
            ctx.restore();
            
            this.extractedData.studentFaces.push(canvas.toDataURL('image/jpeg', 0.9));
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
        
        // Get student name (handles both string and object formats)
        const getName = (student) => typeof student === 'string' ? student : student?.name;
        
        // Filter out blank cells (null faces or empty names)
        const validCount = students.filter((s, i) => {
            const name = getName(s);
            return name && name.trim() && studentFaces[i];
        }).length;
        
        const studentsHtml = students.map((student, i) => {
            const name = getName(student);
            // Skip blank cells entirely
            if (!name || !name.trim() || !studentFaces[i]) return '';
            
            const isWithdrawn = name.includes('[WITHDRAWN]');
            const cleanName = name.replace('[WITHDRAWN]', '').trim();
            
            return `
                <div class="student-preview-item ${isWithdrawn ? 'withdrawn' : ''}">
                    <img src="${studentFaces[i]}" alt="${cleanName}">
                    <div class="student-name">
                        <input type="text" value="${cleanName}" data-index="${i}" ${isWithdrawn ? 'disabled' : ''}>
                    </div>
                </div>
            `;
        }).filter(html => html).join(''); // Remove empty strings
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>✨ AI Extraction Complete!</h2>
                    <button class="modal-close" onclick="PhotoExtract.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="extract-stats">
                        <div class="extract-stat">
                            <div class="stat-value">${validCount}</div>
                            <div class="stat-label">Students Found</div>
                        </div>
                        <div class="extract-stat">
                            <div class="stat-value">${grid.rows} × ${grid.cols}</div>
                            <div class="stat-label">Grid Detected</div>
                        </div>
                    </div>
                    
                    <h3>Review Students</h3>
                    <p class="help-text">Verify faces are correct. Edit names if needed.</p>
                    <div class="extracted-preview">
                        <div class="student-preview-grid">
                            ${studentsHtml}
                        </div>
                    </div>
                    
                    <div class="import-info" style="margin-top: 1rem; padding: 1rem; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
                        <strong>🎨 Avatar Styles</strong>
                        <div style="margin-top: 0.75rem;">
                            <label style="display: block; margin-bottom: 0.5rem; color: #374151; font-weight: 500;">
                                How many styles to generate?
                            </label>
                            <select id="styleCountSelect" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.95rem;">
                                <option value="1">📷 Original Only (instant)</option>
                                <option value="4" selected>⭐ Popular 4: Original + Disney, Anime, Ghibli (~${Math.ceil(validCount * 3 * 8 / 60)} min)</option>
                                <option value="10">🎨 All 10 Styles (~${Math.ceil(validCount * 9 * 8 / 60)} min)</option>
                            </select>
                            <p style="margin: 0.5rem 0 0; color: #6b7280; font-size: 0.8rem;">
                                More styles = more time, but instant switching later!
                            </p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="secondary-btn" onclick="PhotoExtract.closeModal()">Cancel</button>
                    <button class="primary-btn" onclick="PhotoExtract.saveStudents()">
                        ✓ Import ${validCount} Students
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
        
        // Get student name (handles both string and object formats)
        const getOriginalName = (student) => typeof student === 'string' ? student : student?.name;
        
        // Collect edited names from inputs
        const inputs = document.querySelectorAll('.student-preview-item input');
        const finalNames = Array.from(inputs).map(input => input.value.trim());
        
        // Include students with names (including withdrawn) - skip blank cells entirely
        const allStudents = finalNames
            .map((name, i) => {
                const originalName = getOriginalName(students[i]) || '';
                return { 
                    name: name.replace('[WITHDRAWN]', '').trim(), 
                    face: studentFaces[i], 
                    index: i,
                    isWithdrawn: originalName.toUpperCase().includes('WITHDRAWN')
                };
            })
            .filter(s => s.name && s.face); // Filter out empty names AND null faces (blank cells)
        
        if (allStudents.length === 0) {
            alert('No valid students to import.');
            return;
        }
        
        try {
            // Get user's style selection
            const styleCountSelect = document.getElementById('styleCountSelect');
            const styleCount = parseInt(styleCountSelect?.value || '4');
            
            // Define style sets
            const styleOptions = {
                1: [], // Original only
                4: ['disney', 'anime', 'ghibli'], // Popular 4
                10: ['disney', 'anime', 'ghibli', 'superhero', 'videogame', 'popart', 'watercolor', 'sketch', 'fantasy'] // All
            };
            const stylesToGenerate = styleOptions[styleCount] || styleOptions[4];
            
            // Time estimates
            const timeEstimate = styleCount === 1 ? 'a few seconds' : 
                                styleCount === 4 ? `~${Math.ceil(allStudents.length * 3 * 8 / 60)} minutes` :
                                `~${Math.ceil(allStudents.length * 9 * 8 / 60)} minutes`;
            
            const confirmClear = confirm(
                `Import ${allStudents.length} students?\n\nThis will:\n• Clear existing students\n• Generate ${styleCount} avatar style${styleCount > 1 ? 's' : ''} per student\n\nEstimated time: ${timeEstimate}`
            );
            
            if (!confirmClear) return;
            
            await DB.clearStudents();
            
            // Show processing with detailed progress
            this.showProcessingModal();
            const updateProgress = (message, detail = '') => {
                const h3 = document.querySelector('.ai-processing h3');
                const p = document.querySelector('.ai-processing p');
                if (h3) h3.textContent = message;
                if (p) p.innerHTML = detail;
            };
            
            updateProgress('🎨 Generating avatar styles...', 'Preparing...');
            
            let completed = 0;
            const total = allStudents.length;
            const styleFailures = [];
            
            // Process 2 students at a time to balance speed and rate limits
            const batchSize = 2;
            for (let batch = 0; batch < allStudents.length; batch += batchSize) {
                const batchStudents = allStudents.slice(batch, batch + batchSize);
                
                await Promise.all(batchStudents.map(async (student) => {
                    completed++;
                    updateProgress(
                        '🎨 Generating avatar styles...',
                        `<strong>${student.name}</strong> (${completed}/${total})<br>
                         <small style="color:#6b7280">Creating ${stylesToGenerate.length + 1} styles...</small>`
                    );
                    
                    // Parse name into first/last
                    const parts = student.name.split(/\s+/);
                    const firstName = parts[0] || 'Student';
                    const lastInitial = parts.length > 1 ? parts[parts.length - 1].replace('.', '').charAt(0).toUpperCase() : '?';
                    
                    // Start with original
                    const avatars = {
                        original: student.face
                    };
                    
                    // Generate selected styles in parallel
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
                            
                            if (!styleResponse.ok) {
                                throw new Error(`HTTP ${styleResponse.status}`);
                            }
                            
                            const styleData = await styleResponse.json();
                            if (styleData.success && styleData.image && !styleData.fallback) {
                                return { styleId, image: styleData.image, success: true };
                            }
                            return { styleId, image: student.face, success: false }; // Fallback
                        } catch (e) {
                            console.error(`Style ${styleId} failed for ${student.name}:`, e);
                            styleFailures.push({ student: student.name, style: styleId, error: e.message });
                            return { styleId, image: student.face, success: false }; // Fallback
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
                        avatars: avatars,
                        activeStyle: this.selectedStyle,
                        isWithdrawn: student.isWithdrawn || false,
                        sortKey: `${lastInitial.toLowerCase()}_${firstName.toLowerCase()}`
                    });
                }));
                
                // Small delay between batches to avoid rate limiting
                if (batch + batchSize < allStudents.length) {
                    await new Promise(r => setTimeout(r, 500));
                }
            }
            
            // Log any failures for debugging
            if (styleFailures.length > 0) {
                console.warn('Some style generations failed:', styleFailures);
            }
            
            state.students = await DB.getStudents();
            renderGrid();
            updateStats();
            
            this.closeModal();
            
            const stylesGenerated = stylesToGenerate.length + 1; // +1 for original
            const successMsg = styleFailures.length > 0 
                ? `✨ Imported ${allStudents.length} students!\n\n${stylesGenerated} avatar styles generated (${styleFailures.length} had fallbacks).\nUse the 🎨 Style button to swap anytime!`
                : `✨ Imported ${allStudents.length} students!\n\n${stylesGenerated} avatar styles generated per student.\nUse the 🎨 Style button to swap anytime!`;
            alert(successMsg);
            
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
