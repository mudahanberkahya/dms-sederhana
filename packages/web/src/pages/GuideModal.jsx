import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, FileText, CheckCircle2, Upload, MessageSquare, Settings, LayoutDashboard } from 'lucide-react';
import './GuideModal.css';

const STEPS = [
  {
    title: "Selamat Datang di DMS!",
    desc: "Panduan singkat ini akan membantu Anda memulai. Hanya perlu 2 menit.",
    icon: <LayoutDashboard size={40} />,
    color: "#3525cd",
    content: (
      <div className="guide-content">
        <p>DMS (Document Management System) membantu Anda mengelola dokumen, approval, dan tanda tangan digital dalam satu platform.</p>
        <div className="guide-highlights">
          <div className="guide-highlight">
            <Upload size={18} />
            <span>Upload dokumen</span>
          </div>
          <div className="guide-highlight">
            <CheckCircle2 size={18} />
            <span>Approve dari mana saja</span>
          </div>
          <div className="guide-highlight">
            <MessageSquare size={18} />
            <span>AI Assistant 24/7</span>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Upload & Klasifikasi",
    desc: "Upload dokumen, pilih kategori & alur approval.",
    icon: <Upload size={40} />,
    color: "#10b981",
    content: (
      <div className="guide-content">
        <div className="guide-section">
          <h4>Manual Upload</h4>
          <ol>
            <li>Klik menu <strong>Upload</strong> di sidebar</li>
            <li>Pilih file PDF atau DOCX</li>
            <li>Pilih <strong>kategori</strong> (PO, CA, Memo, dll)</li>
            <li>Pilih <strong>cabang</strong> & <strong>department</strong></li>
            <li>Klik Submit — dokumen otomatis masuk alur approval</li>
          </ol>
        </div>
        <div className="guide-section">
          <h4>Generate dari Template</h4>
          <ol>
            <li>Pilih mode <strong>Generate</strong> di halaman upload</li>
            <li>Pilih template yang tersedia</li>
            <li>Isi field-field yang diminta</li>
            <li>Dokumen siap otomatis — langsung masuk workflow</li>
          </ol>
        </div>
      </div>
    )
  },
  {
    title: "Approval & Delegasi",
    desc: "Pantau dan approve dokumen dengan mudah.",
    icon: <CheckCircle2 size={40} />,
    color: "#f59e0b",
    content: (
      <div className="guide-content">
        <div className="guide-section">
          <h4>Proses Approval</h4>
          <ol>
            <li>Buka halaman <strong>Approvals</strong> dari sidebar</li>
            <li>Lihat dokumen yang menunggu persetujuan Anda</li>
            <li>Klik dokumen untuk lihat detail</li>
            <li>Pilih <strong>Approve</strong> atau <strong>Reject</strong></li>
            <li>Dokumen otomatis lanjut ke approver berikutnya atau selesai</li>
          </ol>
        </div>
        <div className="guide-section">
          <h4>Delegasi (saat cuti/izin)</h4>
          <ol>
            <li>Admin bisa atur delegasi di menu <strong>Delegation</strong></li>
            <li>Tentukan user pengganti & periode</li>
            <li>Semua approval otomatis dialihkan ke delegasi</li>
          </ol>
        </div>
      </div>
    )
  },
  {
    title: "AI & Templates",
    desc: "Manfaatkan AI untuk kerja lebih cerdas.",
    icon: <MessageSquare size={40} />,
    color: "#6366f1",
    content: (
      <div className="guide-content">
        <div className="guide-section">
          <h4>AI Chat</h4>
          <ol>
            <li>Buka <strong>AI Assistant</strong> dari sidebar</li>
            <li>Tanya apa pun soal dokumen, approval, atau workflow</li>
            <li>AI jawab instan dalam Bahasa Indonesia</li>
          </ol>
        </div>
        <div className="guide-section">
          <h4>AI Review</h4>
          <ol>
            <li>Buka detail dokumen yang sudah diupload</li>
            <li>Klik tombol <strong>AI Review</strong></li>
            <li>AI analisis dokumen & beri saran perbaikan</li>
          </ol>
        </div>
        <div className="guide-section">
          <h4>Template Dokumen</h4>
          <ol>
            <li>Admin bisa upload template di <strong>Templates</strong></li>
            <li>Template menggunakan HTML + Handlebars</li>
            <li>User bisa generate dokumen dari template saat upload</li>
          </ol>
        </div>
      </div>
    )
  },
  {
    title: "Siap Mulai!",
    desc: "Anda sudah siap menggunakan DMS.",
    icon: <FileText size={40} />,
    color: "#3525cd",
    content: (
      <div className="guide-content guide-finish">
        <p>Berikut yang bisa Anda lakukan sekarang:</p>
        <div className="guide-checklist">
          <label className="guide-check-item">
            <input type="checkbox" /> Upload dokumen pertama
          </label>
          <label className="guide-check-item">
            <input type="checkbox" /> Cek halaman Approvals
          </label>
          <label className="guide-check-item">
            <input type="checkbox" /> Coba AI Chat
          </label>
          <label className="guide-check-item">
            <input type="checkbox" /> Atur workflow (admin)
          </label>
        </div>
        <p style={{ marginTop: 20, color: '#5a5969' }}>
          Butuh bantuan? Hubungi tim support di <a href="mailto:support@dms.com">support@dms.com</a>
        </p>
      </div>
    )
  }
];

export default function GuideModal({ isOpen, onClose, initialStep = 0 }) {
  const [step, setStep] = useState(initialStep);
  const current = STEPS[step];

  if (!isOpen) return null;

  const handleFinish = () => {
    localStorage.setItem('dms-onboarding-complete', 'true');
    onClose();
  };

  const handleClose = () => {
    localStorage.setItem('dms-onboarding-complete', 'true');
    onClose();
  };

  return (
    <div className="guide-overlay" onClick={handleClose}>
      <div className="guide-modal" onClick={e => e.stopPropagation()}>
        <button className="guide-close" onClick={handleClose}>
          <X size={20} />
        </button>

        <div className="guide-progress-bar">
          {STEPS.map((_, i) => (
            <div 
              key={i} 
              className={`guide-progress-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
              onClick={() => setStep(i)}
            />
          ))}
        </div>

        <div className="guide-body">
          <div className="guide-step-icon" style={{ background: `${current.color}14`, color: current.color }}>
            {current.icon}
          </div>
          <h3 className="guide-step-title">{current.title}</h3>
          <p className="guide-step-desc">{current.desc}</p>
          {current.content}
        </div>

        <div className="guide-nav">
          <button 
            className="guide-btn guide-btn-ghost" 
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
          >
            <ChevronLeft size={18} /> Sebelumnya
          </button>
          
          <div className="guide-nav-right">
            <button className="guide-btn guide-btn-ghost" onClick={handleClose}>
              Lewati
            </button>
            {step < STEPS.length - 1 ? (
              <button className="guide-btn guide-btn-primary" onClick={() => setStep(step + 1)}>
                Selanjutnya <ChevronRight size={18} />
              </button>
            ) : (
              <button className="guide-btn guide-btn-primary" onClick={handleFinish}>
                Mulai Pakai DMS!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
