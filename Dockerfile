# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript code
RUN npm run build

# Production stage
FROM node:18-alpine

# Install production dependencies only
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY .env.example ./.env

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Environment variables with defaults
ENV NODE_ENV=production \
    PORT=4000 \
    DB_USER=postgres \
    DB_HOST=localhost \
    DB_PORT=5432 \
    DB_NAME=mcp_logs \
    DB_SSL=false \
    DB_SSL_REJECT_UNAUTHORIZED=true \
    DB_MAX_POOL_SIZE=20 \
    DB_IDLE_TIMEOUT=10000 \
    DB_CONNECTION_TIMEOUT=0 \
    DB_APPLICATION_NAME=mcp_logger \
    DB_SCHEMA=public \
    LOG_LEVEL=info \
    ENABLE_METRICS=false

# Expose port
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Start the application
CMD ["node", "dist/server.js"]