#!/bin/bash

# EV ChargerShare - AWS EKS Destroy Script
# This script safely destroys the AWS EKS infrastructure

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

# Confirmation prompt
confirm_destruction() {
    print_warning "This will destroy ALL AWS resources created by Terraform!"
    print_warning "This action is IRREVERSIBLE and will result in:"
    echo "  - EKS cluster deletion"
    echo "  - VPC and networking resources deletion"
    echo "  - ECR repositories deletion (and all images)"
    echo "  - S3 bucket deletion (and all data)"
    echo "  - ElastiCache Redis cluster deletion"
    echo "  - All application data will be PERMANENTLY LOST"
    echo ""
    
    read -p "Are you absolutely sure you want to continue? Type 'yes' to confirm: " -r
    echo
    
    if [[ ! $REPLY == "yes" ]]; then
        print_error "Destruction cancelled by user"
        exit 1
    fi
    
    print_warning "Last chance! This will permanently delete everything."
    read -p "Type 'DESTROY' to proceed: " -r
    echo
    
    if [[ ! $REPLY == "DESTROY" ]]; then
        print_error "Destruction cancelled by user"
        exit 1
    fi
}

# Clean up Kubernetes resources first
cleanup_kubernetes() {
    print_status "Cleaning up Kubernetes resources..."
    
    # Check if kubectl is configured
    if ! kubectl cluster-info &> /dev/null; then
        print_warning "kubectl not configured or cluster not accessible"
        return 0
    fi
    
    # Delete application namespace (this will delete all resources in it)
    if kubectl get namespace evchargershare &> /dev/null; then
        print_status "Deleting evchargershare namespace..."
        kubectl delete namespace evchargershare --timeout=300s
    fi
    
    # Delete ingress controller namespace
    if kubectl get namespace ingress-nginx &> /dev/null; then
        print_status "Deleting ingress-nginx namespace..."
        kubectl delete namespace ingress-nginx --timeout=300s
    fi
    
    # Wait for load balancers to be cleaned up
    print_status "Waiting for load balancers to be cleaned up..."
    sleep 60
    
    print_success "Kubernetes resources cleaned up"
}

# Empty S3 bucket before destruction
empty_s3_bucket() {
    print_status "Emptying S3 bucket..."
    
    # Get bucket name from Terraform output
    local bucket_name
    if bucket_name=$(terraform output -raw s3_bucket_name 2>/dev/null); then
        if aws s3 ls "s3://$bucket_name" &> /dev/null; then
            print_status "Emptying S3 bucket: $bucket_name"
            aws s3 rm "s3://$bucket_name" --recursive
            
            # Delete all versions if versioning is enabled
            aws s3api list-object-versions --bucket "$bucket_name" --query 'Versions[].{Key:Key,VersionId:VersionId}' --output text | while read -r key version_id; do
                if [ -n "$key" ] && [ -n "$version_id" ]; then
                    aws s3api delete-object --bucket "$bucket_name" --key "$key" --version-id "$version_id"
                fi
            done
            
            # Delete delete markers
            aws s3api list-object-versions --bucket "$bucket_name" --query 'DeleteMarkers[].{Key:Key,VersionId:VersionId}' --output text | while read -r key version_id; do
                if [ -n "$key" ] && [ -n "$version_id" ]; then
                    aws s3api delete-object --bucket "$bucket_name" --key "$key" --version-id "$version_id"
                fi
            done
            
            print_success "S3 bucket emptied"
        else
            print_warning "S3 bucket not found or not accessible"
        fi
    else
        print_warning "Could not get S3 bucket name from Terraform output"
    fi
}

# Delete ECR repositories and images
cleanup_ecr_repositories() {
    print_status "Cleaning up ECR repositories..."
    
    local backend_repo frontend_repo
    
    if backend_repo=$(terraform output -raw ecr_backend_repository_url 2>/dev/null); then
        local repo_name=$(echo "$backend_repo" | cut -d'/' -f2)
        if aws ecr describe-repositories --repository-names "$repo_name" &> /dev/null; then
            print_status "Deleting ECR repository: $repo_name"
            aws ecr delete-repository --repository-name "$repo_name" --force
        fi
    fi
    
    if frontend_repo=$(terraform output -raw ecr_frontend_repository_url 2>/dev/null); then
        local repo_name=$(echo "$frontend_repo" | cut -d'/' -f2)
        if aws ecr describe-repositories --repository-names "$repo_name" &> /dev/null; then
            print_status "Deleting ECR repository: $repo_name"
            aws ecr delete-repository --repository-name "$repo_name" --force
        fi
    fi
    
    print_success "ECR repositories cleaned up"
}

