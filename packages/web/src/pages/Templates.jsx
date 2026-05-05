import { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { Plus, Trash2, X, FileText, Edit2, Code, Eye, Monitor, AlertTriangle, Search } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import './Admin.css';

export default function Templates() {
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showModal, setShowModal] = useState(false);
    const [name, setName] = useState('');
    const [htmlContent, setHtmlContent] = useState('');
    const [orientation, setOrientation] = useState('portrait');
    const [requireCreatorSignature, setRequireCreatorSignature] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [parsedFields, setParsedFields] = useState([]);
    const [editTemplateId, setEditTemplateId] = useState(null);
    const [configMode, setConfigMode] = useState('visual');
    const [jsonConfig, setJsonConfig] = useState('');

    // Hybrid Editor mode: 'visual' (ReactQuill) or 'html' (textarea)
    const [editorMode, setEditorMode] = useState('visual');

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

    const handleCloseModal = () => {
        setShowModal(false);
        setEditTemplateId(null);
        setName('');
        setHtmlContent('');
        setOrientation('portrait');
        setRequireCreatorSignature(false);
        setParsedFields([]);
        setJsonConfig('');
        setConfigMode('visual');
        setEditorMode('visual');
        setError(null);
    };

    const openEditModal = (t) => {
        setEditTemplateId(t.id);
        setName(t.name);
        setHtmlContent(t.htmlContent || '');
        setOrientation(t.orientation || 'portrait');
        setRequireCreatorSignature(t.requireCreatorSignature || false);
        // Ensure sorted by existing order if present
        let config = t.fieldsConfig || [];
        if (config.length > 0 && config[0].order !== undefined) {
            config = [...config].sort((a, b) => a.order - b.order);
        }
        setParsedFields(config);
        setJsonConfig(JSON.stringify(config, null, 2));
        setConfigMode('visual');
        // Smart Default Mode: complex HTML → preview, simple → visual
        const content = t.htmlContent || '';
        if (content.includes('{{') || /<table/i.test(content)) {
            setEditorMode('preview');
        } else {
            setEditorMode('visual');
        }
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

    const handleFieldNameChange = (index, newName) => {
        const updated = [...parsedFields];
        updated[index].name = newName;
        setParsedFields(updated);
    };

    const handleFieldFormulaChange = (index, newFormula) => {
        const updated = [...parsedFields];
        updated[index].formula = newFormula;
        setParsedFields(updated);
    };

    const handleFieldOptionsChange = (index, newOptions) => {
        const updated = [...parsedFields];
        updated[index].options = newOptions;
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

    const handleAddField = () => {
        setParsedFields(prev => [...prev, {
            name: `field_${prev.length + 1}`,
            label: `Field ${prev.length + 1}`,
            type: 'text',
        }]);
    };

    const handleRemoveField = (index) => {
        setParsedFields(prev => prev.filter((_, i) => i !== index));
    };

    // Auto-detect Handlebars variables from htmlContent
    const handleAutoDetectFields = () => {
        if (!htmlContent || !htmlContent.trim()) {
            alert('Tidak ada konten HTML. Tulis template terlebih dahulu.');
            return;
        }

        // Known helpers/block keywords to skip
        const HELPERS = new Set([
            'formatCurrency', 'formatDate',
            'if', 'else', 'unless', 'each', 'with', 'lookup', 'log',
        ]);

        const variables = new Set();

        // Match all {{ ... }} and {{{ ... }}} blocks
        // Captures: {{var}}, {{helper var}}, {{{var}}}, {{#block var}}, {{/block}}
        const regex = /\{\{\{?\s*([#/]?)(\w+)(?:\s+(\w+))?\s*\}?\}\}/g;
        let match;
        while ((match = regex.exec(htmlContent)) !== null) {
            const prefix = match[1];       // '#' or '/' or ''
            const firstWord = match[2];    // helper name or variable name
            const secondWord = match[3];   // argument (the actual variable when helper is used)

            if (prefix === '/') continue;  // Skip closing blocks like {{/if}}

            if (prefix === '#') {
                // Block helper like {{#if varname}} → extract varname
                if (secondWord && !HELPERS.has(secondWord)) {
                    variables.add(secondWord);
                }
            } else if (HELPERS.has(firstWord)) {
                // Regular helper like {{formatCurrency price}} → extract price
                if (secondWord) {
                    variables.add(secondWord);
                }
            } else {
                // Plain variable like {{nama}} or {{{deskripsi}}}
                variables.add(firstWord);
            }
        }

        if (variables.size === 0) {
            alert('Tidak ditemukan variabel Handlebars di dalam template HTML.');
            return;
        }

        // Filter out variables that already exist in parsedFields
        const existingNames = new Set(parsedFields.map(f => f.name));
        const newVars = [...variables].filter(v => !existingNames.has(v));

        if (newVars.length === 0) {
            alert(`Semua ${variables.size} variabel sudah ada di fieldsConfig. Tidak ada field baru.`);
            return;
        }

        // Smart type guesser based on field name patterns
        const guessType = (name) => {
            const n = name.toLowerCase();
            if (/tanggal|date|tgl/.test(n)) return 'date';
            if (/harga|price|amount|total|biaya|jumlah|qty|quantity/.test(n)) return 'number';
            if (/deskripsi|description|catatan|notes|keterangan|isi/.test(n)) return 'textarea';
            return 'text';
        };

        const newFields = newVars.map(name => ({
            name,
            label: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            type: guessType(name),
        }));

        setParsedFields(prev => [...prev, ...newFields]);
        alert(`✅ ${newFields.length} field baru berhasil dideteksi dan ditambahkan!\n\nField: ${newVars.join(', ')}`);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) return setError("Template Name is required.");
        if (!htmlContent.trim()) return setError("HTML Content is required. Please provide the template body.");

        setIsSaving(true);

        try {
            // Build fieldsConfig from the active config mode
            let finalFieldsConfig = [];
            if (configMode === 'json' && jsonConfig.trim()) {
                try {
                    finalFieldsConfig = JSON.parse(jsonConfig);
                } catch (e) {
                    setIsSaving(false);
                    return setError("Format JSON Konfigurasi tidak valid: " + e.message);
                }
            } else if (parsedFields.length > 0) {
                finalFieldsConfig = parsedFields.map((f, i) => ({ ...f, order: i + 1 }));
            }

            const payload = {
                name: name.trim(),
                htmlContent,
                orientation,
                requireCreatorSignature,
                fieldsConfig: finalFieldsConfig,
            };

            if (editTemplateId) {
                await api.admin.templates.update(editTemplateId, payload);
            } else {
                await api.admin.templates.create(payload);
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

    // ReactQuill modules with image support
    const quillModules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, 4, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'align': [] }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'indent': '-1' }, { 'indent': '+1' }],
                [{ 'size': ['small', false, 'large', 'huge'] }],
                [{ 'color': [] }, { 'background': [] }],
                ['link', 'image'],
                ['clean']
            ]
        }
    }), []);

    return (
        <div className="admin-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Template Management</h1>
                    <p className="page-subtitle">Configure HTML templates for automatic document generation (Puppeteer + Handlebars engine).</p>
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
                                    <th>Fields</th>
                                    <th>Orientation</th>
                                    <th>Date Created</th>
                                    <th>Status</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {templates.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center text-muted" style={{ padding: '2rem' }}>
                                            No templates configured yet.
                                        </td>
                                    </tr>
                                ) : (
                                    templates.map(t => (
                                        <tr key={t.id}>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{t.name}</div>
                                                <div className="text-xs text-muted" style={{ fontFamily: 'monospace' }}>{t.id}</div>
                                                {t.requireCreatorSignature && (
                                                    <span className="badge" style={{ fontSize: '0.7rem', background: 'var(--bg-subtle)', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                        Require Signature
                                                    </span>
                                                )}
                                            </td>
                                            <td>{t.fieldsConfig ? t.fieldsConfig.length : 0} fields</td>
                                            <td>
                                                <span className="text-xs" style={{ textTransform: 'capitalize' }}>
                                                    {t.orientation || 'portrait'}
                                                </span>
                                            </td>
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
                                                <button className="btn-icon text-primary" onClick={() => openEditModal(t)} title="Edit Template" style={{ marginRight: '0.5rem' }}>
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

            {/* CREATE / EDIT MODAL */}
            {showModal && (
                <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '2vh' }}>
                    <div className="modal-content" style={{ maxWidth: '1000px', maxHeight: '96vh' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editTemplateId ? 'Edit Template' : 'Add Template'}</h2>
                            <button className="btn-icon" onClick={handleCloseModal} disabled={isSaving}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
                                
                                {/* Row: Template Name + Orientation */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', marginBottom: '1rem' }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label">Template Name *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g. Purchase Order, Cash Advance Request"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group" style={{ margin: 0, minWidth: '160px' }}>
                                        <label className="form-label">Kertas / Orientasi</label>
                                        <select
                                            className="form-select"
                                            value={orientation}
                                            onChange={e => setOrientation(e.target.value)}
                                        >
                                            <option value="portrait">📄 Portrait (A4)</option>
                                            <option value="landscape">📐 Landscape (A4)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Require Creator Signature checkbox */}
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

                                {/* ===== 3-TAB HTML EDITOR ===== */}
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <label className="form-label" style={{ margin: 0 }}>
                                            <FileText size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                                            HTML Template Content *
                                        </label>
                                        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-subtle)', padding: '3px', borderRadius: '8px' }}>
                                            <button
                                                type="button"
                                                className={`btn btn-sm ${editorMode === 'html' ? 'btn-primary' : 'btn-ghost'}`}
                                                onClick={() => setEditorMode('html')}
                                                style={{ fontSize: '0.8rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            >
                                                <Code size={13} /> HTML
                                            </button>
                                            <button
                                                type="button"
                                                className={`btn btn-sm ${editorMode === 'preview' ? 'btn-primary' : 'btn-ghost'}`}
                                                onClick={() => setEditorMode('preview')}
                                                style={{ fontSize: '0.8rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            >
                                                <Eye size={13} /> Preview
                                            </button>
                                            <button
                                                type="button"
                                                className={`btn btn-sm ${editorMode === 'visual' ? 'btn-primary' : 'btn-ghost'}`}
                                                onClick={() => setEditorMode('visual')}
                                                style={{ fontSize: '0.8rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            >
                                                <Edit2 size={13} /> Visual
                                            </button>
                                        </div>
                                    </div>

                                    {/* === Tab: HTML Code Editor === */}
                                    {editorMode === 'html' && (
                                        <textarea
                                            className="form-input"
                                            style={{
                                                fontFamily: '"Cascadia Code", "Fira Code", "Consolas", monospace',
                                                fontSize: '13px',
                                                minHeight: '400px',
                                                lineHeight: '1.6',
                                                background: '#1e1e2e',
                                                color: '#cdd6f4',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '8px',
                                                padding: '16px',
                                                whiteSpace: 'pre',
                                                overflowX: 'auto',
                                                resize: 'vertical',
                                            }}
                                            value={htmlContent}
                                            onChange={e => setHtmlContent(e.target.value)}
                                            placeholder={`<h1>{{company_name}}</h1>\n<p>Tanggal: {{formatDate created_at}}</p>\n<table>\n  <tr><th>Item</th><th>Harga</th></tr>\n  <tr><td>{{item_name}}</td><td>{{formatCurrency price}}</td></tr>\n</table>`}
                                            spellCheck={false}
                                        />
                                    )}

                                    {/* === Tab: Live Preview (Read-Only) === */}
                                    {editorMode === 'preview' && (
                                        <div style={{
                                            border: '1px solid #ccc',
                                            borderRadius: '8px',
                                            overflow: 'hidden',
                                            background: '#f8f9fa',
                                        }}>
                                            <div style={{
                                                padding: '6px 14px',
                                                background: '#eee',
                                                borderBottom: '1px solid #ccc',
                                                fontSize: '0.78rem',
                                                color: '#666',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                            }}>
                                                <Eye size={12} /> Live Preview (Read-Only) — Placeholder Handlebars ditampilkan apa adanya
                                            </div>
                                            <div style={{
                                                background: '#fff',
                                                padding: '2cm',
                                                minHeight: '400px',
                                                maxHeight: '600px',
                                                overflowY: 'auto',
                                                fontFamily: 'Arial, Helvetica, sans-serif',
                                                fontSize: '12pt',
                                                lineHeight: '1.5',
                                                color: '#000',
                                                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.04)',
                                            }}>
                                                {htmlContent ? (
                                                    <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
                                                ) : (
                                                    <p style={{ color: '#aaa', fontStyle: 'italic' }}>Belum ada konten HTML. Tulis template di tab HTML terlebih dahulu.</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* === Tab: Visual (ReactQuill) === */}
                                    {editorMode === 'visual' && (
                                        <>
                                            <div style={{
                                                padding: '8px 12px',
                                                background: '#fff8e1',
                                                border: '1px solid #ffe082',
                                                borderRadius: '8px 8px 0 0',
                                                fontSize: '0.78rem',
                                                color: '#e65100',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                            }}>
                                                <AlertTriangle size={13} />
                                                <span><strong>Peringatan:</strong> Mode Visual dapat merusak template HTML kompleks, tabel, dan inline CSS. Gunakan mode HTML untuk template yang sudah jadi.</span>
                                            </div>
                                            <div style={{ background: '#fff', borderRadius: '0 0 8px 8px', border: '1px solid var(--border-color)', borderTop: 'none' }}>
                                                <ReactQuill
                                                    theme="snow"
                                                    value={htmlContent}
                                                    onChange={setHtmlContent}
                                                    modules={quillModules}
                                                    placeholder="Tulis template sederhana di sini... Untuk template kompleks, gunakan tab HTML."
                                                    style={{ minHeight: '300px' }}
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div style={{
                                        marginTop: '8px',
                                        padding: '10px 14px',
                                        background: 'var(--bg-subtle)',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        color: 'var(--text-muted)',
                                        lineHeight: '1.5'
                                    }}>
                                        <Monitor size={13} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                                        <strong>Tips Handlebars:</strong> Gunakan <code style={{ background: '#e0e0e0', padding: '1px 4px', borderRadius: '3px' }}>{'{{nama_field}}'}</code> untuk text biasa, dan <code style={{ background: '#e0e0e0', padding: '1px 4px', borderRadius: '3px' }}>{'{{{nama_field}}}'}</code> (triple kurung) untuk mem-parse input Rich Text dari user.
                                        <br />
                                        <strong>Helpers:</strong>{' '}
                                        <code style={{ background: '#e0e0e0', padding: '1px 4px', borderRadius: '3px' }}>{'{{formatCurrency total_price}}'}</code> → Rp 1.500.000 |{' '}
                                        <code style={{ background: '#e0e0e0', padding: '1px 4px', borderRadius: '3px' }}>{'{{formatDate tanggal}}'}</code> → 15 Agustus 2026
                                    </div>
                                </div>

                                {/* ===== FIELDS CONFIGURATOR ===== */}
                                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <label className="form-label" style={{ margin: 0 }}>Konfigurasi Input Form (fieldsConfig)</label>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
                                            {configMode === 'visual' && (
                                                <>
                                                    <button type="button" className="btn btn-sm btn-secondary" onClick={handleAutoDetectFields} style={{ fontSize: '0.8rem' }}>
                                                        <Search size={13} /> Auto-Detect Fields
                                                    </button>
                                                    <button type="button" className="btn btn-sm btn-secondary" onClick={handleAddField} style={{ fontSize: '0.8rem' }}>
                                                        <Plus size={13} /> Add Field
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {configMode === 'visual' ? (
                                        <>
                                            <p className="text-xs text-muted mb-2">
                                                Definisikan field-field yang akan muncul sebagai form input saat user mengisi template. Nama field harus cocok dengan placeholder <code>{'{{nama_field}}'}</code> di HTML.
                                            </p>
                                            {parsedFields.length > 0 ? (
                                                <div className="table-responsive">
                                                    <table className="admin-table">
                                                        <thead>
                                                            <tr>
                                                                <th style={{ width: '60px' }}>Urutan</th>
                                                                <th>Field Name (ID)</th>
                                                                <th>Label (Penamaan UI)</th>
                                                                <th>Tipe Input & Formula</th>
                                                                <th style={{ width: '40px' }}></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {parsedFields.map((field, idx) => (
                                                                <tr key={idx}>
                                                                    <td style={{ whiteSpace: 'nowrap' }}>
                                                                        <button type="button" className="btn-icon" onClick={() => handleMoveFieldUp(idx)} disabled={idx === 0} style={{ padding: '0.1rem', marginRight: '0.2rem' }}>↑</button>
                                                                        <button type="button" className="btn-icon" onClick={() => handleMoveFieldDown(idx)} disabled={idx === parsedFields.length - 1} style={{ padding: '0.1rem' }}>↓</button>
                                                                    </td>
                                                                    <td>
                                                                        <input 
                                                                            type="text" 
                                                                            className="form-input" 
                                                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', fontFamily: 'monospace' }}
                                                                            value={field.name}
                                                                            onChange={e => handleFieldNameChange(idx, e.target.value)}
                                                                            placeholder="e.g. company_name"
                                                                        />
                                                                    </td>
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
                                                                            <option value="textarea">Text Area / Rich Text</option>
                                                                            <option value="number">Number (Angka/Harga)</option>
                                                                            <option value="date">Date (Tanggal)</option>
                                                                            <option value="readonly">Read-only (Hanya Baca / Rumus)</option>
                                                                            <option value="checkbox">Checkbox (Ya/Tidak)</option>
                                                                            <option value="select">Dropdown (Pilihan)</option>
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
                                                                        {field.type === 'select' && (
                                                                            <input 
                                                                                type="text" 
                                                                                className="form-input mt-1" 
                                                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', width: '100%' }}
                                                                                placeholder="Opsi dipisah koma (misal: HRD,IT)"
                                                                                value={field.options || ''}
                                                                                onChange={e => handleFieldOptionsChange(idx, e.target.value)}
                                                                            />
                                                                        )}
                                                                    </td>
                                                                    <td>
                                                                        <button type="button" className="btn-icon text-danger" onClick={() => handleRemoveField(idx)} title="Remove field" style={{ padding: '0.2rem' }}>
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <p className="text-center text-muted" style={{ padding: '1rem', fontSize: '0.85rem' }}>
                                                    Belum ada field. Klik "Add Field" untuk menambahkan, atau gunakan Manual JSON Mode.
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-xs text-muted mb-2">
                                                Definisikan konfigurasi field dalam format JSON array. Setiap objek harus memiliki minimal <code>name</code>, <code>label</code>, dan <code>type</code>.
                                            </p>
                                            <textarea 
                                                className="form-input" 
                                                style={{ fontFamily: 'monospace', fontSize: '13px', minHeight: '200px' }}
                                                value={jsonConfig}
                                                onChange={e => setJsonConfig(e.target.value)}
                                                placeholder='[&#10;  { "name": "company_name", "label": "Nama Perusahaan", "type": "text" },&#10;  { "name": "total_price", "label": "Total Harga", "type": "readonly", "formula": "qty * price" }&#10;]'
                                            />
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={handleCloseModal} disabled={isSaving}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                                    {isSaving ? 'Saving...' : (editTemplateId ? 'Update Template' : 'Create Template')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
