#!/bin/bash

# Setup KinD cluster for EV ChargerShare
set -e

echo "🚀 Setting up KinD cluster for EV ChargerShare..."

# Check if kind is installed
if ! command -v kind &> /dev/null; then
    echo "❌ KinD is not installed. Please install it first:"
    echo "   brew install kind"
    echo "   or visit: https://kind.sigs.k8s.io/docs/user/quick-start/#installation"
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed. Please install it first:"
    echo "   brew install kubectl"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Delete existing cluster if it exists
if kind get clusters | grep -q "evchargershare"; then
    echo "🗑️  Deleting existing evchargershare cluster..."
    kind delete cluster --name evchargershare
fi

# Create KinD cluster
echo "🔧 Creating KinD cluster..."
kind create cluster --config k8s/kind-config.yaml

# Wait for cluster to be ready
echo "⏳ Waiting for cluster to be ready..."
kubectl wait --for=condition=Ready nodes --all --timeout=300s

# Install NGINX Ingress Controller
echo "🌐 Installing NGINX Ingress Controller..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Wait for NGINX Ingress to be ready
echo "⏳ Waiting for NGINX Ingress to be ready..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=300s

echo "✅ KinD cluster setup complete!"
# ... (rest of script unchanged)

