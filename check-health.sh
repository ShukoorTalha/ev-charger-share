#!/bin/bash

# Health Check Script for EvChargerShare
# This script checks the health of all services in the application

# Set colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===== EvChargerShare Health Check =====${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Error: Docker is not running. Please start Docker and try again.${NC}"
  exit 1
fi

# Check MongoDB
echo -e "${YELLOW}Checking MongoDB...${NC}"
if docker-compose ps | grep -q "mongodb.*Up"; then
  echo -e "${GREEN}MongoDB is running.${NC}"
  
  # Check if MongoDB is responding
  if docker-compose exec -T mongodb mongo --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo -e "${GREEN}MongoDB is healthy and responding to queries.${NC}"
  else
    echo -e "${RED}MongoDB is running but not responding to queries.${NC}"
  fi
else
  echo -e "${RED}MongoDB is not running.${NC}"
fi

# Check Redis
echo -e "${YELLOW}Checking Redis...${NC}"
if docker-compose ps | grep -q "redis.*Up"; then
  echo -e "${GREEN}Redis is running.${NC}"
  
  # Check if Redis is responding
  if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
    echo -e "${GREEN}Redis is healthy and responding to queries.${NC}"
  else
    echo -e "${RED}Redis is running but not responding to queries.${NC}"
  fi
else
  echo -e "${RED}Redis is not running.${NC}"
fi

# Check Backend
echo -e "${YELLOW}Checking Backend API...${NC}"
BACKEND_URL="http://localhost:5001/health"
if curl --output /dev/null --silent --fail "$BACKEND_URL"; then
  echo -e "${GREEN}Backend API is running and healthy.${NC}"
  
  # Get more detailed health info
  HEALTH_INFO=$(curl -s "$BACKEND_URL")
  echo -e "${GREEN}Backend Health Info: $HEALTH_INFO${NC}"
else
  echo -e "${RED}Backend API is not responding.${NC}"
  
  # Check if backend container is running
  if docker-compose ps | grep -q "backend.*Up"; then
    echo -e "${YELLOW}Backend container is running but API is not responding. Checking logs...${NC}"
    docker-compose logs --tail=20 backend
  else
    echo -e "${RED}Backend container is not running.${NC}"
  fi
fi

# Check Frontend
echo -e "${YELLOW}Checking Frontend...${NC}"
FRONTEND_URL="http://localhost:80"
if curl --output /dev/null --silent --head --fail "$FRONTEND_URL"; then
  echo -e "${GREEN}Frontend is running and accessible.${NC}"
else
  echo -e "${RED}Frontend is not responding.${NC}"
  
  # Check if frontend container is running
  if docker-compose ps | grep -q "frontend.*Up"; then
    echo -e "${YELLOW}Frontend container is running but website is not accessible. Checking logs...${NC}"
    docker-compose logs --tail=20 frontend
  else
    echo -e "${RED}Frontend container is not running.${NC}"
  fi
fi

# Check disk space
echo -e "${YELLOW}Checking disk space...${NC}"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
  echo -e "${RED}Warning: Disk usage is high ($DISK_USAGE%).${NC}"
else
  echo -e "${GREEN}Disk space is adequate. Usage: $DISK_USAGE%${NC}"
fi

# Check Docker resource usage
echo -e "${YELLOW}Checking Docker resource usage...${NC}"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

echo -e "${BLUE}===== Health Check Complete =====${NC}"
