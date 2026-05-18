# BÁO CÁO ĐỒ ÁN — HỆ THỐNG RÚT NGẮN URL

**Môn học:** Lập Trình Ứng Dụng Web  
**Sinh viên:** 24520453 — UIT  
**Tên đề tài:** URL Shortener — Hệ thống rút ngắn liên kết (Bitly clone)

---

## MỤC LỤC

1. [Giới thiệu đề tài](#1-giới-thiệu-đề-tài)
2. [Công nghệ sử dụng](#2-công-nghệ-sử-dụng)
3. [Kiến trúc hệ thống](#3-kiến-trúc-hệ-thống)
4. [Cơ sở dữ liệu](#4-cơ-sở-dữ-liệu)
5. [Backend — Chi tiết triển khai](#5-backend--chi-tiết-triển-khai)
   - 5.1 [Khởi động & cấu hình server](#51-khởi-động--cấu-hình-server)
   - 5.2 [Hệ thống xác thực người dùng](#52-hệ-thống-xác-thực-người-dùng)
   - 5.3 [Rút ngắn URL & thuật toán Base62](#53-rút-ngắn-url--thuật-toán-base62)
   - 5.4 [Hệ thống Redirect & Redis Cache](#54-hệ-thống-redirect--redis-cache)
   - 5.5 [Thu thập & tổng hợp Analytics](#55-thu-thập--tổng-hợp-analytics)
   - 5.6 [Quản lý URL (Dashboard API)](#56-quản-lý-url-dashboard-api)
   - 5.7 [Middleware: Bảo vệ route & giới hạn tốc độ](#57-middleware-bảo-vệ-route--giới-hạn-tốc-độ)
   - 5.8 [Xử lý lỗi tập trung](#58-xử-lý-lỗi-tập-trung)
   - 5.9 [Health Check](#59-health-check)
6. [Frontend — Các phần quan trọng](#6-frontend--các-phần-quan-trọng)
7. [Luồng xử lý End-to-End](#7-luồng-xử-lý-end-to-end)
8. [Kiểm thử (Testing)](#8-kiểm-thử-testing)
9. [Triển khai với Docker](#9-triển-khai-với-docker)
10. [Tổng kết](#10-tổng-kết)

---

## 1. Giới thiệu đề tài

Hệ thống rút ngắn URL (URL Shortener) là một ứng dụng web cho phép người dùng:

- Nhập một URL dài → nhận về một URL ngắn (ví dụ: `localhost:3000/G`)
- Truy cập URL ngắn → tự động chuyển hướng đến URL gốc
- Đặt **alias tuỳ chỉnh** (ví dụ: `/my-blog`) thay vì mã tự động
- Đặt **ngày hết hạn** cho link
- Xem **thống kê click** theo ngày, nguồn truy cập, quốc gia
- Quản lý toàn bộ URL đã tạo qua **dashboard**

Đây là bài toán kinh điển trong lập trình web, đòi hỏi giải quyết các vấn đề thực tế như: thiết kế API RESTful, tối ưu hiệu năng bằng cache, xác thực người dùng, và phân tích dữ liệu truy cập.
Optimized tool selection

Các luồng chính của web này là:

- **Luồng rút ngắn URL**: `POST /api/shorten` → rate limit → `urlController` → `urlService` → validate URL → tạo shortCode (alias hoặc Base62) → lưu DB → cache Redis → trả về `shortUrl`.
- **Luồng redirect**: `GET /:shortCode` → `redirectController` → Redis GET → nếu hit thì redirect 302 ngay, nếu miss thì MySQL lookup → check hết hạn → set Redis → ghi analytics async → redirect 302.
- **Luồng xem analytics**: `GET /api/urls/:id/analytics` → `requireAuth` → ownership check → query click_events 30 ngày → tổng hợp theo ngày/referer/country → frontend vẽ biểu đồ.
- **Luồng auth**: `POST /api/auth/register|login` → bcrypt + tạo session → cookie `connect.sid`; `GET /api/auth/me` để đồng bộ trạng thái đăng nhập; `POST /api/auth/logout` xóa session.
- **Luồng dashboard**: `GET /api/urls` lấy danh sách URL của user; `DELETE /api/urls/:id` xóa (xóa cache trước rồi xóa DB); `PATCH /api/urls/:id` cập nhật expiry.
- **Luồng frontend sync**: mỗi trang gọi `GET /api/auth/me` để render navbar phù hợp; trang rút ngắn gọi API và hiển thị kết quả.

---

## 2. Công nghệ sử dụng

| Tầng | Công nghệ | Phiên bản | Lý do chọn |
|---|---|---|---|
| Runtime | **Node.js** | 18 LTS | Non-blocking I/O, phù hợp ứng dụng nhiều request đồng thời |
| Framework | **Express.js** | 4.x | Nhẹ, linh hoạt, middleware pipeline rõ ràng |
| ORM | **Prisma** | 5.x | Type-safe queries, tự tạo migration, schema rõ ràng |
| Database | **MySQL** | 8.0 | Quan hệ rõ ràng, index composite hiệu quả |
| Cache | **Redis** (ioredis) | 7 | In-memory, latency < 1ms, dùng cho session + URL cache |
| Auth | **express-session** + **bcryptjs** | — | Session cookie server-side, bcrypt hash mật khẩu |
| Frontend | HTML5 / CSS3 / Bootstrap 5 / JS ES6 | — | Static files, không cần build step |
| Charts | **Chart.js** | 4 (CDN) | Thư viện vẽ biểu đồ đơn giản, tích hợp qua CDN |
| Testing | **Jest** + **Supertest** + **k6** | — | Unit, integration, load test |
| Deploy | **Docker** + **Docker Compose** + **Nginx** | — | Container hoá, dễ reproduce môi trường |

---

## 3. Kiến trúc hệ thống

### 3.1 Mô hình tổng thể

Dự án theo mô hình **Monolith với Layered Architecture** (Controller → Service → Repository/ORM):

```
┌─────────────────────────────────────────────────────────┐
│                      BROWSER                             │
│         (HTML + CSS + Bootstrap + JS thuần)             │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP / HTTPS
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   NGINX (port 80)                        │
│           Reverse proxy → app:3000                      │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              EXPRESS.JS SERVER (port 3000)               │
│                                                         │
│  /frontend/*     → Static files (HTML/CSS/JS)           │
│  /api/auth/*     → authController  → authService       │
│  /api/shorten    → urlController   → urlService        │
│  /api/urls/*     → urlController   → urlService        │
│  /api/urls/:id/analytics → analyticsController         │
│  /:shortCode     → redirectController                  │
│                  (catch-all, đặt cuối cùng)            │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
           ▼                          ▼
┌──────────────────┐       ┌──────────────────────────┐
│   MySQL 8.0      │       │       Redis 7             │
│  (Prisma ORM)    │       │                          │
│                  │       │  key: sess:<sid>          │
│  Table: users    │       │  value: JSON session      │
│  Table: urls     │       │                          │
│  Table:          │       │  key: url:<shortCode>     │
│   click_events   │       │  value: longUrl string    │
└──────────────────┘       └──────────────────────────┘
```

### 3.2 Phân tầng code (Separation of Concerns)

| Tầng | Thư mục | Vai trò |
|---|---|---|
| **Routes** | `src/routes/` | Khai báo endpoint, gắn middleware, gọi controller |
| **Controllers** | `src/controllers/` | Parse request, gọi service, trả response |
| **Services** | `src/services/` | Business logic, Prisma queries, cache |
| **Middleware** | `src/middleware/` | Auth guard, rate limit, error handler |
| **Utils** | `src/utils/` | Hàm thuần (base62, validator) không có side-effect |
| **Config** | `src/config/` | Singleton clients (Redis, session) |

---

## 4. Cơ sở dữ liệu

### 4.1 Schema Prisma

Toàn bộ schema được định nghĩa tại `backend/prisma/schema.prisma`:

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String            // Lưu bcrypt hash, KHÔNG lưu plaintext
  createdAt DateTime @default(now()) @map("created_at")
  urls      Url[]             // Quan hệ 1-nhiều với bảng urls
  @@map("users")
}

model Url {
  id        Int          @id @default(autoincrement())
  shortCode String       @unique @map("short_code")   // base62(id) hoặc alias
  longUrl   String       @map("long_url") @db.Text    // URL gốc có thể rất dài
  userId    Int?         @map("user_id")              // nullable: guest có thể tạo
  clicks    Int          @default(0)                  // đếm tổng click (cache counter)
  expiresAt DateTime?    @map("expires_at")           // null = không hết hạn
  createdAt DateTime     @default(now()) @map("created_at")
  user      User?        @relation(fields: [userId], references: [id], onDelete: SetNull)
  events    ClickEvent[]
  @@index([userId])      // index để query nhanh theo user
  @@map("urls")
}

model ClickEvent {
  id        Int      @id @default(autoincrement())
  urlId     Int      @map("url_id")
  ipAddress String?  @map("ip_address") @db.VarChar(45)   // hỗ trợ cả IPv6
  userAgent String?  @map("user_agent") @db.Text
  referer   String?  @db.Text
  country   String?  @db.VarChar(50)
  clickedAt DateTime @default(now()) @map("clicked_at")
  url       Url      @relation(fields: [urlId], references: [id], onDelete: Cascade)
  @@index([urlId])                  // tìm events theo URL
  @@index([clickedAt])              // lọc theo khoảng thời gian
  @@index([urlId, clickedAt])       // composite: analytics query theo URL + thời gian
  @@map("click_events")
}
```

### 4.2 Quan hệ giữa các bảng

```
users (1) ──────────< urls (many)
                           │
                    urls (1) ──────< click_events (many)
```

- **users → urls**: Một user có nhiều URL. `userId` nullable cho phép guest (chưa đăng nhập) cũng tạo được link.
- **urls → click_events**: Mỗi lần redirect tạo 1 bản ghi click_event. Khi xóa URL thì `onDelete: Cascade` xóa hết click_events theo.
- Khi xóa user: `onDelete: SetNull` — URL không bị xóa, chỉ mất liên kết user.

### 4.3 Thiết kế Index

Composite index `@@index([urlId, clickedAt])` là index quan trọng nhất — được dùng trong query analytics:

```sql
-- Query tương đương khi gọi analyticsService.getAnalytics(urlId, days=30)
SELECT clickedAt, referer, country
FROM click_events
WHERE urlId = ? AND clickedAt >= ?   -- dùng composite index, không full table scan
```

MySQL có thể dùng index này để quét chỉ phần dữ liệu cần thiết thay vì đọc toàn bộ bảng.

---

## 5. Backend — Chi tiết triển khai

### 5.1 Khởi động & cấu hình server

#### Entry point: `src/server.js`

```javascript
const app = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
```

File này chỉ có nhiệm vụ duy nhất: lắng nghe cổng. Mọi cấu hình được tách sang `app.js`.

#### Cấu hình Express: `src/app.js`

Thứ tự đăng ký middleware trong Express **rất quan trọng** — request đi qua từng middleware theo thứ tự khai báo:

```javascript
app.set('trust proxy', 1);          // 1. Tin tưởng Nginx (lấy IP thật từ X-Forwarded-For)

app.use(cors({ ... }));             // 2. Cho phép cross-origin request với cookie
app.use(express.json());            // 3. Parse JSON body
app.use(cookieParser());            // 4. Parse cookie header
app.use(session({ ... }));          // 5. Session middleware (đọc/ghi Redis)

app.use(express.static(...));       // 6. Serve file tĩnh frontend/

app.use('/api/auth', authRoutes);   // 7. API routes
app.use('/api', urlRoutes);
app.use('/api', analyticsRoutes);

app.use('/', redirectRoutes);       // 8. Redirect — PHẢI đặt cuối cùng
app.use(errorHandler);              // 9. Global error handler — luôn là cái cuối
```

**Lý do đặt redirect cuối:** Route `/:shortCode` là wildcard sẽ khớp với mọi path. Nếu đặt trước API routes thì `/api/auth/login` sẽ bị redirect controller xử lý thay vì auth controller.

#### Custom Redis Session Store

Thay vì cài thêm package `connect-redis`, tôi tự implement `RedisStore` bằng cách extend class `session.Store` của express-session:

```javascript
class RedisStore extends session.Store {
  // Đọc session từ Redis
  get(sid, cb) {
    redis.get(`sess:${sid}`)
      .then(data => cb(null, data ? JSON.parse(data) : null))
      .catch(cb);
  }

  // Ghi session vào Redis với TTL tự động theo cookie.maxAge
  set(sid, sess, cb) {
    const ttl = Math.floor((sess.cookie?.maxAge || 86400000) / 1000); // ms → giây
    redis.setex(`sess:${sid}`, ttl, JSON.stringify(sess))
      .then(() => cb(null)).catch(cb);
  }

  // Xóa session khỏi Redis khi logout
  destroy(sid, cb) {
    redis.del(`sess:${sid}`).then(() => cb(null)).catch(cb);
  }
}
```

**Cách hoạt động của session:**
1. Lần đầu request: Express tạo session ID ngẫu nhiên, set cookie `connect.sid` cho browser.
2. Các request tiếp theo: Browser tự gửi cookie → Express đọc session ID → tra Redis → nạp session data vào `req.session`.
3. Khi ghi `req.session.userId = user.id`: Express tự gọi `store.set()` để lưu vào Redis.
4. Khi logout: Gọi `req.session.destroy()` → store gọi `redis.del()`.

Cookie được cấu hình `httpOnly: true` (JS không đọc được, chống XSS) và `sameSite: 'lax'` (chống CSRF cơ bản).

---

### 5.2 Hệ thống xác thực người dùng

#### Route: `src/routes/authRoutes.js`

```javascript
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, auth.register);  // giới hạn 10 req/15 phút
router.post('/login',    authLimiter, auth.login);
router.post('/logout',               auth.logout);
router.get('/me',                    auth.me);
```

#### Controller: `src/controllers/authController.js`

Controller chỉ làm 3 việc: validate input cơ bản, gọi service, set session.

```javascript
exports.register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation ở controller: kiểm tra field bắt buộc và độ dài tối thiểu
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    // Gọi service để xử lý business logic (hash + insert DB)
    const user = await authService.register(email, password);

    // Set session — từ đây request sau tự động được xác thực
    req.session.userId = user.id;
    req.session.email  = user.email;

    res.status(201).json({ user });
  } catch (err) {
    next(err); // Chuyển lỗi sang errorHandler
  }
};
```

#### Service: `src/services/authService.js`

Service chứa business logic thực sự: query DB, hash mật khẩu.

```javascript
async function register(email, password) {
  // Kiểm tra email đã tồn tại chưa
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw { status: 409, message: 'Email already registered' };

  // Bcrypt hash với 10 salt rounds
  // Cost factor 10 ≈ 100ms/hash → đủ chậm để chống brute-force
  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, password: hashed }
  });

  return { id: user.id, email: user.email, createdAt: user.createdAt };
}

async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Dùng cùng thông báo lỗi cho cả 2 trường hợp (không tìm thấy / sai mật khẩu)
  // → tránh leak thông tin "email này có tồn tại hay không"
  if (!user) throw { status: 401, message: 'Invalid credentials' };

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw { status: 401, message: 'Invalid credentials' };

  return { id: user.id, email: user.email };
}
```

**Tại sao dùng cùng thông báo lỗi?** Nếu báo "Email không tồn tại" và "Sai mật khẩu" riêng biệt, kẻ tấn công có thể thử từng email để biết ai đã đăng ký hệ thống.

#### Endpoint `GET /api/auth/me`

```javascript
exports.me = (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ user: { id: req.session.userId, email: req.session.email } });
};
```

Endpoint này được frontend gọi mỗi khi load trang để kiểm tra trạng thái đăng nhập, từ đó quyết định hiển thị navbar guest hay navbar user. Không cần query DB vì thông tin đã có trong session.

---

### 5.3 Rút ngắn URL & thuật toán Base62

#### Thuật toán Base62: `src/utils/base62.js`

```javascript
// 62 ký tự: 0-9, A-Z, a-z
const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function encode(num) {
  let result = '';
  while (num > 0) {
    result = CHARSET[num % 62] + result;  // lấy phần dư, gắn vào đầu chuỗi
    num = Math.floor(num / 62);           // chia lấy phần nguyên, lặp tiếp
  }
  return result || '0';
}
```

**Ví dụ minh hoạ từng bước:**

| Auto-increment ID | Quá trình tính | shortCode |
|---|---|---|
| 1 | 1 % 62 = 1 → `'1'` | `"1"` |
| 62 | 62 % 62 = 0 → `'0'`; 62/62 = 1 → `'A'`; ghép ngược = `'A0'` | `"A0"` |
| 100 | 100 % 62 = 38 → `'c'`; 100/62 = 1 → `'1'` | `"1c"` |
| 56 tỷ | 6 phép lặp | 6 ký tự |

**Tại sao dùng Base62 thay vì UUID hay random string?**

| Phương pháp | Vấn đề |
|---|---|
| UUID (random) | Dài 36 ký tự, phải kiểm tra collision trong DB mỗi lần tạo |
| Random string ngắn | Cần retry loop nếu trùng, code phức tạp hơn |
| **Base62(auto-increment ID)** | **Zero collision** — mỗi ID DB là duy nhất theo định nghĩa |

Với 6 ký tự Base62 có thể biểu diễn 62⁶ ≈ **56 tỷ URL** — đủ dùng cho mọi hệ thống thực tế.

#### Validation: `src/utils/validator.js`

```javascript
function isValidUrl(str) {
  try {
    const url = new URL(str);   // dùng URL API tích hợp sẵn của Node.js
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;  // new URL() ném lỗi nếu format sai
  }
}

function isValidAlias(alias) {
  // 3-20 ký tự, chỉ chấp nhận: chữ cái, số, gạch ngang, gạch dưới
  return /^[a-zA-Z0-9_-]{3,20}$/.test(alias);
}
```

Dùng `new URL()` thay vì regex phức tạp vì URL API chuẩn, xử lý đúng mọi edge case (port, query string, fragment, Unicode domain).

#### Service: `src/services/urlService.js`

Logic tạo URL ngắn có 2 nhánh chính:

```javascript
async function shortenUrl(longUrl, userId, customAlias, expiresAt) {
  // Bước 1: Validate URL
  if (!longUrl) throw { status: 400, message: 'URL is required' };
  if (!isValidUrl(longUrl)) throw { status: 400, message: 'Invalid URL' };

  let shortCode;

  if (customAlias) {
    // === NHÁNH 1: Custom alias do người dùng đặt ===
    if (!isValidAlias(customAlias))
      throw { status: 400, message: 'Invalid alias. Use 3-20 alphanumeric characters...' };

    const exists = await prisma.url.findUnique({ where: { shortCode: customAlias } });
    if (exists) throw { status: 409, message: 'Alias already taken' };

    shortCode = customAlias;
    await prisma.url.create({
      data: { shortCode, longUrl, userId: userId || null,
              expiresAt: expiresAt ? new Date(expiresAt) : null }
    });

  } else {
    // === NHÁNH 2: Auto-generate bằng Base62 ===
    // Kỹ thuật: INSERT trước với shortCode tạm để lấy auto-increment ID
    const url = await prisma.url.create({
      data: { shortCode: 'temp', longUrl, userId: userId || null,
              expiresAt: expiresAt ? new Date(expiresAt) : null }
    });

    // Dùng ID vừa tạo để encode Base62 → shortCode thực sự
    shortCode = base62.encode(url.id);

    // UPDATE lại bản ghi với shortCode đúng
    await prisma.url.update({ where: { id: url.id }, data: { shortCode } });
  }

  // Warm up cache ngay — lần redirect đầu tiên sẽ là cache HIT
  await cacheService.set(shortCode, longUrl);

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  return { shortCode, shortUrl: `${appUrl}/${shortCode}`, longUrl, createdAt: new Date() };
}
```

**Kỹ thuật "INSERT trước, UPDATE sau":** MySQL AUTO_INCREMENT chỉ gán ID khi INSERT, vì vậy phải INSERT một bản ghi tạm trước để nhận được ID, rồi dùng ID đó encode thành shortCode, rồi UPDATE lại. Đây là cách phổ biến khi shortCode phụ thuộc vào ID tự tăng.

---

### 5.4 Hệ thống Redirect & Redis Cache

Đây là tính năng **performance-critical** nhất của hệ thống — mỗi lần ai click vào link ngắn phải được xử lý thật nhanh.

#### Cache Service: `src/services/cacheService.js`

```javascript
const redis = require('../config/redis');

module.exports = {
  async get(key) {
    try { return await redis.get(`url:${key}`); }
    catch { return null; }  // Redis lỗi → trả null, fallback về DB
  },
  async set(key, val, ttl = 86400) {   // TTL mặc định = 1 ngày (86400 giây)
    try { await redis.setex(`url:${key}`, ttl, val); }
    catch {}  // Lỗi cache không được làm crash ứng dụng
  },
  async del(key) {
    try { await redis.del(`url:${key}`); }
    catch {}
  }
};
```

Key được đặt với prefix `url:` để phân biệt với session keys (`sess:`). Mọi lỗi Redis đều được catch và bỏ qua — Redis không phải nguồn sự thật, chỉ là tầng cache.

#### Controller: `src/controllers/redirectController.js`

```javascript
exports.redirect = async (req, res, next) => {
  try {
    const { shortCode } = req.params;

    // Bỏ qua các request đến file tĩnh (ví dụ: /favicon.ico, /style.css)
    if (shortCode.includes('.')) return next();

    // === Bước 1: Kiểm tra Redis cache trước ===
    let longUrl = await cacheService.get(shortCode);

    if (!longUrl) {
      // === Cache MISS: Tra MySQL ===
      const url = await urlService.getByShortCode(shortCode);

      if (!url) {
        // Không tìm thấy → hiển thị trang 404 tuỳ chỉnh
        return res.status(404).sendFile('404.html', { root: FRONTEND_DIR });
      }

      // Kiểm tra link đã hết hạn chưa
      if (url.expiresAt && new Date(url.expiresAt) < new Date()) {
        return res.status(410).json({ error: 'This link has expired' });
      }

      longUrl = url.longUrl;
      await cacheService.set(shortCode, longUrl);  // Warm up cache cho lần sau

      _recordAsync(url.id, req);  // Ghi analytics bất đồng bộ (không await)
    } else {
      // === Cache HIT: Vẫn ghi analytics async ===
      urlService.getByShortCode(shortCode).then(url => {
        if (url) _recordAsync(url.id, req);
      }).catch(() => {});
    }

    res.redirect(302, longUrl);  // Redirect ngay lập tức

  } catch (err) { next(err); }
};

// Ghi analytics — fire-and-forget, không await để không block redirect
function _recordAsync(urlId, req) {
  // Lấy IP thật từ X-Forwarded-For (set bởi Nginx) hoặc fallback req.ip
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip;
  const ua = req.headers['user-agent'] || null;
  const referer = req.headers['referer'] || null;

  analyticsService.recordClick(urlId, ip, ua, referer);  // ghi click_events
  prisma.url.update({ where: { id: urlId },
    data: { clicks: { increment: 1 } } }).catch(() => {}); // tăng counter
}
```

**Tại sao dùng HTTP 302 thay vì 301?**

| Mã | Ý nghĩa | Hệ quả |
|---|---|---|
| 301 Permanent | Browser cache vĩnh viễn | Không thể thu hồi link, analytics bị miss sau lần đầu |
| **302 Temporary** | Browser hỏi server mỗi lần | **Kiểm soát được analytics, có thể vô hiệu hoá link** |

**Tại sao ghi analytics bằng fire-and-forget?**
Người dùng không cần đợi click được ghi vào DB mới nhận redirect. Ghi DB mất 5–20ms — không đáng để người dùng chờ. Nếu ghi thất bại, chỉ mất 1 click trong thống kê, không ảnh hưởng trải nghiệm.

#### Hiệu năng Redis vs MySQL

| Trường hợp | Thời gian xử lý |
|---|---|
| Cache HIT (Redis) | < 2ms |
| Cache MISS (MySQL query) | 10–30ms |

---

### 5.5 Thu thập & tổng hợp Analytics

#### Ghi click event: `analyticsService.recordClick`

```javascript
async function recordClick(urlId, ip, userAgent, referer) {
  try {
    await prisma.clickEvent.create({
      data: {
        urlId,
        ipAddress: ip ? String(ip).substring(0, 45) : null,  // giới hạn 45 chars (IPv6 max)
        userAgent: userAgent || null,
        referer:   referer || null
        // clickedAt: tự động set bởi @default(now()) trong Prisma schema
      }
    });
  } catch (err) {
    console.error('Failed to record click:', err.message);
    // Không ném lỗi ra ngoài — analytics fail không được ảnh hưởng redirect
  }
}
```

#### Tổng hợp analytics: `analyticsService.getAnalytics`

```javascript
async function getAnalytics(urlId, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);  // Tính mốc 30 ngày trước

  // 1 query duy nhất lấy toàn bộ events trong 30 ngày
  // Chỉ select 3 cột cần thiết (không lấy ip, userAgent để tiết kiệm)
  const events = await prisma.clickEvent.findMany({
    where: { urlId, clickedAt: { gte: since } },
    select: { clickedAt: true, referer: true, country: true }
  });

  // === Bước 1: Xây dựng map ngày → số click ===
  // Khởi tạo trước cho tất cả 30 ngày (kể cả ngày không có click → count = 0)
  // Mục đích: biểu đồ line chart không bị lỗ hổng ở ngày không có click
  const byDayMap = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    byDayMap[d.toISOString().split('T')[0]] = 0;  // key: "2025-01-15"
  }
  events.forEach(e => {
    const key = e.clickedAt.toISOString().split('T')[0];
    if (byDayMap[key] !== undefined) byDayMap[key]++;
  });
  const clicksByDay = Object.entries(byDayMap)
    .map(([date, count]) => ({ date, count }));

  // === Bước 2: Tổng hợp top referers ===
  const refererMap = {};
  events.forEach(e => {
    const r = e.referer || 'Direct';                         // null referer = truy cập trực tiếp
    const label = r.length > 100 ? r.substring(0, 100) : r; // giới hạn độ dài label
    refererMap[label] = (refererMap[label] || 0) + 1;
  });
  const topReferers = Object.entries(refererMap)
    .map(([referer, count]) => ({ referer, count }))
    .sort((a, b) => b.count - a.count)  // sắp xếp giảm dần theo count
    .slice(0, 10);                       // chỉ lấy top 10

  // === Bước 3: Tổng hợp top countries (cùng pattern) ===
  const countryMap = {};
  events.forEach(e => {
    const c = e.country || 'Unknown';
    countryMap[c] = (countryMap[c] || 0) + 1;
  });
  const topCountries = Object.entries(countryMap)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { totalClicks: events.length, clicksByDay, topReferers, topCountries };
}
```

**Tại sao aggregation phía Application thay vì SQL GROUP BY?**
- Chỉ **1 query DB** thay vì 3 query riêng (by day, by referer, by country)
- Dữ liệu nhỏ (vài nghìn events/30 ngày/URL) — xử lý trong memory JavaScript rất nhanh
- Code dễ đọc, dễ thay đổi logic mà không cần viết SQL phức tạp

#### Analytics Controller: `src/controllers/analyticsController.js`

```javascript
exports.getAnalytics = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const urlRecord = await prisma.url.findUnique({ where: { id } });

    if (!urlRecord) return res.status(404).json({ error: 'URL not found' });

    // Ownership check:
    // - URL có userId → chỉ owner mới xem được analytics
    // - URL của guest (userId=null) → không check (ai cũng xem được nếu có id)
    if (urlRecord.userId && urlRecord.userId !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const analytics = await analyticsService.getAnalytics(id);
    res.json({ ...analytics, url: urlRecord });  // kèm thông tin URL để hiển thị header
  } catch (err) { next(err); }
};
```

---

### 5.6 Quản lý URL (Dashboard API)

#### Lấy danh sách URL của user

```javascript
// urlService.js
async function getUserUrls(userId) {
  return prisma.url.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }  // mới nhất hiển thị trước
  });
}
```

#### Xóa URL

```javascript
async function deleteUrl(id, userId) {
  const url = await prisma.url.findUnique({ where: { id } });

  if (!url) throw { status: 404, message: 'URL not found' };
  if (url.userId !== userId) throw { status: 403, message: 'Forbidden' };

  // Xóa khỏi Redis TRƯỚC khi xóa DB
  // Nếu còn trong cache sau khi xóa DB → cache trả URL đã xóa (cache poisoning)
  await cacheService.del(url.shortCode);

  // Xóa DB — Cascade tự động xóa toàn bộ click_events của URL này
  await prisma.url.delete({ where: { id } });
}
```

**Thứ tự xóa quan trọng:** Phải xóa cache TRƯỚC khi xóa DB. Nếu ngược lại, trong khoảng thời gian giữa 2 thao tác, cache đã trống nhưng DB chưa xóa → người dùng vẫn redirect được. Nếu xóa DB trước, cache vẫn còn → người dùng vẫn redirect đến URL đã "xóa". Cách đúng: xóa cache trước → đảm bảo không ai dùng được link sau khi action xóa bắt đầu.

#### Cập nhật URL (set/remove expiry)

```javascript
async function updateUrl(id, userId, data) {
  const url = await prisma.url.findUnique({ where: { id } });
  if (!url) throw { status: 404, message: 'URL not found' };
  if (url.userId !== userId) throw { status: 403, message: 'Forbidden' };

  const updateData = {};
  if (data.expiresAt !== undefined) {
    // null = xóa expiry (link không hết hạn), string = set expiry mới
    updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
  }

  return prisma.url.update({ where: { id }, data: updateData });
}
```

---

### 5.7 Middleware: Bảo vệ route & giới hạn tốc độ

#### Auth Middleware: `src/middleware/authMiddleware.js`

```javascript
function requireAuth(req, res, next) {
  // express-session đã load session từ Redis tự động
  // Chỉ cần check session.userId có tồn tại không
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
```

`requireAuth` được gắn vào: `GET /api/urls`, `DELETE /api/urls/:id`, `PATCH /api/urls/:id`, `GET /api/urls/:id/analytics`.

#### Rate Limiter: `src/middleware/rateLimiter.js`

```javascript
const rateLimit = require('express-rate-limit');

// Giới hạn tạo URL: 20 request / 15 phút / IP
const shortenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later' }
});

// Giới hạn auth: 10 request / 15 phút / IP (chặt hơn, chống brute-force mật khẩu)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts, please try again later' }
});
```

`express-rate-limit` theo dõi số request theo IP trong cửa sổ thời gian. Khi vượt ngưỡng → trả lỗi ngay mà không thực thi logic bên trong.

---

### 5.8 Xử lý lỗi tập trung

#### Error Handler: `src/middleware/errorHandler.js`

```javascript
module.exports = (err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
};
```

**Pattern nhất quán trong toàn bộ codebase:**

```javascript
// Service ném lỗi có status code
throw { status: 409, message: 'Email already registered' };
throw { status: 404, message: 'URL not found' };
throw { status: 403, message: 'Forbidden' };

