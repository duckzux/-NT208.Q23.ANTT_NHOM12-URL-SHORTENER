@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║  URL Shortener — Migrate PHP → Node.js              ║
echo ║  Script tu dong xoa cau truc PHP, tao cau truc moi  ║
echo ╚══════════════════════════════════════════════════════╝
echo.

:: ===== KIEM TRA THU MUC HIEN TAI =====
if not exist "frontend" (
    echo [ERROR] Khong tim thay thu muc frontend/
    echo Hay chay script nay tai thu muc goc du an!
    echo VD: cd H:\[TL]KI4\T5_LTW\DOAN
    pause
    exit /b 1
)

echo [INFO] Thu muc hien tai: %cd%
echo.

:: ===== XAC NHAN =====
echo *** CANH BAO: Script se XOA cac file/folder PHP cu: ***
echo.
echo   XOA folders:  backend\
echo   XOA files:    Dockerfile.bak, apache.conf, schema.sql
echo   GIU NGUYEN:   frontend\, docs\, README.md, docker-compose.yml, Dockerfile
echo   TAO MOI:      backend\ (Node.js structure), tests\, prisma\, configs...
echo.
set /p confirm="Ban co chac chan muon tiep tuc? (y/n): "
if /i not "%confirm%"=="y" (
    echo [CANCEL] Da huy. Khong co thay doi nao.
    pause
    exit /b 0
)

echo.
echo ========================================
echo  BUOC 1: Xoa cau truc PHP cu
echo ========================================

:: Xoa folder backend cu (PHP)
if exist "backend" (
    echo [DEL] Xoa backend\ ...
    rmdir /s /q "backend"
    echo       OK
)

:: Xoa file PHP-specific
if exist "Dockerfile.bak" (
    echo [DEL] Xoa Dockerfile.bak
    del /q "Dockerfile.bak"
)
if exist "apache.conf" (
    echo [DEL] Xoa apache.conf
    del /q "apache.conf"
)
if exist "schema.sql" (
    echo [DEL] Xoa schema.sql
    del /q "schema.sql"
)
if exist "seed.sql" (
    echo [DEL] Xoa seed.sql
    del /q "seed.sql"
)
if exist ".htaccess" (
    echo [DEL] Xoa .htaccess
    del /q ".htaccess"
)

echo.
echo ========================================
echo  BUOC 2: Tao cau truc Node.js backend
echo ========================================

:: backend/src/controllers/
echo [NEW] backend\src\controllers\
mkdir "backend\src\controllers"

:: backend/src/routes/
echo [NEW] backend\src\routes\
mkdir "backend\src\routes"

:: backend/src/middleware/
echo [NEW] backend\src\middleware\
mkdir "backend\src\middleware"

:: backend/src/services/
echo [NEW] backend\src\services\
mkdir "backend\src\services"

:: backend/src/utils/
echo [NEW] backend\src\utils\
mkdir "backend\src\utils"

:: backend/src/config/
echo [NEW] backend\src\config\
mkdir "backend\src\config"

:: backend/prisma/migrations/
echo [NEW] backend\prisma\migrations\
mkdir "backend\prisma\migrations"

:: logs/
echo [NEW] backend\logs\
mkdir "backend\logs"

echo.
echo ========================================
echo  BUOC 3: Tao file backend (Node.js)
echo ========================================

:: ----- Entry points -----
echo [FILE] backend\src\app.js
(
echo // Express app setup
echo const express = require^('express'^);
echo const cors = require^('cors'^);
echo const cookieParser = require^('cookie-parser'^);
echo const session = require^('express-session'^);
echo const path = require^('path'^);
echo.
echo const app = express^(^);
echo.
echo // Middleware
echo app.use^(cors^({ origin: process.env.APP_URL, credentials: true }^)^);
echo app.use^(express.json^(^)^);
echo app.use^(cookieParser^(^)^);
echo app.use^(session^({
echo   secret: process.env.SESSION_SECRET ^|^| 'dev-secret',
echo   resave: false,
echo   saveUninitialized: false,
echo   cookie: { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true }
echo }^)^);
echo.
echo // Serve frontend
echo app.use^(express.static^(path.join^(__dirname, '../../frontend'^)^)^);
echo.
echo // Routes
echo app.use^('/api/auth', require^('./routes/authRoutes'^)^);
echo app.use^('/api', require^('./routes/urlRoutes'^)^);
echo app.use^('/api', require^('./routes/analyticsRoutes'^)^);
echo app.use^('/', require^('./routes/redirectRoutes'^)^); // MUST be LAST
echo.
echo // Error handler
echo app.use^(require^('./middleware/errorHandler'^)^);
echo.
echo module.exports = app;
) > "backend\src\app.js"

