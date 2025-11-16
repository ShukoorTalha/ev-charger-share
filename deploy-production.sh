#!/bin/bash

# Production Deployment Script for EvChargerShare
# This script deploys the application to production

# Set colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===== EvChargerShare Production Deployment =====${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Error: Docker is not running. Please start Docker and try again.${NC}"
  exit 1
fi

# Check if .env file exists for production
if [ ! -f ./backend/.env.production ]; then
  echo -e "${RED}Error: .env.production file not found. Please create it with your production configuration.${NC}"
  exit 1
fi

# Copy production env file
echo -e "${YELLOW}Copying production environment file...${NC}"
cp ./backend/.env.production ./backend/.env

# Pull latest changes if in a git repository
if [ -d ".git" ]; then
  echo -e "${YELLOW}Pulling latest changes from git...${NC}"
  git pull
else
  echo -e "${YELLOW}Not a git repository. Skipping git pull.${NC}"
fi

# Build and start the containers in production mode
echo -e "${YELLOW}Building production containers...${NC}"
docker-compose -f docker-compose.yml build

echo -e "${YELLOW}Starting production containers...${NC}"
docker-compose -f docker-compose.yml up -d

# Wait for backend to be ready
echo -e "${YELLOW}Waiting for backend to be ready...${NC}"
attempt=1
max_attempts=30
until $(curl --output /dev/null --silent --fail http://localhost:5000/health); do
  if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}Backend failed to start after $max_attempts attempts. Showing logs:${NC}"
    docker-compose logs backend
    echo -e "${RED}Deployment failed. Please check the logs above.${NC}"
    exit 1
  fi
  
  echo -e "${YELLOW}Waiting for backend to be ready... (attempt $attempt/$max_attempts)${NC}"
  attempt=$((attempt+1))
  sleep 2
done

# Check frontend health
echo -e "${YELLOW}Checking frontend...${NC}"
if $(curl --output /dev/null --silent --fail http://localhost:80); then
  echo -e "${GREEN}Frontend is ready!${NC}"
else
  echo -e "${RED}Frontend may not be ready. Showing logs:${NC}"
  docker-compose logs frontend
fi

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${BLUE}===== Services =====${NC}"
echo -e "${BLUE}Backend API: http://localhost:5000${NC}"
echo -e "${BLUE}Frontend: http://localhost:80${NC}"
echo -e "${YELLOW}To view logs: docker-compose logs -f${NC}"
echo -e "${YELLOW}To stop services: docker-compose down${NC}"

# Run database migrations if needed
echo -e "${YELLOW}Do you want to run database migrations? (y/n)${NC}"
read -r run_migrations

if [[ $run_migrations == "y" || $run_migrations == "Y" ]]; then
  echo -e "${YELLOW}Running database migrations...${NC}"
  docker-compose exec backend node scripts/migrate.js
  echo -e "${GREEN}Database migrations completed!${NC}"
fi

echo -e "${BLUE}===== Deployment Complete =====${NC}"