# Run Terraform destroy
terraform_destroy() {
    print_status "Running Terraform destroy..."
    
    cd "$(dirname "$0")/.."
    
    # Plan the destruction
    terraform plan -destroy -out=destroy.tfplan
    
    print_warning "Please review the destruction plan above"
    read -p "Proceed with destruction? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Destruction cancelled by user"
        exit 1
    fi
    
    # Apply the destruction
    terraform apply destroy.tfplan
    
    if [ $? -eq 0 ]; then
        print_success "Terraform destruction completed successfully"
    else
        print_error "Terraform destruction failed"
        print_error "You may need to manually clean up some resources"
        exit 1
    fi
    
    # Clean up Terraform files
    rm -f destroy.tfplan
    rm -f tfplan
    rm -f terraform.tfstate.backup
}

# Verify destruction
verify_destruction() {
    print_status "Verifying resource destruction..."
    
    local cluster_name
    if cluster_name=$(terraform output -raw cluster_name 2>/dev/null); then
        if aws eks describe-cluster --name "$cluster_name" &> /dev/null; then
            print_warning "EKS cluster still exists: $cluster_name"
        else
            print_success "EKS cluster successfully deleted"
        fi
    fi
    
    # Check for any remaining load balancers
    local remaining_lbs
    if remaining_lbs=$(aws elbv2 describe-load-balancers --query 'LoadBalancers[?contains(LoadBalancerName, `ev-chargershare`)].LoadBalancerName' --output text 2>/dev/null); then
        if [ -n "$remaining_lbs" ]; then
            print_warning "Some load balancers may still exist: $remaining_lbs"
            print_warning "These should be cleaned up automatically, but you may want to check manually"
        fi
    fi
    
    print_success "Destruction verification completed"
}

# Backup important data (optional)
backup_data() {
    print_status "Creating backup of important data..."
    
    local backup_dir="backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup Terraform state
    if [ -f "terraform.tfstate" ]; then
        cp terraform.tfstate "$backup_dir/"
        print_status "Terraform state backed up"
    fi
    
    # Backup configuration files
    if [ -f "terraform.tfvars" ]; then
        cp terraform.tfvars "$backup_dir/"
        print_status "Terraform variables backed up"
    fi
    
    # Export Kubernetes resources (if accessible)
    if kubectl cluster-info &> /dev/null; then
        kubectl get all -n evchargershare -o yaml > "$backup_dir/kubernetes-resources.yaml" 2>/dev/null || true
        kubectl get configmaps -n evchargershare -o yaml > "$backup_dir/configmaps.yaml" 2>/dev/null || true
        kubectl get secrets -n evchargershare -o yaml > "$backup_dir/secrets.yaml" 2>/dev/null || true
        print_status "Kubernetes resources backed up"
    fi
    
    print_success "Backup created in: $backup_dir"
    print_warning "Please save this backup in a secure location"
}

# Main destruction function
main() {
    print_status "Starting EV ChargerShare infrastructure destruction..."
    
    # Check if Terraform is initialized
    cd "$(dirname "$0")/.."
    if [ ! -d ".terraform" ]; then
        print_error "Terraform not initialized. Run 'terraform init' first."
        exit 1
    fi
    
    confirm_destruction
    
    # Offer to create backup
    read -p "Do you want to create a backup before destruction? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        backup_data
    fi
    
    cleanup_kubernetes
    empty_s3_bucket
    cleanup_ecr_repositories
    terraform_destroy
    verify_destruction
    
    print_success "Infrastructure destruction completed!"
    print_status "Summary:"
    echo "  ✓ Kubernetes resources deleted"
    echo "  ✓ S3 bucket emptied and deleted"
    echo "  ✓ ECR repositories deleted"
    echo "  ✓ EKS cluster deleted"
    echo "  ✓ VPC and networking resources deleted"
    echo "  ✓ All AWS resources cleaned up"
    echo ""
    print_warning "If you created any manual resources, please clean them up manually"
    print_warning "Check your AWS bill to ensure all resources are deleted"
}

# Handle script interruption
trap 'print_error "Destruction interrupted"; exit 1' INT TERM

# Run main function
main "$@"
