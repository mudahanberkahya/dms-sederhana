import { useState, useEffect } from "react";
import "./Landing.css";

const PLANS = [
  {
    id: "free",
    name: "Free",
    badge: null,
    desc: "Coba fitur dasar DMS gratis selamanya",
    price: "0",
    currency: "Rp",
    unit: "/bulan",
    popular: false,
    features: [
      { text: "10 dokumen", included: true },
      { text: "Approval basic (2 level)", included: true },
      { text: "1 cabang", included: true },
      { text: "50 MB storage", included: true },
      { text: "AI Chat", included: false },
      { text: "AI Review", included: false },
      { text: "AI Generate", included: false },
      { text: "Export PDF", included: true },
      { text: "Templates siap pakai", included: false },
    ],
    cta: "Mulai Gratis",
    href: "/login",
  },
  {
    id: "starter",
    name: "Starter",
    badge: "POPULER",
    desc: "Untuk tim kecil yang mulai serius",
    price: "39",
    originalPrice: "99",
    discount: "-61%",
    currency: "Rp",
    unit: "rb/bulan",
    popular: true,
    features: [
      { text: "50 dokumen", included: true },
      { text: "Approval 3 level", included: true },
      { text: "3 cabang", included: true },
      { text: "500 MB storage", included: true },
      { text: "AI Chat 50x/hari", included: true },
      { text: "AI Review 10x/hari", included: true },
      { text: "AI Generate", included: false },
      { text: "Export PDF + DOCX", included: true },
      { text: "Download templates", included: true },
      { text: "Delegasi approval", included: true },
    ],
    cta: "Mulai Trial",
    href: "/login",
  },
  {
    id: "professional",
    name: "Professional",
    badge: "REKOMENDASI",
    desc: "Bisnis yang butuh fitur lengkap",
    price: "129",
    originalPrice: "299",
    discount: "-57%",
    currency: "Rp",
    unit: "rb/bulan",
    popular: false,
    featured: true,
    features: [
      { text: "Unlimited dokumen", included: true },
      { text: "Approval 5 level", included: true },
      { text: "Multi-cabang unlimited", included: true },
      { text: "5 GB storage", included: true },
      { text: "AI Chat unlimited", included: true },
      { text: "AI Review 50x/hari", included: true },
      { text: "AI Generate 20x/hari", included: true },
      { text: "Export PDF + DOCX + XLSX", included: true },
      { text: "Upload kustom templates", included: true },
      { text: "API access (rate limited)", included: true },
      { text: "Prioritas support", included: true },
    ],
    cta: "Mulai Trial",
    href: "/login",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    badge: null,
    desc: "Untuk korporasi & grup perusahaan",
    price: "499",
    originalPrice: "999",
    discount: "-50%",
    currency: "Rp",
    unit: "rb/bulan",
    popular: false,
    features: [
      { text: "Unlimited dokumen", included: true },
      { text: "Custom workflow", included: true },
      { text: "Multi-cabang unlimited", included: true },
      { text: "Unlimited storage", included: true },
      { text: "AI Chat unlimited", included: true },
      { text: "AI Review unlimited", included: true },
      { text: "AI Generate unlimited", included: true },
      { text: "Export semua format", included: true },
      { text: "Custom templates", included: true },
      { text: "API unlimited", included: true },
      { text: "Dedicated support", included: true },
      { text: "Whitelabel", included: true },
      { text: "Deploy server sendiri", included: true },
    ],
    cta: "Hubungi Sales",
    href: "mailto:sales@dms.com",
  },
];

const PAIN_POINTS = [
  {
    icon: "phone-off",
    title: "WA / Email Terlewat",
    desc: "Kirim PDF via WhatsApp atau email — sering terlewat, chat tertimbun, atau lupa. Status approval tidak jelas."
  },
  {
    icon: "printer",
    title: "Print → TTD → Scan → File",
    desc: "Dokumen di-print, ditandatangani manual, di-scan, lalu di-filing mandiri oleh requester. Memakan waktu & rentan hilang."
  },
  {
    icon: "files",
    title: "Tidak Ada Standarisasi",
    desc: "Setiap requester filing sendiri. Dokumen approval berserakan di email, laptop, Google Drive — sulit dilacak."
  },
  {
    icon: "alert",
    title: "Sistem Lengkap, Tapi Ada Celah",
    desc: "Perusahaan punya ERP, akuntansi, atau PMS yang oke — tapi jarang ada aplikasi khusus untuk approval & tanda tangan digital sederhana."
  }
];

