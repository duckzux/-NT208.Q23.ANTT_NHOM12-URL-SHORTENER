FROM node:18-alpine
RUN apk add --no-cache openssl libc6-compat

# Set WORKDIR to /app/backend so that relative paths in the source
# (e.g. ../../frontend) resolve correctly inside the container.
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
RUN npx prisma generate

COPY frontend/ /app/frontend/

EXPOSE 3000

# prisma db push is idempotent — safe for first run and restarts alike
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node src/server.js"]
