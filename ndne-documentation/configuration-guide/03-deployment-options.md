# NDNE Deployment Options

This document outlines various options for deploying the NDNE prototype, from development environments to production deployment considerations.

## Docker Compose (Development/Testing)

Docker Compose is the primary method for running the NDNE prototype in development and testing environments. It orchestrates the following services:

- **postgres**: PostgreSQL database
- **redis**: Redis server for caching and session management
- **backend**: Node.js backend API
- **frontend**: React frontend application

### Docker Compose Configuration

The Docker Compose configuration is defined in `docker-compose.yml` in the project root:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: ndne
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
  redis:
    image: redis:7
    ports:
      - "6379:6379"
  backend:
    image: node:18
    working_dir: /app
    volumes:
      - ./backend:/app
      - /app/node_modules
      - ./tsconfig.json:/tsconfig.json:ro
    ports:
      - "4000:4000"
    command: sh -c "npm install && npm run dev"
    environment:
      DB_URL: postgres://user:pass@postgres:5432/ndne
      REDIS_URL: redis://redis:6379
      JWT_SECRET: your_jwt_secret
      OPENROUTER_API_KEY: your_openrouter_api_key
      CORS_ORIGINS: http://localhost:5173,http://localhost:5174
      # Discourse API Settings
      DISCOURSE_URL: ${DISCOURSE_URL:-http://localhost:3000}
      DISCOURSE_API_KEY: ${DISCOURSE_API_KEY:-your_discourse_api_key}
      DISCOURSE_API_USERNAME: ${DISCOURSE_API_USERNAME:-system}
  frontend:
    image: node:18
    working_dir: /app
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "5173:5173"
    command: sh -c "npm install && npm run dev"
    depends_on:
      - backend
volumes:
  pgdata:
```

### Running with Docker Compose

To start the application using Docker Compose:

```bash
# Build and start all services in detached mode
docker-compose up -d --build

# View logs from all services
docker-compose logs -f

# View logs from a specific service
docker-compose logs -f backend

# Stop all services
docker-compose down

# Stop all services and remove volumes
docker-compose down -v
```

After starting the services, you can access:
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000

### Docker Compose for Discourse

The NDNE prototype requires a Discourse forum instance. There is a separate Docker Compose configuration in the `discourse` directory for setting up Discourse if needed:

```bash
cd discourse
docker-compose up -d
```

Refer to `discourse/INSTALLATION.md` and `discourse/NDNE_CONFIGURATION.md` for detailed instructions on setting up and configuring Discourse.

## Production Deployment Considerations

For production deployments, you'll need a more robust and scalable infrastructure. Here are key considerations and options:

### Managed Database Services

In production, it's recommended to use managed database services instead of containerized databases:

- **AWS RDS**: Amazon's Relational Database Service for PostgreSQL
- **Google Cloud SQL**: Google's managed PostgreSQL service
- **Azure Database for PostgreSQL**: Microsoft's managed PostgreSQL service
- **Digital Ocean Managed Databases**: Managed PostgreSQL offering

Configuration steps:
1. Create a managed PostgreSQL instance
2. Configure security groups/network access to allow connections from your backend
3. Update the `DB_URL` environment variable with the connection string

Example AWS RDS connection string:
```
postgres://username:password@your-instance.rds.amazonaws.com:5432/ndne
```

### Managed Redis Services

Similarly, use managed Redis services for production:

- **AWS ElastiCache**: Amazon's managed Redis service
- **Google Cloud Memorystore**: Google's managed Redis service
- **Azure Cache for Redis**: Microsoft's managed Redis service
- **Digital Ocean Managed Redis**: Digital Ocean's Redis offering

Configuration steps:
1. Create a managed Redis instance
2. Configure security groups/network access
3. Update the `REDIS_URL` environment variable

Example AWS ElastiCache connection string:
```
redis://your-instance.cache.amazonaws.com:6379
```

### Container Orchestration

For production, you'll need a more robust container orchestration system than Docker Compose:

#### Kubernetes

Kubernetes provides a powerful platform for containerized applications:

1. Create Kubernetes deployment YAML files for backend and frontend
2. Define services to expose your applications
3. Use ConfigMaps and Secrets for environment variables
4. Deploy using `kubectl apply`

Example backend deployment (simplified):
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ndne-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ndne-backend
  template:
    metadata:
      labels:
        app: ndne-backend
    spec:
      containers:
      - name: backend
        image: your-registry/ndne-backend:latest
        ports:
        - containerPort: 4000
        env:
        - name: DB_URL
          valueFrom:
            secretKeyRef:
              name: ndne-secrets
              key: db-url
        # Additional environment variables...
```

#### AWS ECS (Elastic Container Service)

AWS ECS provides a simpler alternative to Kubernetes:

1. Create task definitions for your containers
2. Define ECS services to run your tasks
3. Use an Application Load Balancer to route traffic

#### Docker Swarm

Docker Swarm is a simpler orchestration option that extends Docker Compose:

1. Initialize a Swarm: `docker swarm init`
2. Deploy using a modified Docker Compose file: `docker stack deploy -c docker-compose.prod.yml ndne`

### Reverse Proxy Setup

In production, you should use a reverse proxy for SSL termination and load balancing:

#### Nginx

Example Nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # Frontend static files
    location / {
        proxy_pass http://frontend:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api {
        proxy_pass http://backend:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Traefik

Traefik is a modern reverse proxy that integrates well with container orchestration platforms:

1. Deploy Traefik using its Docker image
2. Configure routes using labels in your Docker Compose/Kubernetes files
3. Enable automatic SSL certificate generation with Let's Encrypt

### Environment Variable Management

For production, store sensitive environment variables securely:

#### Kubernetes Secrets

```bash
kubectl create secret generic ndne-secrets \
  --from-literal=DB_URL=postgres://user:pass@db-host:5432/ndne \
  --from-literal=JWT_SECRET=your-secret-key \
  --from-literal=OPENROUTER_API_KEY=your-api-key
```

#### AWS Parameter Store / Secrets Manager

1. Store secrets in AWS Parameter Store or Secrets Manager
2. Configure your application to retrieve secrets at runtime
3. Use IAM roles to control access to secrets

#### HashiCorp Vault

For advanced secret management:
1. Deploy HashiCorp Vault
2. Store secrets in Vault
3. Configure your application to retrieve secrets using the Vault API

### Persistent Storage

For data that needs to persist between deployments:

#### Kubernetes Persistent Volumes

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

#### Cloud Storage Solutions

- **AWS EBS/EFS**: For persistent storage in AWS
- **Google Cloud Persistent Disks**: For GCP
- **Azure Disk Storage**: For Azure

### Scaling Backend and Frontend Services

To handle increased load:

#### Horizontal Scaling

1. Deploy multiple replicas of your backend service
2. Use a load balancer to distribute traffic
3. Ensure your application is stateless or uses Redis for session storage

Example Kubernetes HorizontalPodAutoscaler:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ndne-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ndne-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

#### Vertical Scaling

Increase resources allocated to your containers:
- CPU and memory limits in Kubernetes
- Instance sizes in cloud platforms

### Continuous Integration and Deployment (CI/CD)

Automate your deployment process:

#### GitHub Actions

Example workflow:
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Build and push Docker images
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: your-registry/ndne-backend:latest
    
    - name: Deploy to Kubernetes
      uses: steebchen/kubectl@v2
      with:
        config: ${{ secrets.KUBE_CONFIG_DATA }}
        command: apply -f k8s/production
```

#### AWS CodePipeline / CodeBuild

1. Configure CodeBuild to build Docker images
2. Use CodePipeline to automate the deployment workflow
3. Deploy to ECS or EKS

### Monitoring and Logging

For production, implement comprehensive monitoring:

#### Logging Solutions

- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Graylog**: Centralized log management
- **AWS CloudWatch Logs**: Logging for AWS deployments

#### Monitoring Tools

- **Prometheus + Grafana**: Metrics collection and visualization
- **Datadog**: Comprehensive monitoring platform
- **New Relic**: Application performance monitoring

### Backup and Disaster Recovery

Implement a backup strategy:

1. Regular database backups
2. Automated snapshot schedules
3. Backup verification procedures
4. Disaster recovery plan with defined RTO/RPO

## Environment-Specific Configurations

Maintain separate configurations for different environments:

### Development

- Local Docker Compose setup
- Debug logging enabled
- Non-sensitive default credentials

### Staging

- Cloud-based deployment
- Mirrors production configuration
- Uses separate databases/resources from production

### Production

- Fully scaled deployment
- Enhanced security measures
- Regular backups
- High availability configuration

Manage these configurations using:
- Environment-specific Docker Compose files
- Kubernetes namespace-based configuration
- Environment-specific CI/CD pipelines

## Deployment Checklist

Before deploying to production:

1. **Security Review**
   - Secure all endpoints with authentication
   - Use HTTPS everywhere
   - Rotate API keys and secrets
   - Review Docker images for vulnerabilities

2. **Performance Testing**
   - Load test the API
   - Verify database query performance
   - Test auto-scaling capabilities

3. **Backup Verification**
   - Test database backup and restore procedures
   - Verify data integrity after restore

4. **Monitoring Setup**
   - Configure alerts for critical metrics
   - Set up uptime monitoring
   - Implement log aggregation

5. **Documentation**
   - Document deployment procedures
   - Create runbooks for common issues
   - Update configuration guides

## Conclusion

This guide provides an overview of deployment options for the NDNE prototype. For development and testing, Docker Compose provides a simple solution. For production deployments, consider using managed services, container orchestration, and implementing proper security, monitoring, and backup strategies.

The specific deployment approach will depend on your requirements, budget, and existing infrastructure. Start with a simple deployment and evolve it as your needs grow.