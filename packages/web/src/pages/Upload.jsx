import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { AppContext } from '../App';
import {
    Upload as UploadIcon,
    FileText,
    CheckCircle2,
    X,
    CloudUpload,
    Loader2,
    LayoutTemplate
} from 'lucide-react';
import './Upload.css';

const steps = ['Initialization', 'Classify Document', 'Review & Submit'];

export default function Upload() {
    const { categories, userBranches, userDepartment, user, departments } = useContext(AppContext);
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    
    // Mode Selection: manual or template
    const [uploadMode, setUploadMode] = useState('manual');
    
    // Manual State
    const [file, setFile] = useState(null);
    
    // Template State
    const [availableTemplates, setAvailableTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [documentTitle, setDocumentTitle] = useState('');
    const [templateFormData, setTemplateFormData] = useState({});

    // Classification State
    const [category, setCategory] = useState('');
    const [subCategory, setSubCategory] = useState('');
    const [subCategories, setSubCategories] = useState([]);
    const [branch, setBranch] = useState(userBranches?.[0] || 'Astara Hotel');
    const [department, setDepartment] = useState(userDepartment || 'GENERAL');
    const [notes, setNotes] = useState('');
    const [workflowPreview, setWorkflowPreview] = useState(null);
    const [dynamicDepts, setDynamicDepts] = useState({});

    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Fetch templates
        api.admin.templates.active()
            .then(data => setAvailableTemplates(data || []))
            .catch(err => console.error('Failed to load templates', err));
    }, []);

    // Fetch sub-categories when category changes
    useEffect(() => {
        if (category) {
            api.subcategories.list(category)
                .then(data => {
                    setSubCategories(data || []);
                    setSubCategory(''); // Reset when category changes
                })
                .catch(() => setSubCategories([]));
        } else {
            setSubCategories([]);
            setSubCategory('');
        }
    }, [category]);

    // Fetch workflow preview when classification options change
    useEffect(() => {
        if (category && branch) {
            api.documents.previewWorkflow(category, branch, subCategory)
                .then(data => {
                    setWorkflowPreview(data);
                    setDynamicDepts({});
                })
                .catch(console.error);
        } else {
            setWorkflowPreview(null);
        }
    }, [category, branch, subCategory]);

    // Auto-calculate total_price for template generation
    const activeTemplate = availableTemplates.find(t => t.id === selectedTemplateId);
    
    useEffect(() => {
        if (!activeTemplate || !activeTemplate.fieldsConfig) return;

        const hasTotalPriceField = activeTemplate.fieldsConfig.some(f => f.name === 'total_price' || f.type === 'readonly');
        if (!hasTotalPriceField) return;

        let totalSum = 0;
        for (const [key, value] of Object.entries(templateFormData)) {
            if (key.startsWith('price_')) {
                const numVal = parseFloat(value) || 0;
                totalSum += numVal;
            }
        }

        let targetField = activeTemplate.fieldsConfig.find(f => f.name === 'total_price' || f.type === 'readonly')?.name;
        if (!targetField || targetField === 'undefined') targetField = 'total_price';

        if (templateFormData[targetField] !== String(totalSum)) {
            setTemplateFormData(prev => ({ ...prev, [targetField]: String(totalSum) }));
        }
    }, [templateFormData, activeTemplate]);

    const next = () => {
        if (currentStep === 1) {
            // Validate dynamic departments
            const reqSteps = workflowPreview?.steps?.filter(s => s.isDynamicDepartment) || [];
            for (const s of reqSteps) {
                if (!dynamicDepts[s.stepOrder]) {
                    setError(`Please select a target department for Step ${s.stepOrder}`);
                    return;
                }
            }
        }
        if (currentStep < 2) setCurrentStep(currentStep + 1);
        setError('');
    };

    const prev = () => {
        if (currentStep > 0) setCurrentStep(currentStep - 1);
        setError('');
    };

    const submit = async () => {
        if (uploadMode === 'manual' && (!file || !category)) return;
        if (uploadMode === 'template' && (!selectedTemplateId || !category)) return;

        if (uploadMode === 'template' && !documentTitle.trim()) {
            setError('Isian Judul Dokumen (Document Title) wajib diisi.');
            return;
        }

        setIsUploading(true);
        setError('');

        try {
            if (uploadMode === 'manual') {
                const formData = new FormData();
                formData.append('documentFile', file);
                formData.append('title', file.name);
                formData.append('category', category);
                formData.append('branch', branch);
                formData.append('department', department);
                if (subCategory) formData.append('subCategory', subCategory);
                if (notes) formData.append('notes', notes);
                
                if (Object.keys(dynamicDepts).length > 0) {
                    const mapArr = Object.keys(dynamicDepts).map(order => ({ stepOrder: parseInt(order), department: dynamicDepts[order] }));
                    formData.append('dynamicDepartments', JSON.stringify(mapArr));
                }

                await api.documents.upload(formData);
            } else {
                const activeTpl = availableTemplates.find(t => t.id === selectedTemplateId);
                const payload = {
                    templateId: selectedTemplateId,
                    formData: templateFormData,
                    documentTitle: documentTitle,
                    title: `${activeTpl?.name}`,
                    category,
                    branch,
                    department,
                    subCategory: subCategory || undefined,
                    notes: notes || undefined
                };
                if (Object.keys(dynamicDepts).length > 0) {
                    payload.dynamicDepartments = Object.keys(dynamicDepts).map(order => ({ stepOrder: parseInt(order), department: dynamicDepts[order] }));
                }

                await api.documents.generate(payload);
            }

            navigate('/documents');
        } catch (err) {
            console.error("Upload/Generate failed", err);
            let errorMessage = err.message;
            if (err.response && err.response.data) {
                errorMessage = err.response.data.message || err.response.data.error || err.message;
            }
            setError(errorMessage || 'Failed to submit document. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const f = e.dataTransfer?.files?.[0] || e.target.files?.[0];
        if (f && f.type === 'application/pdf') {
            setFile(f);
            setUploadMode('manual');
        }
    };

    return (
        <div className="upload-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Create Document</h1>
                    <p className="page-subtitle">Submit a new document for approval</p>
                </div>
            </div>

            {/* Step Indicator */}
            <div className="step-indicator">
                {steps.map((label, i) => (
                    <div key={i} className={`step-item ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'completed' : ''}`}>
                        <div className="step-number">
                            {i < currentStep ? <CheckCircle2 size={16} /> : i + 1}
                        </div>
                        <span className="step-label">{label}</span>
                        {i < steps.length - 1 && <div className="step-connector" />}
                    </div>
                ))}
            </div>

            <div className="card upload-card">
                {/* Step 1: Upload or Template */}
                {currentStep === 0 && (
                    <div className="upload-step animate-fade-in">
                        
                        <div className="mode-switcher" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: 'var(--bg-subtle)', padding: '0.5rem', borderRadius: '12px' }}>
                            <button
                                className={`btn ${uploadMode === 'manual' ? 'btn-primary' : 'btn-ghost'}`}
                                style={{ flex: 1 }}
                                onClick={() => setUploadMode('manual')}
                            >
                                <UploadIcon size={18} style={{ marginRight: '8px' }} /> Upload Existing PDF
                            </button>
                            <button
                                className={`btn ${uploadMode === 'template' ? 'btn-primary' : 'btn-ghost'}`}
                                style={{ flex: 1 }}
                                onClick={() => setUploadMode('template')}
                            >
                                <LayoutTemplate size={18} style={{ marginRight: '8px' }} /> Generate from Template
                            </button>
                        </div>

                        {uploadMode === 'manual' ? (
                            <div
                                className={`drop-zone ${file ? 'has-file' : ''}`}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                            >
                                {!file ? (
                                    <>
                                        <CloudUpload size={48} strokeWidth={1} className="drop-icon" />
                                        <p className="drop-text">Drag and drop your PDF here</p>
                                        <span className="drop-hint">or click to browse — Max 25MB</span>
                                        <label className="btn btn-secondary btn-sm drop-browse">
                                            Browse Files
                                            <input type="file" accept=".pdf" hidden onChange={handleDrop} />
                                        </label>
                                    </>
                                ) : (
                                    <div className="file-preview">
                                        <FileText size={32} />
                                        <div className="file-info">
                                            <h4>{file.name}</h4>
                                            <span>{(file.size / 1024).toFixed(1)} KB</span>
                                        </div>
                                        <button className="btn-icon" onClick={() => setFile(null)}>
                                            <X size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="template-zone" style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                                <div className="form-group">
                                    <label className="form-label">Select Base Template *</label>
                                    <select 
                                        className="form-select"
                                        value={selectedTemplateId} 
                                        onChange={e => setSelectedTemplateId(e.target.value)}
                                    >
                                        <option value="">— Choose a Template —</option>
                                        {availableTemplates.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {selectedTemplateId && (
                                    <div className="form-group" style={{ marginTop: '1.5rem' }}>
                                        <label className="form-label">Judul Dokumen (Document Title) *</label>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            placeholder="Misal: Pembelian Kursi Operasional"
                                            value={documentTitle}
                                            onChange={e => setDocumentTitle(e.target.value)}
                                        />
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                            Nama ini akan digabung dengan jenis template sebagai nama final file.
                                        </p>
                                    </div>
                                )}

                                {activeTemplate && activeTemplate.fieldsConfig && activeTemplate.fieldsConfig.length > 0 && (
                                    <div style={{ marginTop: '1.5rem', background: 'var(--bg-card-hover)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                        <h4 style={{ marginBottom: '1rem' }}>Template Document Fields</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                            {activeTemplate.fieldsConfig.map(field => (
                                                <div key={field.name} className="form-group" style={{ marginBottom: 0 }}>
                                                    <label className="form-label">{field.label} {field.required && '*'}</label>
                                                    {field.type === 'textarea' ? (
                                                        <textarea 
                                                            className="form-input" 
                                                            rows={4}
                                                            placeholder={`Enter ${field.label}...`}
                                                            value={templateFormData[field.name] || ''}
                                                            onChange={e => setTemplateFormData({ ...templateFormData, [field.name]: e.target.value })}
                                                        />
                                                    ) : (
                                                        <input 
                                                            type={field.type === 'readonly' ? 'text' : field.type || 'text'}
                                                            className="form-input"
                                                            placeholder={field.type === 'readonly' || field.name === 'total_price' ? 'Auto calculated...' : `Enter ${field.label}...`}
                                                            value={templateFormData[field.name] || ''}
                                                            onChange={e => setTemplateFormData({ ...templateFormData, [field.name]: e.target.value })}
                                                            readOnly={field.type === 'readonly' || field.name === 'total_price'}
                                                            style={(field.type === 'readonly' || field.name === 'total_price') ? { backgroundColor: 'var(--bg-subtle)' } : {}}
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {activeTemplate && (!activeTemplate.fieldsConfig || activeTemplate.fieldsConfig.length === 0) && (
                                    <p className="text-muted text-center" style={{ marginTop: '1rem' }}>This template requires no direct input data.</p>
                                )}
                            </div>
                        )}

                    </div>
                )}

                {/* Step 2: Classify */}
                {currentStep === 1 && (
                    <div className="classify-step animate-fade-in">
                        <div className="form-group">
                            <label className="form-label">Document Category *</label>
                            <div className="category-grid">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        className={`category-option ${category === cat.id ? 'selected' : ''}`}
                                        onClick={() => setCategory(cat.id)}
                                    >
                                        <FileText size={20} />
                                        <span>{cat.name}</span>
                                        <small>{cat.id}</small>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sub-Category Dropdown */}
                        {subCategories.length > 0 && (
                            <div className="form-group">
                                <label className="form-label">Document Type / Sub-Category</label>
                                <select
                                    className="form-select"
                                    value={subCategory}
                                    onChange={(e) => setSubCategory(e.target.value)}
                                >
                                    <option value="">— Default (No Sub-Category) —</option>
                                    {subCategories.map(sc => (
                                        <option key={sc} value={sc}>{sc}</option>
                                    ))}
                                </select>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    Select a specific document type to use the correct approval workflow.
                                </p>
                            </div>
                        )}

                        <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label className="form-label">Branch *</label>
                                <select 
                                    className="form-select" 
                                    value={branch} 
                                    onChange={(e) => setBranch(e.target.value)}
                                    disabled={userBranches?.length === 1}
                                >
                                    {(userBranches || ['Astara Hotel']).map(b => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                </select>
                                {userBranches?.length === 1 && (
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        Auto-selected based on your assigned branch.
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="form-label">Department *</label>
                                <select className="form-select" value={department} onChange={e => setDepartment(e.target.value)}>
                                    <option value="GENERAL">GENERAL</option>
                                    {departments?.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Notes (optional)</label>
                            <textarea
                                className="form-input"
                                rows={3}
                                placeholder="Add any notes for the approvers..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>

                        {workflowPreview?.steps?.some(s => s.isDynamicDepartment) && (
                            <div className="form-group" style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-card-hover)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <h4 style={{ marginBottom: '12px', fontSize: '0.95rem' }}>Dynamic Routing Requirements</h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                                    The selected workflow requires you to specify the target department for certain approval steps.
                                </p>
                                {workflowPreview.steps.filter(s => s.isDynamicDepartment).map(step => (
                                    <div key={step.id} style={{ marginBottom: '10px' }}>
                                        <label className="form-label" style={{ fontSize: '0.85rem' }}>
                                            Step {step.stepOrder} ({(step.roleRequired || '').replace(/_/g, ' ').toUpperCase()}) *
                                        </label>
                                        <select 
                                            className="form-select" 
                                            value={dynamicDepts[step.stepOrder] || ''} 
                                            onChange={(e) => setDynamicDepts(prev => ({ ...prev, [step.stepOrder]: e.target.value }))}
                                        >
                                            <option value="">— Select Target Department —</option>
                                            {departments?.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Review */}
                {currentStep === 2 && (
                    <div className="review-step animate-fade-in">
                        <h3 className="review-title">Review Before Submitting</h3>
                        <div className="review-grid">
                            <div className="review-item">
                                <span className="info-label">Type</span>
                                <span className="info-value">
                                    {uploadMode === 'manual' ? 
                                        <span><UploadIcon size={14} style={{ display: 'inline', verticalAlign: 'middle' }}/> Manual PDF Upload</span> 
                                        : 
                                        <span><LayoutTemplate size={14} style={{ display: 'inline', verticalAlign: 'middle' }}/> Generated from Template</span>
                                    }
                                </span>
                            </div>
                            <div className="review-item">
                                <span className="info-label">{uploadMode === 'manual' ? 'File' : 'Template'}</span>
                                <span className="info-value">{uploadMode === 'manual' ? file?.name : activeTemplate?.name}</span>
                            </div>
                            <div className="review-item">
                                <span className="info-label">Category</span>
                                <span className={`badge badge-${category.toLowerCase().replace(' ', '-')}`}>{category || '—'}</span>
                            </div>
                            {subCategory && (
                                <div className="review-item">
                                    <span className="info-label">Sub-Category</span>
                                    <span className="info-value">{subCategory}</span>
                                </div>
                            )}
                            <div className="review-item">
                                <span className="info-label">Branch</span>
                                <span className="info-value">{branch}</span>
                            </div>
                            <div className="review-item">
                                <span className="info-label">Department</span>
                                <span className="info-value">{department}</span>
                            </div>
                            {notes && (
                                <div className="review-item" style={{ gridColumn: '1 / -1' }}>
                                    <span className="info-label">Notes</span>
                                    <span className="info-value">{notes}</span>
                                </div>
                            )}
                            {Object.keys(dynamicDepts).length > 0 && (
                                <div className="review-item" style={{ gridColumn: '1 / -1' }}>
                                    <span className="info-label">Dynamic Routings</span>
                                    <div style={{ marginTop: '8px' }}>
                                        {Object.entries(dynamicDepts).map(([order, dept]) => (
                                            <div key={order} style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                • Step {order}: <strong style={{ color: 'var(--text-primary)' }}>{dept}</strong>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="review-workflow">
                            <h4>Approval Workflow</h4>
                            <p className="text-muted">This document will be routed through the {subCategory ? `${subCategory} ` : 'standard '}{category || 'document'} approval chain for {branch}.</p>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="upload-nav">
                    {currentStep > 0 && (
                        <button className="btn btn-secondary" onClick={prev} disabled={isUploading}>Back</button>
                    )}
                    <div style={{ flex: 1 }}>
                        {error && <span style={{ color: 'var(--status-rejected)', fontSize: '0.85rem', marginLeft: '1rem' }}>{error}</span>}
                    </div>
                    {currentStep < 2 ? (
                        <button
                            className="btn btn-primary"
                            onClick={next}
                            disabled={
                                (currentStep === 0 && uploadMode === 'manual' && !file) ||
                                (currentStep === 0 && uploadMode === 'template' && !selectedTemplateId) ||
                                (currentStep === 1 && !category)
                            }
                        >
                            Continue
                        </button>
                    ) : (
                        <button className="btn btn-primary" onClick={submit} disabled={isUploading}>
                            {isUploading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                                    {uploadMode === 'template' ? 'Generating...' : 'Uploading...'}
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={16} /> Submit for Approval
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
