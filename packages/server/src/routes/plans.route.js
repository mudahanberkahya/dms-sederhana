import express from 'express';

const router = express.Router();

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    priceLabel: "Gratis",
    currency: "Rp",
    popular: false,
    featured: false,
    description: "Coba fitur dasar DMS gratis selamanya",
    limits: {
      documents: 10,
      storageMB: 50,
      branches: 1,
      approvalLevels: 2,
    },
    features: {
      aiChat: false,
      aiReview: false,
      aiGenerate: false,
      delegation: false,
      apiAccess: false,
      whitelabel: false,
      selfHost: false,
      templates: "view",
      export: ["pdf"],
    }
  },
  {
    id: "starter",
    name: "Starter",
    price: 39000,
    originalPrice: 99000,
    discount: "-61%",
    priceLabel: "39",
    currency: "Rp",
    unit: "rb/bulan",
    popular: true,
    featured: false,
    description: "Untuk tim kecil yang mulai serius",
    limits: {
      documents: 50,
      storageMB: 500,
      branches: 3,
      approvalLevels: 3,
    },
    features: {
      aiChat: { limit: 50, period: "hari" },
      aiReview: { limit: 10, period: "hari" },
      aiGenerate: false,
      delegation: true,
      apiAccess: false,
      whitelabel: false,
      selfHost: false,
      templates: "download",
      export: ["pdf", "docx"],
    }
  },
  {
    id: "professional",
    name: "Professional",
    price: 129000,
    originalPrice: 299000,
    discount: "-57%",
    priceLabel: "129",
    currency: "Rp",
    unit: "rb/bulan",
    popular: false,
    featured: true,
    description: "Bisnis yang butuh fitur lengkap",
    limits: {
      documents: -1, // unlimited
      storageMB: 5120, // 5 GB
      branches: -1,
      approvalLevels: 5,
    },
    features: {
      aiChat: true,
      aiReview: { limit: 50, period: "hari" },
      aiGenerate: { limit: 20, period: "hari" },
      delegation: true,
      apiAccess: { rateLimited: true },
      whitelabel: false,
      selfHost: false,
      templates: "upload",
      export: ["pdf", "docx", "xlsx"],
    }
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 499000,
    originalPrice: 999000,
    discount: "-50%",
    priceLabel: "499",
    currency: "Rp",
    unit: "rb/bulan",
    popular: false,
    featured: false,
    description: "Untuk korporasi & grup perusahaan",
    limits: {
      documents: -1,
      storageMB: -1,
      branches: -1,
      approvalLevels: -1, // custom
    },
    features: {
      aiChat: true,
      aiReview: true,
      aiGenerate: true,
      delegation: true,
      apiAccess: { rateLimited: false },
      whitelabel: true,
      selfHost: true,
      customWorkflow: true,
      templates: "custom",
      export: ["pdf", "docx", "xlsx", "all"],
    }
  }
];

// GET /api/plans — public, no auth required
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: PLANS
  });
});

// GET /api/plans/:id — get single plan
router.get('/:id', (req, res) => {
  const plan = PLANS.find(p => p.id === req.params.id);
  if (!plan) {
    return res.status(404).json({ error: "Plan not found" });
  }
  res.json({ success: true, data: plan });
});

export default router;