echo [FILE] backend\src\server.js
(
echo require^('dotenv'^).config^(^);
echo const app = require^('./app'^);
echo const PORT = process.env.PORT ^|^| 3000;
echo app.listen^(PORT, ^(^) =^> console.log^(`Server running on port ${PORT}`^)^);
) > "backend\src\server.js"

:: ----- Controllers -----
echo [FILE] backend\src\controllers\authController.js
echo // TODO: register, login, logout, me > "backend\src\controllers\authController.js"

echo [FILE] backend\src\controllers\urlController.js
echo // TODO: shorten, getUrls, deleteUrl, updateUrl > "backend\src\controllers\urlController.js"

echo [FILE] backend\src\controllers\redirectController.js
echo // TODO: redirect - Redis cache first, fallback MySQL, record click async > "backend\src\controllers\redirectController.js"

echo [FILE] backend\src\controllers\analyticsController.js
echo // TODO: getAnalytics - clicksByDay, topReferers, topCountries > "backend\src\controllers\analyticsController.js"

:: ----- Routes -----
echo [FILE] backend\src\routes\authRoutes.js
(
echo const router = require^('express'^).Router^(^);
echo const auth = require^('../controllers/authController'^);
echo // router.post^('/register', auth.register^);
echo // router.post^('/login', auth.login^);
echo // router.post^('/logout', auth.logout^);
echo // router.get^('/me', auth.me^);
echo module.exports = router;
) > "backend\src\routes\authRoutes.js"

echo [FILE] backend\src\routes\urlRoutes.js
(
echo const router = require^('express'^).Router^(^);
echo const url = require^('../controllers/urlController'^);
echo // router.post^('/shorten', url.shorten^);
echo // router.get^('/urls', url.getUrls^);
echo // router.delete^('/urls/:id', url.deleteUrl^);
echo // router.patch^('/urls/:id', url.updateUrl^);
echo module.exports = router;
) > "backend\src\routes\urlRoutes.js"

echo [FILE] backend\src\routes\analyticsRoutes.js
(
echo const router = require^('express'^).Router^(^);
echo const analytics = require^('../controllers/analyticsController'^);
echo // router.get^('/urls/:id/analytics', analytics.getAnalytics^);
echo module.exports = router;
) > "backend\src\routes\analyticsRoutes.js"

echo [FILE] backend\src\routes\redirectRoutes.js
(
echo const router = require^('express'^).Router^(^);
echo const redirect = require^('../controllers/redirectController'^);
echo // router.get^('/:shortCode', redirect.redirect^);
echo module.exports = router;
) > "backend\src\routes\redirectRoutes.js"

:: ----- Middleware -----
echo [FILE] backend\src\middleware\authMiddleware.js
echo // TODO: requireAuth, optionalAuth > "backend\src\middleware\authMiddleware.js"

echo [FILE] backend\src\middleware\rateLimiter.js
echo // TODO: express-rate-limit config > "backend\src\middleware\rateLimiter.js"

echo [FILE] backend\src\middleware\errorHandler.js
(
echo module.exports = ^(err, req, res, next^) =^> {
echo   console.error^(err^);
echo   const status = err.status ^|^| 500;
echo   res.status^(status^).json^({ error: err.message ^|^| 'Internal Server Error' }^);
echo };
) > "backend\src\middleware\errorHandler.js"

:: ----- Services -----
echo [FILE] backend\src\services\urlService.js
echo // TODO: shortenUrl, getByShortCode, getUserUrls, deleteUrl > "backend\src\services\urlService.js"

echo [FILE] backend\src\services\authService.js
echo // TODO: register, login (bcrypt hash/compare) > "backend\src\services\authService.js"

echo [FILE] backend\src\services\cacheService.js
(
echo const redis = require^('../config/redis'^);
echo module.exports = {
echo   async get^(key^) { try { return await redis.get^(`url:${key}`^); } catch { return null; } },
echo   async set^(key, val, ttl = 86400^) { try { await redis.setex^(`url:${key}`, ttl, val^); } catch {} },
echo   async del^(key^) { try { await redis.del^(`url:${key}`^); } catch {} },
echo };
) > "backend\src\services\cacheService.js"

echo [FILE] backend\src\services\analyticsService.js
echo // TODO: recordClick, getClicksByDay, getTopReferers, getTopCountries > "backend\src\services\analyticsService.js"

