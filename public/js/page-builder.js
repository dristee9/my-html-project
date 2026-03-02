// Page Builder JavaScript
class PageBuilder {
    constructor() {
        this.sections = [];
        this.selectedSection = null;
        this.history = [];
        this.historyIndex = -1;
        this.campaignId = window.campaignId || '';
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadExistingData();
        this.setupDragAndDrop();
    }

    setupEventListeners() {
        // Toolbar buttons
        document.getElementById('previewBtn')?.addEventListener('click', () => this.preview());
        document.getElementById('saveDraftBtn')?.addEventListener('click', () => this.saveDraft());
        document.getElementById('publishBtn')?.addEventListener('click', () => this.publish());
        
        // Undo/Redo
        document.getElementById('undoBtn')?.addEventListener('click', () => this.undo());
        document.getElementById('redoBtn')?.addEventListener('click', () => this.redo());
        
        // Category filtering
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterTemplates(e.target.dataset.category));
        });
        
        // Template dragging
        document.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('dragstart', (e) => this.handleDragStart(e));
        });
        
        // Properties panel
        document.getElementById('closeProperties')?.addEventListener('click', () => this.closeProperties());
    }

    setupDragAndDrop() {
        const dropZone = document.getElementById('sectionsDropZone');
        const container = document.getElementById('sectionsContainer');
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            
            const templateId = e.dataTransfer.getData('template-id');
            this.addSectionFromTemplate(templateId);
        });
        
        // Make sections sortable
        new Sortable(container, {
            animation: 150,
            onEnd: (evt) => this.reorderSections()
        });
    }

    handleDragStart(e) {
        const templateCard = e.target.closest('.template-card');
        e.dataTransfer.setData('template-id', templateCard.dataset.template);
        e.dataTransfer.effectAllowed = 'copy';
    }

    addSectionFromTemplate(templateId) {
        const template = this.getTemplateById(templateId);
        if (!template) return;
        
        const sectionId = this.generateId();
        const section = {
            id: sectionId,
            type: template.type,
            content: JSON.parse(JSON.stringify(template.content)),
            settings: {
                backgroundColor: '#ffffff',
                textColor: '#000000',
                padding: { top: 20, bottom: 20, left: 20, right: 20 },
                margin: { top: 0, bottom: 0 },
                borderRadius: 0,
                boxShadow: 'none'
            },
            order: this.sections.length
        };
        
        this.sections.push(section);
        this.renderSection(section);
        this.saveToHistory();
        this.showDropZonePlaceholder(false);
    }

    renderSection(section) {
        const container = document.getElementById('sectionsContainer');
        const sectionElement = document.createElement('div');
        sectionElement.className = 'builder-section';
        sectionElement.dataset.sectionId = section.id;
        
        sectionElement.innerHTML = `
            <div class="section-header">
                <div class="section-title">
                    <span class="section-icon">${this.getSectionIcon(section.type)}</span>
                    <span>${this.formatSectionType(section.type)}</span>
                </div>
                <div class="section-actions">
                    <button class="btn-icon" onclick="pageBuilder.editSection('${section.id}')">✏️</button>
                    <button class="btn-icon" onclick="pageBuilder.duplicateSection('${section.id}')">📋</button>
                    <button class="btn-icon" onclick="pageBuilder.deleteSection('${section.id}')">🗑️</button>
                </div>
            </div>
            <div class="section-content">
                ${this.renderSectionPreview(section)}
            </div>
        `;
        
        container.appendChild(sectionElement);
    }

    renderSectionPreview(section) {
        switch (section.type) {
            case 'hero':
                return `
                    <div class="hero-preview" style="background: ${section.settings.backgroundColor}; padding: 2rem; border-radius: 0.5rem;">
                        <h2 style="color: ${section.settings.textColor}">${section.content.title}</h2>
                        <p style="color: ${section.settings.textColor}">${section.content.subtitle}</p>
                    </div>
                `;
            case 'features':
                return `
                    <div class="features-preview">
                        <h3>${section.content.title}</h3>
                        <div class="features-grid">
                            ${section.content.features.map(feature => `
                                <div class="feature-item">
                                    <span class="feature-icon">${feature.icon}</span>
                                    <h4>${feature.title}</h4>
                                    <p>${feature.description}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            default:
                return `<div class="generic-preview">[${this.formatSectionType(section.type)} Section]</div>`;
        }
    }

    editSection(sectionId) {
        const section = this.sections.find(s => s.id === sectionId);
        if (!section) return;
        
        this.selectedSection = section;
        this.openPropertiesPanel(section);
    }

    openPropertiesPanel(section) {
        const panel = document.getElementById('propertiesPanel');
        panel.innerHTML = this.generatePropertiesForm(section);
        
        // Add event listeners for property changes
        this.setupPropertyListeners(section);
    }

    generatePropertiesForm(section) {
        let html = `
            <div class="property-group">
                <h4>Section Settings</h4>
                
                <div class="form-group">
                    <label>Background Color</label>
                    <div class="color-control">
                        <input type="color" class="color-picker" data-property="backgroundColor" value="${section.settings.backgroundColor}">
                        <input type="text" class="color-value" value="${section.settings.backgroundColor}" readonly>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Text Color</label>
                    <div class="color-control">
                        <input type="color" class="color-picker" data-property="textColor" value="${section.settings.textColor}">
                        <input type="text" class="color-value" value="${section.settings.textColor}" readonly>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Padding Top (px)</label>
                        <input type="number" class="form-control" data-setting="padding.top" value="${section.settings.padding.top}" min="0">
                    </div>
                    <div class="form-group">
                        <label>Padding Bottom (px)</label>
                        <input type="number" class="form-control" data-setting="padding.bottom" value="${section.settings.padding.bottom}" min="0">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Margin Top (px)</label>
                        <input type="number" class="form-control" data-setting="margin.top" value="${section.settings.margin.top}" min="0">
                    </div>
                    <div class="form-group">
                        <label>Margin Bottom (px)</label>
                        <input type="number" class="form-control" data-setting="margin.bottom" value="${section.settings.margin.bottom}" min="0">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Border Radius (px)</label>
                        <input type="number" class="form-control" data-setting="borderRadius" value="${section.settings.borderRadius}" min="0" max="50">
                    </div>
                    <div class="form-group">
                        <label>Box Shadow</label>
                        <select class="form-control" data-setting="boxShadow">
                            <option value="none" ${section.settings.boxShadow === 'none' ? 'selected' : ''}>None</option>
                            <option value="0 2px 4px rgba(0,0,0,0.1)" ${section.settings.boxShadow === '0 2px 4px rgba(0,0,0,0.1)' ? 'selected' : ''}>Light</option>
                            <option value="0 4px 8px rgba(0,0,0,0.15)" ${section.settings.boxShadow === '0 4px 8px rgba(0,0,0,0.15)' ? 'selected' : ''}>Medium</option>
                            <option value="0 8px 16px rgba(0,0,0,0.2)" ${section.settings.boxShadow === '0 8px 16px rgba(0,0,0,0.2)' ? 'selected' : ''}>Heavy</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
        
        // Add content-specific properties
        switch (section.type) {
            case 'hero':
                html += `
                    <div class="property-group">
                        <h4>Hero Content</h4>
                        <div class="form-group">
                            <label>Title</label>
                            <input type="text" class="form-control" data-content="title" value="${section.content.title}">
                        </div>
                        <div class="form-group">
                            <label>Subtitle</label>
                            <input type="text" class="form-control" data-content="subtitle" value="${section.content.subtitle}">
                        </div>
                    </div>
                `;
                break;
        }
        
        return html;
    }

    setupPropertyListeners(section) {
        // Color pickers
        document.querySelectorAll('.color-picker').forEach(input => {
            input.addEventListener('change', (e) => {
                const property = e.target.dataset.property;
                section.settings[property] = e.target.value;
                
                // Update color value display
                const colorValue = e.target.nextElementSibling;
                if (colorValue && colorValue.classList.contains('color-value')) {
                    colorValue.value = e.target.value;
                }
                
                this.updateSectionPreview(section);
                this.saveToHistory();
            });
        });
        
        // Setting inputs (padding, margin, etc.)
        document.querySelectorAll('[data-setting]').forEach(input => {
            input.addEventListener('input', (e) => {
                const settingPath = e.target.dataset.setting;
                const value = e.target.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value;
                
                // Handle nested properties like padding.top
                if (settingPath.includes('.')) {
                    const [parent, child] = settingPath.split('.');
                    section.settings[parent][child] = value;
                } else {
                    section.settings[settingPath] = value;
                }
                
                this.updateSectionPreview(section);
                this.saveToHistory();
            });
        });
        
        // Content inputs
        document.querySelectorAll('[data-content]').forEach(input => {
            input.addEventListener('input', (e) => {
                const property = e.target.dataset.content;
                section.content[property] = e.target.value;
                this.updateSectionPreview(section);
                this.saveToHistory();
            });
        });
    }

    updateSectionPreview(section) {
        const sectionElement = document.querySelector(`[data-section-id="${section.id}"]`);
        if (sectionElement) {
            const contentElement = sectionElement.querySelector('.section-content');
            contentElement.innerHTML = this.renderSectionPreview(section);
        }
    }

    duplicateSection(sectionId) {
        const section = this.sections.find(s => s.id === sectionId);
        if (!section) return;
        
        const newSection = JSON.parse(JSON.stringify(section));
        newSection.id = this.generateId();
        newSection.order = this.sections.length;
        
        this.sections.push(newSection);
        this.renderSection(newSection);
        this.saveToHistory();
    }

    deleteSection(sectionId) {
        if (!confirm('Are you sure you want to delete this section?')) return;
        
        this.sections = this.sections.filter(s => s.id !== sectionId);
        document.querySelector(`[data-section-id="${sectionId}"]`).remove();
        this.reorderSections();
        this.saveToHistory();
        this.showDropZonePlaceholder(this.sections.length === 0);
    }

    reorderSections() {
        const sectionElements = document.querySelectorAll('.builder-section');
        sectionElements.forEach((element, index) => {
            const sectionId = element.dataset.sectionId;
            const section = this.sections.find(s => s.id === sectionId);
            if (section) section.order = index;
        });
        this.sections.sort((a, b) => a.order - b.order);
        this.saveToHistory();
    }

    showDropZonePlaceholder(show) {
        const placeholder = document.getElementById('dropZonePlaceholder');
        const container = document.getElementById('sectionsContainer');
        
        if (show) {
            placeholder.style.display = 'block';
            container.style.display = 'none';
        } else {
            placeholder.style.display = 'none';
            container.style.display = 'block';
        }
    }

    saveToHistory() {
        // Remove future history if we're in the middle
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        this.history.push(JSON.parse(JSON.stringify(this.sections)));
        this.historyIndex = this.history.length - 1;
        
        this.updateHistoryButtons();
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.sections = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.refreshCanvas();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.sections = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.refreshCanvas();
        }
    }

    refreshCanvas() {
        const container = document.getElementById('sectionsContainer');
        container.innerHTML = '';
        
        this.sections.sort((a, b) => a.order - b.order);
        this.sections.forEach(section => this.renderSection(section));
        
        this.showDropZonePlaceholder(this.sections.length === 0);
        this.updateHistoryButtons();
    }

    updateHistoryButtons() {
        document.getElementById('undoBtn').disabled = this.historyIndex <= 0;
        document.getElementById('redoBtn').disabled = this.historyIndex >= this.history.length - 1;
    }

    async saveDraft() {
        await this.saveCampaign('draft');
    }

    async publish() {
        await this.saveCampaign('active');
    }

    async saveCampaign(status) {
        const formData = this.collectFormData();
        formData.status = status;
        
        try {
            const response = await fetch(`/builder/save/${this.campaignId || ''}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.campaignId = result.campaignId;
                this.showMessage('Campaign saved successfully!', 'success');
                
                // Add to version history
                this.addToVersionHistory(status);
                
                if (status === 'active') {
                    window.location.href = `/campaigns/${result.campaignId}`;
                }
            } else {
                this.showMessage(result.error || 'Failed to save campaign', 'error');
            }
        } catch (error) {
            console.error('Save error:', error);
            this.showMessage('Failed to save campaign', 'error');
        }
    }

    addToVersionHistory(status) {
        const versionData = {
            version: this.history.length,
            timestamp: new Date().toISOString(),
            status: status,
            sections: JSON.parse(JSON.stringify(this.sections)),
            campaignData: this.collectCampaignData()
        };
        
        // Store in localStorage as backup
        const versionHistory = JSON.parse(localStorage.getItem('campaignVersions') || '[]');
        versionHistory.push(versionData);
        
        // Keep only last 10 versions
        if (versionHistory.length > 10) {
            versionHistory.shift();
        }
        
        localStorage.setItem('campaignVersions', JSON.stringify(versionHistory));
        
        // Update UI
        this.updateVersionHistoryUI(versionHistory);
    }
    
    updateVersionHistoryUI(versions) {
        const historyPanel = document.getElementById('versionHistoryPanel');
        if (!historyPanel) return;
        
        historyPanel.innerHTML = `
            <div class="version-history-header">
                <h4>Version History</h4>
                <button class="btn btn-sm btn-outline" onclick="pageBuilder.clearVersionHistory()">Clear</button>
            </div>
            <div class="version-list">
                ${versions.map((version, index) => `
                    <div class="version-item" data-version="${index}">
                        <div class="version-info">
                            <span class="version-number">v${version.version}</span>
                            <span class="version-status ${version.status}">${version.status}</span>
                            <span class="version-time">${new Date(version.timestamp).toLocaleString()}</span>
                        </div>
                        <div class="version-actions">
                            <button class="btn-icon" onclick="pageBuilder.restoreVersion(${index})" title="Restore this version">🔄</button>
                            <button class="btn-icon" onclick="pageBuilder.compareVersion(${index})" title="Compare with current">🔍</button>
                        </div>
                    </div>
                `).reverse().join('')}
            </div>
        `;
    }
    
    restoreVersion(versionIndex) {
        const versions = JSON.parse(localStorage.getItem('campaignVersions') || '[]');
        const version = versions[versionIndex];
        
        if (!version) return;
        
        if (confirm(`Restore version ${version.version}? This will replace your current work.`)) {
            this.sections = JSON.parse(JSON.stringify(version.sections));
            this.refreshCanvas();
            this.saveToHistory();
            this.showMessage(`Restored version ${version.version}`, 'success');
        }
    }
    
    compareVersion(versionIndex) {
        const versions = JSON.parse(localStorage.getItem('campaignVersions') || '[]');
        const version = versions[versionIndex];
        
        if (!version) return;
        
        // Show comparison modal
        this.showComparisonModal(version);
    }
    
    showComparisonModal(version) {
        const modal = document.createElement('div');
        modal.className = 'comparison-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Compare Versions</h3>
                        <button class="close-button" onclick="this.closest('.comparison-modal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="version-comparison">
                            <div class="version-side">
                                <h4>Version ${version.version} (${new Date(version.timestamp).toLocaleString()})</h4>
                                <pre>${JSON.stringify(version.sections, null, 2)}</pre>
                            </div>
                            <div class="version-side">
                                <h4>Current Version</h4>
                                <pre>${JSON.stringify(this.sections, null, 2)}</pre>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    clearVersionHistory() {
        if (confirm('Clear all version history? This cannot be undone.')) {
            localStorage.removeItem('campaignVersions');
            this.updateVersionHistoryUI([]);
            this.showMessage('Version history cleared', 'info');
        }
    }
    
    collectCampaignData() {
        return {
            title: document.getElementById('campaignTitle').value,
            description: document.getElementById('campaignDescription').value,
            category: document.getElementById('campaignCategory').value,
            fundingGoal: document.getElementById('fundingGoal').value,
            deadline: document.getElementById('campaignDeadline').value
        };
    }
    
    collectFormData() {
        return {
            title: document.getElementById('campaignTitle').value,
            description: document.getElementById('campaignDescription').value,
            category: document.getElementById('campaignCategory').value,
            fundingGoal: document.getElementById('fundingGoal').value,
            deadline: document.getElementById('campaignDeadline').value,
            pageBuilderData: {
                sections: this.sections,
                globalStyles: this.getGlobalStyles(),
                customCSS: ''
            }
        };
    }

    getGlobalStyles() {
        return {
            fontFamily: 'inherit',
            primaryColor: '#3b82f6',
            secondaryColor: '#10b981',
            accentColor: '#8b5cf6',
            backgroundColor: '#ffffff'
        };
    }

    async preview() {
        if (!this.campaignId) {
            this.showMessage('Please save your campaign first to preview', 'warning');
            return;
        }
        
        // Open preview in same window to maintain authentication
        window.location.href = `/builder/${this.campaignId}/preview`;
    }

    loadExistingData() {
        // Load existing campaign data if editing
        if (typeof campaign !== 'undefined' && campaign && campaign.pageBuilder && campaign.pageBuilder.enabled) {
            this.sections = campaign.pageBuilder.sections || [];
            this.sections.forEach(section => this.renderSection(section));
            this.showDropZonePlaceholder(false);
            this.saveToHistory();
        } else {
            this.showDropZonePlaceholder(true);
        }
    }

    filterTemplates(category) {
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        const templates = document.querySelectorAll('.template-card');
        templates.forEach(template => {
            if (category === 'all' || template.dataset.type === category) {
                template.style.display = 'block';
            } else {
                template.style.display = 'none';
            }
        });
    }

    getTemplateById(id) {
        // In a real implementation, this would fetch from the server
        const templates = [
            {
                id: 'hero-basic',
                type: 'hero',
                content: {
                    title: 'Your Campaign Title',
                    subtitle: 'A compelling subtitle that explains your mission',
                    description: 'Detailed description of your campaign...',
                    image: '',
                    ctaText: 'Support This Campaign',
                    ctaLink: '#donate'
                }
            },
            {
                id: 'features-three-col',
                type: 'features',
                content: {
                    title: 'Key Features',
                    features: [
                        { icon: '💡', title: 'Feature One', description: 'First feature description' },
                        { icon: '🚀', title: 'Feature Two', description: 'Second feature description' },
                        { icon: '🎯', title: 'Feature Three', description: 'Third feature description' }
                    ]
                }
            },
            {
                id: 'hero-image',
                type: 'hero',
                content: {
                    title: 'Campaign with Image',
                    subtitle: 'Showcase your vision with compelling visuals',
                    description: 'Add an impactful image to grab attention',
                    image: '',
                    ctaText: 'Learn More',
                    ctaLink: '#'
                }
            },
            {
                id: 'testimonials-slider',
                type: 'testimonials',
                content: {
                    title: 'What People Say',
                    testimonials: [
                        { name: 'John Doe', role: 'Supporter', quote: 'This is an amazing initiative!', avatar: '' },
                        { name: 'Jane Smith', role: 'Mentor', quote: 'Incredible work being done here.', avatar: '' }
                    ]
                }
            },
            {
                id: 'contact-form',
                type: 'form',
                content: {
                    title: 'Get In Touch',
                    fields: [
                        { type: 'text', label: 'Name', required: true },
                        { type: 'email', label: 'Email', required: true },
                        { type: 'textarea', label: 'Message', required: true }
                    ],
                    buttonText: 'Send Message'
                }
            },
            {
                id: 'donation-form',
                type: 'form',
                content: {
                    title: 'Support This Campaign',
                    fields: [
                        { type: 'number', label: 'Donation Amount (BDT)', required: true, min: 100 },
                        { type: 'text', label: 'bKash Number', required: true },
                        { type: 'textarea', label: 'Your Message (Optional)', required: false }
                    ],
                    buttonText: 'Donate Now'
                }
            }
        ];
        
        return templates.find(t => t.id === id);
    }

    generateId() {
        return 'section_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getSectionIcon(type) {
        const icons = {
            hero: '🏔️',
            text: '📝',
            image: '🖼️',
            gallery: '🎨',
            video: '🎥',
            features: '⭐',
            testimonials: '💬',
            faq: '❓',
            cta: '🎯',
            form: '📋',
            divider: '---',
            custom: '⚙️'
        };
        return icons[type] || '📄';
    }

    formatSectionType(type) {
        return type.charAt(0).toUpperCase() + type.slice(1);
    }

    showMessage(message, type = 'info') {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            color: white;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            ${type === 'success' ? 'background: #10b981;' : ''}
            ${type === 'error' ? 'background: #ef4444;' : ''}
            ${type === 'warning' ? 'background: #f59e0b;' : ''}
            ${type === 'info' ? 'background: #3b82f6;' : ''}
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pageBuilder = new PageBuilder();
});

// Add SortableJS for drag and drop sorting
// In a real implementation, you'd include SortableJS library
class Sortable {
    constructor(element, options) {
        this.element = element;
        this.options = options;
        this.init();
    }
    
    init() {
        // Basic sortable implementation
        let draggedElement = null;
        
        this.element.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('builder-section')) {
                draggedElement = e.target;
                e.target.style.opacity = '0.5';
            }
        });
        
        this.element.addEventListener('dragover', (e) => {
            e.preventDefault();
            const target = e.target.closest('.builder-section');
            if (target && target !== draggedElement) {
                const rect = target.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                if (e.clientY < midpoint) {
                    target.parentNode.insertBefore(draggedElement, target);
                } else {
                    target.parentNode.insertBefore(draggedElement, target.nextSibling);
                }
            }
        });
        
        this.element.addEventListener('dragend', (e) => {
            if (draggedElement) {
                draggedElement.style.opacity = '1';
                draggedElement = null;
                if (this.options.onEnd) this.options.onEnd();
            }
        });
    }
}