// Controller bắt và chuyển tiếp sang errorHandler
} catch (err) { next(err); }
```

Error handler nhận object `{ status, message }` từ service → map đúng HTTP status. Lỗi không có `status` → mặc định 500 (server error). Lợi ích: không lặp lại code xử lý lỗi, mọi lỗi đều được format nhất quán.

---

### 5.9 Health Check

```javascript
app.get('/api/health', async (req, res) => {
  let dbStatus = 'ok', redisStatus = 'ok';

  try { await prisma.$queryRaw`SELECT 1`; } catch { dbStatus = 'error'; }
  try { await redis.ping(); }              catch { redisStatus = 'error'; }

  res.json({
    status: 'ok',
    db: dbStatus,
    redis: redisStatus,
    uptime: Math.floor(process.uptime()),   // số giây server đã chạy
    timestamp: new Date().toISOString()
  });
});
```

`SELECT 1` là query nhẹ nhất có thể — chỉ kiểm tra kết nối còn sống không, không đọc data thật. Endpoint này hữu ích cho monitoring và để nhanh chóng chẩn đoán khi có vấn đề.

---

## 6. Frontend — Các phần quan trọng

Frontend là static files (HTML/CSS/JS thuần) được Express serve trực tiếp, không cần build step hay framework JS nặng. Các file được tổ chức theo chức năng.

### 6.1 Giao tiếp API: `frontend/js/api.js`

File trung tâm định nghĩa cách gọi backend. Tất cả request đều đi qua hàm `apiCall`:

```javascript
async function apiCall(endpoint, options) {
  var config = Object.assign({
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'   // BẮT BUỘC: gửi session cookie kèm AJAX request
  }, options || {});

  var res = await fetch(API_BASE + endpoint, config);
  var data = await res.json();

  if (!res.ok) {
    var err = new Error(data.error || 'Error ' + res.status);
    err.status = res.status;
    throw err;  // Ném lỗi để caller xử lý (hiển thị thông báo)
  }
  return data;
}

