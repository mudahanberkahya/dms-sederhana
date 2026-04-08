import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Search, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import './Admin.css';

export default function Categories() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [categoryId, setCategoryId] = useState('');
    const [categoryName, setCategoryName] = useState('');

    const fetchCategories = async () => {
        try {
            const data = await api.admin.categories.list();
            setCategories(data || []);
        } catch (err) {
            console.error("Failed to load categories", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleAddCategory = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.admin.categories.add({ id: categoryId, name: categoryName });
            setShowModal(false);
            setCategoryId('');
            setCategoryName('');
            await fetchCategories();
        } catch (err) {
            alert("Failed to add category: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm("Are you sure you want to delete this category? Workflows and documents relying on it might break.")) {
            return;
        }
        try {
            await api.admin.categories.delete(id);
            await fetchCategories();
        } catch (err) {
            alert("Failed to delete category: " + err.message);
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
        <div className="admin-page animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Document Categories</h1>
                    <p className="page-subtitle">Manage categories for documents and workflows</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={16} /> Add Category
                </button>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Category ID</th>
                            <th>Display Name</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map(c => (
                            <tr key={c.id}>
                                <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{c.id}</td>
                                <td>{c.name}</td>
                                <td>
                                    <button
                                        className="btn-icon danger"
                                        onClick={() => handleDeleteCategory(c.id)}
                                        title="Delete Category"
                                    >
                                        <X size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {categories.length === 0 && (
                            <tr>
                                <td colSpan="3" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                                    No categories found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && createPortal(
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Add New Category</h3>
                            <button className="btn-icon" onClick={() => setShowModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleAddCategory}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Category ID (e.g. 'Contract')</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={categoryId}
                                        onChange={e => setCategoryId(e.target.value)}
                                        required
                                        placeholder="Contract"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Display Name (e.g. 'Contract')</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={categoryName}
                                        onChange={e => setCategoryName(e.target.value)}
                                        required
                                        placeholder="Contract"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : 'Add Category'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}
        </div>
    );
}
