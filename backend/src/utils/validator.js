function isValidUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidAlias(alias) {
  return /^[a-zA-Z0-9_-]{3,20}$/.test(alias);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = { isValidUrl, isValidAlias, isValidEmail };
