const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['join_channel', 'join_group', 'visit_link', 'complete_survey', 'watch_video', 'custom'],
    required: true
  },
  category: {
    type: String,
    required: true
  },
  reward: {
    type: Number,
    required: true,
    default: 10
  },
  maxCompletions: {
    type: Number,
    default: null // null means unlimited
  },
  currentCompletions: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiryDate: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // Default 24 hours
  },
  requiredProof: {
    type: Boolean,
    default: true
  },
  proofInstructions: {
    type: String,
    default: 'Please provide a screenshot as proof'
  },
  data: {
    // Task-specific data (e.g., channel ID, link URL)
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdBy: {
    type: Number,
    ref: 'User',
    required: true
  },
  completedBy: [{
    userId: {
      type: Number,
      ref: 'User'
    },
    completedAt: {
      type: Date,
      default: Date.now
    },
    rewardCredited: {
      type: Boolean,
      default: false
    },
    proof: {
      type: String
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }],
  tags: [{
    type: String
  }]
}, {
  timestamps: true
});

// Method to check if task is expired
TaskSchema.methods.isExpired = function() {
  return this.expiryDate < new Date();
};

// Method to check if task is completed
TaskSchema.methods.isCompleted = function() {
  return this.maxCompletions && this.currentCompletions >= this.maxCompletions;
};

// Method to check if user can complete task
TaskSchema.methods.canUserComplete = function(userId) {
  // Check if task is active
  if (!this.isActive) return false;
  
  // Check if task is expired
  if (this.isExpired()) return false;
  
  // Check if task is already completed
  if (this.isCompleted()) return false;
  
  // Check if user has already completed this task
  const userCompletion = this.completedBy.find(c => c.userId.toString() === userId.toString());
  if (userCompletion) return false;
  
  return true;
};

// Method to add completion
TaskSchema.methods.addCompletion = function(userId, proof = null) {
  this.completedBy.push({
    userId,
    completedAt: new Date(),
    proof
  });
  this.currentCompletions += 1;
  return this.save();
};

module.exports = mongoose.model('Task', TaskSchema);
