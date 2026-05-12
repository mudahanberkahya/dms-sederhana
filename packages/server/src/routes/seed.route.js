import express from 'express';
import { db } from '../db/index.js';
import { documentTemplate, role, departmentRef, documentCategory, keywordMapping } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';

const router = express.Router();

const SEED_TEMPLATES = [
  {
    name: 'Purchase Order',
    htmlContent: `<div style="font-family: Arial; max-width: 700px; margin: 0 auto; padding: 20px;">
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
    fieldsConfig: [
      { name: 'poNumber', label: 'Nomor PO', type: 'text', required: true },
      { name: 'date', label: 'Tanggal', type: 'date', required: true },
      { name: 'vendor', label: 'Nama Vendor', type: 'text', required: true },
      { name: 'items', label: 'Items', type: 'table', columns: [
        { name: 'name', label: 'Nama Item', type: 'text' },
        { name: 'qty', label: 'Quantity', type: 'number' },
        { name: 'price', label: 'Harga Satuan', type: 'number' },
        { name: 'total', label: 'Total', type: 'number', readOnly: true }
      ]}
    ]
  },
  {
    name: 'Memo Internal',
    htmlContent: `<div style="font-family: Arial; max-width: 650px; margin: 0 auto; padding: 30px;">
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
    fieldsConfig: [
      { name: 'memoNumber', label: 'Nomor Memo', type: 'text', required: true },
      { name: 'date', label: 'Tanggal', type: 'date', required: true },
      { name: 'from', label: 'Dari (Departemen)', type: 'text', required: true },
      { name: 'fromName', label: 'Nama Pengirim', type: 'text', required: true },
      { name: 'to', label: 'Kepada', type: 'text', required: true },
      { name: 'subject', label: 'Perihal', type: 'text', required: true },
      { name: 'priority', label: 'Prioritas', type: 'select', options: ['Rendah', 'Normal', 'Tinggi', 'Urgen'], required: true },
      { name: 'content', label: 'Isi Memo', type: 'textarea', required: true },
    ]
  },
  {
    name: 'Surat Perintah Kerja',
    htmlContent: `<div style="font-family: Arial; max-width: 700px; margin: 0 auto; padding: 20px;">
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
    fieldsConfig: [
      { name: 'spkNumber', label: 'Nomor SPK', type: 'text', required: true },
      { name: 'date', label: 'Tanggal', type: 'date', required: true },
      { name: 'assignee', label: 'Kepada (Nama)', type: 'text', required: true },
      { name: 'workType', label: 'Jenis Pekerjaan', type: 'text', required: true },
      { name: 'location', label: 'Lokasi', type: 'text', required: true },
      { name: 'startDate', label: 'Mulai', type: 'date', required: true },
      { name: 'endDate', label: 'Selesai', type: 'date', required: true },
      { name: 'description', label: 'Deskripsi', type: 'textarea', required: true },
      { name: 'budget', label: 'Estimasi Biaya', type: 'number', required: true },
    ]
  },
  {
    name: 'Form Cuti / Izin',
    htmlContent: `<div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
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
    fieldsConfig: [
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
    ]
  }
];

// POST /api/seed — seed data
router.post('/', async (req, res) => {
  try {
    const counts = { templates: 0, roles: 0, departments: 0, categories: 0 };

    // 1. Seed templates (check by name)
    for (const tpl of SEED_TEMPLATES) {
      const existing = await db.select({ id: documentTemplate.id })
        .from(documentTemplate)
        .where(eq(documentTemplate.name, tpl.name))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(documentTemplate).values({
          name: tpl.name,
          htmlContent: tpl.htmlContent,
          fieldsConfig: tpl.fieldsConfig,
          isActive: true,
          requireCreatorSignature: false,
        });
        counts.templates++;
      }
    }

    // 2. Seed roles
    const defaultRoles = [
      { id: 'admin', name: 'Admin' },
      { id: 'manager', name: 'Manager' },
      { id: 'staff', name: 'Staff' },
      { id: 'initiator', name: 'Initiator' },
      { id: 'approver', name: 'Approver' },
    ];
    for (const r of defaultRoles) {
      const existing = await db.select({ id: role.id })
        .from(role)
        .where(eq(role.id, r.id))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(role).values({ id: r.id, name: r.name });
        counts.roles++;
      }
    }

    // 3. Seed departments
    const defaultDepts = [
      { id: 'GENERAL', name: 'General' },
      { id: 'FINANCE', name: 'Finance' },
      { id: 'HR', name: 'HR' },
      { id: 'OPERATIONS', name: 'Operations' },
      { id: 'IT', name: 'IT' },
      { id: 'MARKETING', name: 'Marketing' },
    ];
    for (const d of defaultDepts) {
      const existing = await db.select({ id: departmentRef.id })
        .from(departmentRef)
        .where(eq(departmentRef.id, d.id))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(departmentRef).values({ id: d.id, name: d.name });
        counts.departments++;
      }
    }

    // 4. Seed categories
    const defaultCats = [
      { id: 'PO', name: 'Purchase Order' },
      { id: 'CA', name: 'Cash Advance' },
      { id: 'MEMO', name: 'Memo Internal' },
      { id: 'SPK', name: 'Surat Perintah Kerja' },
      { id: 'HR', name: 'HR & Kepegawaian' },
      { id: 'INVOICE', name: 'Invoice & Tagihan' },
    ];
    for (const c of defaultCats) {
      const existing = await db.select({ id: documentCategory.id })
        .from(documentCategory)
        .where(eq(documentCategory.id, c.id))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(documentCategory).values({ id: c.id, name: c.name });
        counts.categories++;
      }
    }

    res.json({
      success: true,
      message: 'Seed data berhasil',
      counts,
    });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ error: 'Gagal seed data', details: err.message });
  }
});

export default router;
