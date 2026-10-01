# --- Stage 1: compile TypeScript to dist/, then drop the dev-only packages
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# The lockfile is written by npm 11; npm 10 (bundled with Node 22) reads it differently
RUN npm install -g npm@11 && npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# --- Stage 2: only production dependencies and the compiled code
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/dist dist
USER node
EXPOSE 3000
# Runs pending database migrations on startup, then serves the api
CMD ["node", "dist/main.js"]
