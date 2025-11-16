# EV ChargerShare Kubernetes Deployment

This directory contains Kubernetes manifests and deployment scripts for running EV ChargerShare in a local KinD (Kubernetes in Docker) cluster.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) running
- [KinD](https://kind.sigs.k8s.io/docs/user/quick-start/#installation) installed
- [kubectl](https://kubernetes.io/docs/tasks/tools/) installed
- [Skaffold](https://skaffold.dev/docs/install/) installed (optional, for development)

### Installation Commands

```bash
# macOS with Homebrew
brew install kind kubectl skaffold

# Or install individually
brew install kind
brew install kubectl
brew install skaffold
```

## Quick Start

### Option 1: Automated Setup with Scripts

```bash
# 1. Setup KinD cluster with NGINX Ingress
./scripts/setup-kind.sh

# 2. Build and deploy the application
./scripts/deploy-k8s.sh

# 3. Access the application
open http://localhost:8080
```

### Option 2: Development with Skaffold

```bash
# Setup KinD cluster first
./scripts/setup-kind.sh

# Start development with auto-rebuild and hot-reload
skaffold dev

# Or run in the background
skaffold run
```

### Option 3: Manual Deployment

```bash
# Create KinD cluster
kind create cluster --config k8s/kind-config.yaml

# Install NGINX Ingress
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Build Docker images
docker build -t chargershare-backend:latest ./backend
docker build -t chargershare-frontend:latest ./frontend

# Load images into KinD
kind load docker-image chargershare-backend:latest --name evchargershare
kind load docker-image chargershare-frontend:latest --name evchargershare

# Deploy to Kubernetes
kubectl apply -f k8s/
```

## Architecture

The Kubernetes deployment includes:

### Services
- **Frontend**: React application served by Nginx
- **Backend**: Node.js Express API server
- **MongoDB**: Database for application data
- **Redis**: Session storage and caching
- **NGINX Ingress**: Load balancer and reverse proxy

### Configuration
- **ConfigMap**: Environment variables for the application
- **Secret**: Sensitive data (API keys, credentials)
- **Namespace**: Isolated environment for all resources

## Accessing the Application

Once deployed, the application is accessible at:

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:8080/api
- **Health Check**: http://localhost:8080/api/health

## Environment Variables

### Required for Full Functionality

Update `k8s/configmap.yaml` with your values:

```yaml
# Stripe Payment Processing
STRIPE_SECRET_KEY: "sk_test_..."

# AWS S3 for File Storage
AWS_ACCESS_KEY_ID: "your-access-key"
AWS_SECRET_ACCESS_KEY: "your-secret-key"
S3_BUCKET_NAME: "your-bucket-name"

# Email Configuration
EMAIL_USER: "your-email@gmail.com"
EMAIL_PASS: "your-app-password"

# OpenCage Geocoding API
OPENCAGE_API_KEY: "your-opencage-key"
```

## Useful Commands

### Cluster Management
```bash
# View cluster info
kubectl cluster-info

# Get all resources
kubectl get all -n evchargershare

# View pod logs
kubectl logs -f deployment/backend -n evchargershare
kubectl logs -f deployment/frontend -n evchargershare

# Access pod shell
kubectl exec -it deployment/backend -n evchargershare -- /bin/bash
```

### Debugging
```bash
# Check pod status
kubectl get pods -n evchargershare

# Describe problematic resources
kubectl describe pod <pod-name> -n evchargershare
kubectl describe service backend-service -n evchargershare

# View ingress configuration
kubectl describe ingress evchargershare-ingress -n evchargershare

# Port forward for direct access
kubectl port-forward service/backend-service 5000:5000 -n evchargershare
kubectl port-forward service/frontend-service 3000:80 -n evchargershare
```

### Cleanup
```bash
# Delete all resources
./scripts/cleanup-k8s.sh

# Or manually delete namespace
kubectl delete namespace evchargershare

# Delete KinD cluster
kind delete cluster --name evchargershare
```

## Development Workflow

### With Skaffold (Recommended)
```bash
# Start development mode with hot-reload
skaffold dev

# Build and deploy once
skaffold run

# Delete deployment
skaffold delete
```

### Manual Development
```bash
# Rebuild and redeploy after code changes
docker build -t chargershare-backend:latest ./backend
docker build -t chargershare-frontend:latest ./frontend
kind load docker-image chargershare-backend:latest --name evchargershare
kind load docker-image chargershare-frontend:latest --name evchargershare
kubectl rollout restart deployment/backend -n evchargershare
kubectl rollout restart deployment/frontend -n evchargershare
```

## Troubleshooting

### Common Issues

1. **Images not found**: Make sure to load images into KinD cluster
   ```bash
   kind load docker-image chargershare-backend:latest --name evchargershare
   ```

2. **Ingress not working**: Ensure NGINX Ingress Controller is installed
   ```bash
   kubectl get pods -n ingress-nginx
   ```

3. **Database connection issues**: Check if MongoDB is running
   ```bash
   kubectl logs deployment/mongodb -n evchargershare
   ```

4. **Port conflicts**: Make sure ports 8080 and 8443 are available

### Logs and Monitoring
```bash
# View all pod logs
kubectl logs -f -l app=backend -n evchargershare
kubectl logs -f -l app=frontend -n evchargershare
kubectl logs -f -l app=mongodb -n evchargershare

# Monitor resource usage
kubectl top pods -n evchargershare
kubectl top nodes
```

## Production Considerations

This setup is designed for local development. For production deployment:

1. **Use persistent volumes** for MongoDB and Redis data
2. **Set up proper secrets management** (e.g., Kubernetes secrets, Vault)
3. **Configure resource limits** and requests appropriately
4. **Set up monitoring** and logging (Prometheus, Grafana, ELK stack)
5. **Use a managed Kubernetes service** (EKS, GKE, AKS)
6. **Set up CI/CD pipelines** for automated deployments
7. **Configure SSL/TLS** with proper certificates
8. **Set up backup strategies** for data persistence

## File Structure

```
k8s/
├── README.md              # This file
├── kind-config.yaml       # KinD cluster configuration
├── namespace.yaml         # Kubernetes namespace
├── configmap.yaml         # Environment variables and secrets
├── mongodb.yaml           # MongoDB deployment and service
├── redis.yaml             # Redis deployment and service
├── backend.yaml           # Backend API deployment and service
├── frontend.yaml          # Frontend deployment and service
└── ingress.yaml           # NGINX Ingress configuration

scripts/
├── setup-kind.sh          # Automated KinD cluster setup
├── deploy-k8s.sh          # Build and deploy application
└── cleanup-k8s.sh         # Cleanup resources

skaffold.yaml              # Skaffold configuration for development
```