// Expose toàn cục — không dùng module bundler nên dùng window.*
window.AuthApi   = { register, login, logout, me };
window.ShortenApi = { shorten };
```

`credentials: 'include'` là điểm then chốt — không có dòng này, browser không gửi cookie theo AJAX request và mọi API call sẽ trả 401.

### 6.2 Đồng bộ trạng thái đăng nhập: `auth.js`

Mỗi trang HTML đều load `auth.js`. Script này gọi `GET /api/auth/me` để biết trạng thái đăng nhập:
- **200**: Render navbar với tên user + nút Logout + link Dashboard
- **401**: Render navbar với nút Sign-in + Register

Nếu đang ở trang `signin.html` hoặc `register.html` mà session vẫn hợp lệ → tự động redirect về `index.html` (không cho vào trang login nếu đã đăng nhập).

### 6.3 Form rút ngắn URL: `shorten.js`

Validate URL phía client trước (tránh request thừa), gọi `ShortenApi.shorten()`, hiển thị kết quả. URL hiển thị được tính từ `window.location.origin + '/' + result.shortCode` thay vì lấy từ server — đảm bảo hiển thị đúng domain người dùng đang thấy.

### 6.4 Dashboard: `dashboard.js`

Gọi `GET /api/urls`, render bảng HTML với innerHTML. Mỗi hàng có 3 nút:
- **Copy**: Dùng `navigator.clipboard.writeText()` với fallback `execCommand('copy')`
- **Stats**: Link đến `analytics.html?id=<url.id>`
- **Xóa**: Gọi `DELETE /api/urls/:id`, reload bảng

### 6.5 Analytics: `analytics.js`

Gọi `GET /api/urls/:id/analytics`, nhận JSON, render 3 biểu đồ Chart.js:
- **Line chart**: Lượt click 30 ngày — hiển thị trend theo thời gian
- **Doughnut chart**: Top 10 referer — phân bố nguồn truy cập
- **Bar chart**: Top 10 quốc gia — phân bố địa lý

Tất cả chart theo dark theme (`color: '#ccc'`, grid `rgba(255,255,255,0.05)`).

---

## 7. Luồng xử lý End-to-End

### Luồng 1: Người dùng rút ngắn URL

```
[Browser] POST /api/shorten { longUrl, customAlias?, expiresAt? }
          │
          ├─ Middleware: shortenLimiter (rate limit OK?)
          ├─ urlController.shorten: lấy userId từ session (hoặc null nếu guest)
          │
          └─ urlService.shortenUrl(longUrl, userId, alias, expiry)
               ├─ isValidUrl() → hợp lệ
               ├─ [Nếu alias] check trùng → INSERT trực tiếp
               ├─ [Nếu auto] INSERT shortCode='temp' → nhận ID=42
               │            → base62.encode(42) = "G"
               │            → UPDATE SET short_code='G'
               ├─ Redis SETEX url:G "https://..."
               └─ return { shortCode:"G", shortUrl:"http://localhost:3000/G" }
          │
          [Browser] Hiển thị shortUrl, user copy & chia sẻ
