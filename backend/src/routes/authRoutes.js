const router = require('express').Router();
const auth = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, auth.register);
router.post('/login', authLimiter, auth.login);
router.post('/logout', auth.logout);
router.get('/me', auth.me);

module.exports = router;
