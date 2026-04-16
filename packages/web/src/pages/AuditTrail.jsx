import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
    ClipboardList,
    FileUp,
    CheckCircle2,
    XCircle,
    Settings2,
    UserPlus,
    Search,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Filter
} from 'lucide-react';
import './AuditTrail.css';

const ACTION_OPTIONS = [
    { value: '', label: 'All Actions' },
    { value: 'DOCUMENT_UPLOADED', label: 'Document Uploaded' },
    { value: 'APPROVAL_GRANTED', label: 'Approval Granted' },
    { value: 'APPROVAL_REJECTED', label: 'Approval Rejected' },
    { value: 'WORKFLOW_UPDATED', label: 'Workflow Updated' },
    { value: 'KEYWORD_UPDATED', label: 'Keyword Updated' },
    { value: 'USER_CREATED', label: 'User Created' },
];

const ACTION_CONFIG = {
    DOCUMENT_UPLOADED:  { icon: FileUp,       color: 'blue',    label: 'Document Uploaded' },
    APPROVAL_GRANTED:   { icon: CheckCircle2,  color: 'emerald', label: 'Approval Granted' },
    APPROVAL_REJECTED:  { icon: XCircle,       color: 'rose',    label: 'Approval Rejected' },
    WORKFLOW_UPDATED:   { icon: Settings2,     color: 'amber',   label: 'Workflow Updated' },
    KEYWORD_UPDATED:    { icon: Settings2,     color: 'amber',   label: 'Keyword Updated' },
    USER_CREATED:       { icon: UserPlus,      color: 'blue',    label: 'User Joined' },
};

const PAGE_SIZE = 15;

export default function AuditTrail() {
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

    // Filters
    const [actionFilter, setActionFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = {
                limit: PAGE_SIZE,
                offset: (page - 1) * PAGE_SIZE,
            };
            if (actionFilter) params.action = actionFilter;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const result = await api.logs.list(params);
            setLogs(result.logs || []);
            setTotal(result.total || 0);
        } catch (err) {
            console.error('Failed to fetch audit logs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, actionFilter, startDate, endDate]);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
            ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    };

    const handleResetFilters = () => {
        setActionFilter('');
        setStartDate('');
        setEndDate('');
        setPage(1);
    };

    return (
        <div className="audit-trail-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Audit Trail</h1>
                    <p className="page-subtitle">System-wide activity log for compliance and monitoring</p>
                </div>
            </div>

            {/* Filters */}
            <div className="card audit-filters-card">
                <div className="audit-filters">
                    <div className="audit-filter-group">
                        <label className="audit-filter-label">
                            <Filter size={14} />
                            Action Type
                        </label>
                        <select
                            className="form-select audit-filter-select"
                            value={actionFilter}
                            onChange={e => { setActionFilter(e.target.value); setPage(1); }}
                        >
                            {ACTION_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="audit-filter-group">
                        <label className="audit-filter-label">Start Date</label>
                        <input
                            type="date"
                            className="form-input audit-filter-input"
                            value={startDate}
                            onChange={e => { setStartDate(e.target.value); setPage(1); }}
                        />
                    </div>

                    <div className="audit-filter-group">
                        <label className="audit-filter-label">End Date</label>
                        <input
                            type="date"
                            className="form-input audit-filter-input"
                            value={endDate}
                            onChange={e => { setEndDate(e.target.value); setPage(1); }}
                        />
                    </div>

                    {(actionFilter || startDate || endDate) && (
                        <button className="btn btn-ghost btn-sm audit-reset-btn" onClick={handleResetFilters}>
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Log Table */}
            <div className="card audit-table-card">
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="empty-state" style={{ padding: '48px 20px' }}>
                        <ClipboardList size={40} />
                        <p>No audit logs found</p>
                    </div>
                ) : (
                    <>
                        <table className="data-table audit-table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>User</th>
                                    <th>Action</th>
                                    <th>Entity</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => {
                                    const cfg = ACTION_CONFIG[log.action] || ACTION_CONFIG.DOCUMENT_UPLOADED;
                                    const Icon = cfg.icon;
                                    return (
                                        <tr key={log.id}>
                                            <td className="audit-timestamp">{formatDate(log.createdAt)}</td>
                                            <td>
                                                <span className="audit-user">{log.userName || 'System'}</span>
                                            </td>
                                            <td>
                                                <div className="audit-action-cell">
                                                    <span className={`audit-action-badge audit-action-${cfg.color}`}>
                                                        <Icon size={12} />
                                                        {cfg.label}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="audit-entity">{log.entity}</span>
                                            </td>
                                            <td className="audit-details">{log.details}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div className="audit-pagination">
                            <span className="pagination-info">
                                Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                            </span>
                            <div className="pagination-controls">
                                <button
                                    className="btn-icon"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                    let p;
                                    if (totalPages <= 5) {
                                        p = i + 1;
                                    } else if (page <= 3) {
                                        p = i + 1;
                                    } else if (page >= totalPages - 2) {
                                        p = totalPages - 4 + i;
                                    } else {
                                        p = page - 2 + i;
                                    }
                                    return (
                                        <button
                                            key={p}
                                            className={`pagination-page ${page === p ? 'active' : ''}`}
                                            onClick={() => setPage(p)}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}
                                <button
                                    className="btn-icon"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
