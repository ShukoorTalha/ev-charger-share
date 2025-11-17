#!/bin/bash

# EV ChargerShare - AWS EKS Deployment Script
# This script deploys the application to AWS EKS using Terraform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local missing_tools=()
    
    if ! command -v terraform &> /dev/null; then
        missing_tools+=("terraform")
    fi
    
    if ! command -v aws &> /dev/null; then
        missing_tools+=("aws-cli")
    fi
    
    if ! command -v kubectl &> /dev/null; then
        missing_tools+=("kubectl")
    fi
    
    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_error "Please install the missing tools and try again."
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

# Check AWS credentials
check_aws_credentials() {
    print_status "Checking AWS credentials..."
    
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured or invalid"
        print_error "Please run 'aws configure' to set up your credentials"
        exit 1
    fi
    
    local aws_account=$(aws sts get-caller-identity --query Account --output text)
    local aws_region=$(aws configure get region)
    
    print_success "AWS credentials configured for account: $aws_account in region: $aws_region"
}

# Initialize Terraform
init_terraform() {
    print_status "Initializing Terraform..."
    
    cd "$(dirname "$0")/.."
    
    if [ ! -f "terraform.tfvars" ]; then
        print_warning "terraform.tfvars not found. Creating from example..."
        cp terraform.tfvars.example terraform.tfvars
        print_warning "Please edit terraform.tfvars with your configuration before continuing"
        read -p "Press Enter to continue after editing terraform.tfvars..."
    fi
    
    terraform init
    print_success "Terraform initialized"
}

# Plan Terraform deployment
plan_terraform() {
    print_status "Planning Terraform deployment..."
    
    terraform plan -out=tfplan
    
    print_warning "Please review the Terraform plan above"
    read -p "Do you want to continue with the deployment? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Deployment cancelled by user"
        exit 1
    fi
}

# Apply Terraform configuration
apply_terraform() {
    print_status "Applying Terraform configuration..."
    
    terraform apply tfplan
    
    if [ $? -eq 0 ]; then
        print_success "Terraform deployment completed successfully"
    else
        print_error "Terraform deployment failed"
        exit 1
    fi
}

# Configure kubectl
configure_kubectl() {
    print_status "Configuring kubectl..."
    
    local cluster_name=$(terraform output -raw cluster_id)
    local aws_region=$(terraform output -raw aws_region)
    
    aws eks update-kubeconfig --region "$aws_region" --name "$cluster_name"
    
    # Test kubectl connection
    if kubectl cluster-info &> /dev/null; then
        print_success "kubectl configured successfully"
    else
        print_error "Failed to configure kubectl"
        exit 1
    fi
}

# Build and push Docker images
build_and_push_images() {
    print_status "Building and pushing Docker images..."
    
    local backend_repo=$(terraform output -raw ecr_backend_repository_url)
    local frontend_repo=$(terraform output -raw ecr_frontend_repository_url)
    local aws_region=$(terraform output -raw aws_region)
    local aws_account_id=$(terraform output -raw aws_account_id)
    
    # Login to ECR
    print_status "Logging into ECR..."
    aws ecr get-login-password --region "$aws_region" | docker login --username AWS --password-stdin "$aws_account_id.dkr.ecr.$aws_region.amazonaws.com"
    
    # Build and push backend image
    print_status "Building backend image..."
    cd ../../backend
    docker build -t "$backend_repo:latest" .
    docker push "$backend_repo:latest"
    
    # Build and push frontend image
    print_status "Building frontend image..."
    cd ../frontend
    docker build -t "$frontend_repo:latest" .
    docker push "$frontend_repo:latest"
    
    cd ../terraform
    print_success "Docker images built and pushed successfully"
}

# Deploy application to Kubernetes
deploy_application() {
    print_status "Deploying application to Kubernetes..."
    
    # Update Kubernetes manifests with ECR image URLs
    local backend_repo=$(terraform output -raw ecr_backend_repository_url)
    local frontend_repo=$(terraform output -raw ecr_frontend_repository_url)
    
    # Create temporary directory for updated manifests
    mkdir -p temp-k8s
    cp -r ../k8s/* temp-k8s/
    
    # Update image references in manifests
    sed -i.bak "s|evchargershare-backend:latest|$backend_repo:latest|g" temp-k8s/backend.yaml
    sed -i.bak "s|evchargershare-frontend:latest|$frontend_repo:latest|g" temp-k8s/frontend.yaml
    
    # Apply Kubernetes manifests
    kubectl apply -f temp-k8s/
    
    # Wait for deployments to be ready
    print_status "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available --timeout=600s deployment/backend -n evchargershare
    kubectl wait --for=condition=available --timeout=600s deployment/frontend -n evchargershare
    kubectl wait --for=condition=available --timeout=600s deployment/mongodb -n evchargershare
    kubectl wait --for=condition=available --timeout=600s deployment/redis -n evchargershare
    
    # Clean up temporary files
    rm -rf temp-k8s
    
    print_success "Application deployed successfully"
}

# Get application URLs
get_application_urls() {
    print_status "Getting application URLs..."
    
    # Wait for load balancer to be ready
    print_status "Waiting for load balancer to be ready..."
    sleep 60
    
    local ingress_url=$(kubectl get ingress evchargershare-ingress -n evchargershare -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
    
    if [ -n "$ingress_url" ]; then
        print_success "Application is available at: http://$ingress_url"
    else
        print_warning "Load balancer URL not yet available. You can check later with:"
        echo "kubectl get ingress evchargershare-ingress -n evchargershare"
    fi
    
    # Show service URLs
    print_status "Service endpoints:"
    kubectl get services -n evchargershare
}

# Create admin user
create_admin_user() {
    print_status "Creating admin user..."
    
    # Check if createAdmin.js exists
    if [ -f "../backend/scripts/createAdmin.js" ]; then
        # Run admin creation job
        kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: create-admin-$(date +%s)
  namespace: evchargershare
spec:
  template:
    spec:
      containers:
      - name: create-admin
        image: $(terraform output -raw ecr_backend_repository_url):latest
        command: ["node", "scripts/createAdmin.js"]
        env:
        - name: MONGODB_URI
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: MONGODB_URI
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
      restartPolicy: Never
  backoffLimit: 3
EOF
        
        print_success "Admin user creation job submitted"
        print_status "Check job status with: kubectl get jobs -n evchargershare"
    else
        print_warning "Admin creation script not found. You may need to create an admin user manually."
    fi
}

# Main deployment function
main() {
    print_status "Starting EV ChargerShare deployment to AWS EKS..."
    
    check_prerequisites
    check_aws_credentials
    init_terraform
    plan_terraform
    apply_terraform
    configure_kubectl
    build_and_push_images
    deploy_application
    get_application_urls
    create_admin_user
    
    print_success "Deployment completed successfully!"
    print_status "Next steps:"
    echo "1. Configure your domain DNS to point to the load balancer"
    echo "2. Set up SSL certificates if using a custom domain"
    echo "3. Configure monitoring and alerting"
    echo "4. Set up backup and disaster recovery"
    echo "5. Review and update security settings"
}

# Handle script interruption
trap 'print_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"
