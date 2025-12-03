# Jenkins CI/CD Pipeline for EV ChargerShare

This repository includes a comprehensive Jenkins pipeline for building, testing, and deploying the EV ChargerShare application.

## Prerequisites

1. **Jenkins** installed and running
2. **Docker** installed on Jenkins agent
3. **Docker Compose** installed on Jenkins agent
4. **Required Jenkins Plugins:**
   - Docker Pipeline
   - Docker Compose Build Step
   - Git
   - Timestamper
   - AnsiColor

## Setup Instructions

### 1. Configure Jenkins Credentials

Create the following credentials in Jenkins (Manage Jenkins → Credentials):

- **JWT Secret** (Secret text): `jwt-secret`
  - Value: Your JWT secret key for production

### 2. Configure Environment Variables

In your Jenkins job configuration, add the following environment variables (or use `.jenkins.env.example` as a template):

```groovy
DOCKER_REGISTRY=your-registry.com:5000  // Optional: for pushing images
APP_PORT=8080
MONGODB_URI=mongodb://mongoUser:mongoPass@mongodb:27017/evchargershare?authSource=admin
JWT_SECRET=your_secret_key
FRONTEND_URL=http://localhost:8080
```

### 3. Create Jenkins Pipeline Job

1. Go to Jenkins → New Item
2. Select "Pipeline"
3. In Pipeline configuration:
   - Definition: Pipeline script from SCM
   - SCM: Git
   - Repository URL: Your repository URL
   - Script Path: `Jenkinsfile`

### 4. Pipeline Stages

The pipeline includes the following stages:

1. **Checkout**: Checks out the code from Git
2. **Build Docker Image**: Builds the Docker image with version tags
3. **Run Backend Tests**: Executes backend unit tests
4. **Security Scan**: Runs Trivy security scan (optional)
5. **Push to Registry**: Pushes image to Docker registry (for main/master/develop branches)
6. **Deploy with Docker Compose**: Deploys the application using docker-compose
7. **Health Check**: Verifies the application is running
8. **Integration Tests**: Runs integration tests (if configured)

## Usage

### Manual Build

```bash
# Build the image
docker build -t evchargershare:latest .

# Run with docker-compose
docker-compose -f docker-compose.single.yml up -d
```

### Jenkins Build

1. Trigger the pipeline manually or via webhook
2. Monitor the build progress in Jenkins
3. Access the application at `http://localhost:8080` (or configured port)

## Environment Variables

All environment variables can be configured in:
- Jenkins job configuration
- `.env` file (for local development)
- Docker Compose file

See `.jenkins.env.example` for all available variables.

## Troubleshooting

### Build Fails

1. Check Docker is running: `docker ps`
2. Verify Docker Compose is installed: `docker-compose --version`
3. Check Jenkins logs for specific errors

### Tests Fail

- Tests are configured to not fail the build (can be changed in Jenkinsfile)
- Check test output in Jenkins console
- Test results are archived as artifacts

### Deployment Issues

- Check container logs: `docker-compose -f docker-compose.single.yml logs`
- Verify health checks: `docker-compose -f docker-compose.single.yml ps`
- Check network connectivity between containers

## Customization

### Modify Pipeline Stages

Edit `Jenkinsfile` to add/remove stages:
- Add linting stage
- Add frontend tests
- Add deployment to staging/production
- Add notification stages (Slack, email, etc.)

### Change Ports

Update `APP_PORT` environment variable or modify `docker-compose.single.yml`

### Use External Services

To use external MongoDB/Redis instead of containers:
1. Remove `mongodb` and `redis` services from `docker-compose.single.yml`
2. Update `MONGODB_URI` to point to external service
3. Remove `depends_on` from app service

## Production Deployment

For production deployments:

1. **Use Secrets Management**: Store sensitive data in Jenkins credentials or secret management system
2. **Use Image Registry**: Push images to a private registry
3. **Configure Monitoring**: Add monitoring and alerting
4. **Set Up Backups**: Configure MongoDB and Redis backups
5. **Use HTTPS**: Configure reverse proxy with SSL certificates
6. **Resource Limits**: Add resource limits to containers in docker-compose

## Support

For issues or questions, check:
- Application logs: `docker-compose -f docker-compose.single.yml logs app`
- Jenkins console output
- Docker container status: `docker-compose -f docker-compose.single.yml ps`

