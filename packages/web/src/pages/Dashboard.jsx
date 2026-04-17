import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../App';
import { api } from '../lib/api';
import {
    Clock,
    CheckCircle2,
    FileText,
    XCircle,
    ArrowUpRight,
    TrendingUp,
    Loader2,
    FileUp,
    UserPlus,
    Settings2,
    RefreshCw
} from 'lucide-react';
import './Dashboard.css';

// ── helpers ──────────────────────────────────────────────
const ACTIVITY_MAP = {
    DOCUMENT_UPLOADED:  { icon: FileUp,       color: 'blue',    label: 'Document Uploaded' },
    APPROVAL_GRANTED:   { icon: CheckCircle2,  color: 'emerald', label: 'Approval Granted' },
    APPROVAL_REJECTED:  { icon: XCircle,       color: 'rose',    label: 'Approval Rejected' },
    WORKFLOW_UPDATED:   { icon: Settings2,     color: 'amber',   label: 'Workflow Updated' },
    KEYWORD_UPDATED:    { icon: Settings2,     color: 'amber',   label: 'Keyword Updated' },
    USER_CREATED:       { icon: UserPlus,      color: 'blue',    label: 'User Joined' },
};

function timeAgo(dateStr) {
    const now = new Date();
    const then = new Date(dateStr);
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return then.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Dashboard() {
    const { user, currentBranch } = useContext(AppContext);
    const [recentDocs, setRecentDocs] = useState([]);
    const [activityFeed, setActivityFeed] = useState([]);
    const [stats, setStats] = useState({
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0
    });
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [docsRes, pendingRes, logsRes] = await Promise.all([
                    api.documents.list(),
                    api.approvals.pending(),
                    api.logs.list({ limit: 5 }).catch(() => ({ logs: [] })),
                ]);

                // Get recent 6 docs for the selected branch (or all branches)
                const filteredDocs = docsRes.filter(doc => currentBranch === 'All' ? true : doc.branch === currentBranch);
                setRecentDocs(filteredDocs.slice(0, 6));

                // Calculate stats from the full list
                const pendingCount = filteredDocs.filter(d => d.status === 'PENDING').length;
                const approvedCount = filteredDocs.filter(d => d.status === 'APPROVED').length;
                const rejectedCount = filteredDocs.filter(d => d.status === 'REJECTED').length;

                setStats({
                    pending: pendingRes.length, // Use actual pending approvals for the user
                    approved: approvedCount,
                    rejected: rejectedCount,
                    total: filteredDocs.length
                });

                // Set activity feed from logs API
                setActivityFeed(logsRes.logs || []);
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [currentBranch]);

    const statusBadgeClass = (status) => {
        if (!status) return 'badge-neutral';
        switch (status.toUpperCase()) {
            case 'APPROVED': return 'badge-approved';
            case 'REJECTED': return 'badge-rejected';
            case 'PENDING': return 'badge-pending';
            default: return 'badge-neutral';
        }
    };

    const categoryBadgeClass = (category) => {
        if (!category) return 'badge-neutral';
        switch (category) {
            case 'Purchase Order': return 'badge-po';
            case 'Cash Advance': return 'badge-ca';
            case 'Memo': return 'badge-memo';
            default: return 'badge-neutral';
        }
    };

    if (loading) {
        return (
            <div className="dashboard" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
            </div>
        );
    }

    const statCards = [
        {
            label: 'Pending Approvals',
            value: stats.pending,
            icon: Clock,
            color: 'pending',
            trend: 'Needs your attention',
            link: '/approvals'
        },
        {
            label: 'Approved',
            value: stats.approved,
            icon: CheckCircle2,
            color: 'teal',
            trend: 'Documents approved',
            link: '/documents?status=APPROVED'
        },
        {
            label: 'Rejected',
            value: stats.rejected,
            icon: XCircle,
            color: 'coral',
            trend: 'Documents rejected',
            link: '/documents?status=REJECTED'
        },
        {
            label: 'Total Documents',
            value: stats.total,
            icon: FileText,
            color: 'gold',
            trend: 'In the system',
            link: '/documents'
        }
    ];

    const handleSyncDocuments = async () => {
        if (!window.confirm("Simulasi ulang penugasan dokumen yang tersangkut. Tindakan ini aman namun memerlukan sedikit proses. Lanjutkan?")) return;
        setSyncing(true);
        try {
            const res = await api.approvals.sync();
            alert(res.message || "Sinkronisasi berhasil.");
            window.location.reload();
        } catch (err) {
            alert(err.message || "Gagal melakukan sinkronisasi dokumen.");
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="dashboard">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Welcome back, {user?.name.split(' ')[0] || 'User'}!</p>
                </div>
                {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'super_admin' || user?.role?.toLowerCase() === 'superadmin') && (
                    <button 
                        className="btn btn-outline"
                        onClick={handleSyncDocuments}
                        disabled={syncing}
                    >
                        <RefreshCw size={18} className={syncing ? "icon-spin" : ""} />
                        <span>{syncing ? 'Syncing...' : 'Sync Stuck Documents'}</span>
                    </button>
                )}
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                {statCards.map((stat, i) => (
                    <Link
                        key={i}
                        to={stat.link}
                        className={`stat-card card stat-${stat.color}`}
                        style={{ animationDelay: `${i * 80}ms`, textDecoration: 'none', cursor: 'pointer' }}
                    >
                        <div className="stat-card-header">
                            <div className={`stat-icon stat-icon-${stat.color}`}>
                                <stat.icon size={20} />
                            </div>
                            <ArrowUpRight size={14} className="stat-trend-icon" />
                        </div>
                        <div className="stat-value">{stat.value}</div>
                        <div className="stat-label">{stat.label}</div>
                        <div className="stat-trend">{stat.trend}</div>
                    </Link>
                ))}
            </div>

            <div className="dashboard-grid">
                {/* Recent Documents */}
                <div className="card recent-docs-card">
                    <div className="card-header">
                        <h2 className="card-title">Recent Documents</h2>
                        <Link to="/documents" className="btn btn-ghost btn-sm">
                            View All <ArrowUpRight size={14} />
                        </Link>
                    </div>
                    <div className="table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Document</th>
                                    <th>Category</th>
                                    <th>Branch</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Uploader</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentDocs.map((doc) => (
                                    <tr key={doc.id}>
                                        <td>
                                            <Link to={`/documents/${doc.id}`} className="doc-link" style={{ display: 'block', padding: '0.5rem 0' }}>
                                                <span className="doc-name">{doc.title || 'Untitled Document'}</span>
                                                <span className="doc-id mono" style={{ display: 'block', marginTop: '0.2rem' }}>{doc.displayId}</span>
                                            </Link>
                                        </td>
                                        <td><span className={`badge ${categoryBadgeClass(doc.category)}`}>{doc.category}</span></td>
                                        <td className="text-muted">{doc.branch || 'N/A'}</td>
                                        <td className="text-muted">{new Date(doc.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td><span className={`badge ${statusBadgeClass(doc.status)}`}>{doc.status?.toUpperCase()}</span></td>
                                        <td className="text-muted">{doc.uploaderUser?.name || (doc.uploadedBy ? `User ${doc.uploadedBy.substring(0, 8)}...` : 'Unknown')}</td>
                                        <td>
                                            <Link to={`/documents/${doc.id}`} className="btn-icon"><ArrowUpRight size={16} /></Link>
                                        </td>
                                    </tr>
                                ))}
                                {recentDocs.length === 0 && (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                            No recent documents found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Activity Feed — Live from /api/logs */}
                <div className="card activity-card">
                    <div className="card-header">
                        <h2 className="card-title">Activity Feed</h2>
                        <TrendingUp size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div className="activity-list">
                        {activityFeed.length > 0 ? activityFeed.map((log, i) => {
                            const cfg = ACTIVITY_MAP[log.action] || ACTIVITY_MAP.DOCUMENT_UPLOADED;
                            const Icon = cfg.icon;
                            return (
                                <div key={log.id || i} className="activity-item" style={{ animationDelay: `${i * 60}ms` }}>
                                    <div className={`activity-icon-circle activity-icon-${cfg.color}`}>
                                        <Icon size={16} />
                                    </div>
                                    <div className="activity-content">
                                        <p className="activity-title">{cfg.label}</p>
                                        <p className="activity-detail">
                                            <strong>{log.userName || 'System'}</strong>{' '}
                                            {log.details}
                                        </p>
                                        <span className="activity-time">{timeAgo(log.createdAt)}</span>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="empty-state" style={{ padding: '32px 16px' }}>
                                <TrendingUp size={32} />
                                <p>No activity yet</p>
                            </div>
                        )}
                    </div>
                    {activityFeed.length > 0 && (
                        <Link to="/admin/audit-trail" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}>
                            View Full Audit Trail <ArrowUpRight size={14} />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
