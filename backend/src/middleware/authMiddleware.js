function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function optionalAuth(req, res, next) {
  next();
}

module.exports = { requireAuth, optionalAuth };
