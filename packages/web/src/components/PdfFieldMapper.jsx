import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Rnd } from 'react-rnd';
import { Plus, Trash2, ChevronLeft, ChevronRight, Loader2, MousePointerSquareDashed } from 'lucide-react';
import { computeScale } from '../lib/coordinateUtils';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './PdfFieldMapper.css';

// Setup PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/**
 * PdfFieldMapper — Visual field placement component for Admin template builder.
 * 
 * Renders a PDF page and allows the admin to drag/drop/resize field boxes on top.
 * Outputs a JSON array of fields with absolute coordinates.
 * 
 * Props:
 *  - pdfFile: File object (from input[type=file])
 *  - initialFields: optional existing fields config array
 *  - onFieldsChange: callback(fieldsArray) called whenever fields change
 * 
 * Ref methods:
 *  - getFieldsConfig() → returns current fields array
 */
const PdfFieldMapper = forwardRef(function PdfFieldMapper({ pdfFile, initialFields, onFieldsChange }, ref) {
    const [numPages, setNumPages] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [fields, setFields] = useState(initialFields || []);
    const [selectedFieldId, setSelectedFieldId] = useState(null);
    const [editingField, setEditingField] = useState(null); // field being edited
    const [pdfPageDimensions, setPdfPageDimensions] = useState({ width: 0, height: 0 });
    const [containerWidth, setContainerWidth] = useState(0);

    const containerRef = useRef(null);
    const [pdfFileUrl, setPdfFileUrl] = useState(null);

    // Create object URL for the PDF file
    useEffect(() => {
        if (pdfFile) {
            const url = URL.createObjectURL(pdfFile);
            setPdfFileUrl(url);
            return () => URL.revokeObjectURL(url);
        }
        setPdfFileUrl(null);
    }, [pdfFile]);

    // Measure the container width for responsive rendering
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

    // Expose getFieldsConfig via ref
    useImperativeHandle(ref, () => ({
        getFieldsConfig: () => {
            const pageWidth = pdfPageDimensions.width || 595.28; // fallback to A4 width
            const scaleFactor = computeScale(containerWidth, pageWidth);
            
            // Debug scale
            console.log(`[PdfFieldMapper] getFieldsConfig: containerWidth=${containerWidth}, pageWidth=${pageWidth}, scale=${scaleFactor}`);

            return fields.map(f => {
                // Ensure we divide by a valid scale
                const s = (scaleFactor > 0 && isFinite(scaleFactor)) ? scaleFactor : 1;
                return {
                    name: f.name,
                    label: f.label || f.name,
                    type: f.type,
                    page: f.page,
                    x: Math.round(Number(f.x)),
                    y: Math.round(Number(f.y)),
                    width: Math.round(Number(f.width)),
                    height: Math.round(Number(f.height)),
                };
            });
        }
    }));

    // Notify parent of changes
    useEffect(() => {
        if (onFieldsChange) {
            onFieldsChange(fields.map(f => ({
                name: f.name,
                label: f.label || f.name,
                type: f.type,
                page: f.page,
                x: Math.round(f.x),
                y: Math.round(f.y),
                width: Math.round(f.width),
                height: Math.round(f.height),
            })));
        }
    }, [fields, containerWidth, pdfPageDimensions]);

    const onDocumentLoadSuccess = useCallback(({ numPages: n }) => {
        setNumPages(n);
        setCurrentPage(1);
    }, []);

    const onPageLoadSuccess = useCallback((page) => {
        // react-pdf viewport at scale:1 uses 96 DPI CSS pixels. pdf-lib uses 72 DPI points.
        // page.view array contains raw PDF points [x, y, width, height].
        const width = page.view ? page.view[2] : (page.getViewport ? page.getViewport({ scale: 1 }).width * (72 / 96) : 595.28);
        const height = page.view ? page.view[3] : (page.getViewport ? page.getViewport({ scale: 1 }).height * (72 / 96) : 841.89);
        setPdfPageDimensions({ width, height });
    }, []);

    const scale = containerWidth > 0 && pdfPageDimensions.width > 0
        ? computeScale(containerWidth, pdfPageDimensions.width)
        : 1;

    const renderedPageHeight = pdfPageDimensions.height * scale;

    // Add a new field
    const addField = () => {
        const id = `field_${Date.now()}`;
        const newField = {
            id,
            name: `field_${fields.length + 1}`,
            label: `Field ${fields.length + 1}`,
            type: 'text',
            page: currentPage,
            x: 40,
            y: 40,
            width: 180,
            height: 28,
        };
        setFields(prev => [...prev, newField]);
        setSelectedFieldId(id);
        setEditingField({ ...newField });
    };

    // Delete a field
    const deleteField = (id) => {
        setFields(prev => prev.filter(f => f.id !== id));
        if (selectedFieldId === id) setSelectedFieldId(null);
        if (editingField?.id === id) setEditingField(null);
    };

    // Update field position from drag
    const handleDragStop = (id, d) => {
        setFields(prev => prev.map(f =>
            f.id === id ? { ...f, x: d.x, y: d.y } : f
        ));
    };

    // Update field size from resize
    const handleResizeStop = (id, _e, _dir, ref, _delta, position) => {
        setFields(prev => prev.map(f =>
            f.id === id ? {
                ...f,
                width: parseInt(ref.style.width, 10),
                height: parseInt(ref.style.height, 10),
                x: position.x,
                y: position.y,
            } : f
        ));
    };

    // Double-click to edit field name/type
    const handleDoubleClick = (field) => {
        setSelectedFieldId(field.id);
        setEditingField({ ...field });
    };

    // Save edits from the editor panel
    const saveFieldEdit = () => {
        if (!editingField) return;
        setFields(prev => prev.map(f =>
            f.id === editingField.id ? { ...f, name: editingField.name, label: editingField.label || editingField.name, type: editingField.type } : f
        ));
        setEditingField(null);
    };

    const cancelFieldEdit = () => {
        setEditingField(null);
    };

    // Filter fields for current page
    const pageFields = fields.filter(f => f.page === currentPage);

    if (!pdfFile) {
        return (
            <div className="pdf-mapper-container">
                <div className="pdf-mapper-empty">
                    <MousePointerSquareDashed size={40} strokeWidth={1} />
                    <p>Upload a PDF file first</p>
                    <span>The visual field mapper will appear here after uploading</span>
                </div>
            </div>
        );
    }

    return (
        <div className="pdf-mapper-container">
            {/* Toolbar */}
            <div className="pdf-mapper-toolbar">
                <button type="button" className="btn btn-primary btn-sm" onClick={addField}>
                    <Plus size={14} /> Add Field
                </button>
                <span className="field-count">{fields.length} field{fields.length !== 1 ? 's' : ''} configured</span>
            </div>

            {/* Field Editor (when editing) */}
            {editingField && (
                <div className="pdf-field-editor">
                    <div className="form-group">
                        <label className="form-label">Field Name (ID)</label>
                        <input
                            type="text"
                            className="form-input"
                            value={editingField.name}
                            onChange={e => setEditingField(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g. field_to"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Label</label>
                        <input
                            type="text"
                            className="form-input"
                            value={editingField.label || ''}
                            onChange={e => setEditingField(prev => ({ ...prev, label: e.target.value }))}
                            placeholder="e.g. To"
                        />
                    </div>
                    <div className="form-group" style={{ minWidth: '100px', flex: 'none' }}>
                        <label className="form-label">Type</label>
                        <select
                            className="form-select"
                            value={editingField.type}
                            onChange={e => setEditingField(prev => ({ ...prev, type: e.target.value }))}
                        >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="textarea">Textarea</option>
                            <option value="readonly">Read-only</option>
                        </select>
                    </div>
                    <div className="editor-actions">
                        <button type="button" className="btn btn-primary btn-sm" onClick={saveFieldEdit}>Save</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={cancelFieldEdit}>Cancel</button>
                    </div>
                </div>
            )}

            {/* PDF Viewer + Field Overlay */}
            <div
                className={`pdf-mapper-viewer ${pdfFileUrl ? 'has-pdf' : ''}`}
                ref={containerRef}
                onClick={() => { setSelectedFieldId(null); }}
            >
                {pdfFileUrl && (
                    <div className="pdf-mapper-canvas-wrapper">
                        <Document
                            file={pdfFileUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            loading={
                                <div className="pdf-mapper-loading">
                                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
                                    <span>Loading PDF...</span>
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

                        {/* Draggable Field Overlays */}
                        {pageFields.map(field => (
                            <Rnd
                                key={field.id}
                                default={{
                                    x: field.x * scale,
                                    y: field.y * scale,
                                    width: field.width * scale,
                                    height: field.height * scale,
                                }}
                                position={{ x: field.x * scale, y: field.y * scale }}
                                size={{ width: field.width * scale, height: field.height * scale }}
                                bounds="parent"
                                onDragStop={(_e, d) => handleDragStop(field.id, { x: d.x / scale, y: d.y / scale })}
                                onResizeStop={(e, dir, ref, delta, pos) => handleResizeStop(field.id, e, dir, ref, delta, { x: pos.x / scale, y: pos.y / scale })}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedFieldId(field.id);
                                }}
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    handleDoubleClick(field);
                                }}
                                className={`pdf-field-box ${selectedFieldId === field.id ? 'selected' : ''}`}
                                style={{ position: 'absolute' }}
                                minWidth={60}
                                minHeight={18}
                            >
                                <span className="field-label">{field.name}</span>
                                <button
                                    type="button"
                                    className="field-delete-btn"
                                    onClick={(e) => { e.stopPropagation(); deleteField(field.id); }}
                                    title="Delete field"
                                >
                                    ×
                                </button>
                            </Rnd>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {numPages && numPages > 1 && (
                <div className="pdf-mapper-pagination">
                    <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    >
                        <ChevronLeft size={14} />
                    </button>
                    <span>Page {currentPage} of {numPages}</span>
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
    );
});

export default PdfFieldMapper;
