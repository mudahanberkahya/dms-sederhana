import { useState, useEffect, useRef, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, MoreHorizontal, Pencil, KeyRound, Trash2, X, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { AppContext } from '../App';
import './Admin.css';

export default function Users() {
    const { roles, departments } = useContext(AppContext);
    const [search, setSearch] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: '', department: 'GENERAL', branches: ['Astara Hotel'] });

    // Ensure default role is selected if available
    useEffect(() => {
        if (roles.length > 0 && !newUser.role) {
            setNewUser(prev => ({ ...prev, role: roles[0].id }));
        }
    }, [roles]);

    // Action menu state
    const [menuUserId, setMenuUserId] = useState(null);
    const menuRef = useRef(null);

    // Edit modal state
    const [editUser, setEditUser] = useState(null);
    const [saving, setSaving] = useState(false);

    // Reset password modal state
    const [resetUser, setResetUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [resetting, setResetting] = useState(false);

    // Delete confirmation state
    const [deleteUser, setDeleteUser] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fetchUsers = async () => {
        try {
            const data = await api.admin.users.list();
            setUsers(data);
        } catch (err) {
            console.error("Failed to load users", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuUserId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            await api.admin.users.create(newUser);
            setShowAddForm(false);
            setNewUser({ name: '', email: '', password: '', role: roles[0]?.id || '', branches: ['Astara Hotel'] });
            await fetchUsers();
            alert("User created successfully!");
        } catch (err) {
            alert("Failed to create user: " + err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.admin.users.update(editUser.id, {
                name: editUser.name,
                email: editUser.email,
                role: editUser.role,
                branches: editUser.branches,
                department: editUser.department
            });
            setEditUser(null);
            await fetchUsers();
            alert("Saved");
        } catch (err) {
            alert("Failed to update user: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setResetting(true);
        try {
            await api.admin.users.resetPassword(resetUser.id, newPassword);
            setResetUser(null);
            setNewPassword('');
            alert('Password reset successfully!');
        } catch (err) {
            alert("Failed to reset password: " + err.message);
        } finally {
            setResetting(false);
        }
    };

    const handleDeleteUser = async () => {
        setDeleting(true);
        try {
            await api.admin.users.delete(deleteUser.id);
            setDeleteUser(null);
            await fetchUsers();
        } catch (err) {
            alert("Failed to delete user: " + err.message);
        } finally {
            setDeleting(false);
        }
    };

    const filtered = users.filter(u =>
        (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
    );

    const initials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    };

    const roleLabel = (rId) => {
        const found = roles.find(r => r.id === rId);
        return found ? found.name : (rId ? rId.replace(/_/g, ' ').toUpperCase() : 'N/A');
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
                    <h1 className="page-title">User Management</h1>
                    <p className="page-subtitle">{users.length} users across all branches</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
                    <Plus size={16} /> {showAddForm ? 'Cancel' : 'Add User'}
                </button>
            </div>

            <div className="admin-toolbar">
                <div className="admin-search">
                    <Search size={16} className="admin-search-icon" />
                    <input className="form-input" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            {showAddForm && (
                <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Create New Staff Member</h3>
                    <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div>
                            <label className="form-label">Full Name</label>
                            <input required className="form-input" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Email Address</label>
                            <input required type="email" className="form-input" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Password</label>
                            <input required type="password" className="form-input" minLength={8} value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Role</label>
                            <select className="form-input" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                <option value="admin">ADMIN</option>
                                {roles.filter(r => r.id !== 'admin').map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Department</label>
                            <select className="form-input" value={newUser.department || 'GENERAL'} onChange={e => setNewUser({ ...newUser, department: e.target.value })}>
                                <option value="GENERAL">GENERAL</option>
                                {departments?.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label className="form-label">Branches</label>
                            {['Astara Hotel', 'Pentacity Hotel'].map(b => (
                                <label key={b} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={newUser.branches?.includes(b)}
                                        onChange={(e) => {
                                            const updated = e.target.checked 
                                                ? [...(newUser.branches || []), b]
                                                : (newUser.branches || []).filter(br => br !== b);
                                            setNewUser({ ...newUser, branches: updated });
                                        }}
                                    />
                                    {b}
                                </label>
                            ))}
                        </div>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button type="submit" className="btn btn-primary" disabled={creating} style={{ minWidth: 120, justifyContent: 'center' }}>
                                {creating ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Create User'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card admin-table-card">
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Branch</th>
                                <th>Status</th>
                                <th>Absence</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(u => (
                                <tr key={u.id}>
                                    <td>
                                        <div className="user-cell">
                                            <div className="user-cell-avatar">{initials(u.name)}</div>
                                            <div className="user-cell-info">
                                                <span className="user-cell-name">{u.name}</span>
                                                <span className="user-cell-email">{u.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td><span className="role-tag">{roleLabel(u.role)}</span></td>
                                    <td className="text-muted" style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={u.branches?.join(', ') || 'N/A'}>
                                        {u.branches?.join(', ') || 'N/A'} {u.department ? `(${u.department})` : ''}
                                    </td>
                                    <td>
                                        <span className={`status-dot ${!u.banned ? 'active' : 'inactive'}`}>
                                            {!u.banned ? 'ACTIVE' : 'BANNED'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="text-muted" style={{ fontSize: '0.82rem' }}>—</span>
                                    </td>
                                    <td style={{ position: 'relative' }}>
                                        <button className="btn-icon" onClick={() => setMenuUserId(menuUserId === u.id ? null : u.id)}>
                                            <MoreHorizontal size={16} />
                                        </button>
                                        {menuUserId === u.id && (
                                            <div ref={menuRef} className="action-menu">
                                                <button className="action-menu-item" onClick={() => { setEditUser({ ...u }); setMenuUserId(null); }}>
                                                    <Pencil size={14} /> Edit User
                                                </button>
                                                <button className="action-menu-item" onClick={() => { setResetUser(u); setNewPassword(''); setMenuUserId(null); }}>
                                                    <KeyRound size={14} /> Reset Password
                                                </button>
                                                <button className="action-menu-item danger" onClick={() => { setDeleteUser(u); setMenuUserId(null); }}>
                                                    <Trash2 size={14} /> Delete User
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                        No users found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit User Modal */}
            {editUser && createPortal(
                <div className="modal-overlay" onClick={() => setEditUser(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Edit User</h3>
                            <button className="btn-icon" onClick={() => setEditUser(null)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleUpdateUser}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Full Name</label>
                                    <input required className="form-input" value={editUser.name} onChange={e => setEditUser({ ...editUser, name: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email Address</label>
                                    <input required type="email" className="form-input" value={editUser.email} onChange={e => setEditUser({ ...editUser, email: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Role</label>
                                    <select className="form-input" value={editUser.role || ''} onChange={e => setEditUser({ ...editUser, role: e.target.value })}>
                                        <option value="admin">ADMIN</option>
                                        {roles.filter(r => r.id !== 'admin').map(r => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Department</label>
                                    <select className="form-input" value={editUser.department || 'GENERAL'} onChange={e => setEditUser({ ...editUser, department: e.target.value })}>
                                        <option value="GENERAL">GENERAL</option>
                                        {departments?.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Branches</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        {['Astara Hotel', 'Pentacity Hotel'].map(b => (
                                            <label key={b} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={editUser.branches?.includes(b)}
                                                    onChange={(e) => {
                                                        const updated = e.target.checked 
                                                            ? [...(editUser.branches || []), b]
                                                            : (editUser.branches || []).filter(br => br !== b);
                                                        setEditUser({ ...editUser, branches: updated });
                                                    }}
                                                />
                                                {b}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setEditUser(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving || !editUser.branches?.length}>
                                    {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}

            {/* Reset Password Modal */}
            {resetUser && createPortal(
                <div className="modal-overlay" onClick={() => setResetUser(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Reset Password</h3>
                            <button className="btn-icon" onClick={() => setResetUser(null)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleResetPassword}>
                            <div className="modal-body">
                                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                    Set a new password for <strong style={{ color: 'var(--text-primary)' }}>{resetUser.name}</strong> ({resetUser.email})
                                </p>
                                <div className="form-group">
                                    <label className="form-label">New Password</label>
                                    <input required type="password" className="form-input" minLength={8} placeholder="Minimum 8 characters"
                                        value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setResetUser(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={resetting}>
                                    {resetting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Reset Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}

            {/* Delete Confirmation Modal */}
            {deleteUser && createPortal(
                <div className="modal-overlay" onClick={() => setDeleteUser(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 style={{ color: 'var(--accent-coral)' }}>Delete User</h3>
                            <button className="btn-icon" onClick={() => setDeleteUser(null)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Are you sure you want to permanently delete <strong style={{ color: 'var(--text-primary)' }}>{deleteUser.name}</strong> ({deleteUser.email})?
                                This action cannot be undone.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setDeleteUser(null)}>Cancel</button>
                            <button className="btn btn-danger" onClick={handleDeleteUser} disabled={deleting}>
                                {deleting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Delete User'}
                            </button>
                        </div>
                    </div>
                </div>
            , document.body)}
        </div>
    );
}
