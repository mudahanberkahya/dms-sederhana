import { useState, useEffect, useContext } from 'react';
import { ArrowRight, Plus, Loader2, Save, X, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { AppContext } from '../App';
import './Admin.css';

export default function Workflows() {
    const { categories, roles } = useContext(AppContext);

    const [workflows, setWorkflows] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('Astara Hotel');
    const [selectedSubCategory, setSelectedSubCategory] = useState('');
    const [loading, setLoading] = useState(true);

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editSteps, setEditSteps] = useState([]);
    const [saving, setSaving] = useState(false);

    const fetchWorkflows = async () => {
        if (!categories || categories.length === 0) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // Fetch workflow for each category
            const results = await Promise.all(
                categories.map(cat => api.admin.workflows.get(cat.id).catch(() => []))
            );

            // Format into a flat array covering all category/branch/subCategory combinations
            const formatted = [];
            const branches = ['Astara Hotel', 'Pentacity Hotel', 'All'];
            
            categories.forEach((cat, i) => {
                const wfs = results[i] || [];
                branches.forEach(b => {
                    // Add workflows without sub_category
                    const defaultWf = wfs.find(w => w.branch === b && !w.subCategory);
                    formatted.push({
                        id: defaultWf?.id || `${cat.id}-${b}`,
                        category: cat.id,
                        branch: b,
                        subCategory: null,
                        steps: defaultWf?.steps || []
                    });
                    
                    // Add workflows with sub_category
                    const subCatWfs = wfs.filter(w => w.branch === b && w.subCategory);
                    subCatWfs.forEach(scWf => {
                        formatted.push({
                            id: scWf.id,
                            category: cat.id,
                            branch: b,
                            subCategory: scWf.subCategory,
                            steps: scWf.steps || []
                        });
                    });
                });
            });
            setWorkflows(formatted);
            if (!selectedCategoryId) setSelectedCategoryId(categories[0].id);
        } catch (err) {
            console.error("Failed to load workflows", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkflows();
    }, [categories]);

    const selectedWorkflow = workflows.find(w => 
        w.category === selectedCategoryId && 
        w.branch === selectedBranch && 
        (w.subCategory || '') === selectedSubCategory
    );

    // Get unique sub-categories for current category
    const availableSubCategories = [...new Set(
        workflows
            .filter(w => w.category === selectedCategoryId && w.subCategory)
            .map(w => w.subCategory)
    )];

    const handleEditStart = () => {
        setEditSteps([...(selectedWorkflow?.steps || [])]);
        setIsEditing(true);
    };

    const handleAddStep = () => {
        setEditSteps([...editSteps, { roleRequired: '', isOptional: false }]);
    };

    const handleRemoveStep = (index) => {
        const newSteps = [...editSteps];
        newSteps.splice(index, 1);
        setEditSteps(newSteps);
    };

    const handleStepRoleChange = (index, role) => {
        const newSteps = [...editSteps];
        newSteps[index].roleRequired = role;
        setEditSteps(newSteps);
    };

    const handleSave = async () => {
        if (!editSteps || editSteps.length === 0) {
            alert("At least one approval step is required");
            return;
        }
        if (editSteps.some(step => !step.roleRequired)) {
            alert("Please select a role for all approval steps");
            return;
        }
        setSaving(true);
        try {
            await api.admin.workflows.save({
                category: selectedCategoryId,
                branch: selectedBranch,
                subCategory: selectedSubCategory || null,
                steps: editSteps
            });
            setIsEditing(false);
            await fetchWorkflows(); // Refresh data
            alert("Saved workflow successfully");
        } catch (err) {
            alert("Failed to save workflow: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditSteps([]);
    };

    // Determine display label for the card title
    const categoryLabel = categories.find(c => c.id === selectedCategoryId)?.name || selectedCategoryId;

    if (loading && workflows.length === 0) {
        return (
            <div className="admin-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-teal)' }} />
            </div>
        );
    }

    // Shared edit panel JSX (used by both existing and new workflow cards)
    const editPanel = (
        <div className="workflow-edit-container" style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {editSteps.map((step, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-muted)', width: '60px' }}>Step {index + 1}</div>
                        <select
                            className="form-input"
                            value={step.roleRequired}
                            onChange={(e) => handleStepRoleChange(index, e.target.value)}
                            style={{ flex: 1 }}
                        >
                            <option value="" disabled>Select a role...</option>
                            {roles.map(r => (
                                <option key={r.id} value={r.id}>{r.name.toUpperCase()}</option>
                            ))}
                        </select>
                        <button className="btn-icon danger" onClick={() => handleRemoveStep(index)} title="Remove Step">
                            <Trash2 size={16} color="var(--accent-coral)" />
                        </button>
                    </div>
                ))}
                {editSteps.length === 0 && (
                    <div className="text-muted" style={{ textAlign: 'center', padding: '1rem 0' }}>No steps. Click "Add Step" below.</div>
                )}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleAddStep} style={{ marginTop: '16px' }}>
                <Plus size={14} /> Add Step
            </button>
        </div>
    );

    // Edit/Save buttons JSX
    const editSaveButtons = (
        <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={handleCancelEdit} disabled={saving}><X size={14} /> Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <><Save size={14} /> Save</>}
            </button>
        </div>
    );

    return (
        <div className="admin-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Workflow Configuration</h1>
                    <p className="page-subtitle">Configure approval chains per document category and sub-category</p>
                </div>
            </div>

            <div className="filter-chips" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            className={`filter-chip ${selectedCategoryId === cat.id ? 'active' : ''}`}
                            onClick={() => {
                                if (!isEditing) {
                                    setSelectedCategoryId(cat.id);
                                    setSelectedSubCategory('');
                                }
                            }}
                            disabled={isEditing}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>Branch:</span>
                    <select 
                        className="form-select" 
                        style={{ padding: '0.25rem 2rem 0.25rem 0.75rem', fontSize: '0.85rem' }}
                        value={selectedBranch}
                        onChange={(e) => {
                            if (!isEditing) setSelectedBranch(e.target.value);
                        }}
                        disabled={isEditing}
                    >
                        <option value="Astara Hotel">Astara Hotel</option>
                        <option value="Pentacity Hotel">Pentacity Hotel</option>
                        <option value="All">All Branches (Global Fallback)</option>
                    </select>
                </div>
            </div>

            {/* Sub-Category Selector */}
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>Sub-Category:</span>
                <button
                    className={`filter-chip ${selectedSubCategory === '' ? 'active' : ''}`}
                    onClick={() => { if (!isEditing) setSelectedSubCategory(''); }}
                    disabled={isEditing}
                    style={{ fontSize: '0.82rem' }}
                >
                    Default (No Sub-Category)
                </button>
                {availableSubCategories.map(sc => (
                    <button
                        key={sc}
                        className={`filter-chip ${selectedSubCategory === sc ? 'active' : ''}`}
                        onClick={() => { if (!isEditing) setSelectedSubCategory(sc); }}
                        disabled={isEditing}
                        style={{ fontSize: '0.82rem' }}
                    >
                        {sc}
                    </button>
                ))}
                {!isEditing && (
                    <input
                        type="text"
                        className="form-input"
                        placeholder="New sub-category..."
                        style={{ width: '180px', padding: '0.25rem 0.5rem', fontSize: '0.82rem' }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.target.value.trim()) {
                                setSelectedSubCategory(e.target.value.trim());
                                e.target.value = '';
                            }
                        }}
                    />
                )}
            </div>

            {/* Case 1: Existing workflow found */}
            {selectedWorkflow && (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                            <h3 className="card-title" style={{ marginBottom: 4 }}>
                                {categoryLabel} Workflow
                                {selectedSubCategory && <span style={{ color: 'var(--accent-teal)', fontWeight: 500 }}> — {selectedSubCategory}</span>}
                            </h3>
                            <p className="text-muted" style={{ marginBottom: 0, fontSize: '0.85rem' }}>
                                Approval chain for {categoryLabel}
                                {selectedSubCategory ? ` (${selectedSubCategory})` : ''} documents at {selectedBranch}
                            </p>
                        </div>
                        {!isEditing ? (
                            <button className="btn btn-primary btn-sm" onClick={handleEditStart}>Edit Chain</button>
                        ) : editSaveButtons}
                    </div>

                    {!isEditing ? (
                        <div className="workflow-chain">
                            {selectedWorkflow.steps.map((step, i) => (
                                <div key={step.id || i} style={{ display: 'flex', alignItems: 'center' }}>
                                    <div className="wf-step">
                                        <div className="wf-step-role">{roles.find(r => r.id === step.roleRequired)?.name || step.roleRequired.replace('_', ' ').toUpperCase()}</div>
                                        <div className="wf-step-label">Step {step.stepOrder || (i + 1)}</div>
                                    </div>
                                    {i < selectedWorkflow.steps.length - 1 && (
                                        <ArrowRight size={16} className="wf-arrow" />
                                    )}
                                </div>
                            ))}
                            {selectedWorkflow.steps.length === 0 && (
                                <div className="text-muted" style={{ padding: '2rem 0', textAlign: 'center', width: '100%' }}>
                                    No steps configured. Documents will be auto-approved.
                                </div>
                            )}
                        </div>
                    ) : editPanel}
                </div>
            )}

            {/* Case 2: No workflow found for this sub-category — show create prompt or edit panel */}
            {!selectedWorkflow && selectedSubCategory && (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                            <h3 className="card-title" style={{ marginBottom: 4 }}>
                                {categoryLabel} Workflow
                                <span style={{ color: 'var(--accent-teal)', fontWeight: 500 }}> — {selectedSubCategory}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>(New)</span>
                            </h3>
                            <p className="text-muted" style={{ marginBottom: 0, fontSize: '0.85rem' }}>
                                {!isEditing 
                                    ? <>No workflow configured for <strong>{selectedCategoryId}</strong> with sub-category <strong>"{selectedSubCategory}"</strong> at <strong>{selectedBranch}</strong>.</>
                                    : <>Creating new approval chain for {categoryLabel} ({selectedSubCategory}) at {selectedBranch}</>
                                }
                            </p>
                        </div>
                        {!isEditing ? (
                            <button className="btn btn-primary btn-sm" onClick={handleEditStart}>
                                <Plus size={14} /> Create Workflow
                            </button>
                        ) : editSaveButtons}
                    </div>
                    {isEditing && editPanel}
                </div>
            )}
        </div>
    );
}

