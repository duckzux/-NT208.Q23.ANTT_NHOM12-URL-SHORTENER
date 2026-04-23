# URL Shortener System

A full-featured URL shortening service — Bitly clone built with **Node.js + Express + Prisma + MySQL + Redis**.

## Features

- **Shorten URLs** — Base62 encoding of auto-increment ID (zero collision, 56 billion unique codes)
- **Custom aliases** — Choose your own short code (e.g. `/my-link`)
- **Expiration dates** — Set optional link expiry
- **Fast redirects** — Redis cache-first lookup (<5ms on cache hit), HTTP 302
- **Click analytics** — Track clicks per day, top referers, top countries; visualised with Chart.js
- **Authentication** — Register/login with bcrypt-hashed passwords; session-cookie auth (httpOnly)
- **Dashboard** — View, copy, and delete your shortened URLs
- **Rate limiting** — express-rate-limit on shorten and auth endpoints
- **Health check** — `GET /api/health` returns DB + Redis status

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18 LTS |
| Framework | Express.js 4.x |
| ORM | Prisma 5 |
| Database | MySQL 8.0 |
| Cache | Redis 7 (ioredis) |
| Auth | express-session + bcryptjs |
| Frontend | HTML5 / CSS3 / Bootstrap 5 / JavaScript ES6 |
| Charts | Chart.js 4 (CDN) |
| Testing | Jest + Supertest (integration) + k6 (load) |
| Deploy | Docker + Docker Compose |

## Architecture

```
Browser
  └── Express static → frontend/
  └── /api/auth/*    → authController  → authService  → MySQL (Prisma)
  └── /api/shorten   → urlController   → urlService   → MySQL + Redis
  └── /api/urls/*    → urlController   → urlService   → MySQL
  └── /api/urls/:id/analytics → analyticsController → analyticsService → MySQL
  └── /:shortCode    → redirectController → Redis (cache hit) or MySQL (miss) → 302
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | — | Register (201/400/409) |
| POST | /api/auth/login | — | Login, create session (200/401) |
| POST | /api/auth/logout | Yes | Logout (200) |
| GET | /api/auth/me | Yes | Current user (200/401) |
| POST | /api/shorten | Optional | Create short URL (201/400/409) |
| GET | /:shortCode | — | Redirect (302/404/410) |
| GET | /api/urls | Yes | List user's URLs (200) |
| GET | /api/urls/:id/analytics | Yes | Analytics data (200/403) |
| DELETE | /api/urls/:id | Yes | Delete URL (200/403) |
| PATCH | /api/urls/:id | Yes | Update URL (200/403) |
| GET | /api/health | — | Health check |

## Project Structure

```
DOAN/
├── backend/
│   ├── src/
│   │   ├── app.js              # Express app setup
│   │   ├── server.js           # Entry point
│   │   ├── controllers/        # Request handlers
│   │   ├── routes/             # Route definitions
│   │   ├── services/           # Business logic
│   │   ├── middleware/         # Auth, rate limit, error handler
│   │   ├── utils/              # base62, validator, logger
│   │   └── config/             # redis, session
│   ├── prisma/
│   │   ├── schema.prisma       # DB schema (User, Url, ClickEvent)
│   │   └── seed.js             # Sample data
│   └── package.json
├── frontend/
│   ├── index.html              # Main shortener page
│   ├── signin.html             # Login page
│   ├── register.html           # Register page
│   ├── dashboard.html          # User dashboard
│   ├── analytics.html          # Click analytics with charts
│   ├── 404.html                # Not found page
│   ├── css/                    # 9 CSS files (custom + Bootstrap)
│   └── js/                     # api.js, auth.js, shorten.js, dashboard.js, analytics.js, utils.js
├── tests/
│   ├── unit/                   # Jest unit tests (validator, base62)
│   ├── integration/            # Supertest API tests
│   └── load/                   # k6 load tests
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── SETUP.md                    # How to run
```

## Database Schema

Three tables managed by Prisma:

- **users** — id, email (unique), password (bcrypt), created_at
- **urls** — id, short_code (unique), long_url, user_id (nullable), clicks, expires_at, created_at
- **click_events** — id, url_id, ip_address, user_agent, referer, country, clicked_at

## Demo Account (after seeding)

```
Email:    demo@example.com
Password: password123
```

## Quick Start

See [SETUP.md](SETUP.md) for full setup instructions.

```bash
# Docker (easiest)
docker compose up --build

# Local development
cd backend && npm install
npx prisma migrate dev
npm run dev
```
