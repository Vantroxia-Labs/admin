# syntax=docker/dockerfile:1.4
# ═══════════════════════════════════════════════════════════════════════════
# AegisRemit Admin Portal — Multi-stage Dockerfile
# Place at: Vantroxia-Labs/admin/Dockerfile
# ═══════════════════════════════════════════════════════════════════════════

# ── Stage 1: Build ─────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=https://api.aegisremit.ng/api/v1
ARG VITE_USE_MOCK=false
ARG VITE_PAYLOAD_ENCRYPTION_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_USE_MOCK=$VITE_USE_MOCK
ENV VITE_PAYLOAD_ENCRYPTION_KEY=$VITE_PAYLOAD_ENCRYPTION_KEY

RUN npm run build

# ── Stage 2: Serve with nginx ──────────────────────────────────────────────
FROM nginx:alpine AS runtime

# Custom nginx config for SPA routing
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
