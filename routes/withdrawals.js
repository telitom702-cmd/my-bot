const express = require('express');
const router = express.Router();
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const verifyToken = require('./auth').verifyToken;

// Get all withdrawals (admin only)
router.get('/', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findOne({ telegramId: req.user.userId });
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;
    
    // Build query
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    // Get withdrawals
    const withdrawals = await Withdrawal.find(query)
      .populate('userId', 'username firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count
    const total = await Withdrawal.countDocuments(query);
    
    res.json({
      withdrawals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get withdrawals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user withdrawals
router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    // Check if user is admin or requesting their own data
    const requestingUser = await User.findOne({ telegramId: req.user.userId });
    if (!requestingUser || (!requestingUser.isAdmin && req.params.userId !== requestingUser._id.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    // Get withdrawals
    const withdrawals = await Withdrawal.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count
    const total = await Withdrawal.countDocuments({ userId: req.params.userId });
    
    res.json({
      withdrawals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get user withdrawals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new withdrawal request
router.post('/', verifyToken, async (req, res) => {
  try {
    const { amount, paymentMethod, paymentDetails } = req.body;
    
    // Find user
    const user = await User.findOne({ telegramId: req.user.userId });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check minimum withdrawal amount
    if (amount < config.MIN_WITHDRAWAL_AMOUNT) {
      return res.status(400).json({ 
        message: `Minimum withdrawal amount is ${config.CURRENCY_SYMBOL}${config.MIN_WITHDRAWAL_AMOUNT}` 
      });
    }
    
    // Check if user has enough balance
    if (user.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }
    
    // Calculate fee and net amount
    const fee = Math.floor(amount * (config.WITHDRAWAL_FEE_PERCENTAGE / 100));
    const netAmount = amount - fee;
    
    // Create withdrawal request
    const withdrawal = new Withdrawal({
      userId: user._id,
      amount,
      paymentMethod,
      paymentDetails,
      fee,
      netAmount,
      status: 'pending'
    });
    
    await withdrawal.save();
    
    res.status(201).json({ withdrawal });
  } catch (error) {
    console.error('Create withdrawal error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update withdrawal status (admin only)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findOne({ telegramId: req.user.userId });
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { status, notes } = req.body;
    
    // Find withdrawal
    const withdrawal = await Withdrawal.findById(req.params.id);
    
    if (!withdrawal) {
      return res.status(404).json({ message: 'Withdrawal not found' });
    }
    
    // Check if status can be updated
    if (withdrawal.status === 'completed') {
      return res.status(400).json({ message: 'Cannot update completed withdrawal' });
    }
    
    // Update withdrawal
    withdrawal.status = status;
    withdrawal.processedBy = user.telegramId;
    withdrawal.processedAt = new Date();
    withdrawal.notes = notes;
    
    await withdrawal.save();
    
    // If approved, deduct balance from user
    if (status === 'approved') {
      const targetUser = await User.findById(withdrawal.userId);
      
      if (targetUser) {
        targetUser.balance -= withdrawal.amount;
        await targetUser.save();
        
        // Create transaction record
        const transaction = new Transaction({
          userId: targetUser.telegramId,
          type: 'withdrawal',
          amount: -withdrawal.amount,
          balanceAfter: targetUser.balance,
          description: `Withdrawal request approved - ${config.CURRENCY_SYMBOL}${withdrawal.netAmount}`,
          withdrawalId: withdrawal._id
        });
        await transaction.save();
        
        // Notify user
        // This would require bot.telegram.sendMessage, which is not available in the web server
        // You would need to implement a notification system
      }
    }
    
    res.json({ message: 'Withdrawal updated successfully', withdrawal });
  } catch (error) {
    console.error('Update withdrawal error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
