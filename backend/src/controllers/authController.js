const authService = require('../services/authService');

exports.register = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const user = await authService.register(email, password);
    req.session.userId = user.id;
    req.session.email = user.email;
    res.status(201).json({ user });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await authService.login(email, password);
    req.session.userId = user.id;
    req.session.email = user.email;
    res.json({ user });
  } catch (err) { next(err); }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
};

exports.me = (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ user: { id: req.session.userId, email: req.session.email } });
};
