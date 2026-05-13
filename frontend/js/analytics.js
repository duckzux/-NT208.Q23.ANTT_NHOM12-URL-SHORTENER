document.addEventListener('DOMContentLoaded', function() {
  var id = getUrlParam('id');
  if (!id) { window.location.href = 'dashboard.html'; return; }
  loadAnalytics(id);
});

async function loadAnalytics(id) {
  try {
    var data = await apiCall('/urls/' + id + '/analytics');

    document.getElementById('loadingMsg').style.display = 'none';
    document.getElementById('analyticsContent').style.display = 'block';

    if (data.url) {
      var appUrl = window.location.origin;
      document.getElementById('urlInfo').innerHTML =
        '<a href="' + appUrl + '/' + escapeHtml(data.url.shortCode) + '" target="_blank" style="color:#6366f1;">' +
        appUrl + '/' + escapeHtml(data.url.shortCode) + '</a> &rarr; ' +
        '<span style="color:#aaa;">' + escapeHtml(truncate(data.url.longUrl, 80)) + '</span>';
    }

    document.getElementById('statTotal').textContent = data.totalClicks || 0;

    var today = new Date().toISOString().split('T')[0];
    var todayEntry = (data.clicksByDay || []).find(function(d) { return d.date === today; });
    document.getElementById('statToday').textContent = todayEntry ? todayEntry.count : 0;

    var activeDays = (data.clicksByDay || []).filter(function(d) { return d.count > 0; }).length;
    document.getElementById('statAvg').textContent = activeDays > 0 ? Math.round(data.totalClicks / activeDays) : 0;
    document.getElementById('statCountries').textContent = (data.topCountries || []).length;

    renderLineChart(data.clicksByDay || []);
    renderDoughnutChart('refererChart', data.topReferers || [], 'referer', 'count');
    renderBarChart('countryChart', data.topCountries || [], 'country', 'count');

  } catch (err) {
    document.getElementById('loadingMsg').style.display = 'none';
    document.getElementById('errorMsg').style.display = 'block';
    document.getElementById('errorText').textContent = err.message || 'Lỗi tải dữ liệu';
    if (err.status === 401 || (err.message && err.message.includes('401'))) {
      setTimeout(function() { window.location.href = 'signin.html'; }, 2000);
    }
  }
}

function renderLineChart(data) {
  var ctx = document.getElementById('lineChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(function(d) { return d.date; }),
      datasets: [{
        label: 'Lượt click',
        data: data.map(function(d) { return d.count; }),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.15)',
        tension: 0.3,
        fill: true,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#ccc' } } },
      scales: {
        x: { ticks: { color: '#aaa', maxTicksLimit: 10 }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
      }
    }
  });
}

var CHART_COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#ec4899','#84cc16','#f97316','#14b8a6'];

function renderDoughnutChart(canvasId, data, labelKey, valueKey) {
  if (!data.length) {
    document.getElementById(canvasId).parentElement.innerHTML += '<p style="color:#aaa;text-align:center;">Chưa có dữ liệu</p>';
    return;
  }
  var ctx = document.getElementById(canvasId).getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(function(d) { return d[labelKey]; }),
      datasets: [{ data: data.map(function(d) { return d[valueKey]; }), backgroundColor: CHART_COLORS.slice(0, data.length) }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'right', labels: { color: '#ccc', font: { size: 11 } } } }
    }
  });
}

function renderBarChart(canvasId, data, labelKey, valueKey) {
  if (!data.length) {
    document.getElementById(canvasId).parentElement.innerHTML += '<p style="color:#aaa;text-align:center;">Chưa có dữ liệu</p>';
    return;
  }
  var ctx = document.getElementById(canvasId).getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(function(d) { return d[labelKey]; }),
      datasets: [{ label: 'Clicks', data: data.map(function(d) { return d[valueKey]; }), backgroundColor: '#6366f1' }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#ccc' } } },
      scales: {
        x: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
      }
    }
  });
}
