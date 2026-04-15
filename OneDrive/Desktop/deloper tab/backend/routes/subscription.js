const express = require('express');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Subscribe (Mock activation)
router.post('/subscribe', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.isSubscribed = true;
    await user.save();
    
    res.json({ message: 'Subscription activated!', user: { id: user._id, isSubscribed: user.isSubscribed } });
  } catch (error) {
    res.status(500).json({ message: 'Subscription failed.', error: error.message });
  }
});

// Unsubscribe (for testing)
router.post('/unsubscribe', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.isSubscribed = false;
    await user.save();
    
    res.json({ message: 'Subscription deactivated!', user: { id: user._id, isSubscribed: user.isSubscribed } });
  } catch (error) {
    res.status(500).json({ message: 'Operation failed.', error: error.message });
  }
});

module.exports = router;
