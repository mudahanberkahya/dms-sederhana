import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { AppContext } from '../App';
import { Clock, CheckCircle2, UserCheck, FileText, ArrowRight, Loader2, Calendar } from 'lucide-react';
import './Approvals.css';

const categoryBadge = (cat) => {
    const map = { 
        'Purchase Order': 'badge-po', 
        'PO': 'badge-po',
        'Cash Advance': 'badge-ca', 
        'CA': 'badge-ca',
        'Memo': 'badge-memo', 
        'Petty Cash': 'badge-petty' 
    };
    return map[cat] || 'badge-po';
};

export default function Approvals() {
    const { currentBranch } = useContext(AppContext);
    const [tab, setTab] = useState('pending');
    const [pendingItems, setPendingItems] = useState([]);
    const [loading, setLoading] = useState(true);

    // Date filter state (input values)
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    // Applied filter state (what's actually sent to the API)
    const [appliedStartDate, setAppliedStartDate] = useState('');
    const [appliedEndDate, setAppliedEndDate] = useState('');

    const handleApplyDateFilter = () => {
        setLoading(true);
        setAppliedStartDate(startDate);
        setAppliedEndDate(endDate);
    };

    const handleClearDateFilter = () => {
        setStartDate('');
        setEndDate('');
        setLoading(true);
        setAppliedStartDate('');
        setAppliedEndDate('');
    };

    // Placeholder mock data since full API routes aren't built for these sections
    const completedItems = [];
    const delegatedItems = [];

    useEffect(() => {
        const fetchPending = async () => {
            setLoading(true);
            try {
                const params = {};
                if (appliedStartDate) params.startDate = appliedStartDate;
                if (appliedEndDate) params.endDate = appliedEndDate;
                if (currentBranch && currentBranch !== 'All') params.branch = currentBranch;
                const data = await api.approvals.pending(params);
                setPendingItems(data);
            } catch (err) {
                console.error("Failed to load pending approvals", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPending();
    }, [appliedStartDate, appliedEndDate, currentBranch]);

    if (loading) {
        return (
            <div className="approvals-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-teal)' }} />
            </div>
        );
    }

    return (
        <div className="approvals-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">My Approvals</h1>
                    <p className="page-subtitle">Documents awaiting your review</p>
                </div>
            </div>

            <div className="tabs">
                <button className={`tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
                    <Clock size={16} /> Pending <span className="tab-count">{pendingItems.length}</span>
                </button>
                <button className={`tab ${tab === 'completed' ? 'active' : ''}`} onClick={() => setTab('completed')}>
                    <CheckCircle2 size={16} /> Completed
                </button>
                <button className={`tab ${tab === 'delegated' ? 'active' : ''}`} onClick={() => setTab('delegated')}>
                    <UserCheck size={16} /> Delegated to Me <span className="tab-count">{delegatedItems.length}</span>
                </button>
            </div>

            {/* Date Range Filter */}
            <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                <input
                    type="date"
                    className="form-input"
                    style={{ maxWidth: 170, fontSize: '0.85rem' }}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>to</span>
                <input
                    type="date"
                    className="form-input"
                    style={{ maxWidth: 170, fontSize: '0.85rem' }}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                />
                <button
                    className="btn btn-primary btn-sm"
                    onClick={handleApplyDateFilter}
                    disabled={!startDate && !endDate}
                >
                    Apply Filter
                </button>
                {(appliedStartDate || appliedEndDate) && (
                    <button className="btn btn-ghost btn-sm" onClick={handleClearDateFilter}>
                        Clear Dates
                    </button>
                )}
            </div>

            <div className="approval-list">
                {tab === 'pending' && pendingItems.map((item) => (
                    <Link to={`/documents/${item.documentId}`} key={item.approvalId} className="card approval-card animate-fade-in">
                        <div className="approval-card-left">
                            <FileText size={20} className="approval-file-icon" />
                            <div>
                                <div className="approval-doc-name">{item.title || 'Untitled Document'}</div>
                                <div className="approval-meta">
                                    <span className={`badge badge-sm ${categoryBadge(item.category)}`}>{item.category}</span>
                                    <span className="mono">{item.displayId}</span>
                                    <span>Branch: {item.branch || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="approval-card-right">
                            <span className="badge badge-pending">Awaiting Action</span>
                            <span className="approval-date">{new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            <ArrowRight size={16} className="approval-arrow" />
                        </div>
                    </Link>
                ))}

                {tab === 'completed' && completedItems.map((item) => (
                    <Link to={`/documents/${item.id}`} key={item.id} className="card approval-card animate-fade-in">
                        <div className="approval-card-left">
                            <FileText size={20} className="approval-file-icon" />
                            <div>
                                <div className="approval-doc-name">{item.name}</div>
                                <div className="approval-meta">
                                    <span className={`badge badge-sm ${categoryBadge(item.category)}`}>{item.category}</span>
                                    <span className="mono">{item.id}</span>
                                </div>
                            </div>
                        </div>
                        <div className="approval-card-right">
                            <span className={`badge ${item.action === 'Approved' ? 'badge-approved' : 'badge-rejected'}`}>
                                {item.action}
                            </span>
                            <span className="approval-date">{item.date}</span>
                        </div>
                    </Link>
                ))}

                {tab === 'delegated' && delegatedItems.map((item) => (
                    <Link to={`/documents/${item.id}`} key={item.id} className="card approval-card animate-fade-in">
                        <div className="approval-card-left">
                            <FileText size={20} className="approval-file-icon" />
                            <div>
                                <div className="approval-doc-name">{item.name}</div>
                                <div className="approval-meta">
                                    <span className={`badge badge-sm ${categoryBadge(item.category)}`}>{item.category}</span>
                                    <span className="mono">{item.id}</span>
                                    <span className="delegate-tag"><UserCheck size={12} /> from {item.delegatedFrom}</span>
                                </div>
                            </div>
                        </div>
                        <div className="approval-card-right">
                            <span className="badge badge-pending">Pending</span>
                            <span className="approval-date">{item.date}</span>
                            <ArrowRight size={16} className="approval-arrow" />
                        </div>
                    </Link>
                ))}

                {((tab === 'pending' && pendingItems.length === 0) ||
                    (tab === 'delegated' && delegatedItems.length === 0)) && (
                        <div className="empty-state">
                            <CheckCircle2 size={48} strokeWidth={1} />
                            <p>No items to show</p>
                        </div>
                    )}
            </div>
        </div>
    );
}
