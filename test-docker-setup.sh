#!/bin/bash

# Test Docker Setup Script for EvChargerShare
# This script tests the Docker setup by:
# 1. Building and starting all containers
# 2. Running basic health checks
# 3. Running backend tests
# 4. Checking frontend build

echo "===== EvChargerShare Docker Setup Test ====="
echo "Starting test at $(date)"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker is not running. Please start Docker and try again."
  exit 1
fi

# Build and start containers in detached mode
echo "Building and starting containers..."
docker-compose build
if [ $? -ne 0 ]; then
  echo "Error: Docker build failed."
  exit 1
fi

docker-compose up -d
if [ $? -ne 0 ]; then
  echo "Error: Docker compose up failed."
  exit 1
fi

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

# Check if MongoDB is running
echo "Checking MongoDB..."
if ! docker-compose exec mongodb mongo --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
  echo "Error: MongoDB is not responding."
else
  echo "MongoDB is running."
fi

# Check if backend API is running
echo "Checking backend API..."
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health)
if [ "$BACKEND_HEALTH" != "200" ]; then
  echo "Error: Backend API is not responding. Status code: $BACKEND_HEALTH"
else
  echo "Backend API is running."
fi

# Check if frontend is running
echo "Checking frontend..."
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost)
if [ "$FRONTEND_HEALTH" != "200" ]; then
  echo "Error: Frontend is not responding. Status code: $FRONTEND_HEALTH"
else
  echo "Frontend is running."
fi

# Run backend tests
echo "Running backend tests..."
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
TEST_EXIT_CODE=$?

# Clean up test containers
docker-compose -f docker-compose.test.yml down

if [ $TEST_EXIT_CODE -ne 0 ]; then
  echo "Backend tests failed."
else
  echo "Backend tests passed."
fi

# Summary
echo "===== Test Summary ====="
echo "MongoDB: $(docker-compose ps mongodb | grep Up > /dev/null && echo 'OK' || echo 'FAILED')"
echo "Backend: $(docker-compose ps backend | grep Up > /dev/null && echo 'OK' || echo 'FAILED')"
echo "Frontend: $(docker-compose ps frontend | grep Up > /dev/null && echo 'OK' || echo 'FAILED')"
echo "Redis: $(docker-compose ps redis | grep Up > /dev/null && echo 'OK' || echo 'FAILED')"
echo "Tests: $([ $TEST_EXIT_CODE -eq 0 ] && echo 'PASSED' || echo 'FAILED')"

# Clean up
echo "Do you want to stop and remove the Docker containers? (y/n)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
  docker-compose down
  echo "Containers stopped and removed."
else
  echo "Containers are still running."
fi

echo "Test completed at $(date)"
