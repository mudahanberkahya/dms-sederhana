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
            // Fetch workflow for each category (branch=All for now)
            const results = await Promise.all(
                categories.map(cat => api.admin.workflows.get(cat.id).catch(() => []))
            );

            // Format into a flat array covering all category/branch combinations
            const formatted = [];
            const branches = ['Astara Hotel', 'Pentacity Hotel', 'All'];
            
            categories.forEach((cat, i) => {
                const wfs = results[i] || [];
                branches.forEach(b => {
                    const existingWf = wfs.find(w => w.branch === b);
                    formatted.push({
                        id: existingWf?.id || `${cat.id}-${b}`,
                        category: cat.id,
                        branch: b,
                        steps: existingWf?.steps || []
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

    const selectedWorkflow = workflows.find(w => w.category === selectedCategoryId && w.branch === selectedBranch);

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
                branch: selectedWorkflow?.branch || 'Astara Hotel',
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

    if (loading && workflows.length === 0) {
        return (
            <div className="admin-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-teal)' }} />
            </div>
        );
    }

    return (
        <div className="admin-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Workflow Configuration</h1>
                    <p className="page-subtitle">Configure approval chains per document category</p>
                </div>
            </div>

            <div className="filter-chips" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            className={`filter-chip ${selectedCategoryId === cat.id ? 'active' : ''}`}
                            onClick={() => {
                                if (!isEditing) setSelectedCategoryId(cat.id);
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

            {selectedWorkflow && (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                            <h3 className="card-title" style={{ marginBottom: 4 }}>{categories.find(c => c.id === selectedWorkflow.category)?.name || selectedWorkflow.category} Workflow</h3>
                            <p className="text-muted" style={{ marginBottom: 0, fontSize: '0.85rem' }}>Approval chain for {categories.find(c => c.id === selectedWorkflow.category)?.name || selectedWorkflow.category} documents at {selectedWorkflow.branch}</p>
                        </div>
                        {!isEditing ? (
                            <button className="btn btn-primary btn-sm" onClick={handleEditStart}>Edit Chain</button>
                        ) : (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(false)} disabled={saving}><X size={14} /> Cancel</button>
                                <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                                    {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <><Save size={14} /> Save</>}
                                </button>
                            </div>
                        )}
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
                    ) : (
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
                    )}
                </div>
            )}
        </div>
    );
}
