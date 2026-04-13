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
    Loader2
} from 'lucide-react';
import './Upload.css';

const steps = ['Upload File', 'Classify Document', 'Review & Submit'];

export default function Upload() {
    const { categories, userBranches, userDepartment, user, departments } = useContext(AppContext);
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [file, setFile] = useState(null);
    const [category, setCategory] = useState('');
    const [subCategory, setSubCategory] = useState('');
    const [subCategories, setSubCategories] = useState([]);
    const [branch, setBranch] = useState(userBranches?.[0] || 'Astara Hotel');
    const [department, setDepartment] = useState(userDepartment || 'GENERAL');
    const [notes, setNotes] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const [workflowPreview, setWorkflowPreview] = useState(null);
    const [dynamicDepts, setDynamicDepts] = useState({});

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
        if (!file || !category) return;
        setIsUploading(true);
        setError('');

        try {
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
            navigate('/documents');
        } catch (err) {
            console.error("Upload failed", err);
            
            // Try to extract exact error message from backend
            let errorMessage = err.message;
            if (err.response && err.response.data) {
                errorMessage = err.response.data.message || err.response.data.error || err.message;
            }
            
            setError(errorMessage || 'Failed to upload document. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const f = e.dataTransfer?.files?.[0] || e.target.files?.[0];
        if (f && f.type === 'application/pdf') setFile(f);
    };

    return (
        <div className="upload-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Upload Document</h1>
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
                {/* Step 1: Upload */}
                {currentStep === 0 && (
                    <div className="upload-step animate-fade-in">
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

                        {/* Sub-Category Dropdown — only shown if sub-categories exist for selected category */}
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
                                <span className="info-label">File</span>
                                <span className="info-value">{file?.name || 'No file'}</span>
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
                                <div className="review-item">
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
                            disabled={currentStep === 0 && !file || currentStep === 1 && !category}
                        >
                            Continue
                        </button>
                    ) : (
                        <button className="btn btn-primary" onClick={submit} disabled={isUploading}>
                            {isUploading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <UploadIcon size={16} /> Submit for Approval
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

