var API_BASE = '/api';

async function apiCall(endpoint, options) {
  var config = Object.assign({
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  }, options || {});
  var res = await fetch(API_BASE + endpoint, config);
  var data = await res.json();
  if (!res.ok) {
    var err = new Error(data.error || 'Error ' + res.status);
    err.status = res.status;
    throw err;
  }
  return data;
}

window.AuthApi = {
  register: function(email, password) {
    return apiCall('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
  },
  login: function(email, password) {
    return apiCall('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  },
  logout: function() {
    return apiCall('/auth/logout', { method: 'POST' });
  },
  me: function() {
    return apiCall('/auth/me');
  }
};

window.ShortenApi = {
  shorten: function(longUrl, customAlias, expiresAt) {
    var body = { longUrl: longUrl };
    if (customAlias) body.customAlias = customAlias;
    if (expiresAt) body.expiresAt = expiresAt;
    return apiCall('/shorten', { method: 'POST', body: JSON.stringify(body) });
  }
};