```

### Luồng 2: Redirect khi click vào link ngắn

```
[Browser] GET /G
          │
          └─ redirectController.redirect
               ├─ Redis GET url:G
               │   ├─ HIT → longUrl tìm thấy
               │   │   ├─ fire-and-forget: ghi click_events + increment clicks
               │   │   └─ res.redirect(302, longUrl)  ← ~1ms
               │   │
               │   └─ MISS → MySQL findUnique({ shortCode:'G' })
               │       ├─ Không tìm → 404 sendFile('404.html')
               │       ├─ Hết hạn → 410 Gone
               │       ├─ Redis SETEX url:G longUrl   (warm cache)
               │       ├─ fire-and-forget: ghi analytics
               │       └─ res.redirect(302, longUrl)  ← ~15ms
          │
          [Browser] Tự động chuyển đến URL gốc
```

### Luồng 3: Xem thống kê click

```
[Browser] GET /api/urls/42/analytics (kèm session cookie)
          │
          ├─ Middleware: requireAuth → session.userId tồn tại → pass
          │
          └─ analyticsController.getAnalytics
               ├─ MySQL findUnique({ id:42 }) → lấy urlRecord
               ├─ urlRecord.userId === session.userId → pass ownership
               │
               └─ analyticsService.getAnalytics(42)
                    ├─ 1 query: SELECT clickedAt,referer,country
                    │          WHERE urlId=42 AND clickedAt >= (now-30d)
                    ├─ JS: group by day → clicksByDay[30]
                    ├─ JS: group by referer → topReferers[10]
                    └─ JS: group by country → topCountries[10]
          │
          [Browser] analytics.js render 3 Chart.js charts
