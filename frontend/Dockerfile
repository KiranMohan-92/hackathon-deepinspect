# =============================================================================
# DeepInspect Frontend - Multi-stage Production Dockerfile
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies - Install npm packages
# -----------------------------------------------------------------------------
FROM node:22-alpine@sha256:1c7a7868e45b9e7b9c0b5e1e2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1 AS deps

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --prefer-offline --no-audit

# -----------------------------------------------------------------------------
# Stage 2: Build - Create production bundle
# -----------------------------------------------------------------------------
FROM node:22-alpine@sha256:1c7a7868e45b9e7b9c0b5e1e2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1 AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment variables at build time
ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_MAPS_API_KEY

# Set environment variables for build
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}

# Build the application
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Runner - Production nginx server
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine@sha256:4c8d5b0a7c8e9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3 AS runner

# Security: Create non-root user (nginx runs as nginx by default)
# Create necessary directories with proper permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /etc/nginx/conf.d

# Copy built assets from builder
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY --chown=nginx:nginx nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Switch to non-root user
USER nginx

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
