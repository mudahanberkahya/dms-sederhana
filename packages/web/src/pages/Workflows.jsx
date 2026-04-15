import { useState, useEffect, useContext } from 'react';
import { ArrowRight, Plus, Loader2, Save, X, Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../lib/api';
import { AppContext } from '../App';
import './Admin.css';

// Predefined Position Hints (same as Keywords page)
const POSITION_HINTS = [
    "Above Signature Line",
    "Below Signature Line",
    "Left",
    "Right",
    "Center",
    "Auto-placed using keyword search"
];

export default function Workflows() {
    const { categories, roles } = useContext(AppContext);

    const [workflows, setWorkflows] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('Astara Hotel');
    const [selectedSubCategory, setSelectedSubCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [newSubCatInput, setNewSubCatInput] = useState('');

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

    const handleStepDynamicDeptChange = (index, checked) => {
        const newSteps = [...editSteps];
        newSteps[index].isDynamicDepartment = checked;
        setEditSteps(newSteps);
    };

    const handleStepKeywordConfigChange = (index, field, value) => {
        const newSteps = [...editSteps];
        if (!newSteps[index].keywordConfig) {
            newSteps[index].keywordConfig = { keyword: '', positionHint: 'Above Signature Line', offset_x: 0, offset_y: 0 };
        }
        newSteps[index].keywordConfig[field] = value;
        setEditSteps(newSteps);
    };

    const toggleStepKeywordConfig = (index) => {
        const newSteps = [...editSteps];
        if (!newSteps[index].showKeywordConfig) {
            newSteps[index].showKeywordConfig = true;
            if (!newSteps[index].keywordConfig) {
                newSteps[index].keywordConfig = { keyword: '', positionHint: 'Above Signature Line', offset_x: 0, offset_y: 0 };
            }
        } else {
            newSteps[index].showKeywordConfig = false;
        }
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

            // Auto-POST keyword mappings for steps that have keyword config filled
            const keywordPromises = editSteps
                .filter(step => step.keywordConfig && step.keywordConfig.keyword && step.keywordConfig.keyword.trim())
                .map((step, index) => {
                    return api.admin.keywords.add({
                        category: selectedCategoryId,
                        sub_category: selectedSubCategory || null,
                        branch: selectedBranch,
                        role: step.roleRequired,
                        step_order: index + 1,
                        keyword: step.keywordConfig.keyword.trim(),
                        positionHint: step.keywordConfig.positionHint || 'Above Signature Line',
                        offset_x: parseInt(step.keywordConfig.offset_x) || 0,
                        offset_y: parseInt(step.keywordConfig.offset_y) || 0
                    });
                });

            if (keywordPromises.length > 0) {
                await Promise.all(keywordPromises);
            }

            setIsEditing(false);
            await fetchWorkflows();
            const kwMsg = keywordPromises.length > 0 ? ` (${keywordPromises.length} keyword mapping(s) also created)` : '';
            alert(`Saved workflow successfully${kwMsg}`);
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

    const handleDeleteWorkflow = async () => {
        if (!selectedWorkflow) return;
        if (!confirm(`Are you sure you want to delete this workflow? This will erase the sub-category "${selectedSubCategory}" from this branch.`)) return;
        setSaving(true);
        try {
            await api.admin.workflows.delete(selectedWorkflow.id);
            setSelectedSubCategory('');
            await fetchWorkflows(); // Refresh data
            alert("Deleted workflow successfully");
        } catch (err) {
            alert("Failed to delete workflow: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    // --- Sub-Category Management Handlers ---
    const handleAddSubCategory = () => {
        const val = newSubCatInput.trim();
        if (!val) return;
        setSelectedSubCategory(val);
        setNewSubCatInput('');
    };

    const handleRenameSubCategory = async (oldName) => {
        const newName = prompt(`Rename sub-category "${oldName}" to:`, oldName);
        if (!newName || newName.trim() === '' || newName.trim() === oldName) return;
        const trimmedName = newName.trim();

        // Find all workflows with this sub-category for current category
        const affectedWorkflows = workflows.filter(
            w => w.category === selectedCategoryId && w.subCategory === oldName
        );

        if (affectedWorkflows.length === 0) {
            setSelectedSubCategory(trimmedName);
            return;
        }

        setSaving(true);
        try {
            // For each affected workflow: save a copy with the new sub-category name, then delete the old one
            for (const wf of affectedWorkflows) {
                // Save with new name
                await api.admin.workflows.save({
                    category: wf.category,
                    branch: wf.branch,
                    subCategory: trimmedName,
                    steps: wf.steps.map(s => ({
                        roleRequired: s.roleRequired,
                        isOptional: s.isOptional || false,
                        isDynamicDepartment: s.isDynamicDepartment || false
                    }))
                });
                // Delete old workflow (only if it has a real UUID id)
                if (wf.id && !wf.id.includes('-') === false) {
                    await api.admin.workflows.delete(wf.id);
                }
                // Safer: just try delete, ignore if fails on generated IDs
                try { await api.admin.workflows.delete(wf.id); } catch (_) { /* ignore */ }
            }
            setSelectedSubCategory(trimmedName);
            await fetchWorkflows();
            alert(`Sub-category renamed to "${trimmedName}" successfully`);
        } catch (err) {
            alert("Failed to rename sub-category: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSubCategory = async (scName) => {
        if (!confirm(`Delete sub-category "${scName}" and ALL its workflows across all branches? This cannot be undone.`)) return;

        const affectedWorkflows = workflows.filter(
            w => w.category === selectedCategoryId && w.subCategory === scName
        );

        setSaving(true);
        try {
            for (const wf of affectedWorkflows) {
                try { await api.admin.workflows.delete(wf.id); } catch (_) { /* ignore generated IDs */ }
            }
            if (selectedSubCategory === scName) setSelectedSubCategory('');
            await fetchWorkflows();
            alert(`Sub-category "${scName}" deleted successfully`);
        } catch (err) {
            alert("Failed to delete sub-category: " + err.message);
        } finally {
            setSaving(false);
        }
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
                    <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '72px', fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                checked={step.isDynamicDepartment || false}
                                onChange={(e) => handleStepDynamicDeptChange(index, e.target.checked)}
                            />
                            Dynamic Department Selection (User selects department during upload)
                        </label>
                        {/* Signature Keyword Configuration Accordion */}
                        <button
                            type="button"
                            onClick={() => toggleStepKeywordConfig(index)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '72px', fontSize: '0.8rem', color: 'var(--accent-teal)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
                        >
                            {step.showKeywordConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            Signature Keyword Configuration (Optional)
                        </button>
                        {step.showKeywordConfig && (
                            <div style={{ marginLeft: '72px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>Configure the keyword for automatic signature placement. This will be saved to the Keywords table.</p>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: '0.78rem' }}>Keyword Text in PDF</label>
                                    <input className="form-input" placeholder="e.g. 'Approved by Hotel Manager'" value={step.keywordConfig?.keyword || ''} onChange={e => handleStepKeywordConfigChange(index, 'keyword', e.target.value)} style={{ fontSize: '0.82rem' }} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: '0.78rem' }}>Position Hint</label>
                                    <select className="form-input" value={step.keywordConfig?.positionHint || 'Above Signature Line'} onChange={e => handleStepKeywordConfigChange(index, 'positionHint', e.target.value)} style={{ fontSize: '0.82rem' }}>
                                        {POSITION_HINTS.map(hint => <option key={hint} value={hint}>{hint}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: '0.78rem' }}>X Offset (px)</label>
                                        <input type="number" className="form-input" value={step.keywordConfig?.offset_x ?? 0} onChange={e => handleStepKeywordConfigChange(index, 'offset_x', e.target.value)} style={{ fontSize: '0.82rem' }} />
                                    </div>
                                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: '0.78rem' }}>Y Offset (px)</label>
                                        <input type="number" className="form-input" value={step.keywordConfig?.offset_y ?? 0} onChange={e => handleStepKeywordConfigChange(index, 'offset_y', e.target.value)} style={{ fontSize: '0.82rem' }} />
                                    </div>
                                </div>
                            </div>
                        )}
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

            {/* Sub-Category Selector with Add/Edit/Delete */}
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
                    <div key={sc} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                        <button
                            className={`filter-chip ${selectedSubCategory === sc ? 'active' : ''}`}
                            onClick={() => { if (!isEditing) setSelectedSubCategory(sc); }}
                            disabled={isEditing}
                            style={{ fontSize: '0.82rem', borderTopRightRadius: 0, borderBottomRightRadius: 0, paddingRight: '6px' }}
                        >
                            {sc}
                        </button>
                        {!isEditing && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '1px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderLeft: 'none', borderRadius: '0 var(--radius-pill) var(--radius-pill) 0', padding: '3px 4px' }}>
                                <button
                                    className="btn-icon"
                                    onClick={() => handleRenameSubCategory(sc)}
                                    title={`Rename "${sc}"`}
                                    style={{ padding: '2px', width: '20px', height: '20px' }}
                                >
                                    <Edit2 size={11} />
                                </button>
                                <button
                                    className="btn-icon danger"
                                    onClick={() => handleDeleteSubCategory(sc)}
                                    title={`Delete "${sc}"`}
                                    style={{ padding: '2px', width: '20px', height: '20px' }}
                                >
                                    <Trash2 size={11} color="var(--accent-coral)" />
                                </button>
                            </span>
                        )}
                    </div>
                ))}
                {!isEditing && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="New sub-category..."
                            style={{ width: '170px', padding: '0.25rem 0.5rem', fontSize: '0.82rem' }}
                            value={newSubCatInput}
                            onChange={(e) => setNewSubCatInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddSubCategory();
                            }}
                        />
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={handleAddSubCategory}
                            disabled={!newSubCatInput.trim()}
                            style={{ padding: '4px 10px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                        >
                            <Plus size={12} /> Add
                        </button>
                    </div>
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
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {selectedWorkflow && (
                                    <button className="btn btn-secondary btn-sm" onClick={handleDeleteWorkflow} style={{ color: 'var(--accent-coral)', borderColor: 'var(--accent-coral)' }}>
                                        <Trash2 size={14} /> Delete
                                    </button>
                                )}
                                <button className="btn btn-primary btn-sm" onClick={handleEditStart}>Edit Chain</button>
                            </div>
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
