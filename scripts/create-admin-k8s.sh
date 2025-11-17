#!/bin/bash

# Create admin user in Kubernetes environment
set -e

echo "🔧 Creating admin user in Kubernetes..."

# Check if kubectl is configured
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ kubectl is not configured or cluster is not accessible"
    exit 1
fi

# Check if we're in the right namespace
CURRENT_NAMESPACE=$(kubectl config view --minify --output 'jsonpath={..namespace}')
if [[ "$CURRENT_NAMESPACE" != "evchargershare" ]]; then
    echo "📋 Switching to evchargershare namespace..."
    kubectl config set-context --current --namespace=evchargershare
fi

# Method 1: Using Kubernetes Job (Recommended)
echo "🚀 Method 1: Creating admin user using Kubernetes Job..."
echo ""
echo "1️⃣  Default Admin User:"
echo "   Email: admin@evchargershare.com"
echo "   Password: Admin123!"
echo ""
echo "2️⃣  Custom Admin User:"
echo "   You can customize the email, password, and name"
echo ""

read -p "Choose method (1 for default, 2 for custom, 3 for direct pod execution): " -n 1 -r
echo

case $REPLY in
    1)
        echo "🔧 Creating default admin user..."
        kubectl apply -f k8s/create-admin-job.yaml
        
        echo "⏳ Waiting for job to complete..."
        kubectl wait --for=condition=complete --timeout=60s job/create-admin-user
        
        echo "📋 Job logs:"
        kubectl logs job/create-admin-user
        
        echo "🧹 Cleaning up job..."
        kubectl delete job create-admin-user
        ;;
    2)
        echo "🔧 Creating custom admin user..."
        read -p "Enter admin email: " ADMIN_EMAIL
        read -s -p "Enter admin password: " ADMIN_PASSWORD
        echo
        read -p "Enter admin name: " ADMIN_NAME
        
        # Create temporary job with custom values
        cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: create-custom-admin-user
  namespace: evchargershare
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: create-custom-admin
        image: chargershare-backend:latest
        imagePullPolicy: Never
        command: ["node", "scripts/createAdmin.js"]
        args: ["--email", "$ADMIN_EMAIL", "--password", "$ADMIN_PASSWORD", "--name", "$ADMIN_NAME"]
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
  backoffLimit: 3
EOF
        
        echo "⏳ Waiting for job to complete..."
        kubectl wait --for=condition=complete --timeout=60s job/create-custom-admin-user
        
        echo "📋 Job logs:"
        kubectl logs job/create-custom-admin-user
        
        echo "🧹 Cleaning up job..."
        kubectl delete job create-custom-admin-user
        ;;
    3)
        echo "🔧 Using direct pod execution..."
        
        # Get a running backend pod
        BACKEND_POD=$(kubectl get pods -l app=backend -o jsonpath='{.items[0].metadata.name}')
        
        if [[ -z "$BACKEND_POD" ]]; then
            echo "❌ No backend pods found. Make sure the application is deployed."
            exit 1
        fi
        
        echo "📋 Using backend pod: $BACKEND_POD"
        
        read -p "Use default admin credentials? (y/N): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "🔧 Creating default admin user..."
            kubectl exec $BACKEND_POD -- node scripts/createAdmin.js
        else
            read -p "Enter admin email: " ADMIN_EMAIL
            read -s -p "Enter admin password: " ADMIN_PASSWORD
            echo
            read -p "Enter admin name: " ADMIN_NAME
            
            echo "🔧 Creating custom admin user..."
            kubectl exec $BACKEND_POD -- node scripts/createAdmin.js --email "$ADMIN_EMAIL" --password "$ADMIN_PASSWORD" --name "$ADMIN_NAME"
        fi
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "✅ Admin user creation process completed!"
echo ""
echo "🔐 Admin Login Information:"
echo "   Access the admin panel at: http://localhost:8080/admin"
echo "   Use the credentials you specified above"
echo ""
echo "⚠️  Security Reminder:"
echo "   - Change the default password after first login"
echo "   - Enable 2FA if available"
echo "   - Review admin permissions regularly"
