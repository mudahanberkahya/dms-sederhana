import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Calendar, UserCheck, Plus, X, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import './Admin.css';

export default function Delegation() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);

    // Delegation Form state
    const [absentUserId, setAbsentUserId] = useState('');
    const [delegateUserId, setDelegateUserId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchUsers = async () => {
        try {
            const data = await api.admin.users.list();
            setUsers(data || []);
        } catch (err) {
            console.error("Failed to load users for delegation", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const activeDelegations = users.filter(u => u.isAbsent === true);

    const handleSetAbsence = async (e) => {
        e.preventDefault();
        if (absentUserId === delegateUserId) {
            return alert("A user cannot delegate to themselves.");
        }

        setSaving(true);
        try {
            await api.admin.users.setDelegation(absentUserId, {
                isAbsent: true,
                delegatedToUserId: delegateUserId,
                startDate,
                endDate
            });
            setShowModal(false);
            setAbsentUserId('');
            setDelegateUserId('');
            setStartDate('');
            setEndDate('');
            await fetchUsers(); // Refresh to show new delegation
        } catch (err) {
            alert("Failed to set delegation: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleMarkReturned = async (userId) => {
        try {
            await api.admin.users.setDelegation(userId, {
                isAbsent: false,
                delegatedToUserId: null,
                startDate: null,
                endDate: null
            });
            await fetchUsers(); // Refresh
        } catch (err) {
            alert("Failed to update status: " + err.message);
        }
    };

    const initials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    };

    const getUserName = (id) => {
        const u = users.find(u => u.id === id);
        return u ? u.name : 'Unknown User';
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
                    <h1 className="page-title">Delegation Management</h1>
                    <p className="page-subtitle">Manage absence and approval delegation</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <UserCheck size={16} /> Set Absence
                </button>
            </div>

            {activeDelegations.length > 0 ? (
                <div className="delegation-card-grid">
                    {activeDelegations.map(d => (
                        <div key={d.id} className="card">
                            <div className="delegation-card-user">
                                <div className="user-cell-avatar">{initials(d.name)}</div>
                                <div>
                                    <div style={{ fontWeight: 500 }}>{d.name}</div>
                                    <div className="text-muted" style={{ fontSize: '0.78rem' }}>{d.role?.replace('_', ' ').toUpperCase()} — {d.branch}</div>
                                </div>
                            </div>

                            <div className="delegation-arrow">
                                <span>Delegated to</span>
                                <ArrowRight size={14} />
                                <strong>{getUserName(d.delegatedToUserId)}</strong>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14, fontSize: '0.82rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                                    <Calendar size={14} />
                                    <span>Absent since: {new Date().toLocaleDateString()}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                                    <Calendar size={14} />
                                    <span>Expected return: {new Date(new Date().setDate(new Date().getDate() + 7)).toLocaleDateString()}</span>
                                </div>
                                <div className="badge badge-pending" style={{ width: 'fit-content', marginTop: 4 }}>
                                    Active Delegation
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                                <button className="btn btn-danger btn-sm" onClick={() => handleMarkReturned(d.id)}>Mark as Returned</button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card empty-state">
                    <UserCheck size={48} strokeWidth={1} style={{ opacity: 0.2 }} />
                    <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>No active delegations</p>
                </div>
            )}

            {/* Set Absence Modal */}
            {showModal && createPortal(
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Set Absence & Delegation</h3>
                            <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSetAbsence}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Absent User</label>
                                    <select required className="form-input" value={absentUserId} onChange={e => setAbsentUserId(e.target.value)}>
                                        <option value="">Select User...</option>
                                        {users.filter(u => !u.isAbsent).map(u => (
                                            <option key={u.id} value={u.id}>{u.name} ({u.role?.replace('_', ' ')})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Delegate To</label>
                                    <select required className="form-input" value={delegateUserId} onChange={e => setDelegateUserId(e.target.value)}>
                                        <option value="">Select Delegate...</option>
                                        {users.filter(u => u.id !== absentUserId && !u.isAbsent).map(u => (
                                            <option key={u.id} value={u.id}>{u.name} ({u.role?.replace('_', ' ')})</option>
                                        ))}
                                    </select>
                                    <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                                        All approval requests sent to the absent user will be shown to the delegate.
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Start Date</label>
                                        <input required type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">End Date</label>
                                        <input required type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Confirm Delegation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            , document.body)}
        </div>
    );
}