const USE_CASES = [
  { icon: "hotel", title: "Hotel & Akomodasi", desc: "Approval check-in, guest request, laporan housekeeping, SOP operasional — semuanya digital." },
  { icon: "building", title: "Kantor & Korporasi", desc: "Memo internal, pengajuan cuti, approval kontrak, PO, invoice — alur persetujuan jadi terstruktur." },
  { icon: "truck", title: "Manufaktur & Logistik", desc: "Approve delivery order, inspeksi QC, laporan produksi, dan dokumen pengiriman." },
  { icon: "zap", title: "Startup & UKM", desc: "Tanpa admin dokumen khusus. Semua orang bisa upload, approve, dan lacak dokumen dalam 5 menit." },
  { icon: "heart", title: "Rumah Sakit & Klinik", desc: "Rekam medis, approval tindakan, surat rujukan — semua approval dengan TTD digital." },
  { icon: "shield", title: "Pemerintahan & Yayasan", desc: "Surat dinas, disposisi, pengajuan anggaran, dokumen kepegawaian — lengkap dengan audit trail." },
];

const FEATURES = [
  { icon: "file-text", title: "Dokumen Digital", desc: "Upload, kelola, dan cari dokumen perusahaan dengan cepat. Semua tersimpan aman di cloud." },
  { icon: "check-circle", title: "Approval Otomatis", desc: "Alur persetujuan multi-level. Manager approve dari mana saja via HP — tidak ada lagi dokumen mengendap." },
  { icon: "pen-tool", title: "Tanda Tangan Digital", desc: "TTD digital terverifikasi langsung di dokumen. Tidak perlu print & scan lagi." },
  { icon: "list", title: "Audit Trail", desc: "Catat setiap aktivitas — siapa sign, kapan approve, apa yang diubah. Siap untuk audit kepatuhan." },
  { icon: "globe", title: "Multi-Cabang", desc: "Kelola banyak cabang dari satu dashboard. Cocok untuk grup perusahaan." },
  { icon: "chart", title: "Report & Analitik", desc: "Lihat statistik dokumen, approval time, dan aktivitas tim secara real-time." },
  { icon: "sparkles", title: "AI Assistant", desc: "Chat dengan AI untuk tanya dokumen, review, dan generate draft. Asisten pintar 24/7." },
];

