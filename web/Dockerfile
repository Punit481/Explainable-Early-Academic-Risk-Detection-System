# --- Stage 1: build the React app into static files (dist/)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# The lockfile is written by npm 11; npm 10 (bundled with Node 22) reads it differently
RUN npm install -g npm@11 && npm ci
COPY . .
RUN npm run build

# --- Stage 2: nginx serves those files and forwards /api/* to the api
FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
