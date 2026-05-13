# Changelog

## Week 1 - Setup & Migration
- Migrated from PHP/Apache to Node.js + Express
- Set up Prisma ORM with MySQL 8
- Defined DB schema: `users`, `urls`, `click_events`
- Created project structure (backend / frontend / tests)
- Added Docker Compose for one-command local dev

## Week 2 - Core Features
- **Base62 encoding** — `encode(id)` maps auto-increment primary key to a 6-char short code (charset `0-9A-Za-z`); collision-free by construction (bijection over unique IDs)
- **URL shortening** — `POST /api/shorten` creates a URL record, encodes its ID, caches to Redis, returns `{ shortCode, shortUrl }`
- **Custom aliases** — optional `customAlias` field, validated with regex, checked for uniqueness (409 on conflict)
- **Expiration dates** — optional `expiresAt`; redirect returns 410 Gone after expiry
- **Redis cache** — cache-first redirect lookup; TTL 24 h; invalidated on delete
- **Redirect** — `GET /:shortCode` → 302 to long URL; 404 page on miss

## Week 3 - Auth & Dashboard
- **Authentication** — register / login with bcrypt-hashed passwords, `express-session` cookie (httpOnly, 7-day TTL)
- **Rate limiting** — `express-rate-limit` on auth (10/15 min) and shorten (20/15 min) endpoints
- **Dashboard** — `GET /api/urls` returns user's URLs sorted newest-first; frontend table with copy/delete/analytics actions
- **Delete & patch** — `DELETE /api/urls/:id` and `PATCH /api/urls/:id` with ownership check (403 if not owner)
- **Health check** — `GET /api/health` returns DB + Redis status + uptime

## Week 4 - Analytics & Testing
- **Click tracking** — fire-and-forget `ClickEvent` insert on every redirect (IP, User-Agent, Referer); counter incremented on `urls.clicks`
- **Analytics API** — `GET /api/urls/:id/analytics` aggregates clicks by day (last 30 days), top referers, top countries
- **Analytics UI** — Chart.js line chart (clicks/day), doughnut (referers), bar (countries); stat cards for total / today / avg / countries
- **Unit tests** — Jest: `base62.test.js` (encode/decode + collision rate), `validator.test.js` (13 cases)
- **Collision rate test** — encodes 100,000 sequential IDs, asserts 0 collisions, documents 62^6 = 56,800,235,584 capacity
- **Integration tests** — Supertest: auth flow (7 cases), URL shorten/redirect/delete (8 cases)
- **Load tests** — k6: redirect benchmark (0→100 VUs), shorten benchmark (0→50 VUs), mixed workload (80% redirect / 15% shorten / 5% health)
- **Seed data** — demo account (`demo@example.com` / `password123`) with sample URLs and click events
