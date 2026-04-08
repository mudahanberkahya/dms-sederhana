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
    Loader2
} from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
    const { user, currentBranch } = useContext(AppContext);
    const [recentDocs, setRecentDocs] = useState([]);
    const [stats, setStats] = useState({
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [docsRes, pendingRes] = await Promise.all([
                    api.documents.list(),
                    api.approvals.pending(),
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
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [currentBranch]);

    const activityFeed = [
        { user: 'System', action: 'logged in', doc: 'DMS Core', time: 'Just now' }
    ];

    const statusBadgeClass = (status) => {
        if (!status) return 'badge-neutral';
        switch (status.toUpperCase()) {
            case 'APPROVED': return 'badge-success';
            case 'REJECTED': return 'badge-danger';
            case 'PENDING': return 'badge-warning';
            default: return 'badge-neutral';
        }
    };

    const categoryBadgeClass = (category) => {
        if (!category) return 'badge-neutral';
        switch (category) {
            case 'Purchase Order': return 'badge-primary';
            case 'Cash Advance': return 'badge-accent';
            case 'Memo': return 'badge-info';
            default: return 'badge-neutral';
        }
    };

    if (loading) {
        return (
            <div className="dashboard" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-teal)' }} />
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

    return (
        <div className="dashboard">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Welcome back, {user?.name.split(' ')[0] || 'User'}!</p>
                </div>
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

                {/* Activity Feed */}
                <div className="card activity-card">
                    <div className="card-header">
                        <h2 className="card-title">Activity Feed</h2>
                        <TrendingUp size={16} className="text-muted" />
                    </div>
                    <div className="activity-list">
                        {activityFeed.map((act, i) => (
                            <div key={i} className="activity-item" style={{ animationDelay: `${i * 60}ms` }}>
                                <div className={`activity-dot dot-${act.action.replace(' ', '-')}`} />
                                <div className="activity-content">
                                    <p>
                                        <strong>{act.user}</strong> {act.action}{' '}
                                        <span className="mono">{act.doc}</span>
                                    </p>
                                    <span className="activity-time">{act.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
