/**
 * Coordinate conversion utilities for DOM ↔ pdf-lib coordinate systems.
 *
 * DOM/Web:  Origin at TOP-LEFT,  Y increases DOWNWARD
 * pdf-lib:  Origin at BOTTOM-LEFT, Y increases UPWARD
 *
 * When the user drags a box on the web preview, we record DOM coordinates.
 * To print text/images at the same visual position in pdf-lib, we must invert Y.
 */

/**
 * Convert DOM coordinates (from the PDF viewer overlay) to pdf-lib coordinates.
 *
 * @param {number} domX        - X position in DOM (pixels from left of container)
 * @param {number} domY        - Y position in DOM (pixels from top of container)
 * @param {number} fieldHeight - Height of the field/box in DOM pixels
 * @param {number} pdfPageHeight - Height of the actual PDF page in points (from pdf-lib)
 * @param {number} scale       - Scale factor = DOM rendered width / PDF page width in points
 * @returns {{ x: number, y: number }} - Coordinates in pdf-lib points
 */
export function domToPdfCoords(domX, domY, fieldHeight, pdfPageHeight, scale) {
    // Convert DOM pixels to PDF points
    const pdfX = domX / scale;
    // Y inversion: DOM top → PDF bottom. The field's bottom edge in DOM is (domY + fieldHeight).
    // In PDF coords, the baseline of text is at the bottom of the box, so we use the bottom edge.
    const pdfY = pdfPageHeight - ((domY + fieldHeight) / scale);
    return { x: pdfX, y: pdfY };
}

/**
 * Convert pdf-lib coordinates back to DOM coordinates (for rendering existing configs).
 *
 * @param {number} pdfX        - X position in PDF points
 * @param {number} pdfY        - Y position in PDF points (from bottom)
 * @param {number} fieldHeight - Height of the field in DOM pixels
 * @param {number} pdfPageHeight - Height of the actual PDF page in points
 * @param {number} scale       - Scale factor = DOM rendered width / PDF page width in points
 * @returns {{ x: number, y: number }} - Coordinates in DOM pixels
 */
export function pdfToDomCoords(pdfX, pdfY, fieldHeight, pdfPageHeight, scale) {
    const domX = pdfX * scale;
    // Reverse the Y inversion
    const domY = (pdfPageHeight - pdfY) * scale - fieldHeight;
    return { x: domX, y: domY };
}

/**
 * Compute the scale factor from the rendered DOM container width and the PDF page width.
 *
 * @param {number} containerWidth - Width of the DOM container in pixels
 * @param {number} pdfPageWidth   - Width of the PDF page in points
 * @returns {number} scale factor
 */
export function computeScale(containerWidth, pdfPageWidth) {
    if (!pdfPageWidth || pdfPageWidth === 0) return 1;
    return containerWidth / pdfPageWidth;
}
