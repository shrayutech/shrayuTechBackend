const Product = require('../models/Product.model');

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// Seed initial products data
exports.seedProducts = async (req, res) => {
  try {
    const count = await Product.countDocuments();
    if (count > 0) {
      return res.status(200).json({ success: true, message: 'Products already seeded.' });
    }

    const products = [
      {
        badge: "AI-Powered CRM",
        name: "Shrayu Nexus",
        description: "A flagship customer intelligence platform using deep learning to predict behavior and automate multi-channel sales cycles.",
        features: [
          "Predictive Lead Scoring",
          "Omnichannel Automation",
          "Advanced Sentiment Analysis",
          "Executive Strategy Dashboards"
        ],
        color: "from-blue-600 to-indigo-700"
      },
      {
        badge: "Financial Engine",
        name: "Shrayu Ledger",
        description: "An ultra-secure reconciliation engine for high-volume transactions, featuring real-time fraud detection and global compliance mapping.",
        features: [
          "Real-time Fraud Detection",
          "Automated Tax Compliance",
          "Immutable Audit Trails",
          "Instant Settlement Hub"
        ],
        color: "from-emerald-600 to-teal-700"
      },
      {
        badge: "People & Culture",
        name: "Shrayu Talent",
        description: "Revolutionizing HR with data-driven recruitment and engagement tools designed to scale global hybrid teams.",
        features: [
          "AI Resume Matching",
          "Global Payroll Integration",
          "Retention Prediction Engine",
          "Remote-First Collaboration"
        ],
        color: "from-rose-500 to-pink-600"
      }
    ];

    await Product.insertMany(products);

    if (res) {
      res.status(201).json({ success: true, message: 'Products seeded successfully.' });
    } else {
      console.log('Products seeded successfully.');
    }
  } catch (error) {
    console.error('Error seeding products:', error);
    if (res) {
      res.status(500).json({ success: false, error: 'Failed to seed products' });
    }
  }
};
