########## Stage 1 - Frontend build ##########
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Install dependencies
COPY frontend/package*.json ./
RUN npm install

# Build production assets
COPY frontend .
RUN npm run build:prod


########## Stage 2 - Backend build ##########
FROM node:20-alpine AS backend-build

WORKDIR /app/backend

# Install backend dependencies (production only)
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy backend source
COPY backend .


########## Stage 3 - Runtime image ##########
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

# Copy backend and frontend build artifacts
COPY --from=backend-build /app/backend ./backend
COPY --from=frontend-build /app/frontend/build ./frontend-build

WORKDIR /app/backend

# Ensure required directories exist
RUN mkdir -p uploads logs

EXPOSE 5000

# Default environment variable placeholders (override at runtime)
ENV PORT=5000

CMD ["node", "server.js"]

