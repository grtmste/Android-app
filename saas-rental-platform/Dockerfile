# Stage 1 — build the React frontend
FROM node:20-alpine AS frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2 — run the Node backend and serve the built frontend
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --production
COPY backend/ ./
# Place the built React app where the backend expects it
COPY --from=frontend /app/dist ./public

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production
CMD ["node", "src/index.js"]
