import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = { stages: [
  { duration: '30s', target: 50 },
  { duration: '60s', target: 100 },
  { duration: '30s', target: 0 },
] };
export default function () {
  const res = http.get('http://localhost:3000/000001', { redirects: 0 });
  check(res, { 'is 302': r => r.status === 302 });
  sleep(1);
}
