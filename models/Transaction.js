const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  userId: {
    type: Number,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['task_completion', 'referral_reward', 'admin_credit', 'withdrawal', 'purchase'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  referralId: {
    type: Number,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'failed'],
    default: 'completed'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Transaction', TransactionSchema);
