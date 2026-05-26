const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  telegramId: {
    type: Number,
    required: true,
    unique: true
  },

  // ⚡ FIXED: username required বাদ দেওয়া হয়েছে
  username: {
    type: String,
    default: 'no_username'
  },

  firstName: {
    type: String,
    required: true
  },

  lastName: {
    type: String,
    default: ''
  },

  languageCode: {
    type: String,
    default: 'en'
  },

  isBot: {
    type: Boolean,
    default: false
  },

  balance: {
    type: Number,
    default: 0
  },

  totalEarnings: {
    type: Number,
    default: 0
  },

  // ⚡ NOTE: MongoDB TTL daily reset (optional feature)
  dailyTasksCompleted: {
    type: Number,
    default: 0
  },

  level: {
    type: Number,
    default: 1
  },

  xp: {
    type: Number,
    default: 0
  },

  xpToNextLevel: {
    type: Number,
    default: 100
  },

  referredBy: {
    type: Number,
    ref: 'User'
  },

  referrals: [{
    type: Number,
    ref: 'User'
  }],

  lastActive: {
    type: Date,
    default: Date.now
  },

  joinedAt: {
    type: Date,
    default: Date.now
  },

  isActive: {
    type: Boolean,
    default: true
  },

  isBanned: {
    type: Boolean,
    default: false
  },

  banReason: {
    type: String
  },

  banDate: {
    type: Date
  },

  ipAddress: {
    type: String
  },

  deviceInfo: {
    type: String
  },

  suspiciousActivityCount: {
    type: Number,
    default: 0
  },

  lastSuspiciousActivity: {
    type: Date
  }
}, {
  timestamps: true
});

// Virtual full name
UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Check task limit
UserSchema.methods.canCompleteTask = function () {
  return this.dailyTasksCompleted < (process.env.MAX_DAILY_TASKS || 20);
};

// Add balance
UserSchema.methods.addBalance = function (amount) {
  this.balance += amount;
  this.totalEarnings += amount;
  return this.save();
};

// Level system
UserSchema.methods.checkLevelUp = function () {
  if (this.xp >= this.xpToNextLevel) {
    this.level += 1;
    this.xp = this.xp - this.xpToNextLevel;
    this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
    return true;
  }
  return false;
};

// Add XP
UserSchema.methods.addXP = function (amount) {
  this.xp += amount;
  return this.checkLevelUp();
};

// Add referral
UserSchema.methods.addReferral = function (refereeId) {
  if (!this.referrals.includes(refereeId)) {
    this.referrals.push(refereeId);
    return this.save();
  }
  return Promise.resolve();
};

module.exports = mongoose.model('User', UserSchema);
