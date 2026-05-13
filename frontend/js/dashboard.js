document.addEventListener('DOMContentLoaded', function() {
  loadDashboard();
});

async function loadDashboard() {
  try {
    var data = await apiCall('/urls');
    var urls = data.urls || [];

    document.getElementById('totalLinks').textContent = urls.length;
    var totalClicks = urls.reduce(function(sum, u) { return sum + (u.clicks || 0); }, 0);
    document.getElementById('totalClicks').textContent = totalClicks;

    renderTable(urls);
  } catch (err) {
    if (err.status === 401 || (err.message && err.message.includes('401'))) {
      window.location.href = 'signin.html';
    }
  }
}

function renderTable(urls) {
  var tbody = document.getElementById('urlTableBody');
  if (!urls || urls.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4" style="color:#aaa;">Bạn chưa có URL nào. <a href="index.html" style="color:#6366f1;">Tạo ngay!</a></td></tr>';
    return;
  }

  var appUrl = window.location.origin;
  tbody.innerHTML = urls.map(function(url) {
    var shortUrl = appUrl + '/' + url.shortCode;
    var created = formatDate(url.createdAt);
    var expires = url.expiresAt ? formatDate(url.expiresAt) : '-';
    var longDisplay = escapeHtml(truncate(url.longUrl, 60));

    return '<tr>' +
      '<td><a href="' + escapeHtml(shortUrl) + '" target="_blank" class="fw-bold text-decoration-none" style="color:#6366f1;">' + escapeHtml(url.shortCode) + '</a></td>' +
      '<td><span class="text-break" title="' + escapeHtml(url.longUrl) + '">' + longDisplay + '</span></td>' +
      '<td class="text-center"><span class="badge bg-primary rounded-pill">' + (url.clicks || 0) + '</span></td>' +
      '<td class="text-center">' + created + '</td>' +
      '<td class="text-center">' + expires + '</td>' +
      '<td class="text-center">' +
        '<button class="btn btn-sm btn-outline-secondary me-1" onclick="copyUrl(\'' + escapeHtml(shortUrl) + '\')">Copy</button>' +
        '<a href="analytics.html?id=' + url.id + '" class="btn btn-sm btn-outline-info me-1">Stats</a>' +
        '<button class="btn btn-sm btn-outline-danger" onclick="deleteUrl(' + url.id + ')">Xóa</button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function copyUrl(url) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(url).then(function() {
      showToast('Đã copy URL!', 'success');
    }).catch(function() { fallbackCopy(url); });
  } else {
    fallbackCopy(url);
  }
}

function fallbackCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showToast('Đã copy URL!', 'success');
}

async function deleteUrl(id) {
  if (!confirm('Bạn có chắc muốn xóa URL này?')) return;
  try {
    await apiCall('/urls/' + id, { method: 'DELETE' });
    showToast('Đã xóa URL', 'success');
    loadDashboard();
  } catch (err) {
    showToast(err.message || 'Lỗi khi xóa', 'error');
  }
}
