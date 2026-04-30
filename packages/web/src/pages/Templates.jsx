import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Plus, Trash2, X, FileText, CheckCircle, XCircle, Edit2 } from 'lucide-react';
import './Admin.css';

export default function Templates() {
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showModal, setShowModal] = useState(false);
    const [name, setName] = useState('');
    const [requireCreatorSignature, setRequireCreatorSignature] = useState(false);
    const [file, setFile] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [parsedFields, setParsedFields] = useState([]);
    const [isExtracting, setIsExtracting] = useState(false);
    const [editTemplateId, setEditTemplateId] = useState(null);
    const [configMode, setConfigMode] = useState('visual');
    const [jsonConfig, setJsonConfig] = useState('');

    const loadTemplates = async () => {
        try {
            setIsLoading(true);
            const data = await api.admin.templates.list();
            setTemplates(data || []);
        } catch (err) {
            setError(err.message || 'Failed to load templates');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadTemplates();
    }, []);

    useEffect(() => {
        if (!file || editTemplateId) {
            if (!editTemplateId) setParsedFields([]);
            return;
        }

        const extractFormFields = async () => {
            setIsExtracting(true);
            try {
                const formData = new FormData();
                formData.append('templateFile', file);
                const res = await api.admin.templates.extractFields(formData);
                if (res && res.fieldsConfig) {
                    setParsedFields(res.fieldsConfig);
                    setJsonConfig(JSON.stringify(res.fieldsConfig, null, 2));
                }
            } catch (err) {
                console.error("Failed to extract fields:", err);
            } finally {
                setIsExtracting(false);
            }
        };

        extractFormFields();
    }, [file]);

    const handleCloseModal = () => {
        setShowModal(false);
        setEditTemplateId(null);
        setName('');
        setRequireCreatorSignature(false);
        setFile(null);
        setParsedFields([]);
        setJsonConfig('');
        setConfigMode('visual');
        setError(null);
    };

    const openEditModal = (t) => {
        setEditTemplateId(t.id);
        setName(t.name);
        setRequireCreatorSignature(t.requireCreatorSignature || false);
        setFile(null);
        // Ensure sorted by existing order if present
        let config = t.fieldsConfig || [];
        if (config.length > 0 && config[0].order !== undefined) {
            config = [...config].sort((a, b) => a.order - b.order);
        }
        setParsedFields(config);
        setJsonConfig(JSON.stringify(config, null, 2));
        setConfigMode('visual');
        setShowModal(true);
    };

    const handleFieldTypeChange = (index, newType) => {
        const updated = [...parsedFields];
        updated[index].type = newType;
        setParsedFields(updated);
    };

    const handleFieldLabelChange = (index, newLabel) => {
        const updated = [...parsedFields];
        updated[index].label = newLabel;
        setParsedFields(updated);
    };

    const handleFieldFormulaChange = (index, newFormula) => {
        const updated = [...parsedFields];
        updated[index].formula = newFormula;
        setParsedFields(updated);
    };

    const handleMoveFieldUp = (index) => {
        if (index === 0) return;
        const updated = [...parsedFields];
        const temp = updated[index];
        updated[index] = updated[index - 1];
        updated[index - 1] = temp;
        setParsedFields(updated);
    };

    const handleMoveFieldDown = (index) => {
        if (index === parsedFields.length - 1) return;
        const updated = [...parsedFields];
        const temp = updated[index];
        updated[index] = updated[index + 1];
        updated[index + 1] = temp;
        setParsedFields(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) return setError("Template Name is required.");
        if (!file && !editTemplateId) return setError("Base PDF File is required.");

        setIsSaving(true);

        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('requireCreatorSignature', requireCreatorSignature);
            if (file) formData.append('templateFile', file);
            
            if (configMode === 'json' && jsonConfig.trim()) {
                try {
                    const parsedJson = JSON.parse(jsonConfig);
                    formData.append('fieldsConfig', JSON.stringify(parsedJson));
                } catch (e) {
                    setIsSaving(false);
                    return setError("Format JSON Konfigurasi tidak valid: " + e.message);
                }
            } else if (parsedFields.length > 0) {
                // Ensure array order explicitly sets the 'order' integer
                const orderedFields = parsedFields.map((f, i) => ({ ...f, order: i + 1 }));
                formData.append('fieldsConfig', JSON.stringify(orderedFields));
            }

            if (editTemplateId) {
                // Determine if we are updating fieldsConfig only, or also replacing the PDF
                let payload;
                if (file) {
                    // Update with file -> formData
                    await api.admin.templates.update(editTemplateId, formData);
                } else {
                    // Update without file -> JSON payload
                    payload = { name, requireCreatorSignature };
                    
                    if (configMode === 'json' && jsonConfig.trim()) {
                        payload.fieldsConfig = JSON.parse(jsonConfig);
                    } else if (parsedFields.length > 0) {
                        payload.fieldsConfig = parsedFields.map((f, i) => ({ ...f, order: i + 1 }));
                    }
                    await api.admin.templates.update(editTemplateId, payload);
                }
            } else {
                await api.admin.templates.upload(formData);
            }

            handleCloseModal();
            loadTemplates();
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this template? Any running workflows will not be affected but users can no longer generate this template.")) return;
        try {
            await api.admin.templates.delete(id);
            loadTemplates();
        } catch (err) {
            alert(err.message || "Failed to delete");
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            await api.admin.templates.update(id, { isActive: !currentStatus });
            loadTemplates();
        } catch (err) {
            alert("Failed to update status");
        }
    };

    return (
        <div className="admin-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Template Management</h1>
                    <p className="page-subtitle">Configure base PDF templates for automatic document generation.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={16} /> Add Template
                </button>
            </div>

            {error && !showModal && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

            <div className="card">
                {isLoading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
                ) : (
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Configured Fields</th>
                                    <th>Date Created</th>
                                    <th>Status</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {templates.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center text-muted" style={{ padding: '2rem' }}>
                                            No templates configured yet.
                                        </td>
                                    </tr>
                                ) : (
                                    templates.map(t => (
                                        <tr key={t.id}>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{t.name}</div>
                                                <div className="text-xs text-muted" style={{ fontFamily: 'monospace' }}>{t.id}</div>
                                            </td>
                                            <td>{t.fieldsConfig ? t.fieldsConfig.length : 0} fields</td>
                                            <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <span 
                                                    className={`badge ${t.isActive ? 'badge-approved' : 'badge-rejected'}`}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => toggleStatus(t.id, t.isActive)}
                                                >
                                                    {t.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="text-right" style={{ whiteSpace: 'nowrap' }}>
                                                <button className="btn-icon text-primary" onClick={() => openEditModal(t)} title="Edit Config & Urutan" style={{ marginRight: '0.5rem' }}>
                                                    <Edit2 size={16} />
                                                </button>
                                                <button className="btn-icon text-danger" onClick={() => handleDelete(t.id)} title="Delete">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* CREATE MODAL — Wide for PDF visual mapper */}
            {showModal && (
                <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '3vh' }}>
                    <div className="modal-content" style={{ maxWidth: '900px', maxHeight: '92vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editTemplateId ? 'Edit Template' : 'Add Template'}</h2>
                            <button className="btn-icon" onClick={handleCloseModal} disabled={isSaving}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
                                <div className="form-group">
                                    <label className="form-label">Template Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. Purchase Order"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Base PDF File {editTemplateId ? '(Opsional)' : '*'}</label>
                                    <input
                                        type="file"
                                        className="form-input"
                                        accept=".pdf"
                                        onChange={e => setFile(e.target.files[0])}
                                    />
                                    <p className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
                                        {editTemplateId 
                                            ? "Kosongkan jika hanya ingin mengubah Label/Urutan form saja. Upload file baru jika form dasarnya berubah." 
                                            : "DMS secara otomatis akan membaca Text Field (AcroForms) yang ada di dalam PDF tersebut menggunakan nama field-nya."}
                                    </p>
                                </div>
                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                                    <input
                                        type="checkbox"
                                        id="requireCreatorSignature"
                                        checked={requireCreatorSignature}
                                        onChange={e => setRequireCreatorSignature(e.target.checked)}
                                        style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="requireCreatorSignature" style={{ margin: 0, fontWeight: 500, cursor: 'pointer' }}>
                                        Require Creator Signature
                                        <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>
                                            Wajibkan staf/pembuat dokumen (Creator) untuk menempatkan tanda tangannya pada PDF sebelum dokumen disubmit.
                                        </span>
                                    </label>
                                </div>

                                {/* Extracted Fields Configurator */}
                                {isExtracting && (
                                    <div className="alert alert-info" style={{ marginTop: '1rem' }}>
                                        Mengekstrak AcroForm fields dari PDF...
                                    </div>
                                )}
                                
                                {!isExtracting && (parsedFields.length > 0 || configMode === 'json') && (
                                    <div className="form-group mt-4">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <label className="form-label" style={{ margin: 0 }}>Konfigurasi Kolom Ekstraksi (AcroForms)</label>
                                            <select 
                                                className="form-select" 
                                                style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                                                value={configMode}
                                                onChange={e => {
                                                    setConfigMode(e.target.value);
                                                    if (e.target.value === 'json') {
                                                        setJsonConfig(JSON.stringify(parsedFields, null, 2));
                                                    } else {
                                                        try {
                                                            const arr = JSON.parse(jsonConfig);
                                                            if (Array.isArray(arr)) setParsedFields(arr);
                                                        } catch (err) { }
                                                    }
                                                }}
                                            >
                                                <option value="visual">Visual Mode (Tabel)</option>
                                                <option value="json">Manual JSON Mode</option>
                                            </select>
                                        </div>

                                        {configMode === 'visual' ? (
                                            <>
                                                <p className="text-xs text-muted mb-2">
                                                    Berikut adalah komponen field yang otomatis terbaca dari file PDF Anda. Anda bisa mengatur <b>urutan form</b> (↑/↓), mengubah **Tipe Input**, dan memasukkan **Rumus (Formula)**.
                                                </p>
                                                <div className="table-responsive">
                                            <table className="admin-table">
                                                <thead>
                                                    <tr>
                                                        <th>Urutan</th>
                                                        <th>Field ID (Dari PDF)</th>
                                                        <th>Label (Penamaan UI)</th>
                                                        <th>Tipe Input & Formula</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {parsedFields.map((field, idx) => (
                                                        <tr key={idx}>
                                                            <td style={{ whiteSpace: 'nowrap' }}>
                                                                <button type="button" className="btn-icon" onClick={() => handleMoveFieldUp(idx)} disabled={idx === 0} style={{ padding: '0.1rem', marginRight: '0.2rem' }}>↑</button>
                                                                <button type="button" className="btn-icon" onClick={() => handleMoveFieldDown(idx)} disabled={idx === parsedFields.length - 1} style={{ padding: '0.1rem' }}>↓</button>
                                                            </td>
                                                            <td><code className="text-xs">{field.name}</code></td>
                                                            <td>
                                                                <input 
                                                                    type="text" 
                                                                    className="form-input" 
                                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                                                                    value={field.label}
                                                                    onChange={e => handleFieldLabelChange(idx, e.target.value)}
                                                                />
                                                            </td>
                                                            <td>
                                                                <select 
                                                                    className="form-select mb-1" 
                                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', width: '100%' }}
                                                                    value={field.type}
                                                                    onChange={e => handleFieldTypeChange(idx, e.target.value)}
                                                                >
                                                                    <option value="text">Text (Pendek)</option>
                                                                    <option value="textarea">Text Area (Panjang)</option>
                                                                    <option value="number">Number (Angka/Harga)</option>
                                                                    <option value="date">Date (Tanggal)</option>
                                                                    <option value="readonly">Read-only (Hanya Baca / Rumus)</option>
                                                                </select>
                                                                {field.type === 'readonly' && (
                                                                    <input 
                                                                        type="text" 
                                                                        className="form-input mt-1" 
                                                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', background: '#f8fafc', width: '100%' }}
                                                                        placeholder="Formula misal: qty * price"
                                                                        value={field.formula || ''}
                                                                        onChange={e => handleFieldFormulaChange(idx, e.target.value)}
                                                                    />
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        </>
                                        ) : (
                                            <>
                                                <p className="text-xs text-muted mb-2">
                                                    Jika ekstraksi UI tidak berjalan baik atau nama field PDF menggunakan struktur <code>undefined.</code>, Anda dapat menggunakan mode JSON manual.
                                                </p>
                                                <textarea 
                                                    className="form-input" 
                                                    style={{ fontFamily: 'monospace', fontSize: '13px', minHeight: '300px' }}
                                                    value={jsonConfig}
                                                    onChange={e => setJsonConfig(e.target.value)}
                                                />
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={handleCloseModal} disabled={isSaving}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                                    {isSaving ? 'Uploading...' : 'Upload Template'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
