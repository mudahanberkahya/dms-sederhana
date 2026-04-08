/**
 * Convert Markdown to PDF using marked + Puppeteer
 */
import { readFileSync, writeFileSync } from 'fs';
import { Marked } from 'marked';
import puppeteer from 'puppeteer';

const docsDir = '/Users/pdt/Documents/DMS/docs';

async function mdToPdf(inputFile, outputFile, title) {
    const md = readFileSync(`${docsDir}/${inputFile}`, 'utf-8');
    const marked = new Marked();
    const htmlBody = await marked.parse(md);

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 13px; line-height: 1.6; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 20px; }
  h1 { font-size: 24px; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-top: 30px; color: #1e40af; }
  h2 { font-size: 20px; color: #1e40af; margin-top: 25px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
  h3 { font-size: 16px; color: #374151; margin-top: 20px; }
  h4 { font-size: 14px; color: #4b5563; margin-top: 15px; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 12px; }
  th, td { border: 1px solid #d1d5db; padding: 6px 10px; text-align: left; }
  th { background: #f3f4f6; font-weight: 600; }
  tr:nth-child(even) { background: #f9fafb; }
  code { background: #f3f4f6; padding: 2px 5px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 12px; }
  pre { background: #1e293b; color: #e2e8f0; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 11px; }
  pre code { background: transparent; color: inherit; padding: 0; }
  blockquote { border-left: 3px solid #2563eb; margin: 12px 0; padding: 8px 16px; background: #eff6ff; color: #374151; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  ul, ol { padding-left: 24px; }
  li { margin: 3px 0; }
  a { color: #2563eb; text-decoration: none; }
  strong { color: #111827; }
</style>
</head><body>${htmlBody}</body></html>`;

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
        path: `${docsDir}/${outputFile}`,
        format: 'A4',
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
        printBackground: true
    });
    await browser.close();
    console.log(`  ✅ ${outputFile} created`);
}

async function main() {
    await mdToPdf('MASTER_DOCUMENTATION.md', 'MASTER_DOCUMENTATION.pdf', 'DMS Master Documentation');
    await mdToPdf('PANDUAN_PENGGUNAAN.md', 'PANDUAN_PENGGUNAAN.pdf', 'Panduan Penggunaan DMS');
    console.log('\nDone!');
}

main().catch(err => { console.error(err); process.exit(1); });
