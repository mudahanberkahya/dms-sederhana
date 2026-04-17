import { execFile } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const execFileAsync = util.promisify(execFile);

// Construct paths assuming ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.resolve(__dirname, '../../scripts/stamp_pdf.py');

export const PdfService = {
    /**
     * Invokes the PyMuPDF python script to stamp a signature image onto the target PDF.
     * 
     * Paths from the database may be relative (e.g. "storage/signatures/file.png")
     * so we resolve them relative to the server package root (process.cwd()).
     */
    async stampSignature(inputPdfPath, outputPdfPath, signatureImagePath, keyword, positionHint = 'Above', offsetX = 0, offsetY = 0, delegateName = '') {
        try {
            // Resolve absolute paths — DB stores relative paths like "storage/..."
            let inputAbs = inputPdfPath;
            if (!path.isAbsolute(inputAbs)) {
                inputAbs = path.resolve(process.cwd(), inputPdfPath);
                if (!fs.existsSync(inputAbs) && process.env.DOCUMENT_STORAGE_PATH) {
                    // Fallback to NAS if old relative path doesn't exist locally
                    inputAbs = path.join(process.env.DOCUMENT_STORAGE_PATH, path.basename(inputPdfPath));
                }
            }
            
            let outputAbs = outputPdfPath;
            if (!path.isAbsolute(outputAbs)) {
                if (process.env.DOCUMENT_STORAGE_PATH) {
                    // Always write new stamps to the new storage path
                    outputAbs = path.join(process.env.DOCUMENT_STORAGE_PATH, path.basename(outputPdfPath));
                } else {
                    outputAbs = path.resolve(process.cwd(), outputPdfPath);
                }
            }

            let sigAbs = signatureImagePath;
            if (!path.isAbsolute(sigAbs)) {
                sigAbs = path.resolve(process.cwd(), signatureImagePath);
                if (!fs.existsSync(sigAbs) && process.env.SIGNATURE_STORAGE_PATH) {
                    // Fallback to NAS if old relative signature doesn't exist locally
                    sigAbs = path.join(process.env.SIGNATURE_STORAGE_PATH, path.basename(signatureImagePath));
                }
            }

            console.log(`[PdfService] === PDF Signature Stamping ===`);
            console.log(`[PdfService]   Keyword:     "${keyword}"`);
            console.log(`[PdfService]   Position:    ${positionHint}`);
            console.log(`[PdfService]   Input PDF:   ${inputAbs}`);
            console.log(`[PdfService]   Output PDF:  ${outputAbs}`);
            console.log(`[PdfService]   Signature:   ${sigAbs}`);
            console.log(`[PdfService]   Script:      ${scriptPath}`);

            // File existence checks
            if (!fs.existsSync(inputAbs)) {
                console.error(`[PdfService] ERROR: Input PDF does not exist: ${inputAbs}`);
                throw new Error(`Input PDF not found: ${inputAbs}`);
            }
            if (!fs.existsSync(sigAbs)) {
                console.error(`[PdfService] ERROR: Signature image does not exist: ${sigAbs}`);
                throw new Error(`Signature image not found: ${sigAbs}`);
            }
            if (!fs.existsSync(scriptPath)) {
                console.error(`[PdfService] ERROR: Python script does not exist: ${scriptPath}`);
                throw new Error(`stamp_pdf.py not found: ${scriptPath}`);
            }

            // Ensure output directory exists
            const outputDir = path.dirname(outputAbs);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const args = [
                scriptPath,
                inputAbs,
                outputAbs,
                sigAbs,
                keyword,
                '--pos',
                positionHint || 'Above',
                '--offset_x',
                String(offsetX || 0),
                '--offset_y',
                String(offsetY || 0)
            ];

            if (delegateName) {
                args.push('--delegate_name');
                args.push(delegateName);
            }

            const { stdout, stderr } = await execFileAsync('python', args);

            if (stdout && stdout.trim()) {
                console.log(`[PdfService] Script Output:\n${stdout.trim()}`);
            }
            if (stderr && stderr.trim()) {
                console.warn(`[PdfService] Script Warnings:\n${stderr.trim()}`);
            }

            // Verify output was created
            if (fs.existsSync(outputAbs)) {
                const stats = fs.statSync(outputAbs);
                console.log(`[PdfService] ✅ Stamped PDF created: ${outputAbs} (${stats.size} bytes)`);
            } else {
                console.error(`[PdfService] ❌ Output PDF was NOT created at: ${outputAbs}`);
                throw new Error(`Stamped PDF was not created at: ${outputAbs}`);
            }

            return { success: true };
        } catch (err) {
            console.error(`[PdfService] Execution error:`, err.message);
            throw new Error(`PDF Stamping failed: ${err.message}`);
        }
    }
};

