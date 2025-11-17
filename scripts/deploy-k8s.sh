#!/bin/bash

# Deploy EV ChargerShare to Kubernetes
set -e

echo "🚀 Deploying EV ChargerShare to Kubernetes..."

# Check if kubectl is configured
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ kubectl is not configured or cluster is not accessible"
    exit 1
fi

# Check if we're using the right context
CURRENT_CONTEXT=$(kubectl config current-context)
echo "📋 Current kubectl context: $CURRENT_CONTEXT"

if [[ "$CURRENT_CONTEXT" != "kind-evchargershare" ]]; then
    echo "⚠️  Warning: Not using kind-evchargershare context"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Build Docker images for KinD
echo "🔨 Building Docker images..."
docker build -t chargershare-backend:latest ./backend
docker build -t chargershare-frontend:latest ./frontend

# Load images into KinD cluster
echo "📦 Loading images into KinD cluster..."
kind load docker-image chargershare-backend:latest --name evchargershare
kind load docker-image chargershare-frontend:latest --name evchargershare

# Apply Kubernetes manifests
echo "🔧 Applying Kubernetes manifests..."
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/mongodb.yaml
kubectl apply -f k8s/redis.yaml

# Wait for databases to be ready
echo "⏳ Waiting for databases to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/mongodb -n evchargershare
kubectl wait --for=condition=available --timeout=300s deployment/redis -n evchargershare

# Deploy application services
echo "🔧 Deploying application services..."
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml

# Wait for deployments to be ready
echo "⏳ Waiting for application to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/backend -n evchargershare
kubectl wait --for=condition=available --timeout=300s deployment/frontend -n evchargershare

echo "✅ Deployment complete!"
echo ""
echo "📋 Deployment Status:"
kubectl get pods -n evchargershare
echo ""
echo "🌐 Access the application:"
echo "   Frontend: http://localhost:8080"
echo "   Backend API: http://localhost:8080/api"
echo ""
echo "🛠️  Useful commands:"
echo "   kubectl get all -n evchargershare"
echo "   kubectl logs -f deployment/backend -n evchargershare"
echo "   kubectl logs -f deployment/frontend -n evchargershare"
echo "   kubectl describe ingress evchargershare-ingress -n evchargershare"
