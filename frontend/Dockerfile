FROM node:20-alpine as build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy app source
COPY . .

# Set environment variable to ignore ESLint warnings
ENV CI=true
ENV ESLINT_NO_DEV_ERRORS=true

# Build the app with ESLint checks disabled
RUN npm run build:prod

# Production stage
FROM nginx:alpine

# Copy built assets from the build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
