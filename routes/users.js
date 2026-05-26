const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const verifyToken = require('./auth').verifyToken;

// Get all users (admin only)
router.get('/', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findOne({ telegramId: req.user.userId });
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { page = 1, limit = 10, search } = req.query;
    const skip = (page - 1) * limit;
    
    // Build query
    let query = {};
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Get users
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count
    const total = await User.countDocuments(query);
    
    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('referrals')
      .populate('referredBy');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user transactions
router.get('/:id/transactions', verifyToken, async (req, res) => {
  try {
    // Check if user is admin or requesting their own data
    const requestingUser = await User.findOne({ telegramId: req.user.userId });
    if (!requestingUser || (!requestingUser.isAdmin && req.params.id !== requestingUser._id.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    // Get transactions
    const transactions = await Transaction.find({ userId: req.params.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count
    const total = await Transaction.countDocuments({ userId: req.params.id });
    
    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get user transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { page = 1, limit = 10, type = 'balance' } = req.query;
    const skip = (page - 1) * limit;
    
    // Build sort
    let sort = {};
    if (type === 'balance') {
      sort.balance = -1;
    } else if (type === 'totalEarnings') {
      sort.totalEarnings = -1;
    } else if (type === 'referrals') {
      sort.referrals = -1;
    } else if (type === 'level') {
      sort.level = -1;
      sort.xp = -1;
    }
    
    // Get users
    const users = await User.find({ isActive: true })
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    // Add rank
    const rankedUsers = users.map((user, index) => ({
      rank: skip + index + 1,
      ...user.toObject()
    }));
    
    // Get total count
    const total = await User.countDocuments({ isActive: true });
    
    res.json({
      users: rankedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user (admin only)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findOne({ telegramId: req.user.userId });
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { balance, level, xp, isActive, isBanned, banReason } = req.body;
    
    // Find and update user
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        balance,
        level,
        xp,
        isActive,
        isBanned,
        banReason,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Credit balance to user (admin only)
router.post('/:id/credit', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findOne({ telegramId: req.user.userId });
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { amount, description } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    
    // Find user
    const targetUser = await User.findById(req.params.id);
    
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Credit balance
    await targetUser.addBalance(amount);
    
    // Create transaction record
    const transaction = new Transaction({
      userId: targetUser.telegramId,
      type: 'admin_credit',
      amount,
      balanceAfter: targetUser.balance,
      description: description || `Admin credit of ${config.CURRENCY_SYMBOL}${amount}`
    });
    await transaction.save();
    
    res.json({ 
      message: 'Balance credited successfully',
      user: targetUser 
    });
  } catch (error) {
    console.error('Credit balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
