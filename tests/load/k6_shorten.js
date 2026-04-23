import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '60s', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.05'],
  },
};

const URLS = [
  'https://www.google.com',
  'https://github.com',
  'https://stackoverflow.com',
  'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
  'https://nodejs.org/en/docs/',
];

export default function () {
  const longUrl = URLS[Math.floor(Math.random() * URLS.length)];
  const res = http.post(
    `${BASE_URL}/api/shorten`,
    JSON.stringify({ longUrl }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const ok = check(res, {
    'status is 201': r => r.status === 201,
    'has shortCode': r => JSON.parse(r.body).shortCode !== undefined,
  });
  errorRate.add(!ok);
  sleep(1);
}
