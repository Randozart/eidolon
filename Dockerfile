# --- Stage 1: Builder ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# --- Stage 2: Production (Strictly Hardened) ---
FROM nginx:alpine

# 1. Prepare temp directories
RUN mkdir -p /tmp/client_temp /tmp/proxy_temp_path /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp && \
    chown -R nginx:nginx /tmp && \
    chmod -R 777 /tmp

# 2. Clear default Nginx files
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/* /etc/nginx/nginx.conf

# 3. Copy application assets
COPY --from=builder /app/dist /usr/share/nginx/html

# 4. Copy the NEW Unified Nginx Config to the GLOBAL location
COPY nginx.conf /etc/nginx/nginx.conf

# 5. Correct permissions while shell still exists
RUN chown -R nginx:nginx /usr/share/nginx/html /etc/nginx && \
    chmod -R 755 /usr/share/nginx/html

# 6. FINAL HARDENING: Remove shells
RUN rm -rf /bin/sh /bin/ash

# 7. Execution settings
USER nginx
ENTRYPOINT []
EXPOSE 8080

CMD ["/usr/sbin/nginx", "-g", "daemon off;"]