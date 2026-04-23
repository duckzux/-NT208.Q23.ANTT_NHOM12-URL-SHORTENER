# Hướng dẫn chạy URL Shortener thành web thật

Có **2 cách** chạy: Docker (khuyến nghị, 1 lệnh) hoặc Local (cần cài sẵn MySQL + Redis).

---

## Cách 1 — Docker Compose (khuyến nghị)

### Yêu cầu
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) đã cài và đang chạy
- Git

### Bước 1 — Clone project

```bash
git clone <your-repo-url>
cd DOAN
```

### Bước 2 — Tạo file .env

```bash
cp .env.example .env
```

Chỉnh sửa `.env` nếu cần (mặc định chạy được luôn với Docker):

```env
DATABASE_URL="mysql://root:rootpass@mysql:3306/url_shortener"
APP_URL=http://localhost:3000
SESSION_SECRET=your-secret-key-change-this
DB_PASSWORD=rootpass
```

### Bước 3 — Build và chạy

```bash
docker compose up --build
```

> Lần đầu mất 2-3 phút để build image và MySQL khởi động.

### Bước 4 — Truy cập

Mở trình duyệt: **http://localhost:3000**

### (Tuỳ chọn) Seed dữ liệu mẫu

```bash
docker compose exec app npx prisma db seed
```

Demo account sau khi seed: `demo@example.com` / `password123`

### Dừng Docker

```bash
docker compose down        # dừng, giữ data
docker compose down -v     # dừng + xoá database
```

---

## Cách 2 — Chạy Local (không Docker)

### Yêu cầu

- Node.js >= 18 (`node -v`)
- MySQL 8.0 đang chạy
- Redis 7 đang chạy
- npm >= 9

### Bước 1 — Clone & cài dependencies

```bash
git clone <your-repo-url>
cd DOAN/backend
npm install
```

### Bước 2 — Tạo database MySQL

Đăng nhập MySQL và tạo DB:

```sql
CREATE DATABASE url_shortener CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Bước 3 — Cấu hình .env

Tạo **hai** file .env (cùng nội dung — root cho docker-compose, backend/ cho Prisma CLI):

```bash
cp .env.example .env
cp .env.example backend/.env
```

Chỉnh sửa `DOAN/.env` và `DOAN/backend/.env`:

```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@127.0.0.1:3306/url_shortener"
APP_URL=http://localhost:3000
NODE_ENV=development
SESSION_SECRET=dev-secret-change-me
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

> Thay `YOUR_PASSWORD` bằng mật khẩu MySQL của bạn. Nếu không có mật khẩu, dùng: `mysql://root:@127.0.0.1:3306/url_shortener`

### Bước 4 — Chạy migrations

```bash
cd DOAN/backend
npx prisma migrate dev --name init
```

### Bước 5 — (Tuỳ chọn) Seed dữ liệu mẫu

```bash
npm run seed
```

### Bước 6 — Khởi động server

```bash
npm run dev       # development (nodemon, auto-reload)
# hoặc
npm start         # production
```

### Bước 7 — Truy cập

Mở trình duyệt: **http://localhost:3000**

---

## Deploy lên web thật (production)

### Option A — Railway.app (miễn phí, dễ nhất)

1. Tạo tài khoản [Railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Thêm services: **MySQL** và **Redis** trong cùng project
4. Set environment variables trong Railway dashboard:
   ```
   DATABASE_URL=<từ Railway MySQL>
   REDIS_HOST=<từ Railway Redis>
   SESSION_SECRET=<random string dài>
   APP_URL=https://<your-app>.railway.app
   NODE_ENV=production
   ```
5. Railway tự build Dockerfile và deploy

### Option B — VPS + Docker (DigitalOcean / Vultr / Hetzner)

```bash
# Trên VPS (Ubuntu)
sudo apt update && sudo apt install docker.io docker-compose-plugin -y

# Clone project
git clone <your-repo-url> && cd DOAN

# Tạo .env production
cat > .env << 'EOF'
DATABASE_URL="mysql://root:STRONG_PASSWORD@mysql:3306/url_shortener"
DB_PASSWORD=STRONG_PASSWORD
SESSION_SECRET=VERY_LONG_RANDOM_STRING
APP_URL=https://yourdomain.com
NODE_ENV=production
EOF

# Chạy
docker compose up -d --build

# Chạy migrations và seed
docker compose exec app npx prisma migrate deploy
```

**Cài Nginx + SSL (Let's Encrypt):**

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com

# Nginx config: /etc/nginx/sites-available/url-shortener
server {
    listen 80;
    server_name yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Option C — Render.com (miễn phí tier)

1. New Web Service → Connect GitHub repo
2. Environment: `Docker`
3. Add environment variables (DATABASE_URL, REDIS_HOST, SESSION_SECRET, APP_URL)
4. Add PostgreSQL/MySQL và Redis add-ons

---

## Chạy Tests

### Unit + Integration tests (cần MySQL + Redis chạy)

```bash
cd DOAN/backend
npm test
```

### Load tests với k6

```bash
# Cài k6: https://k6.io/docs/getting-started/installation/

# Redirect load test
k6 run tests/load/k6_redirect.js

# Shorten load test
k6 run tests/load/k6_shorten.js

# Mixed load test
k6 run tests/load/k6_mixed.js

# Chạy với custom base URL
k6 run -e BASE_URL=https://yourdomain.com tests/load/k6_mixed.js
```

### So sánh Redis vs không Redis

```bash
# Test với Redis (mặc định)
k6 run tests/load/k6_redirect.js

# Tắt Redis trong docker-compose, test lại
# Ghi chép P50, P95, RPS để so sánh
```

---

## Prisma Studio (xem/sửa database qua GUI)

```bash
cd DOAN/backend
npx prisma studio
# Mở http://localhost:5555
```

---

## Cấu trúc biến môi trường

| Biến | Bắt buộc | Mô tả | Ví dụ |
|------|----------|-------|-------|
| DATABASE_URL | Có | Prisma connection string | `mysql://root:pass@localhost:3306/url_shortener` |
| SESSION_SECRET | Có | Khoá ký session cookie | Chuỗi random >= 32 ký tự |
| APP_URL | Có | URL gốc của app (không có /) | `https://yourdomain.com` |
| REDIS_HOST | Có | Redis hostname | `localhost` hoặc `redis` (Docker) |
| REDIS_PORT | Không | Redis port | `6379` (mặc định) |
| NODE_ENV | Không | Environment | `development` / `production` |
| PORT | Không | Server port | `3000` (mặc định) |

---

## Checklist nộp bài

- [ ] GitHub repo public
- [ ] `.env.example` có trong repo, `.env` không có trong repo
- [ ] `docker compose up --build` chạy OK
- [ ] `npx prisma migrate deploy` tự động tạo DB
- [ ] >= 10 commits có ý nghĩa
- [ ] `npm test` pass
- [ ] Live demo URL với HTTPS
- [ ] Báo cáo PDF + Slide + Video
