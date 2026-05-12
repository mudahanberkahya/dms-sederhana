import express from 'express';
import db from '../db/schema.js';

const router = express.Router();

const SEED_TEMPLATES = [
  {
    displayId: 'TPL-001',
    name: 'Purchase Order',
    category: 'PO',
    description: 'Template PO standar untuk procurement barang dan jasa.',
    content: `<div style="font-family: Arial; max-width: 700px; margin: 0 auto; padding: 20px;">
  <h2 style="text-align: center; margin-bottom: 24px;">PURCHASE ORDER</h2>
  <table style="width: 100%; margin-bottom: 20px;">
    <tr><td><strong>No. PO:</strong> {{poNumber}}</td><td style="text-align: right;"><strong>Tanggal:</strong> {{date}}</td></tr>
    <tr><td colspan="2"><strong>Vendor:</strong> {{vendor}}</td></tr>
  </table>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <tr style="background: #f5f5f5;">
      <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Item</th>
      <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Qty</th>
      <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Harga</th>
      <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Total</th>
    </tr>
    {{#each items}}
    <tr>
      <td style="border: 1px solid #ddd; padding: 10px;">{{this.name}}</td>
      <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">{{this.qty}}</td>
      <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">Rp {{formatNumber this.price}}</td>
      <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">Rp {{formatNumber this.total}}</td>
    </tr>
    {{/each}}
  </table>
  <p style="text-align: right; font-size: 18px; font-weight: bold;">Grand Total: Rp {{formatNumber grandTotal}}</p>
  <hr style="margin: 20px 0;" />
  <p><strong>Disetujui oleh:</strong></p>
  <div style="display: flex; justify-content: space-between; margin-top: 40px;">
    <div><em>(Purchasing)</em></div>
    <div><em>(Finance)</em></div>
    <div><em>(Director)</em></div>
  </div>
</div>`,
    fields: JSON.stringify([
      { name: 'poNumber', label: 'Nomor PO', type: 'text', required: true },
      { name: 'date', label: 'Tanggal', type: 'date', required: true },
      { name: 'vendor', label: 'Nama Vendor', type: 'text', required: true },
      { name: 'items', label: 'Items', type: 'table', columns: [
        { name: 'name', label: 'Nama Item', type: 'text' },
        { name: 'qty', label: 'Quantity', type: 'number' },
        { name: 'price', label: 'Harga Satuan', type: 'number' },
        { name: 'total', label: 'Total', type: 'number', readOnly: true }
      ] }
    ]),
    isActive: 1,
  },
  {
    displayId: 'TPL-002',
    name: 'Memo Internal',
    category: 'MEMO',
    description: 'Template memo internal untuk komunikasi antar departemen.',
    content: `<div style="font-family: Arial; max-width: 650px; margin: 0 auto; padding: 30px;">
  <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px;">
    <h1>MEMO INTERNAL</h1>
    <p><strong>No:</strong> {{memoNumber}} | <strong>Tanggal:</strong> {{date}}</p>
  </div>
  <table style="width: 100%; margin-bottom: 20px;">
    <tr><td style="width: 100px;"><strong>Dari:</strong></td><td>{{from}}</td></tr>
    <tr><td><strong>Kepada:</strong></td><td>{{to}}</td></tr>
    <tr><td><strong>Perihal:</strong></td><td>{{subject}}</td></tr>
    <tr><td><strong>Prioritas:</strong></td><td>{{priority}}</td></tr>
  </table>
  <div style="border: 1px solid #ddd; padding: 20px; min-height: 200px; margin-bottom: 20px;">
    {{content}}
  </div>
  <div style="margin-top: 40px;">
    <p><em>{{fromName}}</em></p>
  </div>
</div>`,
    fields: JSON.stringify([
      { name: 'memoNumber', label: 'Nomor Memo', type: 'text', required: true },
      { name: 'date', label: 'Tanggal', type: 'date', required: true },
      { name: 'from', label: 'Dari (Departemen)', type: 'text', required: true },
      { name: 'fromName', label: 'Nama Pengirim', type: 'text', required: true },
      { name: 'to', label: 'Kepada', type: 'text', required: true },
      { name: 'subject', label: 'Perihal', type: 'text', required: true },
      { name: 'priority', label: 'Prioritas', type: 'select', options: ['Rendah', 'Normal', 'Tinggi', 'Urgen'], required: true },
      { name: 'content', label: 'Isi Memo', type: 'textarea', required: true },
    ]),
    isActive: 1,
  },
  {
    displayId: 'TPL-003',
    name: 'Surat Perintah Kerja (SPK)',
    category: 'SPK',
    description: 'Template SPK untuk pekerjaan/ proyek internal.',
    content: `<div style="font-family: Arial; max-width: 700px; margin: 0 auto; padding: 20px;">
  <h2 style="text-align: center; margin-bottom: 24px;">SURAT PERINTAH KERJA</h2>
  <p><strong>No. SPK:</strong> {{spkNumber}}</p>
  <p><strong>Tanggal:</strong> {{date}}</p>
  <p><strong>Kepada:</strong> {{assignee}}</p>
  <p><strong>Jenis Pekerjaan:</strong> {{workType}}</p>
  <p><strong>Lokasi:</strong> {{location}}</p>
  <p><strong>Waktu Pelaksanaan:</strong> {{startDate}} s/d {{endDate}}</p>
  <hr />
  <h4>Deskripsi Pekerjaan</h4>
  <p>{{description}}</p>
  <hr />
  <p><strong>Estimasi Biaya:</strong> Rp {{formatNumber budget}}</p>
  <div style="margin-top: 50px; display: flex; justify-content: space-between;">
    <div>
      <p><em>Pemberi Tugas</em></p>
      <div style="margin-top: 30px;">(________________)</div>
    </div>
    <div>
      <p><em>Pelaksana</em></p>
      <div style="margin-top: 30px;">(________________)</div>
    </div>
  </div>
</div>`,
    fields: JSON.stringify([
      { name: 'spkNumber', label: 'Nomor SPK', type: 'text', required: true },
      { name: 'date', label: 'Tanggal', type: 'date', required: true },
      { name: 'assignee', label: 'Kepada (Nama)', type: 'text', required: true },
      { name: 'workType', label: 'Jenis Pekerjaan', type: 'text', required: true },
      { name: 'location', label: 'Lokasi', type: 'text', required: true },
      { name: 'startDate', label: 'Mulai', type: 'date', required: true },
      { name: 'endDate', label: 'Selesai', type: 'date', required: true },
      { name: 'description', label: 'Deskripsi', type: 'textarea', required: true },
      { name: 'budget', label: 'Estimasi Biaya', type: 'number', required: true },
    ]),
    isActive: 1,
  },
  {
    displayId: 'TPL-004',
    name: 'Form Cuti / Izin',
    category: 'HR',
    description: 'Template pengajuan cuti tahunan, izin, atau sakit.',
    content: `<div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="text-align: center; margin-bottom: 24px;">FORM PENGAJUAN CUTI / IZIN</h2>
  <table style="width: 100%; margin-bottom: 20px;">
    <tr><td style="width: 140px;"><strong>Nama:</strong></td><td>{{employeeName}}</td></tr>
    <tr><td><strong>NIK:</strong></td><td>{{employeeId}}</td></tr>
    <tr><td><strong>Departemen:</strong></td><td>{{department}}</td></tr>
    <tr><td><strong>Jenis:</strong></td><td>{{leaveType}}</td></tr>
    <tr><td><strong>Alasan:</strong></td><td>{{reason}}</td></tr>
    <tr><td><strong>Dari:</strong></td><td>{{startDate}}</td></tr>
    <tr><td><strong>Sampai:</strong></td><td>{{endDate}}</td></tr>
    <tr><td><strong>Total Hari:</strong></td><td>{{totalDays}} hari</td></tr>
    <tr><td><strong>Alamat Cuti:</strong></td><td>{{address}}</td></tr>
    <tr><td><strong>No. HP:</strong></td><td>{{phone}}</td></tr>
  </table>
  <p><em>Selama cuti, tugas akan didelegasikan kepada:</em> <strong>{{delegate}}</strong></p>
  <div style="margin-top: 50px; display: flex; justify-content: space-between;">
    <div><em>Pemohon</em><div style="margin-top: 35px;">(________________)</div></div>
    <div><em>Atasan</em><div style="margin-top: 35px;">(________________)</div></div>
  </div>
</div>`,
    fields: JSON.stringify([
      { name: 'employeeName', label: 'Nama Karyawan', type: 'text', required: true },
      { name: 'employeeId', label: 'NIK', type: 'text', required: true },
      { name: 'department', label: 'Departemen', type: 'text', required: true },
      { name: 'leaveType', label: 'Jenis Cuti', type: 'select', options: ['Cuti Tahunan', 'Cuti Sakit', 'Izin', 'Cuti Melahirkan', 'Cuti Penting'], required: true },
      { name: 'reason', label: 'Alasan', type: 'textarea', required: true },
      { name: 'startDate', label: 'Tanggal Mulai', type: 'date', required: true },
      { name: 'endDate', label: 'Tanggal Selesai', type: 'date', required: true },
      { name: 'totalDays', label: 'Total Hari', type: 'number', required: true },
      { name: 'address', label: 'Alamat Selama Cuti', type: 'textarea' },
      { name: 'phone', label: 'No. HP', type: 'text', required: true },
      { name: 'delegate', label: 'Delegasi Tugas ke', type: 'text' },
    ]),
    isActive: 1,
  },
];

