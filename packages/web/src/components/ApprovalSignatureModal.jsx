import { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Rnd } from 'react-rnd';
import { X, CheckCircle2, Loader2, PenTool, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { computeScale } from '../lib/coordinateUtils';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './ApprovalSignatureModal.css';

// Setup PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/**
 * ApprovalSignatureModal — Visual signature placement modal for approvers.
 * 
 * Props:
 *  - pdfBlobUrl: URL to the PDF blob for viewing
 *  - documentId: ID of the document
 *  - onConfirm: callback({ signatureConfig }) when user confirms placement
 *  - onCancel: callback when user closes modal
 *  - submitting: boolean for loading state
 *  - comment: string — approval comment
 */
export default function ApprovalSignatureModal({ pdfBlobUrl, documentId, onConfirm, onCancel, submitting, comment, initialPosition, initialPage }) {
    const [numPages, setNumPages] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pdfPageDimensions, setPdfPageDimensions] = useState({ width: 0, height: 0 });
    const [containerWidth, setContainerWidth] = useState(0);
    const [pdfLoaded, setPdfLoaded] = useState(false);

    // Signature box position/size in DOM pixels
    const [sigPos, setSigPos] = useState({ x: 200, y: 500, width: 140, height: 60 });
    const [positionInitialized, setPositionInitialized] = useState(false);

    const containerRef = useRef(null);

    // Measure container width
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const onDocumentLoadSuccess = useCallback(({ numPages: n }) => {
        setNumPages(n);
        // Default to initialPage (from keyword config) or page 1
        const targetPage = (initialPage && initialPage >= 1 && initialPage <= n) ? initialPage : 1;
        setCurrentPage(targetPage);
        setPdfLoaded(true);
    }, [initialPage]);

    const onPageLoadSuccess = useCallback((page) => {
        setPdfPageDimensions({ width: page.originalWidth, height: page.originalHeight });
    }, []);

    const scale = containerWidth > 0 && pdfPageDimensions.width > 0
        ? computeScale(containerWidth, pdfPageDimensions.width)
        : 1;

    // Initialize signature position from keyword offsets (once scale is ready)
    useEffect(() => {
        if (positionInitialized) return;
        if (!pdfLoaded || scale <= 0 || pdfPageDimensions.height <= 0) return;

        if (initialPosition && (initialPosition.x !== undefined || initialPosition.y !== undefined)) {
            // initialPosition.x/y are in PDF-point space (from keyword offset_x/offset_y)
            // Convert to DOM pixel positions using current scale
            const domX = Math.round(initialPosition.x * scale);
            const domY = Math.round(initialPosition.y * scale);
            
            // Clamp within bounds
            const maxX = Math.max(0, containerWidth - 140);
            const maxY = Math.max(0, (pdfPageDimensions.height * scale) - 60);

            setSigPos({
                x: Math.min(Math.max(0, domX), maxX),
                y: Math.min(Math.max(0, domY), maxY),
                width: 140,
                height: 60,
            });
            console.log(`[SignatureModal] Initialized from keyword offsets: PDF(${initialPosition.x}, ${initialPosition.y}) → DOM(${domX}, ${domY}) scale=${scale.toFixed(3)}`);
        }
        setPositionInitialized(true);
    }, [pdfLoaded, scale, pdfPageDimensions, initialPosition, positionInitialized, containerWidth]);

    const handleConfirm = () => {
        if (!onConfirm) return;

        // Convert DOM pixel positions to PDF-point units (same as template builder)
        const signatureConfig = {
            page: currentPage,
            x: Math.round(sigPos.x / scale),
            y: Math.round(sigPos.y / scale),
            width: Math.round(sigPos.width / scale),
            height: Math.round(sigPos.height / scale),
        };

        onConfirm({ signatureConfig });
    };

    return (
        <div className="signature-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}>
            <div className="signature-modal-content">
                {/* Header */}
                <div className="signature-modal-header">
                    <h2><PenTool size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Tempatkan Tanda Tangan</h2>
                    <button className="btn-icon" onClick={onCancel} disabled={submitting}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="signature-modal-body">
                    <div className="signature-instructions">
                        <Info size={16} className="info-icon" />
                        <span>Drag & resize kotak tanda tangan ke posisi yang diinginkan di atas dokumen, lalu klik <strong>Confirm Approve</strong>.</span>
                    </div>

                    {/* PDF Container + Signature Box Overlay */}
                    <div className="signature-pdf-container" ref={containerRef}>
                        {pdfBlobUrl ? (
                            <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                                <Document
                                    file={pdfBlobUrl}
                                    onLoadSuccess={onDocumentLoadSuccess}
                                    loading={
                                        <div className="signature-loading">
                                            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
                                            <span>Memuat dokumen PDF...</span>
                                        </div>
                                    }
                                >
                                    <Page
                                        pageNumber={currentPage}
                                        width={containerWidth || undefined}
                                        onLoadSuccess={onPageLoadSuccess}
                                        renderTextLayer={false}
                                        renderAnnotationLayer={false}
                                    />
                                </Document>

                                {/* Draggable Signature Box */}
                                {pdfLoaded && (
                                    <Rnd
                                        position={{ x: sigPos.x, y: sigPos.y }}
                                        size={{ width: sigPos.width, height: sigPos.height }}
                                        bounds="parent"
                                        onDragStop={(_e, d) => {
                                            setSigPos(prev => ({ ...prev, x: d.x, y: d.y }));
                                        }}
                                        onResizeStop={(_e, _dir, ref, _delta, position) => {
                                            setSigPos({
                                                width: parseInt(ref.style.width, 10),
                                                height: parseInt(ref.style.height, 10),
                                                x: position.x,
                                                y: position.y,
                                            });
                                        }}
                                        className="signature-drag-box"
                                        style={{ position: 'absolute' }}
                                        minWidth={80}
                                        minHeight={35}
                                    >
                                        <PenTool size={18} className="sig-icon" />
                                        <span className="sig-label">Tanda Tangan<br/>Di Sini</span>
                                    </Rnd>
                                )}
                            </div>
                        ) : (
                            <div className="signature-loading">
                                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
                                <span>Memuat dokumen...</span>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {numPages && numPages > 1 && (
                        <div className="signature-pagination">
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={currentPage <= 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span>Halaman {currentPage} dari {numPages}</span>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={currentPage >= numPages}
                                onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="signature-modal-footer">
                    <button className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
                        Batal
                    </button>
                    <button className="btn btn-primary" onClick={handleConfirm} disabled={submitting || !pdfLoaded}>
                        {submitting ? (
                            <>
                                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                Memproses...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={16} />
                                Confirm Approve
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
