import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';

// =====================================================================
// Enhancement 2: Register Handlebars Custom Helpers
// =====================================================================

/**
 * {{formatCurrency value}}
 * Converts a number (e.g. 1500000) to Indonesian Rupiah format (e.g. Rp 1.500.000)
 */
Handlebars.registerHelper('formatCurrency', function (value) {
    if (value === null || value === undefined || value === '') return '';
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^\d.-]/g, '')) : Number(value);
    if (isNaN(num)) return String(value);
    return 'Rp ' + num.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
});

/**
 * {{formatDate value}}
 * Converts a date string (YYYY-MM-DD or ISO) to Indonesian long date format
 * e.g. "2026-08-15" → "15 Agustus 2026"
 */
Handlebars.registerHelper('formatDate', function (value) {
    if (!value) return '';
    try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return String(value);
        return new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(date);
    } catch {
        return String(value);
    }
});

// =====================================================================
// Enhancement 1: HTML Boilerplate Wrapper with Base CSS
// =====================================================================

/**
 * Wraps raw HTML content with a full HTML document boilerplate
 * including base CSS for proper Puppeteer rendering.
 * 
 * @param {string} bodyHtml - The compiled Handlebars HTML content
 * @returns {string} Complete HTML document string
 */
function wrapWithBoilerplate(bodyHtml) {
    return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
/* === Base Typography === */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #000;
}

/* === Table Styling === */
table {
    border-collapse: collapse;
    width: 100%;
    margin: 8px 0;
    table-layout: fixed;
    word-wrap: break-word;
}
th, td {
    border: 1px solid #000;
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
    font-size: 11pt;
    word-wrap: break-word;
    overflow-wrap: break-word;
}
th {
    background-color: #f0f0f0;
    font-weight: bold;
}

/* === Quill Alignment Classes === */
.ql-align-center { text-align: center; }
.ql-align-right { text-align: right; }
.ql-align-justify { text-align: justify; }

/* === Quill Indent Classes === */
.ql-indent-1 { padding-left: 3em; }
.ql-indent-2 { padding-left: 6em; }
.ql-indent-3 { padding-left: 9em; }

/* === Image Sizing === */
img {
    max-width: 100%;
    height: auto;
    object-fit: contain;
}

/* === List Styling === */
ul, ol {
    margin: 4px 0;
    padding-left: 2em;
}
li {
    margin-bottom: 2px;
}

/* === Heading Defaults === */
h1 { font-size: 18pt; margin: 8px 0; }
h2 { font-size: 16pt; margin: 6px 0; }
h3 { font-size: 14pt; margin: 4px 0; }
h4 { font-size: 12pt; margin: 4px 0; }

/* === Paragraph Spacing === */
p {
    margin: 4px 0;
}

/* === Horizontal Rule === */
hr {
    border: none;
    border-top: 1px solid #999;
    margin: 12px 0;
}
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

// =====================================================================
// Puppeteer PDF Rendering Service
// =====================================================================

/**
 * Compiles a Handlebars HTML template with data and renders it to a PDF buffer
 * using Puppeteer (headless Chrome).
 * 
 * @param {string} htmlTemplate - Raw HTML string with Handlebars placeholders
 * @param {Object} data - Data object to compile into the template
 * @param {Object} options - Rendering options
 * @param {string} [options.orientation='portrait'] - 'portrait' or 'landscape'
 * @param {string} [options.format='A4'] - Paper format
 * @param {Object} [options.margin] - Page margins
 * @returns {Promise<Buffer>} PDF as a Node.js Buffer
 */
export async function renderHtmlToPdf(htmlTemplate, data = {}, options = {}) {
    const {
        orientation = 'portrait',
        format = 'A4',
        margin = { top: '2cm', bottom: '2cm', left: '2cm', right: '2cm' }
    } = options;

    // Strip HTML comments before compiling — they may contain literal {{ }} 
    // that confuse Handlebars (e.g. instructional comments like "use {{{ }}}")
    let sanitizedTemplate = htmlTemplate.replace(/<!--[\s\S]*?-->/g, '');

    // Fix ReactQuill's &nbsp; injection inside Handlebars expressions.
    // ReactQuill converts spaces to &nbsp; (non-breaking space), which breaks
    // Handlebars parsing: {{formatDate&nbsp;tanggal}} → {{formatDate tanggal}}
    // This regex finds all {{ ... }} and {{{ ... }}} blocks and decodes HTML entities inside them.
    sanitizedTemplate = sanitizedTemplate.replace(/\{\{\{?[^}]*\}?\}\}/g, (match) => {
        return match
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\u00A0/g, ' ');  // Also handle actual non-breaking space character
    });

    // Compile Handlebars template with data
    let compiledHtml;
    try {
        compiledHtml = Handlebars.compile(sanitizedTemplate)(data);
    } catch (compileErr) {
        throw new Error(`Template Handlebars error: ${compileErr.message}. Pastikan semua placeholder menggunakan format {{nama_field}} yang benar.`);
    }
    
    // Wrap with full HTML boilerplate + CSS injection
    const fullHtml = wrapWithBoilerplate(compiledHtml);

    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        
        // Set content and wait for all resources (images, fonts) to load
        await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format,
            landscape: orientation === 'landscape',
            margin,
            printBackground: true,
            preferCSSPageSize: false
        });

        return Buffer.from(pdfBuffer);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Convenience: compile and render a preview with empty/partial data.
 * Same as renderHtmlToPdf but exported with a descriptive name.
 */
export async function renderDraftPreview(htmlTemplate, formData, orientation) {
    return renderHtmlToPdf(htmlTemplate, formData, { orientation });
}

// Re-export Handlebars for direct usage if needed
export { Handlebars };
