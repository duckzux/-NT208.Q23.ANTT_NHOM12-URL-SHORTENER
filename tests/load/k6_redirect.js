import http from 'k6/http';
import { check, sleep } from 'k6';
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SHORT_CODE = __ENV.SHORT_CODE || '000001';

export const options = { stages: [
  { duration: '30s', target: 50 },
  { duration: '60s', target: 100 },
  { duration: '30s', target: 0 },
] };
export default function () {
  const res = http.get(`${BASE_URL}/${SHORT_CODE}`, { redirects: 0 });
  check(res, { 'is 302': r => r.status === 302 });
  sleep(1);
}