const ICONS = {
  "phone-off": <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/><line x1="23" y1="1" x2="1" y2="23"/></svg>,
  printer: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h12M6 8h12M6 12h6"/><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M14 14h4v4h-4z"/></svg>,
  files: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>,
  alert: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>,
};

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [visibleSections, setVisibleSections] = useState(new Set());

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);

    // Intersection Observer for fade-in animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll("[data-observe]").forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="landing">
      {/* ─── NAV ─── */}
      <nav className={`landing-nav${scrolled ? " scrolled" : " top"}`}>
        <div className="landing-nav-inner">
          <a href="/" className="landing-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="2" y="4" width="22" height="26" rx="2" fill="#3525cd" opacity="0.15"/>
              <rect x="6" y="2" width="22" height="26" rx="2" fill="#3525cd" opacity="0.3"/>
              <rect x="10" y="0" width="22" height="26" rx="2" fill="url(#logo-grad)"/>
              <rect x="16" y="8" width="10" height="2" rx="1" fill="white"/>
              <rect x="16" y="13" width="10" height="2" rx="1" fill="white"/>
              <rect x="16" y="18" width="7" height="2" rx="1" fill="white"/>
            </svg>
            <span className="landing-logo-text">DMS</span>
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
      <section className="landing-hero" id="hero">
        <div className="landing-hero-bg">
          <div className="hero-gradient-1" />
          <div className="hero-gradient-2" />
          <div className="hero-gradient-3" />
        </div>
        <div className="landing-hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Dokumen. Tanda Tangan. Approval. Satu Platform.
          </div>
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
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
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
      <section id="masalah" className="landing-section landing-section-alt" data-observe>
        <div className={`landing-section-inner fade-section ${visibleSections.has("masalah") ? "visible" : ""}`}>
          <span className="section-label">MASALAH</span>
          <h2 className="section-title">Proses Manual Itu Bikin Pusing</h2>
          <div className="pain-grid">
            {PAIN_POINTS.map((p, i) => (
              <div key={i} className="pain-card" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="pain-icon">{ICONS[p.icon]}</div>
                <div>
                  <h4 className="pain-title">{p.title}</h4>
                  <p className="pain-desc">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="pain-cta">
            <p><strong>DMS hadir untuk mengisi celah itu.</strong> Satu platform sederhana untuk approval, tanda tangan digital, dan arsip dokumen — tanpa ribet.</p>
          </div>
        </div>
      </section>

      {/* ─── COCOK UNTUK ─── */}
      <section id="use-cases" className="landing-section" data-observe>
        <div className={`landing-section-inner fade-section ${visibleSections.has("use-cases") ? "visible" : ""}`}>
          <span className="section-label">COCOK UNTUK</span>
          <h2 className="section-title">Berbagai Jenis Perusahaan</h2>
          <div className="use-case-grid">
            {USE_CASES.map((u, i) => (
              <div key={i} className="use-case-card">
                <div className="use-case-icon">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3525cd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {u.icon === "hotel" && <><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></>}
                    {u.icon === "building" && <><path d="M3 3h18v18H3z"/><path d="M3 9h18"/><path d="M9 21V9"/></>}
                    {u.icon === "truck" && <><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>}
                    {u.icon === "zap" && <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>}
                    {u.icon === "heart" && <><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></>}
                    {u.icon === "shield" && <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>}
                  </svg>
                </div>
                <h4 className="use-case-title">{u.title}</h4>
                <p className="use-case-desc">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="landing-section landing-section-alt" data-observe>
        <div className={`landing-section-inner fade-section ${visibleSections.has("features") ? "visible" : ""}`}>
          <span className="section-label">FITUR</span>
          <h2 className="section-title">Semua Yang Perusahaan Butuhkan</h2>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="feature-icon">{getFeatureIcon(f.icon)}</div>
                <h4 className="feature-title">{f.title}</h4>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AI FEATURES ─── */}
      <section id="ai-features" className="landing-section" data-observe>
        <div className={`landing-section-inner fade-section ${visibleSections.has("ai-features") ? "visible" : ""}`}>
          <span className="section-label">AI</span>
          <h2 className="section-title">Kecerdasan Buatan Untuk Dokumen</h2>
          <p className="ai-section-desc">
            DMS kini didukung AI untuk membantu Anda bekerja lebih cerdas dan cepat.
          </p>
          <div className="ai-features-grid">
            <div className="feature-card ai-card">
              <div className="feature-icon" style={{ background: "rgba(16, 185, 129, 0.1)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <h4 className="feature-title">AI Chat &amp; Tanya Jawab</h4>
              <p className="feature-desc">Tanya apa saja tentang dokumen, proses approval, atau workflow. AI menjawab instan dalam Bahasa Indonesia.</p>
            </div>
            <div className="feature-card ai-card">
              <div className="feature-icon" style={{ background: "rgba(99, 102, 241, 0.1)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a4 4 0 0 0-4 4M20 6a4 4 0 0 0-4-4M20 18a4 4 0 0 1-4 4M8 20a4 4 0 0 1-4-4"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <h4 className="feature-title">AI Review Dokumen</h4>
              <p className="feature-desc">AI-review dokumen untuk cek kelengkapan, konsistensi, dan kepatuhan standar perusahaan secara otomatis.</p>
            </div>
            <div className="feature-card ai-card">
              <div className="feature-icon" style={{ background: "rgba(245, 158, 11, 0.1)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      <section id="how-it-works" className="landing-section landing-section-alt" data-observe>
        <div className={`landing-section-inner fade-section ${visibleSections.has("how-it-works") ? "visible" : ""}`}>
          <span className="section-label">CARA KERJA</span>
          <h2 className="section-title">Implementasi Dalam Hitungan Hari</h2>
          <div className="how-steps">
            {[
              { num: "01", title: "Setup Akun", desc: "Daftar, undang tim, atur role & cabang. Selesai dalam 10 menit." },
              { num: "02", title: "Upload Template", desc: "Upload template dokumen yang sering dipakai perusahaan, atau pilih dari yang sudah tersedia." },
              { num: "03", title: "Atur Workflow", desc: "Buat alur approval sesuai struktur organisasi Anda. Tinggal drag & drop." },
              { num: "04", title: "Go Live", desc: "Tim mulai pakai — training 30 menit, langsung jalan tanpa hambatan." },
            ].map((s, i) => (
              <div key={i} className="how-step">
                <div className="how-step-number">{s.num}</div>
                <div className="how-step-content">
                  <h4>{s.title}</h4>
                  <p>{s.desc}</p>
                </div>
                {i < 3 && <div className="how-step-line" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="landing-section" data-observe>
        <div className={`landing-section-inner fade-section ${visibleSections.has("pricing") ? "visible" : ""}`}>
          <span className="section-label">HARGA</span>
          <h2 className="section-title">Pilih Yang Cocok</h2>
          <p className="pricing-subtitle">
            Mulai gratis. Upgrade kapan pun Anda butuh lebih.
          </p>
          <div className="pricing-grid">
            {PLANS.map((plan, i) => (
              <div
                key={plan.id}
                className={`pricing-card ${plan.featured ? "pricing-featured" : ""} ${plan.popular ? "pricing-popular" : ""}`}
              >
                {plan.badge && <div className={`pricing-badge ${plan.popular ? "pricing-badge-popular" : ""}`}>{plan.badge}</div>}
                {plan.popular && <div className="pricing-popular-tag">Paling Laris</div>}
                <div className="pricing-header">
                  <h4 className="pricing-name">{plan.name}</h4>
                  <p className="pricing-desc">{plan.desc}</p>
                </div>
                <div className="pricing-amount">
                  {plan.originalPrice && (
                    <>
                      <span className="pricing-original">
                        {plan.currency}{plan.originalPrice}.000
                      </span>
                      <span className="pricing-discount-badge">{plan.discount}</span>
                    </>
                  )}
                  <div className="pricing-current">
                    <span className="pricing-currency">{plan.currency}</span>
                    <span className="pricing-num">{plan.price}</span>
                    <span className="pricing-unit">/{plan.unit}</span>
                  </div>
                </div>
                <a
                  href={plan.href}
                  className={`landing-btn-primary landing-btn-full ${plan.featured ? "btn-featured" : ""}`}
                >
                  {plan.cta}
                </a>
                <ul className="pricing-features">
                  {plan.features.map((feat, j) => (
                    <li key={j} className={feat.included ? "" : "pricing-na"}>
                      <span className="pricing-feat-icon">{feat.included ? "✓" : "—"}</span>
                      {feat.text}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section id="contact" className="landing-section landing-section-cta" data-observe>
        <div className={`landing-section-inner fade-section ${visibleSections.has("contact") ? "visible" : ""}`}>
          <h2 className="cta-title">Siap Bikin Proses Dokumen Lebih Rapi?</h2>
          <p className="cta-desc">Mulai free trial sekarang. Tanpa kartu kredit. Tanpa ribet.</p>
          <div className="cta-buttons">
            <a href="/login" className="landing-btn-primary landing-btn-lg cta-btn-primary">
              Mulai Gratis
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a href="mailto:hello@dms.com" className="landing-btn-secondary landing-btn-lg cta-btn-secondary">
              Hubungi Kami
            </a>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="footer-col">
            <div className="footer-brand">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <rect x="10" y="0" width="22" height="26" rx="2" fill="#3525cd"/>
                <rect x="16" y="8" width="10" height="2" rx="1" fill="white"/>
                <rect x="16" y="13" width="10" height="2" rx="1" fill="white"/>
                <rect x="16" y="18" width="7" height="2" rx="1" fill="white"/>
              </svg>
              <span>DMS — Document Management System</span>
            </div>
            <p className="footer-copy">&copy; 2026 DMS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function getFeatureIcon(name) {
  const props = { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "#3525cd", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };
  switch(name) {
    case "file-text":
      return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
    case "check-circle":
      return <svg {...props}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
    case "pen-tool":
      return <svg {...props}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13 12H3"/></svg>;
    case "list":
      return <svg {...props}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>;
    case "globe":
      return <svg {...props}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
    case "chart":
      return <svg {...props}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
    case "sparkles":
      return <svg {...props} width="24" height="24"><path d="M12 8V4M8 12H4M20 12h-4M12 20v-4M16 8l2-2M6 18l2-2M18 18l-2-2M6 6l2 2"/><circle cx="10" cy="10" r="2"/><circle cx="14" cy="14" r="2"/></svg>;
    default:
      return <svg {...props}><circle cx="12" cy="12" r="10"/></svg>;
  }
}
