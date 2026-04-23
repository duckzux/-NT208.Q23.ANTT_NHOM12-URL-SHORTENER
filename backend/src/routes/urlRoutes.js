const router = require('express').Router();
const url = require('../controllers/urlController');
const { requireAuth } = require('../middleware/authMiddleware');
const { shortenLimiter } = require('../middleware/rateLimiter');

router.post('/shorten', shortenLimiter, url.shorten);
router.get('/urls', requireAuth, url.getUrls);
router.delete('/urls/:id', requireAuth, url.deleteUrl);
router.patch('/urls/:id', requireAuth, url.updateUrl);

module.exports = router;
