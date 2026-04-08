import { useState, useEffect, useRef } from 'react';
import { PenTool, Upload, Plus, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import './Admin.css';

export default function Signatures() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploadingId, setUploadingId] = useState(null);
    const fileInputRef = useRef(null);
    const [targetUserId, setTargetUserId] = useState(null);

    const fetchData = async () => {
        try {
            const [usersData, sigsData] = await Promise.all([
                api.admin.users.list(),
                api.admin.signatures.list()
            ]);

            const usersWithSigs = usersData.map(u => {
                const sig = sigsData.find(s => s.userId === u.id);
                return {
                    ...u,
                    hasSignature: !!sig,
                    signaturePath: sig ? sig.imagePath : null
                };
            });

            setUsers(usersWithSigs);
        } catch (err) {
            console.error("Failed to load users for signatures", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file || !targetUserId) return;

        setUploadingId(targetUserId);
        try {
            const formData = new FormData();
            formData.append('signatureImage', file);
            formData.append('userId', targetUserId);

            await api.admin.signatures.upload(formData);

            // Refresh data to show new signature
            await fetchData();
        } catch (err) {
            console.error("Upload failed", err);
            alert("Failed to upload signature: " + err.message);
        } finally {
            setUploadingId(null);
            setTargetUserId(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const triggerUpload = (userId) => {
        setTargetUserId(userId);
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const initials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
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
                    <h1 className="page-title">Signature Management</h1>
                    <p className="page-subtitle">Upload and manage user signature images (PNG)</p>
                </div>
                <input
                    type="file"
                    accept="image/png"
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                />
            </div>

            <div className="sig-grid">
                {users.map(u => (
                    <div key={u.id} className="card sig-card">
                        <div className="sig-preview">
                            {u.hasSignature ? (
                                <PenTool size={24} strokeWidth={1} />
                            ) : (
                                <span style={{ fontSize: '0.78rem' }}>No signature</span>
                            )}
                        </div>
                        <div className="user-cell" style={{ justifyContent: 'center' }}>
                            <div className="user-cell-avatar" style={{ width: 28, height: 28, fontSize: '0.65rem' }}>{initials(u.name)}</div>
                            <div>
                                <div className="sig-name">{u.name}</div>
                                <div className="sig-role">{u.role?.replace('_', ' ')}</div>
                            </div>
                        </div>
                        <button
                            className="btn btn-secondary btn-sm"
                            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                            onClick={() => triggerUpload(u.id)}
                            disabled={uploadingId === u.id}
                        >
                            {uploadingId === u.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />}
                            {uploadingId === u.id ? ' Uploading...' : (u.hasSignature ? ' Replace' : ' Upload')}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
