import { useState, useContext } from 'react';
import { AppContext } from '../App';
import { authClient } from '../lib/auth';
import { User, Bell, Palette, Loader2 } from 'lucide-react';
import './Admin.css';

export default function Settings() {
    const { user } = useContext(AppContext);

    // Change Password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pwLoading, setPwLoading] = useState(false);
    const [pwMessage, setPwMessage] = useState({ type: '', text: '' });

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPwMessage({ type: '', text: '' });

        if (newPassword !== confirmPassword) {
            setPwMessage({ type: 'error', text: 'New password and confirmation do not match.' });
            return;
        }
        if (newPassword.length < 8) {
            setPwMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
            return;
        }

        setPwLoading(true);
        try {
            const res = await authClient.changePassword({
                currentPassword,
                newPassword,
            });
            if (res.error) {
                throw new Error(res.error.message || 'Failed to change password.');
            }
            setPwMessage({ type: 'success', text: 'Password changed successfully!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setPwMessage({ type: 'error', text: err.message || 'Failed to change password. Check your current password.' });
        } finally {
            setPwLoading(false);
        }
    };

    return (
        <div className="admin-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Settings</h1>
                    <p className="page-subtitle">Manage your account and preferences</p>
                </div>
            </div>

            <div className="card" style={{ maxWidth: 640 }}>
                {/* Profile */}
                <div className="settings-section">
                    <h3><User size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} /> Profile</h3>
                    <div className="form-group">
                        <label className="form-label">Display Name</label>
                        <input className="form-input" defaultValue={user.name} disabled />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input className="form-input" defaultValue={user.email} disabled />
                    </div>
                </div>

                {/* Change Password */}
                <div className="settings-section">
                    <h3><User size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} /> Change Password</h3>
                    <form onSubmit={handleChangePassword}>
                        <div className="form-group">
                            <label className="form-label">Current Password</label>
                            <input
                                className="form-input"
                                type="password"
                                placeholder="Enter current password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <input
                                className="form-input"
                                type="password"
                                placeholder="Minimum 8 characters"
                                minLength={8}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirm New Password</label>
                            <input
                                className="form-input"
                                type="password"
                                placeholder="Re-enter new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        {pwMessage.text && (
                            <div style={{
                                padding: '0.6rem 1rem',
                                borderRadius: '8px',
                                marginBottom: '1rem',
                                fontSize: '0.85rem',
                                background: pwMessage.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                                color: pwMessage.type === 'success' ? '#22c55e' : '#ef4444',
                                border: `1px solid ${pwMessage.type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`
                            }}>
                                {pwMessage.text}
                            </div>
                        )}

                        <button className="btn btn-primary btn-sm" type="submit" disabled={pwLoading} style={{ minWidth: 120 }}>
                            {pwLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Save Password'}
                        </button>
                    </form>
                </div>

                {/* Notifications */}
                <div className="settings-section">
                    <h3><Bell size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} /> Notifications</h3>
                    <div className="settings-row">
                        <div>
                            <div className="settings-label">Email on approval request</div>
                            <div className="settings-desc">Get notified when a document needs your approval</div>
                        </div>
                        <label className="toggle-switch">
                            <input type="checkbox" defaultChecked />
                            <span className="toggle-slider" />
                        </label>
                    </div>
                    <div className="settings-row">
                        <div>
                            <div className="settings-label">Email on rejection</div>
                            <div className="settings-desc">Get notified when your document is rejected</div>
                        </div>
                        <label className="toggle-switch">
                            <input type="checkbox" defaultChecked />
                            <span className="toggle-slider" />
                        </label>
                    </div>
                    <div className="settings-row">
                        <div>
                            <div className="settings-label">Daily digest</div>
                            <div className="settings-desc">Daily summary of all document activity</div>
                        </div>
                        <label className="toggle-switch">
                            <input type="checkbox" />
                            <span className="toggle-slider" />
                        </label>
                    </div>
                </div>

                {/* Display */}
                <div className="settings-section">
                    <h3><Palette size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} /> Display</h3>
                    <div className="form-group">
                        <label className="form-label">Language</label>
                        <select className="form-select" defaultValue="id">
                            <option value="id">Bahasa Indonesia</option>
                            <option value="en">English</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Items per page</label>
                        <select className="form-select" defaultValue="10">
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}
