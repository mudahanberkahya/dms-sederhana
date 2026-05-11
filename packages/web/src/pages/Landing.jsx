import { useState, useEffect } from "react";
import "./Landing.css";

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="landing">
      {/* ─── NAV ─── */}
      <nav className={`landing-nav${scrolled ? " scrolled" : ""}`}>
        <div className="landing-nav-inner">
          <a href="/" className="landing-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="2" y="4" width="22" height="26" rx="2" fill="#3525cd" opacity="0.15"/>
              <rect x="6" y="2" width="22" height="26" rx="2" fill="#3525cd" opacity="0.3"/>
              <rect x="10" y="0" width="22" height="26" rx="2" fill="#3525cd"/>
              <rect x="16" y="8" width="10" height="2" rx="1" fill="white"/>
              <rect x="16" y="13" width="10" height="2" rx="1" fill="white"/>
              <rect x="16" y="18" width="7" height="2" rx="1" fill="white"/>
            </svg>
            <span>DMS</span>
          </a>
          <div className="landing-nav-links">
            <button onClick={() => scrollTo("masalah")}>Masalah</button>
            <button onClick={() => scrollTo("features")}>Fitur</button>
            <button onClick={() => scrollTo("pricing")}>Harga</button>
            <button onClick={() => scrollTo("contact")}>Kontak</button>
            <a href="/login" className="landing-btn-primary">Masuk</a>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="landing-hero">
        <div className="landing-hero-bg">
          <div className="hero-gradient-1" />
          <div className="hero-gradient-2" />
        </div>
        <div className="landing-hero-content">
          <div className="hero-badge">✨ Dokumen. Tanda Tangan. Approval. Satu Platform.</div>
          <h1 className="hero-title">
            <span className="hero-title-white">Aplikasi Pelengkap</span>
            <br />
            <span className="hero-title-accent">Untuk Sistem Perusahaan Anda</span>
          </h1>
          <p className="hero-subtitle">
            DMS adalah sistem manajemen dokumen yang menyederhanakan proses approval,
            tanda tangan digital, dan pengarsipan — menjadi lapisan pelengkap di atas
            sistem ERP, akuntansi, atau PMS yang sudah Anda miliki.
          </p>
          <div className="hero-cta">
            <a href="/login" className="landing-btn-primary landing-btn-lg">
              Mulai Sekarang
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <button className="landing-btn-secondary landing-btn-lg" onClick={() => scrollTo("masalah")}>
              Kenapa DMS?
            </button>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-num">100%</span>
              <span className="hero-stat-label">Paperless</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-num">3x</span>
              <span className="hero-stat-label">Lebih Cepat</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-num">24/7</span>
              <span className="hero-stat-label">Akses Cloud</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MASALAH / PAIN POINTS ─── */}
      <section id="masalah" className="landing-section landing-section-alt">
        <div className="landing-section-inner">
          <h2 className="section-label">MASALAH</h2>
          <h3 className="section-title">Proses Manual Itu Bikin Pusing</h3>
          <div className="pain-grid">
            {[
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    <line x1="23" y1="1" x2="1" y2="23"/>
                  </svg>
                ),
                title: "WA / Email Terlewat",
                desc: "Kirim PDF via WhatsApp atau email — sering terlewat, chat tertimbun, atau lupa. Status approval tidak jelas."
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 4h12M6 8h12M6 12h6"/>
                    <rect x="3" y="4" width="18" height="16" rx="2"/>
                    <path d="M14 14h4v4h-4z"/>
                  </svg>
                ),
                title: "Print → TTD → Scan → File",
                desc: "Dokumen di-print, ditandatangani manual, di-scan, lalu di-filing mandiri oleh requester. Memakan waktu & rentan hilang."
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="M9 12l2 2 4-4"/>
                  </svg>
                ),
                title: "Tidak Ada Standarisasi",
                desc: "Setiap requester filing sendiri. Dokumen approval berserakan di email, laptop, Google Drive — sulit dilacak."
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4"/>
                    <path d="M12 8h.01"/>
                  </svg>
                ),
                title: "Sistem Lengkap, Tapi Ada Celah",
                desc: "Perusahaan punya ERP, akuntansi, atau PMS yang oke — tapi jarang ada aplikasi khusus untuk approval & tanda tangan digital sederhana."
              },
            ].map((p, i) => (
              <div key={i} className="pain-card">
                <div className="pain-icon">{p.icon}</div>
                <div>
                  <h4 className="pain-title">{p.title}</h4>
                  <p className="pain-desc">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="pain-cta" style={{ textAlign: 'center', marginTop: '40px' }}>
            <p style={{ fontSize: '15px', color: '#464555' }}>
              <strong>DMS hadir untuk mengisi celah itu.</strong> Satu platform sederhana untuk approval, tanda tangan digital, dan arsip dokumen — tanpa ribet.
            </p>
          </div>
        </div>
      </section>

      {/* ─── COCOK UNTUK ─── */}
      <section className="landing-section">
        <div className="landing-section-inner">
          <h2 className="section-label">COCOK UNTUK</h2>
          <h3 className="section-title">Berbagai Jenis Perusahaan</h3>
          <div className="use-case-grid">
            {[
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3525cd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>
                  </svg>
                ),
                title: "Hotel & Akomodasi",
                desc: "Approval check-in, guest request, laporan housekeeping, SOP operasional — semuanya digital."
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3525cd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3h18v18H3z"/><path d="M3 9h18"/><path d="M9 21V9"/>
                  </svg>
                ),
                title: "Kantor & Korporasi",
                desc: "Memo internal, pengajuan cuti, approval kontrak, PO, invoice — alur persetujuan jadi terstruktur."
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3525cd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                ),
                title: "Manufaktur & Logistik",
                desc: "Approve delivery order, inspeksi QC, laporan produksi, dan dokumen pengiriman."
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3525cd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                  </svg>
                ),
                title: "Startup & UKM",
                desc: "Tanpa admin dokumen khusus. Semua orang bisa upload, approve, dan lacak dokumen dalam 5 menit."
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3525cd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>
                  </svg>
                ),
                title: "Rumah Sakit & Klinik",
                desc: "Rekam medis, approval tindakan, surat rujukan — semua approval dengan TTD digital."
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3525cd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                ),
                title: "Pemerintahan & Yayasan",
                desc: "Surat dinas, disposisi, pengajuan anggaran, dokumen kepegawaian — lengkap dengan audit trail."
              },
            ].map((u, i) => (
              <div key={i} className="use-case-card">
                <div className="use-case-icon">{u.icon}</div>
                <h4 className="use-case-title">{u.title}</h4>
                <p className="use-case-desc">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="landing-section landing-section-alt">
        <div className="landing-section-inner">
          <h2 className="section-label">FITUR</h2>
          <h3 className="section-title">Semua Yang Perusahaan Butuhkan</h3>
          <div className="features-grid">
            {[
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3525cd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                  </svg>
                ),
                title: "Dokumen Digital",
                desc: "Upload, kelola, dan cari dokumen perusahaan dengan cepat. Semua tersimpan aman di cloud."
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3525cd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                ),
                title: "Approval Otomatis",
                desc: "Alur persetujuan multi-level. Manager approve dari mana saja via HP — tidak ada lagi dokumen mengendap."
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3525cd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13 12H3"/>
                  </svg>
                ),
                title: "Tanda Tangan Digital",
                desc: "TTD digital terverifikasi langsung di dokumen. Tidak perlu print & scan lagi."
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3525cd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
                  </svg>
                ),
                title: "Audit Trail",
                desc: "Catat setiap aktivitas — siapa sign, kapan approve, apa yang diubah. Siap untuk audit kepatuhan."
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3525cd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                ),
                title: "Multi-Cabang",
                desc: "Kelola banyak cabang dari satu dashboard. Cocok untuk grup perusahaan."
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3525cd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                ),
                title: "Report & Analitik",
                desc: "Lihat statistik dokumen, approval time, dan aktivitas tim secara real-time."
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3525cd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 8V4M8 12H4M20 12h-4M12 20v-4M16 8l2-2M6 18l2-2M18 18l-2-2M6 6l2 2"/>
                    <circle cx="10" cy="10" r="2"/><circle cx="14" cy="14" r="2"/>
                  </svg>
                ),
                title: "AI Assistant",
                desc: "Chat dengan AI untuk tanya dokumen, review, dan generate draft. Asisten pintar 24/7."
              },
            ].map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h4 className="feature-title">{f.title}</h4>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AI FEATURES ─── */}
      <section className="landing-section">
        <div className="landing-section-inner">
          <h2 className="section-label">AI</h2>
          <h3 className="section-title">Kecerdasan Buatan Untuk Dokumen</h3>
          <p className="ai-features-desc" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 40px', color: '#6b7280', fontSize: '16px' }}>
            DMS kini didukung AI untuk membantu Anda bekerja lebih cerdas dan cepat.
          </p>
          <div className="features-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3525cd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <h4 className="feature-title">AI Chat &amp; Tanya Jawab</h4>
              <p className="feature-desc">Tanya apa saja tentang dokumen, proses approval, atau workflow. AI menjawab instan dalam Bahasa Indonesia.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3525cd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a4 4 0 0 0-4 4M20 6a4 4 0 0 0-4-4M20 18a4 4 0 0 1-4 4M8 20a4 4 0 0 1-4-4"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <h4 className="feature-title">AI Review Dokumen</h4>
              <p className="feature-desc">AI-review dokumen untuk cek kelengkapan, konsistensi, dan kepatuhan standar perusahaan secara otomatis.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3525cd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  <path d="M12 6v10m-3-3l3 3 3-3"/>
                </svg>
              </div>
              <h4 className="feature-title">AI Generate Draft</h4>
              <p className="feature-desc">Deskripsikan dokumen yang Anda butuhkan, AI akan generate draft lengkap untuk Anda review.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="landing-section landing-section-alt">
        <div className="landing-section-inner">
          <h2 className="section-label">CARA KERJA</h2>
          <h3 className="section-title">Implementasi Dalam Hitungan Hari</h3>
          <div className="steps">
            {[
              { num: "01", title: "Setup Akun", desc: "Daftar, undang tim, atur role & cabang." },
              { num: "02", title: "Upload Template", desc: "Upload template dokumen yang sering dipakai perusahaan." },
              { num: "03", title: "Atur Workflow", desc: "Buat alur approval sesuai struktur organisasi Anda." },
              { num: "04", title: "Go Live", desc: "Tim mulai pakai — training 30 menit, langsung jalan." },
            ].map((s, i) => (
              <div key={i} className="step-card">
                <span className="step-num">{s.num}</span>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="landing-section">
        <div className="landing-section-inner">
          <h2 className="section-label">HARGA</h2>
          <h3 className="section-title">Pilih Yang Cocok</h3>
          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="pricing-badge">POPULER</div>
              <h4 className="pricing-name">SaaS</h4>
              <p className="pricing-desc">Cocok untuk UKM & startup</p>
              <div className="pricing-amount">
                <span className="pricing-currency">Rp</span>
                <span className="pricing-num">499</span>
                <span className="pricing-unit">/ribu/bulan</span>
              </div>
              <ul className="pricing-features">
                <li>✅ Unlimited dokumen</li>
                <li>✅ Semua fitur termasuk</li>
                <li>✅ Cloud hosted</li>
                <li>✅ Support 24/7</li>
                <li>✅ Update otomatis</li>
              </ul>
              <a href="/login" className="landing-btn-primary landing-btn-full">Coba Gratis</a>
            </div>
            <div className="pricing-card pricing-card-featured">
              <div className="pricing-badge pricing-badge-featured">REKOMENDASI</div>
              <h4 className="pricing-name">Enterprise</h4>
              <p className="pricing-desc">Untuk korporasi & grup perusahaan</p>
              <div className="pricing-amount">
                <span className="pricing-currency">Rp</span>
                <span className="pricing-num">1.999</span>
                <span className="pricing-unit">/ribu/bulan</span>
              </div>
              <ul className="pricing-features">
                <li>✅ Semua fitur SaaS</li>
                <li>✅ Deploy di server sendiri</li>
                <li>✅ Whitelabel</li>
                <li>✅ API integration</li>
                <li>✅ Dedicated support</li>
                <li>✅ Custom workflow</li>
              </ul>
              <a href="/login" className="landing-btn-primary landing-btn-full">Hubungi Sales</a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section id="contact" className="landing-section landing-section-cta">
        <div className="landing-section-inner">
          <h3 className="cta-title">Siap Bikin Proses Dokumen Lebih Rapi?</h3>
          <p className="cta-desc">Mulai free trial sekarang. Tanpa kartu kredit. Tanpa ribet.</p>
          <div className="cta-buttons">
            <a href="/login" className="landing-btn-primary landing-btn-lg">Mulai Gratis</a>
            <a href="mailto:hello@dms.com" className="landing-btn-secondary landing-btn-lg">Hubungi Kami</a>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="footer-brand">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <rect x="10" y="0" width="22" height="26" rx="2" fill="#3525cd"/>
              <rect x="16" y="8" width="10" height="2" rx="1" fill="white"/>
              <rect x="16" y="13" width="10" height="2" rx="1" fill="white"/>
              <rect x="16" y="18" width="7" height="2" rx="1" fill="white"/>
            </svg>
            <span>DMS — Document Management System</span>
          </div>
          <p className="footer-copy">&copy; 2026 DMS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
