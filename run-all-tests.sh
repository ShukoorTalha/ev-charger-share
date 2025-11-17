#!/bin/bash

# Run All Tests Script for EvChargerShare
# This script runs all backend tests in the Docker environment

# Set colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}===== EvChargerShare Test Suite =====${NC}"
echo -e "${YELLOW}Starting test environment...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Error: Docker is not running. Please start Docker and try again.${NC}"
  exit 1
fi

# Build and start the test containers
echo -e "${YELLOW}Building and starting test containers...${NC}"
docker-compose -f docker-compose.test.yml build
docker-compose -f docker-compose.test.yml up -d

# Wait for backend to be ready
echo -e "${YELLOW}Waiting for backend to be ready...${NC}"
attempt=1
max_attempts=30
until $(curl --output /dev/null --silent --fail http://localhost:5001/health); do
  if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}Backend failed to start after $max_attempts attempts. Exiting.${NC}"
    docker-compose -f docker-compose.test.yml logs backend
    docker-compose -f docker-compose.test.yml down
    exit 1
  fi
  
  echo -e "${YELLOW}Waiting for backend to be ready... (attempt $attempt/$max_attempts)${NC}"
  attempt=$((attempt+1))
  sleep 2
done

echo -e "${GREEN}Backend is ready!${NC}"

# Run the tests
echo -e "${YELLOW}Running tests...${NC}"
docker-compose -f docker-compose.test.yml exec -T backend npm test

# Store test result
TEST_RESULT=$?

# Show logs if tests failed
if [ $TEST_RESULT -ne 0 ]; then
  echo -e "${RED}Tests failed. Showing logs:${NC}"
  docker-compose -f docker-compose.test.yml logs backend
fi

# Ask if user wants to keep containers running
echo -e "${YELLOW}Do you want to keep the test containers running? (y/n)${NC}"
read -r keep_running

if [[ $keep_running != "y" && $keep_running != "Y" ]]; then
  echo -e "${YELLOW}Stopping test containers...${NC}"
  docker-compose -f docker-compose.test.yml down
else
  echo -e "${YELLOW}Test containers are still running. Stop them later with:${NC}"
  echo -e "docker-compose -f docker-compose.test.yml down"
fi

# Exit with test result
if [ $TEST_RESULT -eq 0 ]; then
  echo -e "${GREEN}All tests passed successfully!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed. Please check the logs above.${NC}"
  exit 1
fi