// POST /api/seed — seed data (admin only, auto-detected)
router.post('/', async (req, res) => {
  try {
    // Insert templates if they don't exist
    let insertedCount = 0;
    for (const tpl of SEED_TEMPLATES) {
      const existing = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM templates WHERE displayId = ?', [tpl.displayId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      if (!existing) {
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO templates (displayId, name, category, description, content, fields, isActive, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [tpl.displayId, tpl.name, tpl.category, tpl.description, tpl.content, tpl.fields, tpl.isActive],
            function (err) { if (err) reject(err); else resolve(this); }
          );
        });
        insertedCount++;
      }
    }

    // Ensure basic roles exist
    const defaultRoles = ['admin', 'manager', 'staff'];
    let rolesCount = 0;
    for (const roleName of defaultRoles) {
      const existing = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM roles WHERE name = ?', [roleName], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      if (!existing) {
        await new Promise((resolve, reject) => {
          db.run('INSERT INTO roles (name, createdAt, updatedAt) VALUES (?, datetime(\'now\'), datetime(\'now\'))',
            [roleName], function (err) { if (err) reject(err); else resolve(this); }
          );
        });
        rolesCount++;
      }
    }

    // Ensure basic departments
    const defaultDepts = ['GENERAL', 'FINANCE', 'HR', 'OPERATIONS', 'IT', 'MARKETING'];
    let deptsCount = 0;
    for (const deptName of defaultDepts) {
      const existing = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM departments WHERE name = ?', [deptName], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      if (!existing) {
        await new Promise((resolve, reject) => {
          db.run('INSERT INTO departments (name, createdAt, updatedAt) VALUES (?, datetime(\'now\'), datetime(\'now\'))',
            [deptName], function (err) { if (err) reject(err); else resolve(this); }
          );
        });
        deptsCount++;
      }
    }

    // Ensure basic categories
    const defaultCats = [
      { name: 'PO', desc: 'Purchase Order' },
      { name: 'CA', desc: 'Cash Advance' },
      { name: 'MEMO', desc: 'Memo Internal' },
      { name: 'SPK', desc: 'Surat Perintah Kerja' },
      { name: 'HR', desc: 'HR & Kepegawaian' },
      { name: 'INVOICE', desc: 'Invoice & Tagihan' },
    ];
    let catsCount = 0;
    for (const cat of defaultCats) {
      const existing = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM categories WHERE name = ?', [cat.name], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      if (!existing) {
        await new Promise((resolve, reject) => {
          db.run('INSERT INTO categories (name, description, createdAt, updatedAt) VALUES (?, ?, datetime(\'now\'), datetime(\'now\'))',
            [cat.name, cat.desc], function (err) { if (err) reject(err); else resolve(this); }
          );
        });
        catsCount++;
      }
    }

    // Ensure "Processed Documents" keyword
    const kwExisting = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM keywords WHERE name = ?', ['Processed Documents'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    if (!kwExisting) {
      await new Promise((resolve, reject) => {
        db.run('INSERT INTO keywords (name, createdAt, updatedAt) VALUES (?, datetime(\'now\'), datetime(\'now\'))',
          ['Processed Documents'], function (err) { if (err) reject(err); else resolve(this); }
        );
      });
    }

    res.json({
      success: true,
      message: 'Seed data berhasil',
      counts: {
        templates: insertedCount,
        roles: rolesCount,
        departments: deptsCount,
        categories: catsCount,
      }
    });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ error: 'Gagal seed data', details: err.message });
  }
});

export default router;
