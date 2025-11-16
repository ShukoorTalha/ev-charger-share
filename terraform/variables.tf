# Terraform Variables for EV ChargerShare EKS Deployment

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "ev-chargershare"
}

variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
  default     = "ev-chargershare-cluster"
}

variable "kubernetes_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.31"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.20.0/24"]
}

# EKS Configuration
variable "cluster_endpoint_public_access_cidrs" {
  description = "List of CIDR blocks that can access the Amazon EKS public API server endpoint"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 7
}

# Redis Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes in the Redis cluster"
  type        = number
  default     = 1
}

# Application Configuration
variable "app_domain" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

variable "ssl_certificate_arn" {
  description = "ARN of SSL certificate for HTTPS"
  type        = string
  default     = ""
}

# Database Configuration (for future RDS integration)
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_engine_version" {
  description = "RDS engine version"
  type        = string
  default     = "8.0"
}

# Application Environment Variables
variable "jwt_secret" {
  description = "JWT secret key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "jwt_refresh_secret" {
  description = "JWT refresh secret key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_secret_key" {
  description = "Stripe secret key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_publishable_key" {
  description = "Stripe publishable key"
  type        = string
  default     = ""
}

variable "aws_access_key_id" {
  description = "AWS Access Key ID for S3"
  type        = string
  sensitive   = true
  default     = ""
}

variable "aws_secret_access_key" {
  description = "AWS Secret Access Key for S3"
  type        = string
  sensitive   = true
  default     = ""
}

variable "email_host" {
  description = "SMTP host for email sending"
  type        = string
  default     = ""
}

variable "email_port" {
  description = "SMTP port for email sending"
  type        = string
  default     = "587"
}

variable "email_user" {
  description = "SMTP username for email sending"
  type        = string
  default     = ""
}

variable "email_password" {
  description = "SMTP password for email sending"
  type        = string
  sensitive   = true
  default     = ""
}

variable "opencage_api_key" {
  description = "OpenCage API key for geocoding"
  type        = string
  sensitive   = true
  default     = ""
}

# Monitoring and Alerting
variable "enable_monitoring" {
  description = "Enable CloudWatch monitoring and alerting"
  type        = bool
  default     = true
}

variable "enable_backup" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

# Scaling Configuration
variable "min_nodes" {
  description = "Minimum number of nodes in EKS Auto Mode"
  type        = number
  default     = 1
}

variable "max_nodes" {
  description = "Maximum number of nodes in EKS Auto Mode"
  type        = number
  default     = 10
}

variable "desired_nodes" {
  description = "Desired number of nodes in EKS Auto Mode"
  type        = number
  default     = 2
}

# Cost Optimization
variable "enable_spot_instances" {
  description = "Enable spot instances for cost optimization"
  type        = bool
  default     = false
}

variable "instance_types" {
  description = "List of instance types for EKS nodes"
  type        = list(string)
  default     = ["t3.medium", "t3.large"]
}

# Security
variable "enable_secrets_encryption" {
  description = "Enable encryption of Kubernetes secrets"
  type        = bool
  default     = true
}

variable "enable_network_policy" {
  description = "Enable Kubernetes network policies"
  type        = bool
  default     = true
}

# Backup and Disaster Recovery
variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "enable_cross_region_backup" {
  description = "Enable cross-region backup replication"
  type        = bool
  default     = false
}
