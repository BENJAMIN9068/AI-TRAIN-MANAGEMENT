const express = require('express');
const router = express.Router();
const { authenticateToken, driverAndAdmin } = require('../middleware/auth');

// Placeholder route - will be expanded later
router.get('/', authenticateToken, driverAndAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'Route API routes - Coming soon'
  });
});

module.exports = router;
