import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppContext } from '../App';
import { api } from '../lib/api';
import {
    ArrowLeft,
    Download,
    CheckCircle2,
    Circle,
    Clock,
    XCircle,
    FileText,
    Shield,
    UserCheck,
    Loader2,
    Lock,
    Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ApprovalSignatureModal from '../components/ApprovalSignatureModal';
import './DocumentDetail.css';

const StatusIcon = ({ status }) => {
    switch (status) {
        case 'completed': return <CheckCircle2 size={20} className="step-icon completed" />;
        case 'current': return <Clock size={20} className="step-icon current" />;
        case 'rejected': return <XCircle size={20} className="step-icon rejected" />;
        case 'locked': return <Lock size={18} className="step-icon pending" />;
        default: return <Circle size={18} className="step-icon pending" />;
    }
};

export default function DocumentDetail() {
    const { id } = useParams();
    const { user, refreshPendingCount } = useContext(AppContext);
    const [docData, setDocData] = useState(null);
    const [approvalSteps, setApprovalSteps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState(false);
    const [actionComment, setActionComment] = useState('');
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [blobVersion, setBlobVersion] = useState(0); // cache-bust counter
    const [signatureHint, setSignatureHint] = useState(null); // keyword offset data
    const navigate = useNavigate();

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to completely DELETE this document? This action cannot be undone.")) return;
        setSubmitting(true);
        try {
            await api.documents.delete(id);
            navigate('/documents');
        } catch (err) {
            alert("Failed to delete document: " + err.message);
            setSubmitting(false);
        }
    };

    const fetchDocDetails = async () => {
        try {
            const data = await api.documents.get(id);
            setDocData(data);
            setBlobVersion(v => v + 1); // trigger PDF blob re-fetch

            if (data.approvalChain && data.approvalChain.length > 0) {
                const mappedSteps = data.approvalChain.map((aStep) => {
                    let stepStatus = 'pending';
                    if (aStep.status === 'APPROVED') stepStatus = 'completed';
                    else if (aStep.status === 'REJECTED') stepStatus = 'rejected';
                    else if (aStep.status === 'PENDING') stepStatus = 'current';
                    else if (aStep.status === 'LOCKED') stepStatus = 'locked';

                    return {
                        id: aStep.id,
                        roleRequired: aStep.roleRequired,
                        role: (aStep.roleRequired || '').replace(/_/g, ' ').toUpperCase(),
                        assignedUserId: aStep.assignedUserId,
                        user: aStep.assignedUserId ? `Assigned: ${aStep.assignedUserId.substring(0, 8)}...` : 'Pending Assignment',
                        status: stepStatus,
                        date: aStep.signedAt ? new Date(aStep.signedAt).toLocaleDateString() : null,
                        comment: aStep.comment,
                        delegatedFromUserId: aStep.delegatedFromUserId
                    };
                });
                setApprovalSteps(mappedSteps);
            } else {
                setApprovalSteps([]);
            }
        } catch (err) {
            console.error("Failed to load document", err);
            setError('Could not load document details. It may not exist or you lack permissions.');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (actionType, signatureConfig = null) => {
        if (actionType === 'approve' && !signatureConfig) {
            // Fetch keyword offset hint before opening modal
            try {
                const hint = await api.approvals.signatureHint(id);
                setSignatureHint(hint);
            } catch (err) {
                console.warn('Failed to fetch signature hint, using defaults:', err);
                setSignatureHint({ offset_x: 0, offset_y: 0, page: 1 });
            }
            setShowSignatureModal(true);
            return;
        }

        if (actionType === 'reject') {
            if (!window.confirm('Are you sure you want to reject this document?')) return;
        }

        setSubmitting(true);
        try {
            const currentStep = approvalSteps.find(s => s.status === 'current');
            if (!currentStep) {
                alert('No pending approval step found for this document.');
                setSubmitting(false);
                return;
            }
            await api.approvals.action(
                currentStep.id, 
                actionType, 
                actionComment || `${actionType} via document details page`,
                signatureConfig
            );
            setShowSignatureModal(false);
            await fetchDocDetails();
            if (refreshPendingCount) refreshPendingCount();
            setActionComment('');
        } catch (err) {
            alert("Failed to process action: " + err.message);
            setSubmitting(false);
        }
    };

    // Callback from signature modal
    const handleSignatureConfirm = ({ signatureConfig }) => {
        handleAction('approve', signatureConfig);
    };

    // Show action buttons if: document is PENDING and user is admin or assigned to the current step
    const canApprove = () => {
        if (!docData || docData.status !== 'PENDING') return false;
        if (!user) return false;
        const currentStep = approvalSteps.find(s => s.status === 'current');
        if (!currentStep) return false;
        // Admin can always approve
        if (user.role === 'admin' || user.role === 'super_admin') return true;
        // Backend authorized approval check applies explicitly here (solves delegation issues)
        if (docData.canIApprove) return true;
        // Assigned user can approve
        if (currentStep.assignedUserId === user.id) return true;
        // Unassigned step matching user role
        if (!currentStep.assignedUserId && currentStep.roleRequired === user.role) return true;
        return false;
    };

    useEffect(() => {
        fetchDocDetails();
    }, [id]);

    // Fetch PDF securely with credentials and display as Blob URL
    useEffect(() => {
        if (docData && (docData.signedFilePath || docData.filePath)) {
            setPdfLoading(true);
            setPdfError(false);
            // Revoke old blob URL to free memory
            if (pdfBlobUrl) {
                URL.revokeObjectURL(pdfBlobUrl);
                setPdfBlobUrl(null);
            }
            api.documents.getFileBlob(id)
                .then(blob => {
                    const url = URL.createObjectURL(blob);
                    setPdfBlobUrl(url);
                })
                .catch(err => {
                    console.error("Failed to fetch PDF blob:", err);
                    setPdfError(true);
                })
                .finally(() => {
                    setPdfLoading(false);
                });
        }
    }, [docData, id, blobVersion]);

    // Cleanup Blob URL on unmount
    useEffect(() => {
        return () => {
            if (pdfBlobUrl) {
                URL.revokeObjectURL(pdfBlobUrl);
            }
        };
    }, [pdfBlobUrl]);

    if (loading) {
        return (
            <div className="detail-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-teal)' }} />
            </div>
        );
    }

    if (error || !docData) {
        return (
            <div className="detail-page" style={{ padding: '2rem', textAlign: 'center' }}>
                <XCircle size={48} style={{ color: 'var(--status-rejected)', margin: '0 auto 1rem' }} />
                <h3>Error Loading Document</h3>
                <p className="text-muted">{error}</p>
                <Link to="/documents" className="btn btn-secondary" style={{ marginTop: '1rem', display: 'inline-flex' }}>Return to Documents</Link>
            </div>
        );
    }

    return (
        <div className="detail-page">
            <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link to="/documents" className="btn btn-ghost">
                    <ArrowLeft size={16} /> Back to Documents
                </Link>
                {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'super_admin' || user?.role?.toLowerCase() === 'superadmin') && (
                    <button
                        className="btn btn-danger btn-sm"
                        onClick={handleDelete}
                        disabled={submitting}
                        title="Delete Document (Admin Only)"
                    >
                        <Trash2 size={16} /> Delete Document
                    </button>
                )}
            </div>

            <div className="detail-grid">
                {/* PDF Viewer — prefer signed version if available */}
                <div className="card pdf-viewer-card">
                    <div className="pdf-viewer-header">
                        <div className="pdf-info">
                            <FileText size={18} />
                            <span className="mono">{docData.displayId || id}</span>
                            {docData.signedFilePath && (
                                <span className="badge badge-success" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>Signed</span>
                            )}
                        </div>
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                                const fp = docData.signedFilePath || docData.filePath;
                                if (fp) {
                                    const backendUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
                                    window.open(`${backendUrl}/api/documents/${id}/file?download=true`, '_blank');
                                } else {
                                    alert("No file available to download");
                                }
                            }}
                        >
                            <Download size={14} /> Download
                        </button>
                    </div>
                    <div className="pdf-viewer-body" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
                        {pdfLoading ? (
                            <div className="pdf-placeholder">
                                <Loader2 size={48} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-teal)' }} />
                                <p>Loading secure document viewer...</p>
                            </div>
                        ) : pdfBlobUrl && !pdfError ? (
                            <iframe
                                key={pdfBlobUrl}
                                title="Document PDF Preview"
                                src={pdfBlobUrl}
                                width="100%"
                                height="100%"
                                style={{ border: 'none', flexGrow: 1 }}
                                onError={() => setPdfError(true)}
                            />
                        ) : (
                            <div className="pdf-placeholder">
                                <FileText size={64} strokeWidth={0.8} />
                                <p>{pdfError ? 'Failed to Load PDF Preview' : 'PDF Preview Not Available'}</p>
                                <span>{pdfError ? 'The document file could not be loaded.' : 'No file path associated with this document.'}</span>
                                {(docData.signedFilePath || docData.filePath) && (
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        style={{ marginTop: '1rem' }}
                                        onClick={() => {
                                            const backendUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
                                            window.open(`${backendUrl}/api/documents/${id}/file`, '_blank');
                                        }}
                                    >
                                        <Download size={14} /> Open in New Tab
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Approval Panel */}
                <div className="detail-sidebar">
                    {/* Document Info */}
                    <div className="card detail-info-card">
                        <h3 className="card-title">Document Info</h3>
                        <div className="info-grid">
                            <div className="info-item">
                                <span className="info-label">Title</span>
                                <span className="info-value">{docData.title || 'Untitled'}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Display ID</span>
                                <span className="info-value mono">{docData.displayId}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Category</span>
                                <span className={`badge badge-${(docData.category || '').toLowerCase().replace(' ', '-')}`}>{docData.category}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Branch</span>
                                <span className="info-value">{docData.branch || 'N/A'}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Uploaded</span>
                                <span className="info-value">{new Date(docData.createdAt).toLocaleDateString()} {new Date(docData.createdAt).toLocaleTimeString()}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Uploaded By</span>
                                <span className="info-value">{docData.uploaderUser?.name || `System`}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Status</span>
                                <span className="info-value mono">{docData.status}</span>
                            </div>
                            {docData.notes && (
                                <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                                    <span className="info-label">Notes from Uploader</span>
                                    <span className="info-value" style={{
                                        background: 'var(--bg-tertiary)',
                                        padding: '0.5rem 0.75rem',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        lineHeight: '1.5',
                                        display: 'block',
                                        marginTop: '0.25rem'
                                    }}>{docData.notes}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Approval Chain */}
                    <div className="card approval-chain-card">
                        <h3 className="card-title">
                            <Shield size={16} /> Approval Chain
                        </h3>
                        {approvalSteps.length === 0 ? (
                            <p className="text-muted" style={{ padding: '1rem', textAlign: 'center' }}>No workflow steps configured for this document.</p>
                        ) : (
                            <div className="approval-stepper">
                                {approvalSteps.map((step, i) => (
                                    <div key={i} className={`stepper-item step-${step.status}`}>
                                        <div className="stepper-line-area">
                                            <StatusIcon status={step.status} />
                                            {i < approvalSteps.length - 1 && <div className="stepper-line" />}
                                        </div>
                                        <div className="stepper-content">
                                            <div className="stepper-role">{`Step ${i + 1}: ${step.role}`}</div>
                                            <div className="stepper-user">{step.user}</div>
                                            {step.delegatedFromUserId && (
                                                <div className="stepper-delegate">
                                                    <UserCheck size={12} />
                                                    <span>Delegated from {step.delegatedFromUserId.substring(0, 8)}...</span>
                                                </div>
                                            )}
                                            {step.date && <div className="stepper-date">{step.date}</div>}
                                            {step.comment && <div className="stepper-note">{step.comment}</div>}
                                            {step.status === 'current' && (
                                                <div className="stepper-badge">
                                                    <Clock size={12} /> Awaiting Action
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    {canApprove() && (
                        <div className="detail-actions" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                            <textarea
                                className="form-input"
                                placeholder="Add a comment before approving or rejecting..."
                                value={actionComment}
                                onChange={(e) => setActionComment(e.target.value)}
                                style={{ marginBottom: '1rem', minHeight: '60px', resize: 'vertical' }}
                            />
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button
                                    className="btn btn-primary detail-action-btn"
                                    onClick={() => handleAction('approve')}
                                    disabled={submitting}
                                >
                                    {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={16} />}
                                    Approve & Sign
                                </button>
                                <button
                                    className="btn btn-danger detail-action-btn"
                                    onClick={() => handleAction('reject')}
                                    disabled={submitting}
                                >
                                    <XCircle size={16} /> Reject
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Visual Signature Modal */}
            {showSignatureModal && (
                <ApprovalSignatureModal
                    pdfBlobUrl={pdfBlobUrl}
                    documentId={id}
                    onConfirm={handleSignatureConfirm}
                    onCancel={() => setShowSignatureModal(false)}
                    submitting={submitting}
                    comment={actionComment}
                    initialPosition={signatureHint ? {
                        x: signatureHint.offset_x || 0,
                        y: signatureHint.offset_y || 0,
                    } : null}
                    initialPage={signatureHint?.page || 1}
                />
            )}
        </div>
    );
}
