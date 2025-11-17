#!/bin/bash

# Script to create admin user inside Docker container
# Usage: ./scripts/createAdminDocker.sh [email] [password] [name]

set -e

echo "🐳 Creating admin user via Docker container..."

# Default values
DEFAULT_EMAIL="admin@evchargershare.com"
DEFAULT_PASSWORD="Admin123!"
DEFAULT_NAME="System Administrator"

# Use provided arguments or defaults
ADMIN_EMAIL="${1:-$DEFAULT_EMAIL}"
ADMIN_PASSWORD="${2:-$DEFAULT_PASSWORD}"
ADMIN_NAME="${3:-$DEFAULT_NAME}"

# Check if Docker container is running
if ! docker ps | grep -q "chargershare-backend"; then
    echo "❌ Backend container is not running. Please start it first:"
    echo "   docker-compose up -d backend"
    exit 1
fi

echo "📧 Email: $ADMIN_EMAIL"
echo "👤 Name: $ADMIN_NAME"
echo ""

# Create the admin user inside the Docker container
docker exec -it chargershare-backend node scripts/createAdmin.js \
    --email "$ADMIN_EMAIL" \
    --password "$ADMIN_PASSWORD" \
    --name "$ADMIN_NAME"

echo ""
echo "✨ Admin creation completed!"
echo ""
echo "📋 Login Credentials:"
echo "   Email: $ADMIN_EMAIL"
echo "   Password: $ADMIN_PASSWORD"
echo ""
echo "⚠️  Remember to change the password after first login!"
