import { useState, useEffect, useContext } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AppContext } from '../App';
import { api } from '../lib/api';
import {
    Upload,
    Filter,
    LayoutGrid,
    List,
    MoreHorizontal,
    FileText,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Calendar
} from 'lucide-react';
import './Documents.css';

const statuses = ['All', 'PENDING', 'APPROVED', 'REJECTED'];

const categoryBadgeClass = (cat) => {
    const map = { 
        'Purchase Order': 'badge-po', 'PO': 'badge-po', 
        'Cash Advance': 'badge-ca', 'CA': 'badge-ca', 
        'Memo': 'badge-memo', 
        'Petty Cash': 'badge-petty' 
    };
    return map[cat] || 'badge-po';
};

const statusBadgeClass = (status) => {
    const map = { 'PENDING': 'badge-pending', 'APPROVED': 'badge-approved', 'REJECTED': 'badge-rejected' };
    return map[status?.toUpperCase()] || 'badge-pending';
};

export default function Documents() {
    const { user, currentBranch, categories: globalCategories } = useContext(AppContext);
    const [searchParams] = useSearchParams();
    const [viewMode, setViewMode] = useState('table');
    const [activeCategory, setActiveCategory] = useState('All');
    const [activeStatus, setActiveStatus] = useState(searchParams.get('status') || 'All');
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);

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

    const handleDelete = async (id, e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to completely DELETE this document?")) return;
        setDeleting(true);
        try {
            await api.documents.delete(id);
            setDocuments(documents.filter(d => d.id !== id));
        } catch (err) {
            alert("Failed to delete document: " + err.message);
        } finally {
            setDeleting(false);
        }
    };

    useEffect(() => {
        const fetchDocs = async () => {
            try {
                const params = {};
                if (appliedStartDate) params.startDate = appliedStartDate;
                if (appliedEndDate) params.endDate = appliedEndDate;
                if (currentBranch && currentBranch !== 'All') params.branch = currentBranch;
                const data = await api.documents.list(params);
                setDocuments(data);
            } catch (err) {
                console.error("Failed to fetch documents", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDocs();
    }, [appliedStartDate, appliedEndDate, currentBranch]);

    const filtered = documents.filter((doc) => {
        // Filter by Branch matching the globally selected branch
        if (currentBranch && doc.branch && doc.branch !== currentBranch && currentBranch !== 'All') return false;

        if (activeCategory !== 'All' && doc.category !== activeCategory) return false;
        if (activeStatus !== 'All' && doc.status !== activeStatus.toUpperCase()) return false;
        return true;
    });

    if (loading) {
        return (
            <div className="documents-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-teal)' }} />
            </div>
        );
    }

    return (
        <div className="documents-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Documents</h1>
                    <p className="page-subtitle">{filtered.length} documents found</p>
                </div>
                <Link to="/documents/upload" className="btn btn-primary">
                    <Upload size={16} /> Upload Document
                </Link>
            </div>

            {/* Toolbar */}
            <div className="docs-toolbar card">
                <div className="filter-row">
                    <div className="filter-chips">
                        <button
                            className={`filter-chip ${activeCategory === 'All' ? 'active' : ''}`}
                            onClick={() => setActiveCategory('All')}
                        >
                            All
                        </button>
                        {(globalCategories || []).map((cat) => (
                            <button
                                key={cat.id}
                                className={`filter-chip ${activeCategory === cat.name ? 'active' : ''}`}
                                onClick={() => setActiveCategory(cat.name)}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    <div className="toolbar-right">
                        <select
                            className="form-select filter-select"
                            value={activeStatus}
                            onChange={(e) => setActiveStatus(e.target.value)}
                        >
                            {statuses.map((s) => (
                                <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
                            ))}
                        </select>

                        <div className="view-toggles">
                            <button
                                className={`btn-icon ${viewMode === 'table' ? 'active' : ''}`}
                                onClick={() => setViewMode('table')}
                            >
                                <List size={18} />
                            </button>
                            <button
                                className={`btn-icon ${viewMode === 'grid' ? 'active' : ''}`}
                                onClick={() => setViewMode('grid')}
                            >
                                <LayoutGrid size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Date Range Filter */}
                <div className="filter-row" style={{ gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
            </div>

            {/* Table View */}
            {viewMode === 'table' && (
                <div className="card docs-table-card">
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
                                {filtered.map((doc) => (
                                    <tr key={doc.id}>
                                        <td>
                                            <Link to={`/documents/${doc.id}`} className="doc-link" style={{ display: 'block', padding: '0.5rem 0' }}>
                                                <span className="doc-name font-medium">{doc.title || 'Untitled Document'}</span>
                                                <span className="doc-id mono text-sm text-muted" style={{ display: 'block', marginTop: '0.2rem' }}>{doc.displayId}</span>
                                            </Link>
                                        </td>
                                        <td><span className={`badge ${categoryBadgeClass(doc.category)}`}>{doc.category}</span></td>
                                        <td className="text-muted">{doc.branch || 'N/A'}</td>
                                        <td className="text-muted">{new Date(doc.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td><span className={`badge ${statusBadgeClass(doc.status)}`}>{doc.status?.toUpperCase() || 'PENDING'}</span></td>
                                        <td className="text-muted">{doc.uploaderUser?.name || `User ${doc.uploaderId}`}</td>
                                        <td>
                                            {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'super_admin' || user?.role?.toLowerCase() === 'superadmin') ? (
                                                <button
                                                    className="btn-icon danger"
                                                    onClick={(e) => handleDelete(doc.id, e)}
                                                    disabled={deleting}
                                                    title="Delete Document"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            ) : (
                                                <button className="btn-icon" disabled><MoreHorizontal size={16} /></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                            No documents found matching the filters
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Grid View */}
            {viewMode === 'grid' && (
                <div className="docs-grid">
                    {filtered.map((doc) => (
                        <Link key={doc.id} to={`/documents/${doc.id}`} className="doc-card card">
                            <div className="doc-card-preview">
                                <FileText size={32} strokeWidth={1} />
                            </div>
                            <div className="doc-card-body">
                                <span className={`badge badge-sm ${categoryBadgeClass(doc.category)}`}>{doc.category}</span>
                                <h3 className="doc-card-title">{doc.title || 'Untitled Document'}</h3>
                                <p className="doc-card-id mono">{doc.displayId}</p>
                                <div className="doc-card-footer">
                                    <span className={`badge badge-sm ${statusBadgeClass(doc.status)}`}>{doc.status?.toUpperCase()}</span>
                                    <span className="doc-card-date">{new Date(doc.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                    {filtered.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            No documents found matching the filters
                        </div>
                    )}
                </div>
            )}

            {/* Pagination */}
            <div className="pagination">
                <span className="pagination-info">Showing 1–{filtered.length} of {filtered.length}</span>
                <div className="pagination-controls">
                    <button className="btn-icon" disabled><ChevronLeft size={16} /></button>
                    <button className="pagination-page active">1</button>
                    <button className="btn-icon" disabled><ChevronRight size={16} /></button>
                </div>
            </div>
        </div>
    );
}
