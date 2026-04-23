FROM node:18-alpine
WORKDIR /app

COPY backend/package*.json ./
RUN npm ci

COPY backend/ .
RUN npx prisma generate

COPY frontend/ /app/frontend/

EXPOSE 3000

# Run DB migrations then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
