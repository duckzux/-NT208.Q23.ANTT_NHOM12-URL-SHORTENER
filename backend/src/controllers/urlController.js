const urlService = require('../services/urlService');

exports.shorten = async (req, res, next) => {
  try {
    const { longUrl, customAlias, expiresAt } = req.body;
    const userId = req.session?.userId || null;
    const result = await urlService.shortenUrl(longUrl, userId, customAlias, expiresAt);
    res.status(201).json(result);
  } catch (err) { next(err); }
};

exports.getUrls = async (req, res, next) => {
  try {
    const urls = await urlService.getUserUrls(req.session.userId);
    res.json({ urls });
  } catch (err) { next(err); }
};

exports.deleteUrl = async (req, res, next) => {
  try {
    await urlService.deleteUrl(parseInt(req.params.id), req.session.userId);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

exports.updateUrl = async (req, res, next) => {
  try {
    const url = await urlService.updateUrl(parseInt(req.params.id), req.session.userId, req.body);
    res.json({ url });
  } catch (err) { next(err); }
};
