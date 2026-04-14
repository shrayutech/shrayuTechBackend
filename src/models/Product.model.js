const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  badge: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  features: [{
    type: String
  }],
  color: {
    type: String,
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
