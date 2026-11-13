# Etapa 1: gera a versão web (PWA) do app Expo
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npx expo export --platform web --output-dir dist \
 && node scripts/generate-sw.js dist

# Etapa 2: serve os arquivos estáticos com nginx
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
