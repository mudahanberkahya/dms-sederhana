import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Pencil, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import './Admin.css';

export default function Departments() {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [isEditing, setIsEditing] = useState(false);
    const [deptId, setDeptId] = useState('');
    const [deptName, setDeptName] = useState('');

    const fetchDepartments = async () => {
        try {
            const data = await api.admin.departments.list();
            setDepartments(data || []);
        } catch (err) {
            console.error("Failed to load departments", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepartments();
    }, []);

    const handleOpenEdit = (dept) => {
        setIsEditing(true);
        setDeptId(dept.id);
        setDeptName(dept.name);
        setShowModal(true);
    };

    const handleOpenAdd = () => {
        setIsEditing(false);
        setDeptId('');
        setDeptName('');
        setShowModal(true);
    };

    const handleSaveDepartment = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isEditing) {
                await api.admin.departments.update(deptId, { name: deptName });
            } else {
                await api.admin.departments.add({ id: deptId, name: deptName });
            }
            setShowModal(false);
            setDeptId('');
            setDeptName('');
            await fetchDepartments();
        } catch (err) {
            alert("Failed to save department: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteDepartment = async (id) => {
        if (!window.confirm("Are you sure you want to delete this department? Documents tied to this code might become orphaned.")) {
            return;
        }
        try {
            await api.admin.departments.delete(id);
            await fetchDepartments();
        } catch (err) {
            alert("Failed to delete department: " + err.message);
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
                    <h1 className="page-title">Departments</h1>
                    <p className="page-subtitle">Manage organization departments for routing and users</p>
                </div>
                <button className="btn btn-primary" onClick={handleOpenAdd}>
                    <Plus size={16} /> Add Department
                </button>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Department Code</th>
                            <th>Display Name</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {departments.map(d => (
                            <tr key={d.id}>
                                <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{d.id}</td>
                                <td>{d.name}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            className="btn-icon"
                                            onClick={() => handleOpenEdit(d)}
                                            title="Edit Department"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            className="btn-icon danger"
                                            onClick={() => handleDeleteDepartment(d.id)}
                                            title="Delete Department"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {departments.length === 0 && (
                            <tr>
                                <td colSpan="3" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                                    No departments found.
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
                            <h3>{isEditing ? 'Edit Department' : 'Add New Department'}</h3>
                            <button className="btn-icon" onClick={() => setShowModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveDepartment}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Department Code (e.g. 'FO')</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={deptId}
                                        onChange={e => setDeptId(e.target.value.toUpperCase())}
                                        required
                                        disabled={isEditing}
                                        placeholder="FO"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Display Name (e.g. 'Front Office')</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={deptName}
                                        onChange={e => setDeptName(e.target.value)}
                                        required
                                        placeholder="Front Office"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add Department')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}
        </div>
    );
}
