# EV ChargerShare - AWS EKS Terraform Deployment

This directory contains Terraform configuration for deploying the EV ChargerShare application to AWS EKS Auto Mode with a complete production-ready infrastructure.

## 🏗️ Architecture Overview

The Terraform configuration creates:

- **EKS Auto Mode Cluster** - Managed Kubernetes cluster with automatic node scaling
- **VPC with Public/Private Subnets** - Secure network architecture across multiple AZs
- **ECR Repositories** - Container image storage for backend and frontend
- **ElastiCache Redis** - Session storage and caching
- **S3 Bucket** - File storage for application assets
- **Application Load Balancer** - HTTPS termination and traffic routing
- **Security Groups** - Network security controls
- **IAM Roles** - Secure service-to-service authentication
- **CloudWatch Logging** - Centralized logging and monitoring

## 📋 Prerequisites

Before deploying, ensure you have:

1. **AWS CLI** configured with appropriate credentials
2. **Terraform** >= 1.0 installed
3. **kubectl** installed for Kubernetes management
4. **Docker** installed for building images
5. **AWS Account** with sufficient permissions

### Required AWS Permissions

Your AWS user/role needs permissions for:
- EKS cluster management
- VPC and networking resources
- ECR repository management
- S3 bucket operations
- ElastiCache management
- IAM role creation
- CloudWatch logging

## 🚀 Quick Start

### 1. Configure Variables

```bash
# Copy the example variables file
cp terraform.tfvars.example terraform.tfvars

# Edit with your configuration
nano terraform.tfvars
```

### 2. Deploy Infrastructure

```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Run the deployment
./scripts/deploy.sh
```

The deployment script will:
- ✅ Check prerequisites
- ✅ Initialize Terraform
- ✅ Plan and apply infrastructure
- ✅ Configure kubectl
- ✅ Build and push Docker images
- ✅ Deploy application to Kubernetes
- ✅ Create admin user

### 3. Access Your Application

After deployment, the script will provide the application URL. You can also get it with:

```bash
kubectl get ingress evchargershare-ingress -n evchargershare
```

## 📁 File Structure

```
terraform/
├── main.tf                    # Main infrastructure resources
├── variables.tf               # Input variables
├── outputs.tf                 # Output values
├── kubernetes.tf              # Kubernetes and Helm configurations
├── terraform.tfvars.example   # Example variables file
├── scripts/
│   ├── deploy.sh             # Automated deployment script
│   └── destroy.sh            # Infrastructure destruction script
└── README.md                 # This file
```

## ⚙️ Configuration

### Key Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `aws_region` | AWS region for deployment | `us-west-2` |
| `environment` | Environment name (dev/staging/prod) | `dev` |
| `cluster_name` | EKS cluster name | `ev-chargershare-cluster` |
| `vpc_cidr` | VPC CIDR block | `10.0.0.0/16` |
| `app_domain` | Application domain name | `""` |
| `jwt_secret` | JWT secret key | **Required** |
| `stripe_secret_key` | Stripe secret key | Optional |

### Security Configuration

**⚠️ IMPORTANT: Change these in production!**

```hcl
# Security secrets - CHANGE THESE!
jwt_secret = "your-super-secret-jwt-key-change-in-production"
jwt_refresh_secret = "your-super-secret-refresh-key-change-in-production"
```

### Scaling Configuration

```hcl
# Node scaling
min_nodes = 1
max_nodes = 10
desired_nodes = 2

# Instance types
instance_types = ["t3.medium", "t3.large"]
```

## 🔧 Manual Operations

### Initialize Terraform Only

```bash
terraform init
terraform plan
terraform apply
```

### Configure kubectl

```bash
aws eks update-kubeconfig --region us-west-2 --name ev-chargershare-cluster
```

### Build and Push Images

```bash
# Login to ECR
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin ACCOUNT.dkr.ecr.us-west-2.amazonaws.com

# Build and push backend
cd ../backend
docker build -t ACCOUNT.dkr.ecr.us-west-2.amazonaws.com/ev-chargershare/backend:latest .
docker push ACCOUNT.dkr.ecr.us-west-2.amazonaws.com/ev-chargershare/backend:latest

# Build and push frontend
cd ../frontend
docker build -t ACCOUNT.dkr.ecr.us-west-2.amazonaws.com/ev-chargershare/frontend:latest .
docker push ACCOUNT.dkr.ecr.us-west-2.amazonaws.com/ev-chargershare/frontend:latest
```

### Deploy Application

```bash
# Apply Kubernetes manifests
kubectl apply -f ../k8s/
```

## 📊 Monitoring and Logging

