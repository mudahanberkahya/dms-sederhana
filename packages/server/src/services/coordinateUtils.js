/**
 * Backend Coordinate Conversion Utilities
 * 
 * DOM/Web:  Origin at TOP-LEFT,  Y increases DOWNWARD
 * pdf-lib:  Origin at BOTTOM-LEFT, Y increases UPWARD
 * 
 * The frontend visual mapper stores field positions in PDF-point space
 * (already divided by scale). This utility converts the DOM-style Y
 * (top-down) to pdf-lib Y (bottom-up).
 */

/**
 * Convert a field's DOM-style Y coordinate to pdf-lib Y coordinate.
 * 
 * The frontend stores coordinates in PDF-point units (already scaled),
 * but with Y measured from the TOP of the page downward.
 * pdf-lib expects Y measured from the BOTTOM of the page upward.
 * 
 * @param {number} domY         - Y position from top of page (in PDF points)
 * @param {number} fieldHeight  - Height of the field (in PDF points)
 * @param {number} pdfPageHeight - Total height of the PDF page (in PDF points)
 * @returns {number} Y coordinate for pdf-lib (from bottom of page)
 */
export function domYToPdfY(domY, fieldHeight, pdfPageHeight) {
    // Return the TOP edge of the field box in PDF space.
    // DOM: top of field = domY
    // PDF: top of field = pageHeight - domY
    return pdfPageHeight - domY;
}

/**
 * Convert a pdf-lib Y coordinate back to DOM-style Y.
 * 
 * @param {number} pdfY          - Y position from bottom of page (in PDF points)
 * @param {number} fieldHeight   - Height of the field (in PDF points)
 * @param {number} pdfPageHeight - Total height of the PDF page (in PDF points)
 * @returns {number} Y coordinate from top (DOM-style, in PDF points)
 */
export function pdfYToDomY(pdfY, fieldHeight, pdfPageHeight) {
    return pdfPageHeight - pdfY - fieldHeight;
}
