# --- Stage 1: Builder ---
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency definitions
COPY package.json package-lock.json* ./

# Clean install
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# --- Stage 2: Production (Hardened) ---
FROM nginx:alpine

# 1. Install curl for healthchecks (optional but recommended) 
# and remove unnecessary shell binaries to reduce attack surface
RUN apk add --no-cache curl && \
    rm -rf /bin/sh /bin/ash

# 2. Setup permissions for non-root user
# Nginx needs to write to these directories. We give ownership to the 'nginx' user.
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d
    
# 3. Create a place for the PID file that the non-root user can write to
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# 4. Remove the default Nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# 5. Copy built assets from builder -- chown them to the nginx user
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# 6. Copy our custom secure config
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

# 7. Switch to non-root user
USER nginx

# 8. Expose unprivileged port 8080 (Ports < 1024 require root)
EXPOSE 8080

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]