### CloudWatch Logs

EKS cluster logs are automatically sent to CloudWatch:

```bash
# View cluster logs
aws logs describe-log-groups --log-group-name-prefix /aws/eks/ev-chargershare-cluster
```

### Application Logs

```bash
# View application logs
kubectl logs -f deployment/backend -n evchargershare
kubectl logs -f deployment/frontend -n evchargershare
```

### Monitoring Dashboard

```bash
# Get cluster info
kubectl cluster-info
kubectl get nodes
kubectl get pods -n evchargershare
```

## 🔒 Security Best Practices

### 1. Secrets Management

- Use AWS Secrets Manager for production secrets
- Rotate JWT secrets regularly
- Use IAM roles instead of access keys where possible

### 2. Network Security

- Private subnets for application workloads
- Security groups with minimal required access
- VPC endpoints for AWS services

### 3. Access Control

- RBAC for Kubernetes access
- IAM roles for service accounts (IRSA)
- Principle of least privilege

## 💰 Cost Optimization

### Estimated Monthly Costs

| Service | Cost |
|---------|------|
| EKS Cluster | $73.00 |
| EC2 Nodes (2x t3.medium) | ~$60.00 |
| ElastiCache (t3.micro) | ~$15.00 |
| NAT Gateways (2x) | $45.00 |
| Load Balancer | ~$20.00 |
| **Total Estimate** | **~$213/month** |

### Cost Reduction Tips

1. **Use Spot Instances**: Set `enable_spot_instances = true`
2. **Right-size Nodes**: Adjust `instance_types` based on usage
3. **Single NAT Gateway**: Use one NAT gateway for dev environments
4. **Reserved Instances**: Purchase RIs for production workloads

## 🛠️ Troubleshooting

### Common Issues

#### 1. EKS Cluster Creation Fails

```bash
# Check AWS service limits
aws service-quotas get-service-quota --service-code eks --quota-code L-1194D53C

# Check IAM permissions
aws sts get-caller-identity
```

#### 2. Pods Stuck in Pending

```bash
# Check node status
kubectl get nodes
kubectl describe nodes

# Check resource requests
kubectl describe pods -n evchargershare
```

#### 3. Load Balancer Not Working

```bash
# Check ingress status
kubectl get ingress -n evchargershare
kubectl describe ingress evchargershare-ingress -n evchargershare

# Check AWS Load Balancer Controller
kubectl get pods -n kube-system | grep aws-load-balancer-controller
```

#### 4. Application Not Accessible

```bash
# Check service endpoints
kubectl get services -n evchargershare
kubectl get endpoints -n evchargershare

# Check pod logs
kubectl logs -f deployment/backend -n evchargershare
```

### Debug Commands

```bash
# Cluster information
kubectl cluster-info dump

# Resource usage
kubectl top nodes
kubectl top pods -n evchargershare

# Events
kubectl get events -n evchargershare --sort-by='.lastTimestamp'
```

## 🔄 Updates and Maintenance

### Updating the Application

1. Build new Docker images
2. Push to ECR
3. Update Kubernetes deployments:

```bash
kubectl set image deployment/backend backend=NEW_IMAGE_URL -n evchargershare
kubectl set image deployment/frontend frontend=NEW_IMAGE_URL -n evchargershare
```

### Updating Infrastructure

```bash
# Plan changes
terraform plan

# Apply changes
terraform apply
```

### Backup and Recovery

```bash
# Backup Kubernetes resources
kubectl get all -n evchargershare -o yaml > backup.yaml

# Backup persistent data
# (MongoDB data should be backed up separately)
```

## 🗑️ Cleanup

### Destroy Infrastructure

```bash
# Run the destroy script
./scripts/destroy.sh
```

This will safely remove all AWS resources and clean up the infrastructure.

### Manual Cleanup

If the destroy script fails:

```bash
# Delete Kubernetes resources first
kubectl delete namespace evchargershare

# Empty S3 bucket
aws s3 rm s3://BUCKET_NAME --recursive

# Run Terraform destroy
terraform destroy
```

## 📞 Support

For issues and questions:

1. Check the troubleshooting section above
2. Review AWS CloudWatch logs
3. Check Kubernetes events and pod logs
4. Consult AWS EKS documentation

## 🔗 Useful Links

- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [AWS Load Balancer Controller](https://kubernetes-sigs.github.io/aws-load-balancer-controller/)

---

**⚠️ Important Notes:**

- Always test in a development environment first
- Review and understand all resources before deployment
- Monitor costs and set up billing alerts
- Regularly update and patch your infrastructure
- Follow AWS security best practices
