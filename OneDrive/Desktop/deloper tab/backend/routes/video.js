const express = require('express');
const Video = require('../models/Video');
const { verifyToken, checkSubscription, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all videos (Subscribed users only)
router.get('/all', verifyToken, checkSubscription, async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });
    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching videos.', error: error.message });
  }
});

// Upload video (Admin only)
router.post('/upload', verifyToken, isAdmin, async (req, res) => {
  try {
    const { title, description, videoUrl, thumbnailUrl, duration } = req.body;
    
    const video = new Video({ title, description, videoUrl, thumbnailUrl, duration });
    await video.save();
    
    res.status(201).json({ message: 'Video uploaded successfully!', video });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed.', error: error.message });
  }
});

// Get video detail (Subscribed users only)
router.get('/:id', verifyToken, checkSubscription, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found.' });
    res.json(video);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching video.', error: error.message });
  }
});

module.exports = router;
