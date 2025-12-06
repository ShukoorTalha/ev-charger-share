#!/bin/bash

# EV Charger Share - Docker Compose Startup Script
# This script starts the entire project with Docker Compose
# Usage: chmod +x start-project.sh && ./start-project.sh

set -e

echo "================================"
echo "EV Charger Share - Docker Startup"
echo "================================"
echo ""

# Check if Docker is installed and running
echo -e "\033[36mChecking Docker availability...\033[0m"
if ! command -v docker &> /dev/null; then
    echo -e "\033[31m✗ Docker is not installed. Please install Docker.\033[0m"
    exit 1
fi
DOCKER_VERSION=$(docker version --format '{{.Client.Version}}' 2>/dev/null || echo "unknown")
echo -e "\033[32m✓ Docker found (version: $DOCKER_VERSION)\033[0m"

# Check if Docker Compose is available
echo -e "\033[36mChecking Docker Compose...\033[0m"
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "\033[31m✗ Docker Compose is not available.\033[0m"
    exit 1
fi
echo -e "\033[32m✓ Docker Compose found\033[0m"

echo ""
echo -e "\033[36mStarting services...\033[0m"
echo ""

# Stop any existing containers (optional cleanup)
echo -e "\033[33mCleaning up previous containers...\033[0m"
docker compose -f docker-compose.yml down --remove-orphans 2>&1 || true

# Build and start containers
echo -e "\033[36mBuilding and starting containers...\033[0m"
docker compose -f docker-compose.yml up --build -d

echo ""
echo -e "\033[32m✓ All services started successfully!\033[0m"
echo ""
echo "================================"
echo -e "\033[32mService URLs:\033[0m"
echo "================================"
echo -e "\033[36mFrontend:  http://localhost:3000\033[0m"
echo -e "\033[36mBackend:   http://localhost:5000\033[0m"
echo -e "\033[36mMongoDB:   mongodb://admin:password@localhost:27018/chargershare\033[0m"
echo -e "\033[36mRedis:     redis://localhost:6380\033[0m"
echo ""
echo -e "\033[33mTo view logs: docker compose -f docker-compose.yml logs -f\033[0m"
echo -e "\033[33mTo stop:      docker compose -f docker-compose.yml down\033[0m"
echo ""

# Wait a moment for services to start
echo -e "\033[33mWaiting for services to initialize (5 seconds)...\033[0m"
sleep 5

# Show container status
echo ""
echo -e "\033[32mContainer Status:\033[0m"
docker compose -f docker-compose.yml ps