```

---

## 8. Kiểm thử (Testing)

### 8.1 Unit Tests (Jest) — `tests/unit/`

**`base62.test.js`** — Kiểm tra tính đúng đắn của thuật toán:
- `encode(1)` = `'1'`, `encode(62)` = `'A0'`
- Roundtrip: `decode(encode(n)) === n` với nhiều giá trị n khác nhau

**`validator.test.js`** — Kiểm tra các hàm validation:
- URL hợp lệ (http/https) vs không hợp lệ (ftp, javascript:, chuỗi bình thường)
- Alias hợp lệ vs không hợp lệ (có space, ký tự đặc biệt, quá ngắn/dài)

### 8.2 Integration Tests (Supertest) — `tests/integration/`

Test toàn bộ luồng HTTP với server thực (không mock):

**`auth.test.js`:**
```
POST /api/auth/register → 201 (tạo tài khoản)
POST /api/auth/register → 409 (email đã dùng)
POST /api/auth/login    → 200 (có cookie trong response)
GET  /api/auth/me       → 200 { user }
POST /api/auth/logout   → 200
GET  /api/auth/me       → 401 (session đã bị xóa)
```

**`shorten.test.js`:**
```
POST /api/shorten { longUrl }             → 201 { shortCode, shortUrl }
GET  /:shortCode                          → 302 Location: longUrl
POST /api/shorten { customAlias }         → 201
POST /api/shorten { customAlias đã dùng } → 409
POST /api/shorten { longUrl sai format }  → 400
```

### 8.3 Load Tests (k6) — `tests/load/`

| File | Kịch bản | Mục tiêu |
|---|---|---|
| `k6_redirect.js` | 100 virtual users redirect liên tục | Đo cache hit rate, latency p95 |
| `k6_shorten.js` | 50 VU tạo URL liên tục | Đo throughput, rate limit behavior |
| `k6_mixed.js` | 80% redirect + 20% shorten | Hiệu năng tổng thể thực tế |

---

## 9. Triển khai với Docker

### Cấu trúc `docker-compose.yml`

```yaml
services:
  nginx:    # Reverse proxy, port 80 public
  app:      # Node.js, expose nội bộ port 3000
  mysql:    # MySQL 8.0, chỉ nội bộ
  redis:    # Redis 7, chỉ nội bộ
