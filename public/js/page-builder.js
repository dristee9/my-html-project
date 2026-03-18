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
            btn.addEventListener('click', (e) => this.filterTemplates(e.target.dataset.category, e));
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
        if (!templateCard) return;
        
        e.dataTransfer.setData('text/plain', templateCard.dataset.template);
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
            
            case 'testimonials':
                return `
                    <div class="testimonials-preview">
                        <h3>${section.content.title || 'Testimonials'}</h3>
                        <div class="testimonials-grid">
                            ${section.content.testimonials.map(testimonial => `
                                <div class="testimonial-item">
                                    <blockquote class="testimonial-quote">
                                        "${testimonial.quote}"
                                    </blockquote>
                                    <div class="testimonial-author">
                                        <strong>${testimonial.name}</strong>
                                        <span>${testimonial.role}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            
            case 'form':
                return `
                    <div class="form-preview">
                        <h3>${section.content.title}</h3>
                        <div class="form-fields">
                            ${section.content.fields.map(field => `
                                <div class="form-field">
                                    <label>${field.label}</label>
                                    ${field.type === 'textarea' ? 
                                        '<textarea disabled placeholder="Field preview"></textarea>' :
                                        `<input type="${field.type}" disabled placeholder="${field.label}">`
                                    }
                                    ${field.required ? '<small style="color: #ef4444;">* Required</small>' : ''}
                                </div>
                            `).join('')}
                            <button class="btn btn-primary" disabled>${section.content.buttonText}</button>
                        </div>
                    </div>
                `;
            
            case 'text':
                return `
                    <div class="text-preview" style="padding: 1rem;">
                        ${section.content.heading ? `<h3>${section.content.heading}</h3>` : ''}
                        <div class="text-body" style="line-height: 1.6; color: ${section.settings.textColor};">
                            ${section.content.body}
                        </div>
                    </div>
                `;
            
            case 'image':
                return `
                    <div class="image-preview">
                        <img src="${section.content.src}" alt="${section.content.alt}" style="max-width: 100%; height: auto; border-radius: 0.5rem;">
                        ${section.content.caption ? `<p class="image-caption" style="text-align: center; margin-top: 0.5rem; font-size: 0.875rem;">${section.content.caption}</p>` : ''}
                    </div>
                `;
            
            case 'gallery':
                return `
                    <div class="gallery-preview">
                        ${section.content.title ? `<h3>${section.content.title}</h3>` : ''}
                        <div class="gallery-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
                            ${section.content.images.map(img => `
                                <img src="${img}" alt="Gallery image" style="width: 100%; height: 150px; object-fit: cover; border-radius: 0.5rem;">
                            `).join('')}
                        </div>
                    </div>
                `;
            
            case 'video':
                return `
                    <div class="video-preview">
                        <div class="video-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; background: #000; border-radius: 0.5rem;">
                            <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" 
                                src="${section.content.url}" 
                                title="Video preview"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
                            </iframe>
                        </div>
                        ${section.content.caption ? `<p class="video-caption" style="text-align: center; margin-top: 0.5rem;">${section.content.caption}</p>` : ''}
                    </div>
                `;
            
            case 'cta':
                return `
                    <div class="cta-preview" style="text-align: center; padding: 2rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 0.5rem;">
                        <h3 style="color: white; margin-bottom: 1rem;">${section.content.heading}</h3>
                        <p style="color: rgba(255,255,255,0.9); margin-bottom: 1.5rem;">${section.content.description}</p>
                        <button class="btn" style="background: white; color: #667eea; padding: 0.75rem 2rem; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer;">
                            ${section.content.buttonText}
                        </button>
                    </div>
                `;
            
            case 'faq':
                return `
                    <div class="faq-preview">
                        ${section.content.title ? `<h3>${section.content.title}</h3>` : ''}
                        <div class="faq-list">
                            ${section.content.faqs.map(faq => `
                                <div class="faq-item" style="border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem; margin-bottom: 0.75rem;">
                                    <h4 style="font-weight: 600; margin-bottom: 0.5rem; color: #1f2937;">❓ ${faq.question}</h4>
                                    <p style="color: #4b5563; line-height: 1.5;">${faq.answer}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            
            case 'divider':
                return `
                    <div class="divider-preview" style="padding: 1rem 0;">
                        <hr style="border: none; border-top: 2px solid #e5e7eb;">
                    </div>
                `;
            
            case 'custom':
                return `
                    <div class="custom-preview" style="padding: 2rem; border: 2px dashed #9ca3af; border-radius: 0.5rem; text-align: center;">
                        <h4>⚙️ Custom Section</h4>
                        <p style="color: #6b7280;">Custom HTML or embedded content</p>
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
                        <div class="form-group">
                            <label>Description</label>
                            <textarea class="form-control" data-content="description" rows="3">${section.content.description}</textarea>
                        </div>
                        <div class="form-group">
                            <label>CTA Text</label>
                            <input type="text" class="form-control" data-content="ctaText" value="${section.content.ctaText}">
                        </div>
                        <div class="form-group">
                            <label>CTA Link</label>
                            <input type="text" class="form-control" data-content="ctaLink" value="${section.content.ctaLink}">
                        </div>
                    </div>
                `;
                break;
            
            case 'features':
                html += `
                    <div class="property-group">
                        <h4>Features Content</h4>
                        <div class="form-group">
                            <label>Section Title</label>
                            <input type="text" class="form-control" data-content="title" value="${section.content.title}">
                        </div>
                        <div class="form-group">
                            <label>Features</label>
                            <div id="featuresList">
                                ${section.content.features.map((feature, index) => `
                                    <div class="feature-item-editable" style="border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                            <strong>Feature ${index + 1}</strong>
                                            <button type="button" class="btn-icon" onclick="pageBuilder.removeFeature(${index})" title="Remove feature">🗑️</button>
                                        </div>
                                        <div class="form-group" style="margin-bottom: 8px;">
                                            <label style="font-size: 12px;">Icon</label>
                                            <input type="text" class="form-control" data-content="features[${index}].icon" value="${feature.icon}" style="font-size: 14px;">
                                        </div>
                                        <div class="form-group" style="margin-bottom: 8px;">
                                            <label style="font-size: 12px;">Title</label>
                                            <input type="text" class="form-control" data-content="features[${index}].title" value="${feature.title}">
                                        </div>
                                        <div class="form-group">
                                            <label style="font-size: 12px;">Description</label>
                                            <textarea class="form-control" data-content="features[${index}].description" rows="2">${feature.description}</textarea>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            <button type="button" class="btn btn-sm btn-outline" onclick="pageBuilder.addFeature()" style="width: 100%; margin-top: 8px;">+ Add Feature</button>
                        </div>
                    </div>
                `;
                break;
            
            case 'testimonials':
                html += `
                    <div class="property-group">
                        <h4>Testimonials Content</h4>
                        <div class="form-group">
                            <label>Section Title</label>
                            <input type="text" class="form-control" data-content="title" value="${section.content.title}">
                        </div>
                        <div class="form-group">
                            <label>Testimonials</label>
                            <div id="testimonialsList">
                                ${section.content.testimonials.map((testimonial, index) => `
                                    <div class="testimonial-item-editable" style="border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                            <strong>Testimonial ${index + 1}</strong>
                                            <button type="button" class="btn-icon" onclick="pageBuilder.removeTestimonial(${index})" title="Remove testimonial">🗑️</button>
                                        </div>
                                        <div class="form-group" style="margin-bottom: 8px;">
                                            <label style="font-size: 12px;">Name</label>
                                            <input type="text" class="form-control" data-content="testimonials[${index}].name" value="${testimonial.name}">
                                        </div>
                                        <div class="form-group" style="margin-bottom: 8px;">
                                            <label style="font-size: 12px;">Role</label>
                                            <input type="text" class="form-control" data-content="testimonials[${index}].role" value="${testimonial.role}">
                                        </div>
                                        <div class="form-group" style="margin-bottom: 8px;">
                                            <label style="font-size: 12px;">Quote</label>
                                            <textarea class="form-control" data-content="testimonials[${index}].quote" rows="2">${testimonial.quote}</textarea>
                                        </div>
                                        <div class="form-group">
                                            <label style="font-size: 12px;">Avatar URL (optional)</label>
                                            <input type="text" class="form-control" data-content="testimonials[${index}].avatar" value="${testimonial.avatar}">
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            <button type="button" class="btn btn-sm btn-outline" onclick="pageBuilder.addTestimonial()" style="width: 100%; margin-top: 8px;">+ Add Testimonial</button>
                        </div>
                    </div>
                `;
                break;
            
            case 'form':
                html += `
                    <div class="property-group">
                        <h4>Form Content</h4>
                        <div class="form-group">
                            <label>Form Title</label>
                            <input type="text" class="form-control" data-content="title" value="${section.content.title}">
                        </div>
                        <div class="form-group">
                            <label>Button Text</label>
                            <input type="text" class="form-control" data-content="buttonText" value="${section.content.buttonText}">
                        </div>
                        <div class="form-group">
                            <label>Form Fields</label>
                            <div id="fieldsList">
                                ${section.content.fields.map((field, index) => `
                                    <div class="field-item-editable" style="border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                            <strong>Field ${index + 1}</strong>
                                            <button type="button" class="btn-icon" onclick="pageBuilder.removeFormField(${index})" title="Remove field">🗑️</button>
                                        </div>
                                        <div class="form-group" style="margin-bottom: 8px;">
                                            <label style="font-size: 12px;">Label</label>
                                            <input type="text" class="form-control" data-content="fields[${index}].label" value="${field.label}">
                                        </div>
                                        <div class="form-group" style="margin-bottom: 8px;">
                                            <label style="font-size: 12px;">Field Type</label>
                                            <select class="form-control" data-content="fields[${index}].type">
                                                <option value="text" ${field.type === 'text' ? 'selected' : ''}>Text</option>
                                                <option value="email" ${field.type === 'email' ? 'selected' : ''}>Email</option>
                                                <option value="number" ${field.type === 'number' ? 'selected' : ''}>Number</option>
                                                <option value="textarea" ${field.type === 'textarea' ? 'selected' : ''}>Textarea</option>
                                                <option value="tel" ${field.type === 'tel' ? 'selected' : ''}>Phone</option>
                                            </select>
                                        </div>
                                        <div class="form-group">
                                            <label style="font-size: 12px;">
                                                <input type="checkbox" data-content="fields[${index}].required" ${field.required ? 'checked' : ''}>
                                                Required
                                            </label>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            <button type="button" class="btn btn-sm btn-outline" onclick="pageBuilder.addFormField()" style="width: 100%; margin-top: 8px;">+ Add Field</button>
                        </div>
                    </div>
                `;
                break;
            
            case 'text':
                html += `
                    <div class="property-group">
                        <h4>Text Content</h4>
                        <div class="form-group">
                            <label>Heading (optional)</label>
                            <input type="text" class="form-control" data-content="heading" value="${section.content.heading || ''}">
                        </div>
                        <div class="form-group">
                            <label>Body Text</label>
                            <textarea class="form-control" data-content="body" rows="6">${section.content.body}</textarea>
                        </div>
                    </div>
                `;
                break;
            
            case 'image':
                html += `
                    <div class="property-group">
                        <h4>Image Content</h4>
                        <div class="form-group">
                            <label>Image URL</label>
                            <input type="text" class="form-control" data-content="src" value="${section.content.src}">
                        </div>
                        <div class="form-group">
                            <label>Alt Text</label>
                            <input type="text" class="form-control" data-content="alt" value="${section.content.alt}">
                        </div>
                        <div class="form-group">
                            <label>Caption (optional)</label>
                            <input type="text" class="form-control" data-content="caption" value="${section.content.caption || ''}">
                        </div>
                    </div>
                `;
                break;
            
            case 'cta':
                html += `
                    <div class="property-group">
                        <h4>Call to Action</h4>
                        <div class="form-group">
                            <label>Heading</label>
                            <input type="text" class="form-control" data-content="heading" value="${section.content.heading}">
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea class="form-control" data-content="description" rows="3">${section.content.description}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Button Text</label>
                            <input type="text" class="form-control" data-content="buttonText" value="${section.content.buttonText}">
                        </div>
                        <div class="form-group">
                            <label>Button Link</label>
                            <input type="text" class="form-control" data-content="buttonLink" value="${section.content.buttonLink}">
                        </div>
                    </div>
                `;
                break;
            
            case 'faq':
                html += `
                    <div class="property-group">
                        <h4>FAQ Content</h4>
                        <div class="form-group">
                            <label>Section Title (optional)</label>
                            <input type="text" class="form-control" data-content="title" value="${section.content.title || ''}">
                        </div>
                        <div class="form-group">
                            <label>FAQ Items</label>
                            <div id="faqList">
                                ${section.content.faqs.map((faq, index) => `
                                    <div class="faq-item-editable" style="border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                            <strong>Q&A ${index + 1}</strong>
                                            <button type="button" class="btn-icon" onclick="pageBuilder.removeFaq(${index})" title="Remove FAQ">🗑️</button>
                                        </div>
                                        <div class="form-group" style="margin-bottom: 8px;">
                                            <label style="font-size: 12px;">Question</label>
                                            <input type="text" class="form-control" data-content="faqs[${index}].question" value="${faq.question}">
                                        </div>
                                        <div class="form-group">
                                            <label style="font-size: 12px;">Answer</label>
                                            <textarea class="form-control" data-content="faqs[${index}].answer" rows="3">${faq.answer}</textarea>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            <button type="button" class="btn btn-sm btn-outline" onclick="pageBuilder.addFaq()" style="width: 100%; margin-top: 8px;">+ Add FAQ</button>
                        </div>
                    </div>
                `;
                break;
            
            case 'gallery':
                html += `
                    <div class="property-group">
                        <h4>Gallery Content</h4>
                        <div class="form-group">
                            <label>Section Title (optional)</label>
                            <input type="text" class="form-control" data-content="title" value="${section.content.title || ''}">
                        </div>
                        <div class="form-group">
                            <label>Images</label>
                            <div id="galleryList">
                                ${section.content.images.map((image, index) => `
                                    <div class="gallery-item-editable" style="border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 4px; display: flex; gap: 10px; align-items: start;">
                                        <div style="flex: 1;">
                                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                                <strong>Image ${index + 1}</strong>
                                                <button type="button" class="btn-icon" onclick="pageBuilder.removeGalleryImage(${index})" title="Remove image">🗑️</button>
                                            </div>
                                            <div class="form-group" style="margin-bottom: 8px;">
                                                <label style="font-size: 12px;">Image URL</label>
                                                <input type="text" class="form-control" data-content="images[${index}]" value="${image}" style="font-size: 12px;">
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            <button type="button" class="btn btn-sm btn-outline" onclick="pageBuilder.addGalleryImage()" style="width: 100%; margin-top: 8px;">+ Add Image</button>
                        </div>
                    </div>
                `;
                break;
            
            case 'video':
                html += `
                    <div class="property-group">
                        <h4>Video Content</h4>
                        <div class="form-group">
                            <label>Video URL (YouTube/Vimeo)</label>
                            <input type="text" class="form-control" data-content="url" value="${section.content.url}">
                        </div>
                        <div class="form-group">
                            <label>Caption (optional)</label>
                            <input type="text" class="form-control" data-content="caption" value="${section.content.caption || ''}">
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
                const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                
                // Handle nested properties like features[0].title
                if (property.includes('[')) {
                    const match = property.match(/([\w]+)\[(\d+)\]\.?([\w]*)/);
                    if (match) {
                        const [, arrayName, index, nestedProp] = match;
                        if (!section.content[arrayName]) section.content[arrayName] = [];
                        
                        if (nestedProp) {
                            // Nested object property like features[0].title
                            if (section.content[arrayName][index]) {
                                section.content[arrayName][index][nestedProp] = value;
                            }
                        } else {
                            // Direct array value like images[0]
                            section.content[arrayName][parseInt(index)] = value;
                        }
                    }
                } else {
                    section.content[property] = value;
                }
                
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

    async addToVersionHistory(status) {
        const versionData = {
            version: this.history.length,
            timestamp: new Date().toISOString(),
            status: status,
            sections: JSON.parse(JSON.stringify(this.sections)),
            campaignData: this.collectCampaignData()
        };
        
        // Store version history server-side via API
        try {
            const response = await fetch(`/builder/${this.campaignId}/versions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify(versionData)
            });
            
            if (response.ok) {
                const result = await response.json();
                // Update UI with server-stored versions
                this.updateVersionHistoryUI(result.versions);
            }
        } catch (error) {
            console.error('Error saving version history:', error);
            // Fallback to local UI update only
            this.showMessage('Saved, but version history not stored', 'warning');
        }
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
    
    async loadVersionHistory() {
        if (!this.campaignId) return [];
        
        try {
            const response = await fetch(`/builder/${this.campaignId}/versions`);
            if (response.ok) {
                const result = await response.json();
                return result.versions || [];
            }
        } catch (error) {
            console.error('Error loading version history:', error);
        }
        return [];
    }
    
    async restoreVersion(versionIndex) {
        const versions = await this.loadVersionHistory();
        const version = versions[versionIndex];
        
        if (!version) return;
        
        if (confirm(`Restore version ${version.version}? This will replace your current work.`)) {
            this.sections = JSON.parse(JSON.stringify(version.sections));
            this.refreshCanvas();
            this.saveToHistory();
            this.showMessage(`Restored version ${version.version}`, 'success');
        }
    }
    
    async compareVersion(versionIndex) {
        const versions = await this.loadVersionHistory();
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
    
    async clearVersionHistory() {
        if (confirm('Clear all version history? This cannot be undone.')) {
            try {
                const response = await fetch(`/builder/${this.campaignId}/versions`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    this.updateVersionHistoryUI([]);
                    this.showMessage('Version history cleared', 'info');
                }
            } catch (error) {
                console.error('Error clearing version history:', error);
                this.showMessage('Failed to clear version history', 'error');
            }
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

    filterTemplates(category, event) {
        if (!event) return;
        
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
            },
            {
                id: 'text-basic',
                type: 'text',
                content: {
                    heading: 'Text Section',
                    body: 'This is a basic text section. You can use this section to add descriptive content about your campaign, mission, or any information you want to share with your audience.'
                }
            },
            {
                id: 'image-basic',
                type: 'image',
                content: {
                    src: 'https://via.placeholder.com/800x400',
                    alt: 'Campaign image',
                    caption: 'Image caption goes here'
                }
            },
            {
                id: 'gallery-grid',
                type: 'gallery',
                content: {
                    title: 'Photo Gallery',
                    images: [
                        'https://via.placeholder.com/400x300',
                        'https://via.placeholder.com/400x300',
                        'https://via.placeholder.com/400x300'
                    ]
                }
            },
            {
                id: 'video-youtube',
                type: 'video',
                content: {
                    url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                    caption: 'Video caption or description'
                }
            },
            {
                id: 'cta-basic',
                type: 'cta',
                content: {
                    heading: 'Take Action Now',
                    description: 'Encourage visitors to take the next step and support your cause.',
                    buttonText: 'Get Involved',
                    buttonLink: '#donate'
                }
            },
            {
                id: 'faq-basic',
                type: 'faq',
                content: {
                    title: 'Frequently Asked Questions',
                    faqs: [
                        { question: 'What is this campaign about?', answer: 'This campaign aims to make a positive impact by addressing an important issue.' },
                        { question: 'How can I contribute?', answer: 'You can contribute by donating, sharing our campaign, or volunteering your time.' }
                    ]
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

    // Dynamic feature management
    addFeature() {
        if (!this.selectedSection) return;
        this.selectedSection.content.features.push({
            icon: '✨',
            title: 'New Feature',
            description: 'Feature description here'
        });
        this.openPropertiesPanel(this.selectedSection);
        this.updateSectionPreview(this.selectedSection);
        this.saveToHistory();
    }

    removeFeature(index) {
        if (!this.selectedSection) return;
        this.selectedSection.content.features.splice(index, 1);
        this.openPropertiesPanel(this.selectedSection);
        this.updateSectionPreview(this.selectedSection);
        this.saveToHistory();
    }

    // Dynamic testimonial management
    addTestimonial() {
        if (!this.selectedSection) return;
        this.selectedSection.content.testimonials.push({
            name: 'Person Name',
            role: 'Supporter',
            quote: 'Great testimonial text here',
            avatar: ''
        });
        this.openPropertiesPanel(this.selectedSection);
        this.updateSectionPreview(this.selectedSection);
        this.saveToHistory();
    }

    removeTestimonial(index) {
        if (!this.selectedSection) return;
        this.selectedSection.content.testimonials.splice(index, 1);
        this.openPropertiesPanel(this.selectedSection);
        this.updateSectionPreview(this.selectedSection);
        this.saveToHistory();
    }

    // Dynamic form field management
    addFormField() {
        if (!this.selectedSection) return;
        this.selectedSection.content.fields.push({
            type: 'text',
            label: 'New Field',
            required: false
        });
        this.openPropertiesPanel(this.selectedSection);
        this.updateSectionPreview(this.selectedSection);
        this.saveToHistory();
    }

    removeFormField(index) {
        if (!this.selectedSection) return;
        this.selectedSection.content.fields.splice(index, 1);
        this.openPropertiesPanel(this.selectedSection);
        this.updateSectionPreview(this.selectedSection);
        this.saveToHistory();
    }

    // Dynamic FAQ management
    addFaq() {
        if (!this.selectedSection) return;
        this.selectedSection.content.faqs.push({
            question: 'New Question?',
            answer: 'Answer to the question goes here.'
        });
        this.openPropertiesPanel(this.selectedSection);
        this.updateSectionPreview(this.selectedSection);
        this.saveToHistory();
    }

    removeFaq(index) {
        if (!this.selectedSection) return;
        this.selectedSection.content.faqs.splice(index, 1);
        this.openPropertiesPanel(this.selectedSection);
        this.updateSectionPreview(this.selectedSection);
        this.saveToHistory();
    }

    // Dynamic gallery image management
    addGalleryImage() {
        if (!this.selectedSection) return;
        this.selectedSection.content.images.push('https://via.placeholder.com/400x300');
        this.openPropertiesPanel(this.selectedSection);
        this.updateSectionPreview(this.selectedSection);
        this.saveToHistory();
    }

    removeGalleryImage(index) {
        if (!this.selectedSection) return;
        this.selectedSection.content.images.splice(index, 1);
        this.openPropertiesPanel(this.selectedSection);
        this.updateSectionPreview(this.selectedSection);
        this.saveToHistory();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pageBuilder = new PageBuilder();
});