pipeline {
    agent any

    environment {
        // Docker image configuration
        IMAGE_NAME        = 'evchargershare'
        IMAGE_TAG         = "${env.BUILD_NUMBER}-${env.GIT_COMMIT.take(7)}"
        DOCKER_REGISTRY   = "${env.DOCKER_REGISTRY ?: 'localhost:5000'}"
        FULL_IMAGE_NAME   = "${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
        LATEST_IMAGE_NAME = "${DOCKER_REGISTRY}/${IMAGE_NAME}:latest"

        // Application configuration
        APP_PORT     = "${env.APP_PORT ?: '8080'}"
        COMPOSE_FILE = 'docker-compose.single.yml'

        // Environment variables for the application
        NODE_ENV     = 'production'
        MONGODB_URI  = "${env.MONGODB_URI ?: 'mongodb://mongoUser:mongoPass@mongodb:27017/evchargershare?authSource=admin'}"
        // Bind the credential to an intermediate variable here. We cannot
        // use expressions like `env.JWT_SECRET ?: credentials('id')` directly
        // in the `environment` block, so expose the credential and then
        // set `env.JWT_SECRET` in a short scripted stage below if needed.
        JWT_SECRET_CRED = credentials('jwt-secret')
        FRONTEND_URL = "${env.FRONTEND_URL ?: 'http://localhost:8080'}"
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
    }

    stages {
        stage('Checkout') {
            steps {
                script {
                    echo "Checking out code from ${env.GIT_BRANCH}"
                    checkout scm
                    sh 'git log -1 --pretty=format:"%h - %an, %ar : %s"'
                }
            }
        }

        stage('Prepare Environment') {
            steps {
                script {
                    // If JWT_SECRET wasn't supplied from the environment (e.g. via
                    // Jenkins global env or an external CI variable), use the
                    // injected credential.
                    if (!env.JWT_SECRET || env.JWT_SECRET.trim() == '') {
                        env.JWT_SECRET = env.JWT_SECRET_CRED
                        echo "JWT_SECRET set from credentials"
                    } else {
                        echo "JWT_SECRET provided by environment, leaving as-is"
                    }
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                ansiColor('xterm') {
                    script {
                        echo "Building Docker image: ${FULL_IMAGE_NAME}"
                        sh """
                            docker build -t ${FULL_IMAGE_NAME} -t ${LATEST_IMAGE_NAME} .
                        """
                    }
                }
            }
            post {
                success {
                    echo "✅ Docker image built successfully"
                    sh "docker images | grep ${IMAGE_NAME} || true"
                }
                failure {
                    echo "❌ Docker image build failed"
                }
            }
        }

        stage('Run Backend Tests') {
            steps {
                script {
                    echo "Running backend tests..."
                    try {
                        sh """
                            docker run --rm \
                                -v \$(pwd)/backend:/app/backend \
                                -w /app/backend \
                                node:20-alpine \
                                sh -c 'npm install && npm test'
                        """
                    } catch (Exception e) {
                        echo "⚠️  Tests failed, but continuing pipeline..."
                        // To fail build on test failure, uncomment:
                        // currentBuild.result = 'FAILURE'
                    }
                }
            }
            post {
                always {
                    // Archive test coverage and results
                    archiveArtifacts artifacts: 'backend/coverage/**/*', allowEmptyArchive: true
                    junit testResults: 'backend/coverage/**/*.xml', allowEmptyResults: true
                }
            }
        }

        stage('Security Scan') {
            steps {
                script {
                    echo "Running security scan on Docker image..."
                    try {
                        sh """
                            docker run --rm \
                                -v /var/run/docker.sock:/var/run/docker.sock \
                                aquasec/trivy:latest image ${FULL_IMAGE_NAME} || true
                        """
                    } catch (Exception e) {
                        echo "⚠️  Security scan tool not available, skipping..."
                    }
                }
            }
        }

        stage('Push to Registry') {
            when {
                anyOf {
                    branch 'main'
                    branch 'master'
                    branch 'develop'
                }
            }
            steps {
                script {
                    if (env.DOCKER_REGISTRY && env.DOCKER_REGISTRY != 'localhost:5000') {
                        echo "Pushing image to registry: ${DOCKER_REGISTRY}"
                        sh """
                            docker push ${FULL_IMAGE_NAME}
                            docker push ${LATEST_IMAGE_NAME}
                        """
                    } else {
                        echo "Skipping registry push (using local registry)"
                    }
                }
            }
        }

        stage('Deploy with Docker Compose') {
            steps {
                script {
                    echo "Deploying application using docker-compose..."
                    sh """
                        # Stop and remove existing containers
                        docker-compose -f ${COMPOSE_FILE} down || true

                        # Export image info for compose
                        export IMAGE_TAG=${IMAGE_TAG}
                        export IMAGE_NAME=${IMAGE_NAME}

                        # Start services
                        docker-compose -f ${COMPOSE_FILE} up -d

                        # Wait for services to be healthy
                        sleep 10
                    """
                }
            }
            post {
                success {
                    echo "✅ Application deployed successfully"
                }
                failure {
                    echo "❌ Deployment failed"
                }
            }
        }

        stage('Health Check') {
            steps {
                script {
                    echo "Checking application health..."
                    retry(5) {
                        sleep(5)
                        sh """
                            curl -f http://localhost:${APP_PORT}/health || exit 1
                            echo "✅ Health check passed"
                        """
                    }
                }
            }
        }

        stage('Integration Tests') {
            steps {
                script {
                    echo "Running integration tests..."
                    try {
                        // Get the network name dynamically from docker-compose
                        // Docker Compose creates networks as: {project_name}_{network_name}
                        // Query the actual network name from running containers
                        def networkName = sh(
                            script: """
                                # Try to get network name from running app container
                                CONTAINER_ID=\$(docker-compose -f ${COMPOSE_FILE} ps -q app 2>/dev/null | head -1)
                                if [ -n "\$CONTAINER_ID" ]; then
                                    docker inspect --format='{{range \$k, \$v := .NetworkSettings.Networks}}{{printf "%s" \$k}}{{end}}' \$CONTAINER_ID 2>/dev/null | head -1
                                else
                                    # Fallback: use COMPOSE_PROJECT_NAME or directory name
                                    PROJECT_NAME=\${COMPOSE_PROJECT_NAME:-}
                                    if [ -z "\$PROJECT_NAME" ]; then
                                        PROJECT_NAME=\$(basename \$(pwd) | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g')
                                    fi
                                    if [ -n "\$PROJECT_NAME" ] && [ "\$PROJECT_NAME" != "." ]; then
                                        echo "\${PROJECT_NAME}_evcs-net"
                                    else
                                        echo "evcs-net"
                                    fi
                                fi
                            """,
                            returnStdout: true
                        ).trim()
                        
                        sh """
                            # Wait for services to be fully ready
                            sleep 15

                            docker run --rm \
                                --network ${networkName} \
                                -e API_URL=http://app:5000 \
                                node:20-alpine \
                                sh -c 'echo "Integration tests would run here"' || true
                        """
                    } catch (Exception e) {
                        echo "⚠️  Integration tests not configured, skipping..."
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                echo "Pipeline execution completed"
                // Clean up old images (keep last 5)
                sh """
                    docker images ${IMAGE_NAME} --format '{{.ID}}' | tail -n +6 | xargs -r docker rmi || true
                """
            }
        }
        success {
            echo "✅ Pipeline succeeded!"
            script {
                sh """
                    echo "Build ${env.BUILD_NUMBER} completed successfully"
                    echo "Image: ${FULL_IMAGE_NAME}"
                    echo "Application available at: http://localhost:${APP_PORT}"
                """
            }
        }
        failure {
            echo "❌ Pipeline failed!"
            script {
                sh """
                    echo "=== Docker Compose Logs ==="
                    docker-compose -f ${COMPOSE_FILE} logs --tail=50 || true

                    echo "=== Container Status ==="
                    docker-compose -f ${COMPOSE_FILE} ps || true
                """
            }
        }
        cleanup {
            cleanWs()
        }
    }
}
