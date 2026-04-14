const Service = require('../models/Service.model');

// Get all services
exports.getAllServices = async (req, res) => {
  try {
    const services = await Service.find();
    res.status(200).json({ success: true, data: services });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// Seed initial services data
exports.seedServices = async (req, res) => {
  try {
    // Check if services already exist
    const count = await Service.countDocuments();
    if (count > 0) {
      return res.status(200).json({ success: true, message: 'Services already seeded.' });
    }

    const services = [
      {
        iconName: "Code",
        title: "Enterprise Web Systems",
        description: "High-performance, scalable web architectures built with precision. We specialize in microservices, cloud-native apps, and advanced React/Node.js ecosystems."
      },
      {
        iconName: "Smartphone",
        title: "Next-Gen Mobile Apps",
        description: "Intuitive mobile experiences that feel native. From sleek consumer apps to complex enterprise mobility solutions using Flutter and React Native."
      },
      {
        iconName: "Cloud",
        title: "Cloud & DevOps Mastery",
        description: "Zero-downtime deployments and iron-clad cloud security. We optimize AWS, Azure, and Google Cloud infrastructures for maximum performance."
      },
      {
        iconName: "Shield",
        title: "AI & Machine Learning",
        description: "Transforming raw data into predictive power. We integrate LLMs and custom ML models to automate workflows and drive intelligent decision-making."
      },
      {
        iconName: "Database",
        title: "Data Engineering & Analytics",
        description: "Enterprise-grade data lakes and real-time processing pipelines. We help you turn vast amounts of information into actionable strategic insights."
      },
      {
        iconName: "Server",
        title: "API & System Integration",
        description: "Seamlessly connecting your digital landscape. We build robust API layers that unify legacy systems with modern cloud applications."
      }
    ];

    await Service.insertMany(services);
    
    if (res) {
      res.status(201).json({ success: true, message: 'Services seeded successfully.' });
    } else {
      console.log('Services seeded successfully.');
    }
  } catch (error) {
    console.error('Error seeding services:', error);
    if (res) {
      res.status(500).json({ success: false, error: 'Failed to seed services' });
    }
  }
};
