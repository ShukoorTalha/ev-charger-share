#!/bin/bash

# Start Development Environment Script for EvChargerShare
# This script starts all services in development mode

# Set colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===== EvChargerShare Development Environment =====${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Error: Docker is not running. Please start Docker and try again.${NC}"
  exit 1
fi

# Check if .env file exists, if not create from example
if [ ! -f ./backend/.env ]; then
  if [ -f ./backend/.env.example ]; then
    echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
    cp ./backend/.env.example ./backend/.env
    echo -e "${GREEN}.env file created. Please update it with your configuration.${NC}"
  else
    echo -e "${RED}Error: .env.example file not found. Please create a .env file manually.${NC}"
    exit 1
  fi
fi

# Ask if user wants to seed the database
echo -e "${YELLOW}Do you want to seed the database with initial data? (y/n)${NC}"
read -r seed_db

# Build and start the containers
echo -e "${YELLOW}Building and starting containers...${NC}"
docker-compose up -d mongodb redis

# Wait for MongoDB to be ready
echo -e "${YELLOW}Waiting for MongoDB to be ready...${NC}"
attempt=1
max_attempts=30
until docker-compose exec -T mongodb mongo --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
  if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}MongoDB failed to start after $max_attempts attempts. Exiting.${NC}"
    docker-compose logs mongodb
    exit 1
  fi
  
  echo -e "${YELLOW}Waiting for MongoDB to be ready... (attempt $attempt/$max_attempts)${NC}"
  attempt=$((attempt+1))
  sleep 2
done

echo -e "${GREEN}MongoDB is ready!${NC}"

# Seed the database if requested
if [[ $seed_db == "y" || $seed_db == "Y" ]]; then
  echo -e "${YELLOW}Seeding the database...${NC}"
  cd backend && node scripts/seedDatabase.js
  cd ..
  echo -e "${GREEN}Database seeded successfully!${NC}"
fi

# Start backend in development mode
echo -e "${YELLOW}Starting backend in development mode...${NC}"
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
echo -e "${YELLOW}Waiting for backend to be ready...${NC}"
attempt=1
max_attempts=30
until $(curl --output /dev/null --silent --fail http://localhost:5000/health); do
  if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}Backend failed to start after $max_attempts attempts. Exiting.${NC}"
    kill $BACKEND_PID
    exit 1
  fi
  
  echo -e "${YELLOW}Waiting for backend to be ready... (attempt $attempt/$max_attempts)${NC}"
  attempt=$((attempt+1))
  sleep 2
done

echo -e "${GREEN}Backend is ready at http://localhost:5000!${NC}"

# Check if frontend directory exists and has package.json
if [ -d "./frontend" ] && [ -f "./frontend/package.json" ]; then
  # Start frontend in development mode
  echo -e "${YELLOW}Starting frontend in development mode...${NC}"
  cd frontend
  npm start &
  FRONTEND_PID=$!
  cd ..
  
  echo -e "${GREEN}Frontend is starting at http://localhost:3000!${NC}"
else
  echo -e "${YELLOW}Frontend directory or package.json not found. Skipping frontend startup.${NC}"
fi

echo -e "${BLUE}===== Development Environment Started =====${NC}"
echo -e "${BLUE}Backend API: http://localhost:5000${NC}"
echo -e "${BLUE}Frontend: http://localhost:3000${NC}"
echo -e "${BLUE}MongoDB: localhost:27017${NC}"
echo -e "${BLUE}Redis: localhost:6379${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services...${NC}"

# Handle cleanup on exit
trap 'echo -e "${YELLOW}Stopping services...${NC}"; kill $BACKEND_PID 2>/dev/null; [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null; docker-compose stop mongodb redis; echo -e "${GREEN}Development environment stopped.${NC}"' EXIT

# Keep script running
wait