:: ----- Utils -----
echo [FILE] backend\src\utils\base62.js
(
echo const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
echo function encode^(num^) {
echo   let result = '';
echo   while ^(num ^> 0^) { result = CHARSET[num %% 62] + result; num = Math.floor^(num / 62^); }
echo   return result.padStart^(6, '0'^);
echo }
echo function decode^(str^) {
echo   let num = 0;
echo   for ^(let i = 0; i ^< str.length; i++^) { num = num * 62 + CHARSET.indexOf^(str[i]^); }
echo   return num;
echo }
echo module.exports = { encode, decode };
) > "backend\src\utils\base62.js"

echo [FILE] backend\src\utils\validator.js
echo // TODO: isValidUrl, isValidAlias, isValidEmail > "backend\src\utils\validator.js"

echo [FILE] backend\src\utils\logger.js
echo // TODO: info, error, warn with timestamp > "backend\src\utils\logger.js"

:: ----- Config -----
echo [FILE] backend\src\config\redis.js
(
echo const Redis = require^('ioredis'^);
echo const redis = new Redis^({ host: process.env.REDIS_HOST ^|^| 'localhost', port: 6379 }^);
echo redis.on^('error', ^(err^) =^> console.error^('Redis error:', err.message^)^);
echo module.exports = redis;
) > "backend\src\config\redis.js"

echo [FILE] backend\src\config\session.js
echo // TODO: express-session config > "backend\src\config\session.js"

:: ----- Prisma -----
echo [FILE] backend\prisma\schema.prisma
(
echo datasource db {
echo   provider = "mysql"
echo   url      = env^("DATABASE_URL"^)
echo }
echo.
echo generator client {
echo   provider = "prisma-client-js"
echo }
echo.
echo model User {
echo   id        Int      @id @default^(autoincrement^(^)^)
echo   email     String   @unique
echo   password  String
echo   createdAt DateTime @default^(now^(^)^) @map^("created_at"^)
echo   urls      Url[]
echo   @@map^("users"^)
echo }
echo.
echo model Url {
echo   id        Int          @id @default^(autoincrement^(^)^)
echo   shortCode String       @unique @map^("short_code"^)
echo   longUrl   String       @map^("long_url"^) @db.Text
echo   userId    Int?         @map^("user_id"^)
echo   clicks    Int          @default^(0^)
echo   expiresAt DateTime?    @map^("expires_at"^)
echo   createdAt DateTime     @default^(now^(^)^) @map^("created_at"^)
echo   user      User?        @relation^(fields: [userId], references: [id], onDelete: SetNull^)
echo   events    ClickEvent[]
echo   @@index^([userId]^)
echo   @@map^("urls"^)
echo }
echo.
echo model ClickEvent {
echo   id        Int      @id @default^(autoincrement^(^)^)
echo   urlId     Int      @map^("url_id"^)
echo   ipAddress String?  @map^("ip_address"^) @db.VarChar^(45^)
echo   userAgent String?  @map^("user_agent"^) @db.Text
echo   referer   String?  @db.Text
echo   country   String?  @db.VarChar^(50^)
echo   clickedAt DateTime @default^(now^(^)^) @map^("clicked_at"^)
echo   url       Url      @relation^(fields: [urlId], references: [id], onDelete: Cascade^)
echo   @@index^([urlId]^)
echo   @@index^([clickedAt]^)
echo   @@index^([urlId, clickedAt]^)
echo   @@map^("click_events"^)
echo }
) > "backend\prisma\schema.prisma"

echo [FILE] backend\prisma\seed.js
echo // TODO: Prisma seed - insert sample users, urls, click_events > "backend\prisma\seed.js"

:: ----- Package.json -----
echo [FILE] backend\package.json
(
echo {
echo   "name": "url-shortener-backend",
echo   "version": "1.0.0",
echo   "description": "URL Shortener - Node.js + Express + Prisma",
echo   "main": "src/server.js",
echo   "scripts": {
echo     "dev": "nodemon src/server.js",
echo     "start": "node src/server.js",
echo     "test": "jest --runInBand --forceExit",
echo     "migrate": "npx prisma migrate dev",
echo     "seed": "npx prisma db seed",
echo     "studio": "npx prisma studio"
echo   },
echo   "prisma": {
echo     "seed": "node prisma/seed.js"
echo   },
echo   "dependencies": {
echo     "@prisma/client": "^5.0.0",
echo     "bcryptjs": "^2.4.3",
echo     "cookie-parser": "^1.4.6",
echo     "cors": "^2.8.5",
echo     "dotenv": "^16.3.0",
echo     "express": "^4.18.2",
echo     "express-rate-limit": "^7.1.0",
echo     "express-session": "^1.17.3",
echo     "ioredis": "^5.3.0"
echo   },
echo   "devDependencies": {
echo     "jest": "^29.7.0",
echo     "nodemon": "^3.0.0",
echo     "prisma": "^5.0.0",
echo     "supertest": "^6.3.0"
echo   }
echo }
) > "backend\package.json"

