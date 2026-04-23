const router = require('express').Router();
const analytics = require('../controllers/analyticsController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/urls/:id/analytics', requireAuth, analytics.getAnalytics);

module.exports = router;
