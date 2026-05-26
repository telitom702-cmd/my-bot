const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const verifyToken = require('./auth').verifyToken;

// Get all tasks
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, type, category } = req.query;
    const skip = (page - 1) * limit;
    
    // Build query
    let query = { isActive: true, expiryDate: { $gt: new Date() } };
    
    if (type) query.type = type;
    if (category) query.category = category;
    
    // Get tasks
    const tasks = await Task.find(query)
      .populate('createdBy', 'username firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count
    const total = await Task.countDocuments(query);
    
    res.json({
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get task by ID
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('createdBy', 'username firstName lastName')
      .populate('completedBy.userId', 'username firstName lastName');
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    res.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new task (admin only)
router.post('/', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findOne({ telegramId: req.user.userId });
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const {
      title,
      description,
      type,
      category,
      reward,
      maxCompletions,
      expiryDate,
      requiredProof,
      proofInstructions,
      data
    } = req.body;
    
    // Create new task
    const task = new Task({
      title,
      description,
      type,
      category,
      reward: reward || config.DEFAULT_TASK_REWARD,
      maxCompletions,
      expiryDate: expiryDate || new Date(Date.now() + config.TASK_EXPIRY_HOURS * 60 * 60 * 1000),
      requiredProof,
      proofInstructions,
      data,
      createdBy: user.telegramId
    });
    
    await task.save();
    
    res.status(201).json({ task });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task (admin only)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findOne({ telegramId: req.user.userId });
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const {
      title,
      description,
      type,
      category,
      reward,
      maxCompletions,
      expiryDate,
      isActive,
      requiredProof,
      proofInstructions,
      data
    } = req.body;
    
    // Find and update task
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        type,
        category,
        reward,
        maxCompletions,
        expiryDate,
        isActive,
        requiredProof,
        proofInstructions,
        data
      },
      { new: true }
    );
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    res.json({ task });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete task (admin only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findOne({ telegramId: req.user.userId });
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Delete task
    const task = await Task.findByIdAndDelete(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve task completion (admin only)
router.post('/:id/approve', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findOne({ telegramId: req.user.userId });
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { userId } = req.body;
    
    // Find task
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Find user's completion
    const completion = task.completedBy.find(c => c.userId.toString() === userId.toString());
    
    if (!completion) {
      return res.status(404).json({ message: 'Completion not found' });
    }
    
    if (completion.status === 'approved') {
      return res.status(400).json({ message: 'Already approved' });
    }
    
    // Update completion status
    completion.status = 'approved';
    completion.rewardCredited = true;
    
    // Find user and credit reward
    const taskUser = await User.findOne({ telegramId: userId });
    if (taskUser) {
      await taskUser.addBalance(task.reward);
      
      // Create transaction record
      const transaction = new Transaction({
        userId,
        type: 'task_completion',
        amount: task.reward,
        balanceAfter: taskUser.balance,
        description: `Completed task: ${task.title} (approved)`,
        taskId: task._id
      });
      await transaction.save();
    }
    
    await task.save();
    
    res.json({ message: 'Task completion approved successfully' });
  } catch (error) {
    console.error('Approve task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject task completion (admin only)
router.post('/:id/reject', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findOne({ telegramId: req.user.userId });
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { userId, reason } = req.body;
    
    // Find task
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Find user's completion
    const completion = task.completedBy.find(c => c.userId.toString() === userId.toString());
    
    if (!completion) {
      return res.status(404).json({ message: 'Completion not found' });
    }
    
    if (completion.status === 'rejected') {
      return res.status(400).json({ message: 'Already rejected' });
    }
    
    // Update completion status
    completion.status = 'rejected';
    
    // Add rejection note
    completion.rejectionReason = reason;
    
    await task.save();
    
    res.json({ message: 'Task completion rejected successfully' });
  } catch (error) {
    console.error('Reject task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
