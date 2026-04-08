import { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Loader2, X, Edit2 } from 'lucide-react';
import { api } from '../lib/api';
import { AppContext } from '../App';
import './Admin.css';

const categoryBadgeClass = (cat) => {
    switch (cat.toLowerCase()) {
        case 'purchase order': return 'badge-po';
        case 'cash advance': return 'badge-ca';
        case 'memo': return 'badge-memo';
        case 'petty cash': return 'badge-petty';
        default: return 'badge-pending';
    }
};

export default function Keywords() {
    const { categories, roles } = useContext(AppContext);
    const [keywords, setKeywords] = useState([]);
    const [loading, setLoading] = useState(true);

    // Add Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [adding, setAdding] = useState(false);
    const [newMapping, setNewMapping] = useState({
        category: '',
        branch: 'Astara Hotel',
        role: '',
        keyword: '',
        offset_x: 0,
        offset_y: 0,
        positionHint: 'Below signature line'
    });

    // Delete Modal State
    const [deleteItem, setDeleteItem] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Edit Modal State
    const [editItem, setEditItem] = useState(null);
    const [editing, setEditing] = useState(false);

    const fetchKeywords = async () => {
        try {
            const data = await api.admin.keywords.list();
            setKeywords(data);
        } catch (err) {
            console.error("Failed to load keywords", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKeywords();
    }, []);

    useEffect(() => {
        if (categories.length > 0 && roles.length > 0 && !newMapping.category && !newMapping.role) {
            setNewMapping(prev => ({
                ...prev,
                category: categories[0].id,
                role: roles[0].id
            }));
        }
    }, [categories, roles]);

    const handleAdd = async (e) => {
        e.preventDefault();
        setAdding(true);
        try {
            await api.admin.keywords.add(newMapping);
            setShowAddModal(false);
            setNewMapping({ category: categories[0]?.id || '', branch: 'Astara Hotel', role: roles[0]?.id || '', keyword: '', offset_x: 0, offset_y: 0, positionHint: 'Below signature line' });
            await fetchKeywords();
        } catch (err) {
            alert("Failed to add keyword mapping: " + err.message);
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.admin.keywords.delete(deleteItem.id);
            setDeleteItem(null);
            await fetchKeywords();
        } catch (err) {
            alert("Failed to delete keyword mapping: " + err.message);
        } finally {
            setDeleting(false);
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setEditing(true);
        try {
            await api.admin.keywords.update(editItem.id, editItem);
            setEditItem(null);
            await fetchKeywords();
        } catch (err) {
            alert("Failed to update keyword mapping: " + err.message);
        } finally {
            setEditing(false);
        }
    };

    if (loading) {
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
                    <h1 className="page-title">Keyword Configuration</h1>
                    <p className="page-subtitle">Map keywords to roles for automatic signature placement on PDFs</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    <Plus size={16} /> Add Mapping
                </button>
            </div>

            <div className="card admin-table-card">
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Document Category</th>
                                <th>Branch</th>
                                <th>Role</th>
                                <th>Keyword</th>
                                <th>XY Offset</th>
                                <th>Position Hint</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {keywords.map(row => (
                                <tr key={row.id}>
                                    <td><span className={`badge ${categoryBadgeClass(row.category)}`}>{row.category}</span></td>
                                    <td className="text-muted">{row.branch || 'All'}</td>
                                    <td><span className="role-tag">{row.role.replace('_', ' ').toUpperCase()}</span></td>
                                    <td><span className="keyword-cell">{row.keyword}</span></td>
                                    <td className="text-muted text-sm mono">X:{row.offset_x || 0} Y:{row.offset_y || 0}</td>
                                    <td className="text-muted text-sm" style={{ fontSize: '0.85rem' }}>{row.positionHint || 'Auto-placed using keyword search'}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button className="btn-icon" onClick={() => setEditItem({...row})} title="Edit Mapping" style={{ marginRight: '8px' }}>
                                            <Edit2 size={16} />
                                        </button>
                                        <button className="btn-icon danger" onClick={() => setDeleteItem(row)} title="Delete Mapping">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {keywords.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                        No keyword mappings configured
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Mapping Modal */}
            {showAddModal && createPortal(
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add Keyword Mapping</h3>
                            <button className="btn-icon" onClick={() => setShowAddModal(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleAdd}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Document Category</label>
                                    <select className="form-input" value={newMapping.category} onChange={e => setNewMapping({ ...newMapping, category: e.target.value })}>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Branch</label>
                                    <select className="form-input" value={newMapping.branch} onChange={e => setNewMapping({ ...newMapping, branch: e.target.value })}>
                                        <option value="Astara Hotel">Astara Hotel</option>
                                        <option value="Pentacity Hotel">Pentacity Hotel</option>
                                        <option value="All">All Branches (Global Fallback)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Role Target</label>
                                    <select className="form-input" value={newMapping.role} onChange={e => setNewMapping({ ...newMapping, role: e.target.value })}>
                                        {roles.map(r => <option key={r.id} value={r.id}>{r.name.toUpperCase()}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Keyword text in PDF</label>
                                    <input required className="form-input" placeholder="e.g. 'Approved by Hotel Manager'" value={newMapping.keyword} onChange={e => setNewMapping({ ...newMapping, keyword: e.target.value })} />
                                    <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>The exact text the system will search for to place the signature image.</p>
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">X Offset (px)</label>
                                        <input type="number" className="form-input" value={newMapping.offset_x} onChange={e => setNewMapping({ ...newMapping, offset_x: parseInt(e.target.value) || 0 })} />
                                        <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>Positif = Kanan, Negatif = Kiri</p>
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Y Offset (px)</label>
                                        <input type="number" className="form-input" value={newMapping.offset_y} onChange={e => setNewMapping({ ...newMapping, offset_y: parseInt(e.target.value) || 0 })} />
                                        <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>Positif = Atas, Negatif = Bawah</p>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Position Hint (Optional)</label>
                                    <input className="form-input" placeholder="e.g. 'Below the table'" value={newMapping.positionHint} onChange={e => setNewMapping({ ...newMapping, positionHint: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={adding}>
                                    {adding ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Add Mapping'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}

            {/* Delete Confirmation Modal */}
            {deleteItem && createPortal(
                <div className="modal-overlay" onClick={() => setDeleteItem(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 style={{ color: 'var(--accent-coral)' }}>Delete Keyword Mapping</h3>
                            <button className="btn-icon" onClick={() => setDeleteItem(null)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Are you sure you want to remove the keyword mapping for <strong style={{ color: 'var(--text-primary)' }}>{deleteItem.role.replace('_', ' ').toUpperCase()}</strong> on <strong style={{ color: 'var(--text-primary)' }}>{deleteItem.category}</strong> documents?
                            </p>
                            <div className="keyword-cell" style={{ marginTop: '12px', display: 'inline-block' }}>{deleteItem.keyword}</div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setDeleteItem(null)}>Cancel</button>
                            <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                                {deleting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Delete Mapping'}
                            </button>
                        </div>
                    </div>
                </div>
            , document.body)}

            {/* Edit Mapping Modal */}
            {editItem && createPortal(
                <div className="modal-overlay" onClick={() => setEditItem(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Edit Keyword Mapping</h3>
                            <button className="btn-icon" onClick={() => setEditItem(null)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleEditSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Document Category</label>
                                    <select className="form-input" value={editItem.category} onChange={e => setEditItem({ ...editItem, category: e.target.value })}>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Branch</label>
                                    <select className="form-input" value={editItem.branch} onChange={e => setEditItem({ ...editItem, branch: e.target.value })}>
                                        <option value="Astara Hotel">Astara Hotel</option>
                                        <option value="Pentacity Hotel">Pentacity Hotel</option>
                                        <option value="All">All Branches (Global Fallback)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Role Target</label>
                                    <select className="form-input" value={editItem.role} onChange={e => setEditItem({ ...editItem, role: e.target.value })}>
                                        {roles.map(r => <option key={r.id} value={r.id}>{r.name.toUpperCase()}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Keyword text in PDF</label>
                                    <input required className="form-input" placeholder="e.g. 'Approved by Hotel Manager'" value={editItem.keyword} onChange={e => setEditItem({ ...editItem, keyword: e.target.value })} />
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">X Offset (px)</label>
                                        <input type="number" className="form-input" value={editItem.offset_x} onChange={e => setEditItem({ ...editItem, offset_x: parseInt(e.target.value) || 0 })} />
                                        <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>Positif = Kanan, Negatif = Kiri</p>
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Y Offset (px)</label>
                                        <input type="number" className="form-input" value={editItem.offset_y} onChange={e => setEditItem({ ...editItem, offset_y: parseInt(e.target.value) || 0 })} />
                                        <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>Positif = Atas, Negatif = Bawah</p>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Position Hint (Optional)</label>
                                    <input className="form-input" placeholder="e.g. 'Below the table'" value={editItem.positionHint} onChange={e => setEditItem({ ...editItem, positionHint: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setEditItem(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={editing}>
                                    {editing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}
        </div>
    );
}