:: ----- .env.example -----
echo [FILE] backend\.env.example
(
echo DATABASE_URL=mysql://root:your_password@localhost:3306/url_shortener
echo REDIS_HOST=redis
echo SESSION_SECRET=your_super_secret_key_change_this
echo PORT=3000
echo APP_URL=http://localhost:3000
echo NODE_ENV=development
) > "backend\.env.example"

:: ----- nodemon.json -----
echo [FILE] backend\nodemon.json
(
echo { "watch": ["src/"], "ext": "js,json", "ignore": ["node_modules/"] }
) > "backend\nodemon.json"

:: ----- jest.config.js -----
echo [FILE] backend\jest.config.js
(
echo module.exports = { testEnvironment: 'node', testMatch: ['**/tests/**/*.test.js'] };
) > "backend\jest.config.js"

:: ----- .gitignore for backend -----
echo [FILE] backend\.gitignore
(
echo node_modules/
echo .env
echo logs/*.log
echo coverage/
) > "backend\.gitignore"

:: ----- logs placeholder -----
echo. > "backend\logs\.gitkeep"

echo.
echo ========================================
echo  BUOC 4: Tao cau truc tests
echo ========================================

:: Tests
if not exist "tests\unit" mkdir "tests\unit"
if not exist "tests\integration" mkdir "tests\integration"
if not exist "tests\load" mkdir "tests\load"

echo [FILE] tests\unit\base62.test.js
(
echo const { encode, decode } = require^('../../backend/src/utils/base62'^);
echo test^('encode 1 = 000001', ^(^) =^> { expect^(encode^(1^)^).toBe^('000001'^); }^);
echo test^('roundtrip', ^(^) =^> { expect^(decode^(encode^(12345^)^)^).toBe^(12345^); }^);
) > "tests\unit\base62.test.js"

echo [FILE] tests\unit\validator.test.js
echo // TODO: test isValidUrl, isValidAlias > "tests\unit\validator.test.js"

echo [FILE] tests\integration\auth.test.js
echo // TODO: Supertest - register, login, logout, me > "tests\integration\auth.test.js"

echo [FILE] tests\integration\shorten.test.js
echo // TODO: Supertest - shorten, redirect, analytics > "tests\integration\shorten.test.js"

echo [FILE] tests\integration\setup.js
echo // TODO: Test DB setup, cleanup > "tests\integration\setup.js"

echo [FILE] tests\load\k6_redirect.js
(
echo import http from 'k6/http';
echo import { check, sleep } from 'k6';
echo export const options = { stages: [
echo   { duration: '30s', target: 50 },
echo   { duration: '60s', target: 100 },
echo   { duration: '30s', target: 0 },
echo ] };
echo export default function ^(^) {
echo   const res = http.get^('http://localhost:3000/000001', { redirects: 0 }^);
echo   check^(res, { 'is 302': r =^> r.status === 302 }^);
echo   sleep^(1^);
echo }
) > "tests\load\k6_redirect.js"

echo [FILE] tests\load\k6_shorten.js
echo // TODO: POST /api/shorten with random URLs > "tests\load\k6_shorten.js"

echo [FILE] tests\load\k6_mixed.js
echo // TODO: 80%% redirect + 15%% shorten + 5%% analytics > "tests\load\k6_mixed.js"

echo.
echo ========================================
echo  BUOC 5: Cap nhat root files
echo ========================================

:: ----- Dockerfile (overwrite) -----
echo [FILE] Dockerfile (Node.js)
(
echo FROM node:18-alpine
echo WORKDIR /app
echo COPY backend/package*.json ./
echo RUN npm ci --production
echo COPY backend/ .
echo RUN npx prisma generate
echo COPY frontend/ /app/frontend/
echo EXPOSE 3000
echo CMD ["node", "src/server.js"]
) > "Dockerfile"

:: ----- docker-compose.yml (overwrite) -----
echo [FILE] docker-compose.yml (Node.js)
(
echo version: '3.8'
echo services:
echo   app:
echo     build: .
echo     ports:
echo       - "3000:3000"
echo     depends_on:
echo       - mysql
echo       - redis
echo     environment:
echo       DATABASE_URL: mysql://root:rootpass@mysql:3306/url_shortener
echo       REDIS_HOST: redis
echo       SESSION_SECRET: change-this-secret-key
echo       APP_URL: http://localhost:3000
echo       NODE_ENV: development
echo     volumes:
echo       - ./backend/src:/app/src
echo       - ./frontend:/app/frontend
echo.
echo   mysql:
echo     image: mysql:8.0
echo     environment:
echo       MYSQL_ROOT_PASSWORD: rootpass
echo       MYSQL_DATABASE: url_shortener
echo     volumes:
echo       - mysql_data:/var/lib/mysql
echo     ports:
echo       - "3306:3306"
echo.
echo   redis:
echo     image: redis:7-alpine
echo     ports:
echo       - "6379:6379"
echo.
echo volumes:
echo   mysql_data:
) > "docker-compose.yml"

:: ----- .dockerignore -----
echo [FILE] .dockerignore
(
echo node_modules
echo .env
echo .git
echo tests
echo docs
echo *.md
echo .dockerignore
) > ".dockerignore"

:: ----- Root .gitignore (update) -----
echo [FILE] .gitignore (updated)
(
echo node_modules/
echo .env
echo dist/
echo logs/*.log
echo coverage/
echo .DS_Store
echo *.bak
echo .idea/
echo .vscode/
) > ".gitignore"

:: ----- Root .env.example -----
echo [FILE] .env.example
(
echo DATABASE_URL=mysql://root:your_password@localhost:3306/url_shortener
echo REDIS_HOST=redis
echo SESSION_SECRET=your_super_secret_key
echo PORT=3000
echo APP_URL=http://localhost:3000
echo NODE_ENV=development
) > ".env.example"

:: ----- CHANGELOG.md -----
if not exist "CHANGELOG.md" (
    echo [FILE] CHANGELOG.md
    (
    echo # Changelog
    echo.
    echo ## Week 1 - Setup
    echo - Migrated from PHP to Node.js + Express
    echo - Setup Prisma ORM with MySQL
    echo - Created project structure
    ) > "CHANGELOG.md"
)

:: ----- Docs -----
if not exist "docs\wireframes" mkdir "docs\wireframes"
if not exist "docs\performance" mkdir "docs\performance"

echo.
echo ========================================
echo  BUOC 6: Cap nhat frontend api.js
echo ========================================

:: Update API_BASE in frontend/js/api.js
if exist "frontend\js\api.js" (
    echo [UPDATE] frontend\js\api.js - doi API_BASE sang /api
    powershell -Command "(Get-Content 'frontend\js\api.js') -replace '/backend/api', '/api' | Set-Content 'frontend\js\api.js'"
    echo          OK
) else (
    echo [FILE] frontend\js\api.js (new)
    (
    echo // API wrapper - Node.js version
    echo var API_BASE = '/api';
    echo.
    echo async function apiCall^(endpoint, options^) {
    echo   var config = Object.assign^({
    echo     headers: { 'Content-Type': 'application/json' },
    echo     credentials: 'include'
    echo   }, options ^|^| {}^);
    echo   var res = await fetch^(API_BASE + endpoint, config^);
    echo   var data = await res.json^(^);
    echo   if ^(!res.ok^) throw new Error^(data.error ^|^| 'Error ' + res.status^);
    echo   return data;
    echo }
    ) > "frontend\js\api.js"
)

echo.
echo ========================================
echo  KET QUA
echo ========================================
echo.
echo [OK] Da xoa cau truc PHP cu
echo [OK] Da tao cau truc Node.js moi
echo.
echo  Cau truc moi:
echo  backend\
echo    src\controllers\  (4 files)
echo    src\routes\       (4 files)
echo    src\middleware\    (3 files)
echo    src\services\     (4 files)
echo    src\utils\        (3 files)
echo    src\config\       (2 files)
echo    src\app.js        (entry point)
echo    src\server.js     (HTTP server)
echo    prisma\schema.prisma
echo    package.json
echo  tests\
echo    unit\         (2 files)
echo    integration\  (3 files)
echo    load\         (3 files)
echo.
echo ========================================
echo  BUOC TIEP THEO
echo ========================================
echo.
echo  1. cd backend
echo  2. npm install
echo  3. npx prisma generate
echo  4. cd ..
echo  5. docker-compose up -d mysql redis
echo  6. cd backend ^&^& npx prisma migrate dev --name init
echo  7. npm run dev
echo  8. Mo browser: http://localhost:3000
echo.
echo  Hoac chay bang Docker:
echo  docker-compose up --build
echo.

pause
