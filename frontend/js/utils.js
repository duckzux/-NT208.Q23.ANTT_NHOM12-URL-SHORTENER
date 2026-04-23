function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.substring(0, max) + '...' : str;
}

function showToast(msg, type) {
  type = type || 'success';
  var existing = document.getElementById('_toast');
  if (existing) existing.remove();
  var el = document.createElement('div');
  el.id = '_toast';
  el.textContent = msg;
  el.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:12px 20px;border-radius:8px;color:#fff;z-index:9999;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
  el.style.background = type === 'success' ? '#22c55e' : '#ef4444';
  document.body.appendChild(el);
  setTimeout(function() { if (el.parentNode) el.remove(); }, 3000);
}

function getUrlParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function escapeHtml(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