```

**Healthcheck MySQL — đảm bảo app không start trước khi DB sẵn sàng:**

```yaml
mysql:
  healthcheck:
    test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
    interval: 10s
    retries: 10
    start_period: 30s  # MySQL cần ~30s để khởi động lần đầu

app:
  depends_on:
    mysql:
      condition: service_healthy  # Chờ MySQL healthy rồi mới start app
```

Không có healthcheck, app start ngay nhưng MySQL chưa sẵn sàng → Prisma kết nối thất bại → app crash.

**Bảo mật trong production:**
- MySQL và Redis **không expose ra ngoài** (không có `ports:`, chỉ `expose:` nội bộ Docker)
- Nginx là điểm vào duy nhất từ internet
- Tất cả credential (`SESSION_SECRET`, `DB_PASSWORD`) inject qua biến môi trường

**Persistent volumes:**
- `mysql_data`: Data MySQL tồn tại qua `docker compose restart`
- `redis_data`: Redis RDB snapshot mỗi 60 giây (lệnh `--save 60 1`)

---

## 10. Tổng kết

### Các vấn đề kỹ thuật đã giải quyết

| Vấn đề | Giải pháp được chọn | Lý do |
|---|---|---|
| Tạo shortCode không trùng lặp | Base62(auto-increment ID) | Zero collision by design, không cần retry loop |
| Redirect nhanh | Redis cache-first | < 2ms cache hit vs 15ms DB query |
| Session stateful không in-process | Redis session store tuỳ chỉnh | Chia sẻ session giữa nhiều process/instance |
| Analytics không làm chậm redirect | Fire-and-forget async | Người dùng không chờ ghi DB |
| Chống spam và brute-force | express-rate-limit theo IP | 10/20 req per 15min |
| Bảo vệ dữ liệu người dùng | Ownership check + bcrypt | Mỗi mutation đều kiểm tra userId |
| Ngăn XSS | escapeHtml() trước innerHTML | Mọi dữ liệu từ server qua hàm escape |
| SQL injection | Prisma parameterized queries | Không nối string user input vào SQL |
| Môi trường reproducible | Docker Compose + healthcheck | Chạy được trên mọi máy có Docker |

### Kiến trúc phân tầng

```
Routes      → Khai báo endpoint, gắn middleware, gọi controller
Controllers → Xử lý HTTP: parse request, gọi service, trả response
Services    → Business logic: validate nâng cao, DB queries, cache
Middleware  → Cross-cutting: auth guard, rate limit, error handler
Utils       → Pure functions không có side-effect: encode, validate
Config      → Singleton clients: Redis connection, session config
```

Mỗi tầng có trách nhiệm rõ ràng, có thể test độc lập, và dễ bảo trì khi codebase phát triển.

### Điểm nổi bật kỹ thuật

1. **Redis dual-purpose**: Vừa làm session store vừa làm URL cache — 2 namespace riêng (`sess:`, `url:`)
2. **Custom RedisStore**: Tự implement không cần package bổ sung, hiểu rõ cơ chế hoạt động
3. **Base62 over ID**: Thiết kế zero-collision, 56 tỷ URL với shortCode 6 ký tự
4. **Fire-and-forget analytics**: Tách biệt critical path (redirect) với non-critical path (logging)
5. **Composite DB index**: `[urlId, clickedAt]` tối ưu hoá analytics query
6. **Middleware order**: Thứ tự khai báo Express middleware quyết định toàn bộ luồng xử lý request
