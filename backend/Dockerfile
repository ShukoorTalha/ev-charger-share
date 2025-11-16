FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy app source
COPY . .

# Set environment variables
ENV NODE_ENV=production

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
CMD ["node", "server.js"]
