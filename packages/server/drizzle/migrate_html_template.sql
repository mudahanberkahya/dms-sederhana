-- Migration: DocGen Engine - AcroForm to HTML-to-PDF
-- Date: 2026-05-04
-- Description: Add htmlContent and orientation columns to document_template table,
--              make filePath nullable for the new HTML-based template engine.

-- 1. Make filePath nullable (was NOT NULL before)
ALTER TABLE document_template ALTER COLUMN file_path DROP NOT NULL;

-- 2. Add HTML content column for Handlebars templates
ALTER TABLE document_template ADD COLUMN IF NOT EXISTS html_content TEXT;

-- 3. Add orientation column (portrait/landscape)
ALTER TABLE document_template ADD COLUMN IF NOT EXISTS orientation VARCHAR(20) DEFAULT 'portrait';
