/**
 * Convert Markdown docs to DOCX format using the 'docx' npm package.
 * Generates well-formatted Word documents from the DMS documentation.
 */
import { readFileSync, writeFileSync } from 'fs';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, TableRow, TableCell, Table, WidthType, BorderStyle } from 'docx';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const docsDir = dirname(__filename);

function parseMarkdownToDocx(mdContent, title) {
    const lines = mdContent.split('\n');
    const children = [];
    let inCodeBlock = false;
    let codeLines = [];
    let inTable = false;
    let tableRows = [];

    const flushTable = () => {
        if (tableRows.length > 0) {
            try {
                const table = new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: tableRows
                });
                children.push(table);
                children.push(new Paragraph({ text: '' }));
            } catch (e) {
                // fallback: add rows as text
                tableRows = [];
            }
            tableRows = [];
        }
        inTable = false;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Code block toggle
        if (line.trim().startsWith('```')) {
            if (inCodeBlock) {
                // End code block
                children.push(new Paragraph({
                    children: [new TextRun({
                        text: codeLines.join('\n'),
                        font: 'Courier New',
                        size: 18,
                        color: '333333'
                    })],
                    spacing: { before: 100, after: 100 },
                }));
                codeLines = [];
                inCodeBlock = false;
            } else {
                if (inTable) flushTable();
                inCodeBlock = true;
            }
            continue;
        }

        if (inCodeBlock) {
            codeLines.push(line);
            continue;
        }

        // Table row
        if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
            // Skip separator rows
            if (line.match(/^\|[\s\-:]+\|/)) continue;

            const cells = line.split('|').slice(1, -1).map(c => c.trim());
            const isHeader = !inTable;

            const row = new TableRow({
                children: cells.map(cellText => new TableCell({
                    children: [new Paragraph({
                        children: [new TextRun({
                            text: cellText.replace(/\*\*/g, ''),
                            bold: isHeader,
                            size: 20,
                            font: 'Calibri'
                        })],
                        spacing: { before: 40, after: 40 }
                    })],
                    width: { size: Math.floor(100 / cells.length), type: WidthType.PERCENTAGE },
                }))
            });

            tableRows.push(row);
            inTable = true;
            continue;
        } else if (inTable) {
            flushTable();
        }

        // Empty line
        if (line.trim() === '') {
            children.push(new Paragraph({ text: '' }));
            continue;
        }

        // Horizontal rule
        if (line.trim() === '---') {
            children.push(new Paragraph({
                children: [new TextRun({ text: '─'.repeat(80), color: 'CCCCCC', size: 16 })],
                spacing: { before: 200, after: 200 }
            }));
            continue;
        }

        // Headers
        const h1Match = line.match(/^# (.+)/);
        const h2Match = line.match(/^## (.+)/);
        const h3Match = line.match(/^### (.+)/);
        const h4Match = line.match(/^#### (.+)/);

        if (h1Match) {
            if (inTable) flushTable();
            children.push(new Paragraph({
                text: h1Match[1].replace(/[📘📖]/g, '').trim(),
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 }
            }));
            continue;
        }
        if (h2Match) {
            if (inTable) flushTable();
            children.push(new Paragraph({
                text: h2Match[1].replace(/[📘📖]/g, '').trim(),
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 150 }
            }));
            continue;
        }
        if (h3Match) {
            if (inTable) flushTable();
            children.push(new Paragraph({
                text: h3Match[1].replace(/[📘📖]/g, '').trim(),
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 200, after: 100 }
            }));
            continue;
        }
        if (h4Match) {
            if (inTable) flushTable();
            children.push(new Paragraph({
                text: h4Match[1],
                heading: HeadingLevel.HEADING_4,
                spacing: { before: 150, after: 80 }
            }));
            continue;
        }

        // Blockquote
        if (line.startsWith('>')) {
            const text = line.replace(/^>\s*/, '').replace(/\*\*/g, '');
            children.push(new Paragraph({
                children: [new TextRun({ text, italics: true, color: '666666', size: 22 })],
                indent: { left: 400 },
                spacing: { before: 40, after: 40 }
            }));
            continue;
        }

        // Bullet points
        const bulletMatch = line.match(/^(\s*)[-*]\s+(.+)/);
        if (bulletMatch) {
            const indent = bulletMatch[1].length;
            const text = bulletMatch[2].replace(/\*\*/g, '').replace(/`([^`]+)`/g, '$1');
            children.push(new Paragraph({
                children: [new TextRun({ text: `• ${text}`, size: 22, font: 'Calibri' })],
                indent: { left: 400 + (indent * 200) },
                spacing: { before: 40, after: 40 }
            }));
            continue;
        }

        // Numbered list
        const numMatch = line.match(/^(\s*)(\d+)\.\s+(.+)/);
        if (numMatch) {
            const text = numMatch[3].replace(/\*\*/g, '').replace(/`([^`]+)`/g, '$1');
            children.push(new Paragraph({
                children: [new TextRun({ text: `${numMatch[2]}. ${text}`, size: 22, font: 'Calibri' })],
                indent: { left: 400 },
                spacing: { before: 40, after: 40 }
            }));
            continue;
        }

        // Regular paragraph
        const cleanText = line.replace(/\*\*/g, '').replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
        children.push(new Paragraph({
            children: [new TextRun({ text: cleanText, size: 22, font: 'Calibri' })],
            spacing: { before: 60, after: 60 }
        }));
    }

    if (inTable) flushTable();

    return new Document({
        title,
        styles: {
            default: {
                document: {
                    run: { font: 'Calibri', size: 22 }
                }
            }
        },
        sections: [{
            properties: {
                page: {
                    margin: { top: 1440, bottom: 1440, left: 1080, right: 1080 }
                }
            },
            children
        }]
    });
}

async function main() {
    const files = [
        { md: 'MASTER_DOCUMENTATION.md', docx: 'MASTER_DOCUMENTATION.docx', title: 'DMS Master Documentation' },
        { md: 'PANDUAN_PENGGUNAAN.md', docx: 'PANDUAN_PENGGUNAAN.docx', title: 'Panduan Penggunaan DMS' },
        { md: 'PRD.md', docx: 'PRD.docx', title: 'Product Requirements Document (PRD)' },
        { md: 'PRODUCT_SPECIFICATION.md', docx: 'PRODUCT_SPECIFICATION.docx', title: 'Product Specification Document' }
    ];

    for (const file of files) {
        console.log(`Converting ${file.md} → ${file.docx}...`);
        const md = readFileSync(`${docsDir}/${file.md}`, 'utf-8');
        const doc = parseMarkdownToDocx(md, file.title);
        const buffer = await Packer.toBuffer(doc);
        writeFileSync(`${docsDir}/${file.docx}`, buffer);
        console.log(`  ✅ ${file.docx} created (${(buffer.length / 1024).toFixed(0)} KB)`);
    }

    console.log('\nDone!');
}

main().catch(err => { console.error(err); process.exit(1); });
