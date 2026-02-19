# --- Stage 1: Builder ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# --- Stage 2: Production (Stateless/Read-Only Compatible) ---
FROM nginx:alpine

# 1. Prepare environment and create required temp directories
RUN apk add --no-cache curl && \
    mkdir -p /tmp/client_temp /tmp/proxy_temp_path /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp && \
    chown -R nginx:nginx /tmp && \
    chmod -R 777 /tmp

# 2. Copy assets
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 3. Secure filesystem permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /etc/nginx/conf.d

# 4. Remove shell
RUN rm -rf /bin/sh /bin/ash

USER nginx
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]