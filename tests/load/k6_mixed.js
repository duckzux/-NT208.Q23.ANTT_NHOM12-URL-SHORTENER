import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const redirectHits = new Counter('redirect_hits');
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SHORT_CODE = __ENV.SHORT_CODE || 'google';

export const options = {
  stages: [
    { duration: '30s', target: 30 },
    { duration: '60s', target: 100 },
    { duration: '60s', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(50)<30', 'p(95)<150'],
    errors: ['rate<0.01'],
  },
};

export default function () {
  const rand = Math.random();

  if (rand < 0.80) {
    // 80% redirect
    const res = http.get(`${BASE_URL}/${SHORT_CODE}`, { redirects: 0 });
    const ok = check(res, { 'redirect 302': r => r.status === 302 });
    errorRate.add(!ok);
    if (ok) redirectHits.add(1);

  } else if (rand < 0.95) {
    // 15% shorten
    const res = http.post(
      `${BASE_URL}/api/shorten`,
      JSON.stringify({ longUrl: 'https://example.com/load-test-' + __VU }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    errorRate.add(res.status !== 201);

  } else {
    // 5% health check
    const res = http.get(`${BASE_URL}/api/health`);
    errorRate.add(res.status !== 200);
  }

  sleep(0.5);
}
