import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Search, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import './Admin.css';

export default function Roles() {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [roleId, setRoleId] = useState('');
    const [roleName, setRoleName] = useState('');

    const fetchRoles = async () => {
        try {
            const data = await api.admin.roles.list();
            setRoles(data || []);
        } catch (err) {
            console.error("Failed to load roles", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const handleAddRole = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.admin.roles.add({ id: roleId, name: roleName });
            setShowModal(false);
            setRoleId('');
            setRoleName('');
            await fetchRoles();
        } catch (err) {
            alert("Failed to add role: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRole = async (id) => {
        if (!window.confirm("Are you sure you want to delete this role? This might affect existing users and workflows.")) {
            return;
        }
        try {
            await api.admin.roles.delete(id);
            await fetchRoles();
        } catch (err) {
            alert("Failed to delete role: " + err.message);
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
                    <h1 className="page-title">Role Management</h1>
                    <p className="page-subtitle">Manage system roles for users and workflows</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={16} /> Add Role
                </button>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Role ID</th>
                            <th>Display Name</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {roles.map(r => (
                            <tr key={r.id}>
                                <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{r.id}</td>
                                <td>{r.name}</td>
                                <td>
                                    <button
                                        className="btn-icon danger"
                                        onClick={() => handleDeleteRole(r.id)}
                                        title="Delete Role"
                                        disabled={r.id === 'admin'} // Cannot delete admin
                                    >
                                        <X size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {roles.length === 0 && (
                            <tr>
                                <td colSpan="3" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                                    No roles found.
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
                            <h3>Add New Role</h3>
                            <button className="btn-icon" onClick={() => setShowModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleAddRole}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Role ID (e.g. 'auditor')</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={roleId}
                                        onChange={e => setRoleId(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                                        required
                                        placeholder="auditor"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Display Name (e.g. 'Auditor')</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={roleName}
                                        onChange={e => setRoleName(e.target.value)}
                                        required
                                        placeholder="Auditor"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : 'Add Role'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}
        </div>
    );
}
