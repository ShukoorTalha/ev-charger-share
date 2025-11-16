#!/bin/bash

# Cleanup EV ChargerShare Kubernetes deployment
set -e

echo "🧹 Cleaning up EV ChargerShare Kubernetes deployment..."

# Check if kubectl is configured
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ kubectl is not configured or cluster is not accessible"
    exit 1
fi

# Check if namespace exists
if kubectl get namespace evchargershare &> /dev/null; then
    echo "🗑️  Deleting evchargershare namespace and all resources..."
    kubectl delete namespace evchargershare
    
    echo "⏳ Waiting for namespace to be fully deleted..."
    while kubectl get namespace evchargershare &> /dev/null; do
        echo "   Still deleting..."
        sleep 5
    done
else
    echo "ℹ️  evchargershare namespace not found"
fi

# Optionally delete the entire KinD cluster
read -p "🤔 Do you want to delete the entire KinD cluster? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if kind get clusters | grep -q "evchargershare"; then
        echo "🗑️  Deleting KinD cluster..."
        kind delete cluster --name evchargershare
        echo "✅ KinD cluster deleted"
    else
        echo "ℹ️  KinD cluster 'evchargershare' not found"
    fi
fi

echo "✅ Cleanup complete!"
