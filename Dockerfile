# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Set environment variables
ENV NODE_ENV=production \
    PORT=4000 \
    DB_USER=postgres \
    DB_PASSWORD=postgres \
    DB_HOST=postgres \
    DB_PORT=5432 \
    DB_NAME=llm_audit \
    DB_SSL=false \
    DB_SSL_REJECT_UNAUTHORIZED=true \
    DB_MAX_POOL_SIZE=20 \
    DB_IDLE_TIMEOUT=10000 \
    DB_CONNECTION_TIMEOUT=0 \
    DB_APPLICATION_NAME=llm_auditor \
    DB_SCHEMA=public

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Start the server
CMD ["node", "dist/server.js"]