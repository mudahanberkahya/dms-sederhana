import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plus, Trash2, X, FileText, CheckCircle, XCircle } from 'lucide-react';
import './Admin.css';

export default function Templates() {
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [name, setName] = useState('');
    const [file, setFile] = useState(null);
    const [fieldsConfig, setFieldsConfig] = useState('[\n  {\n    "name": "to",\n    "label": "To",\n    "type": "text"\n  }\n]');
    const [isSaving, setIsSaving] = useState(false);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) return setError("Template Name is required.");
        if (!file) return setError("Base PDF File is required.");
        if (!fieldsConfig.trim()) return setError("Fields Configuration is required.");

        setIsSaving(true);

        try {
            // Verify JSON format
            let parsed = [];
            try {
                parsed = JSON.parse(fieldsConfig);
            } catch (err) {
                throw new Error("Fields Config is not a valid JSON array.");
            }

            if (!Array.isArray(parsed)) {
                throw new Error("Fields Config must be a JSON array.");
            }

            const formData = new FormData();
            formData.append('name', name);
            formData.append('fieldsConfig', JSON.stringify(parsed));
            if (file) formData.append('templateFile', file);

            await api.admin.templates.upload(formData);

            setShowModal(false);
            setName('');
            setFile(null);
            setFieldsConfig('[\n  {\n    "name": "to",\n    "label": "To",\n    "type": "text"\n  }\n]');
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

            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

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
                                            <td className="text-right">
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

            {/* CREATE MODAL */}
            {showModal && (
                <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '5vh' }}>
                    <div className="modal-content" style={{ maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Add Template</h2>
                            <button className="btn-icon" onClick={() => setShowModal(false)} disabled={isSaving}>
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
                                        placeholder="e.g. Internal Memo Template"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Base PDF File *</label>
                                    <input
                                        type="file"
                                        className="form-input"
                                        accept=".pdf"
                                        onChange={e => setFile(e.target.files[0])}
                                    />
                                    <p className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
                                        Must be a PDF file structured as a Form with designated interactive text fields.
                                    </p>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Fields Configuration (JSON Array) *</label>
                                    <textarea
                                        className="form-input"
                                        rows={6}
                                        style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                                        value={fieldsConfig}
                                        onChange={e => setFieldsConfig(e.target.value)}
                                    />
                                    <p className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
                                        Defines what the user inputs. Example: <code>[{"{"}"name":"subject","label":"Subject","type":"text"{"}"}]</code>
                                    </p>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={isSaving}>
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
