const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Message = require('../models/Message');
const auth = require('../middleware/authMiddleware');

// Get history for a specific room
router.get('/:roomId', auth, async (req, res) => {
  try {
    const messages = await Message.find({ roomId: req.params.roomId }).sort({ timestamp: 1 });
    const room = await Room.findOne({ roomId: req.params.roomId });
    res.json({ messages, room });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;