# Terraform Outputs for EV ChargerShare EKS Deployment

# EKS Cluster Information
output "cluster_id" {
  description = "EKS cluster ID"
  value       = aws_eks_cluster.main.id
}

output "cluster_arn" {
  description = "EKS cluster ARN"
  value       = aws_eks_cluster.main.arn
}

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}

output "cluster_iam_role_name" {
  description = "IAM role name associated with EKS cluster"
  value       = aws_iam_role.eks_cluster.name
}

output "cluster_iam_role_arn" {
  description = "IAM role ARN associated with EKS cluster"
  value       = aws_iam_role.eks_cluster.arn
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
}

output "cluster_primary_security_group_id" {
  description = "The cluster primary security group ID created by the EKS cluster"
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}

# VPC Information
output "vpc_id" {
  description = "ID of the VPC where the cluster is deployed"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnets" {
  description = "List of IDs of public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnets" {
  description = "List of IDs of private subnets"
  value       = aws_subnet.private[*].id
}

output "nat_gateway_ids" {
  description = "List of IDs of the NAT Gateways"
  value       = aws_nat_gateway.main[*].id
}

# ECR Repository Information
output "ecr_backend_repository_url" {
  description = "URL of the ECR repository for backend"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_repository_url" {
  description = "URL of the ECR repository for frontend"
  value       = aws_ecr_repository.frontend.repository_url
}

output "ecr_backend_registry_id" {
  description = "Registry ID of the ECR repository for backend"
  value       = aws_ecr_repository.backend.registry_id
}

output "ecr_frontend_registry_id" {
  description = "Registry ID of the ECR repository for frontend"
  value       = aws_ecr_repository.frontend.registry_id
}

# S3 Bucket Information
output "s3_bucket_name" {
  description = "Name of the S3 bucket for application assets"
  value       = aws_s3_bucket.app_assets.bucket
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket for application assets"
  value       = aws_s3_bucket.app_assets.arn
}

output "s3_bucket_domain_name" {
  description = "Domain name of the S3 bucket"
  value       = aws_s3_bucket.app_assets.bucket_domain_name
}

output "s3_bucket_regional_domain_name" {
  description = "Regional domain name of the S3 bucket"
  value       = aws_s3_bucket.app_assets.bucket_regional_domain_name
}

# ElastiCache Redis Information
output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_port" {
  description = "Redis cluster port"
  value       = aws_elasticache_replication_group.redis.port
}

output "redis_configuration_endpoint" {
  description = "Redis configuration endpoint"
  value       = aws_elasticache_replication_group.redis.configuration_endpoint_address
}

# Security Groups
output "eks_cluster_security_group_id" {
  description = "Security group ID for EKS cluster"
  value       = aws_security_group.eks_cluster.id
}

output "rds_security_group_id" {
  description = "Security group ID for RDS"
  value       = aws_security_group.rds.id
}

output "elasticache_security_group_id" {
  description = "Security group ID for ElastiCache"
  value       = aws_security_group.elasticache.id
}

# IAM Roles
output "node_group_iam_role_name" {
  description = "IAM role name for EKS node group"
  value       = aws_iam_role.eks_node_group.name
}

output "node_group_iam_role_arn" {
  description = "IAM role ARN for EKS node group"
  value       = aws_iam_role.eks_node_group.arn
}

# Region and Account Information
output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}

output "aws_account_id" {
  description = "AWS account ID"
  value       = data.aws_caller_identity.current.account_id
}

# Kubectl Configuration Command
output "kubectl_config_command" {
  description = "Command to configure kubectl"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${var.cluster_name}"
}

# Docker Login Commands for ECR
output "ecr_login_command" {
  description = "Command to login to ECR"
  value       = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}

# Application Configuration
output "application_config" {
  description = "Application configuration for Kubernetes deployment"
  value = {
    mongodb_uri = "mongodb://mongodb-service:27017/evchargershare"
    redis_url   = "redis://${aws_elasticache_replication_group.redis.primary_endpoint_address}:${aws_elasticache_replication_group.redis.port}"
    s3_bucket   = aws_s3_bucket.app_assets.bucket
    aws_region  = var.aws_region
  }
  sensitive = false
}

# Load Balancer Information (will be available after ALB controller installation)
output "load_balancer_dns" {
  description = "DNS name of the load balancer (available after deployment)"
  value       = "Will be available after deploying the application with ALB controller"
}

# Monitoring and Logging
output "cloudwatch_log_group_name" {
  description = "CloudWatch log group name for EKS cluster"
  value       = aws_cloudwatch_log_group.eks_cluster.name
}

output "cloudwatch_log_group_arn" {
  description = "CloudWatch log group ARN for EKS cluster"
  value       = aws_cloudwatch_log_group.eks_cluster.arn
}

# Cost Estimation
output "estimated_monthly_cost" {
  description = "Estimated monthly cost breakdown"
  value = {
    eks_cluster     = "$73.00 (cluster) + $30-100 (nodes)"
    elasticache     = "$15-30 (t3.micro)"
    nat_gateways    = "$45.00 (2 NAT gateways)"
    s3_storage      = "$0.023/GB"
    data_transfer   = "Variable based on usage"
    total_estimate  = "$163-248/month (excluding data transfer and S3 storage)"
  }
}

# Next Steps
output "next_steps" {
  description = "Next steps after Terraform deployment"
  value = [
    "1. Configure kubectl: ${local.kubectl_config_command}",
    "2. Install AWS Load Balancer Controller",
    "3. Deploy application using Kubernetes manifests",
    "4. Configure DNS and SSL certificates",
    "5. Set up monitoring and alerting",
    "6. Configure backup and disaster recovery"
  ]
}

locals {
  kubectl_config_command = "aws eks update-kubeconfig --region ${var.aws_region} --name ${var.cluster_name}"
}
