# URL Shortener

> Đồ án môn Lập trình ứng dụng Web — UIT  
> Hệ thống rút gọn URL xây dựng với **Node.js + Express + Prisma + MySQL + Redis**

---

## Giới thiệu

URL Shortener là ứng dụng web cho phép người dùng rút gọn các URL dài thành các đường dẫn ngắn gọn, dễ nhớ và dễ chia sẻ. Hệ thống cung cấp đầy đủ các tính năng từ rút gọn URL, tuỳ chỉnh alias, theo dõi lượt click, đến phân tích thống kê chi tiết.

---

## Tính năng

- **Rút gọn URL** — Mã hoá Base62 từ auto-increment ID, hỗ trợ tối đa 56 tỷ mã duy nhất, không xung đột
- **Alias tuỳ chỉnh** — Người dùng tự đặt mã ngắn theo ý muốn (ví dụ: `/my-link`)
- **Thời hạn hết hạn** — Đặt ngày hết hạn tuỳ chọn cho từng URL
- **Chuyển hướng nhanh** — Redis cache-first lookup (<5ms khi cache hit), phản hồi HTTP 302
- **Phân tích lượt click** — Thống kê click theo ngày, top referer, top quốc gia; hiển thị bằng Chart.js
- **Xác thực người dùng** — Đăng ký / đăng nhập với mật khẩu mã hoá bcrypt; xác thực bằng session cookie (httpOnly)
- **Dashboard** — Xem, sao chép và xoá các URL đã rút gọn
- **Rate limiting** — Giới hạn tần suất gọi API trên các endpoint rút gọn và xác thực
- **Health check** — `GET /api/health` trả về trạng thái DB và Redis

---

## Công nghệ sử dụng

| Tầng | Công nghệ |
|------|-----------|
| Runtime | Node.js 18 LTS |
| Framework | Express.js 4.x |
| ORM | Prisma 5 |
| Database | MySQL 8.0 |
| Cache | Redis 7 (ioredis) |
| Xác thực | express-session + bcryptjs |
| Frontend | HTML5 / CSS3 / Bootstrap 5 / JavaScript ES6 |
| Charts | Chart.js 4 (CDN) |
| Testing | Jest + Supertest (integration) + k6 (load) |
| Deploy | Docker + Docker Compose |

---

## Kiến trúc hệ thống

```
Browser
  └── Express static  → frontend/
  └── /api/auth/*     → authController     → authService        → MySQL (Prisma)
  └── /api/shorten    → urlController      → urlService         → MySQL + Redis
  └── /api/urls/*     → urlController      → urlService         → MySQL
  └── /api/urls/:id/analytics → analyticsController → analyticsService → MySQL
  └── /:shortCode     → redirectController → Redis (cache hit) hoặc MySQL (miss) → 302
```

---

## API Endpoints

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | /api/auth/register | — | Đăng ký tài khoản (201 / 400 / 409) |
| POST | /api/auth/login | — | Đăng nhập, tạo session (200 / 401) |
| POST | /api/auth/logout | Có | Đăng xuất (200) |
| GET | /api/auth/me | Có | Thông tin người dùng hiện tại (200 / 401) |
| POST | /api/shorten | Tuỳ chọn | Tạo URL rút gọn (201 / 400 / 409) |
| GET | /:shortCode | — | Chuyển hướng (302 / 404 / 410) |
| GET | /api/urls | Có | Danh sách URL của người dùng (200) |
| GET | /api/urls/:id/analytics | Có | Dữ liệu phân tích (200 / 403) |
| DELETE | /api/urls/:id | Có | Xoá URL (200 / 403) |
| PATCH | /api/urls/:id | Có | Cập nhật URL (200 / 403) |
| GET | /api/health | — | Kiểm tra trạng thái hệ thống |

---

## Cấu trúc thư mục

```
DOAN/
├── backend/
│   ├── src/
│   │   ├── app.js              # Cấu hình Express app
│   │   ├── server.js           # Entry point
│   │   ├── controllers/        # Xử lý request
│   │   ├── routes/             # Định nghĩa route
│   │   ├── services/           # Business logic
│   │   ├── middleware/         # Auth, rate limit, error handler
│   │   ├── utils/              # base62, validator, logger
│   │   └── config/             # redis, session
│   ├── prisma/
│   │   ├── schema.prisma       # Schema DB (User, Url, ClickEvent)
│   │   └── seed.js             # Dữ liệu mẫu
│   └── package.json
├── frontend/
│   ├── index.html              # Trang rút gọn URL chính
│   ├── signin.html             # Trang đăng nhập
│   ├── register.html           # Trang đăng ký
│   ├── dashboard.html          # Dashboard người dùng
│   ├── analytics.html          # Phân tích click với biểu đồ
│   ├── 404.html                # Trang không tìm thấy
│   ├── css/                    # CSS tuỳ chỉnh + Bootstrap
│   └── js/                     # api.js, auth.js, shorten.js, dashboard.js, analytics.js, utils.js
├── tests/
│   ├── unit/                   # Jest unit tests (validator, base62)
│   ├── integration/            # Supertest API tests
│   └── load/                   # k6 load tests
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── SETUP.md
```

---

## Lược đồ cơ sở dữ liệu

Ba bảng được quản lý bởi Prisma:

- **users** — id, email (unique), password (bcrypt), created_at
- **urls** — id, short_code (unique), long_url, user_id (nullable), clicks, expires_at, created_at
- **click_events** — id, url_id, ip_address, user_agent, referer, country, clicked_at

---

## Hướng dẫn chạy nhanh

Xem [SETUP.md](SETUP.md) để có hướng dẫn đầy đủ.

```bash
# Chạy bằng Docker (khuyến nghị)
docker compose up --build

# Chạy local (development)
cd backend
npm install
npx prisma migrate dev
npm run dev
```

Ứng dụng chạy tại: `http://localhost:3000`

### Tài khoản demo (sau khi seed)

```
Email:    demo@example.com
Password: password123
```

---

## Chạy tests

```bash
cd backend

# Unit + Integration tests
npm test

# Load test với k6 (cần cài k6)
k6 run tests/load/k6_mixed.js
```

---

## Tác giả

| | |
|--|--|
| MSSV | 24520453 |
| Email | 24520453@gm.uit.edu.vn |
| Trường | Đại học Công nghệ Thông tin — ĐHQG TP.HCM (UIT) |
| Môn học | Lập trình ứng dụng Web |
