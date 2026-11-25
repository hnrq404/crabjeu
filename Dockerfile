# Imagem única (API + PWA) para hospedagens de serviço único, como o Render.
# Para VPS, use docker-compose.prod.yml.

# Etapa 1: build web (PWA) do app Expo
FROM node:22-alpine AS web
WORKDIR /web
COPY mobile/package.json mobile/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY mobile/ .
RUN npx expo export --platform web --output-dir dist \
 && node scripts/generate-sw.js dist

# Etapa 2: API FastAPI servindo também o PWA
FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
COPY --from=web /web/dist ./static
ENV STATIC_DIR=/app/static
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
