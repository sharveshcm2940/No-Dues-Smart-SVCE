# ==============================================================================
# SVCE Smart No-Dues ERP - Hardened Backend Dockerfile (Node.js Alpine)
# ==============================================================================

# Stage 1: Dependency Installation & Compilation
FROM node:20-alpine AS dependencies
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: Production Minimal Runtime
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache wget

# Create non-root directories and permissions
RUN mkdir -p /app/uploads /app/logs /app/backups && chown -R node:node /app

# Copy production dependencies from Stage 1
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./

# Copy application source code
COPY --chown=node:node . .

# Set non-root user for principle of least privilege
USER node

# Expose backend port
EXPOSE 5000

# Default environment configuration (override via env / compose)
ENV PORT=5000
ENV NODE_ENV=production

# Container Healthcheck via liveness probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

# Start Express API Server
CMD ["node", "src/server.js"]
