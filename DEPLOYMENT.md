# Deployment Guide - Attack Detection Dashboard

## Prerequisites

- Docker installed
- Docker Compose installed
- Git

## Quick Start with Docker Compose

### 1. Build and Run

```bash
docker-compose up --build
```

The dashboard will be available at `http://localhost:3000`

### 2. Run in Background

```bash
docker-compose up -d --build
```

### 3. View Logs

```bash
docker-compose logs -f dashboard
```

### 4. Stop the Container

```bash
docker-compose down
```

## Configuration

### Update Backend API URL

If your backend API is running on a different host or port, update the `docker-compose.yml`:

```yaml
environment:
  - VITE_API_URL=http://your-backend-host:port
```

Or create a `.env` file in the project root:

```
VITE_API_URL=http://localhost:8000
```

## Manual Docker Build (without Compose)

### Build the Image

```bash
docker build -t attack-detection-dashboard:latest .
```

### Run the Container

```bash
docker run -d \
  --name dashboard \
  -p 3000:3000 \
  -e VITE_API_URL=http://localhost:8000 \
  attack-detection-dashboard:latest
```

## Production Deployment

For production, consider:

1. **Use a reverse proxy** (Nginx, Apache) in front of the container
2. **Add SSL/TLS certificates** for HTTPS
3. **Set resource limits** in docker-compose.yml:

```yaml
services:
  dashboard:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

4. **Use environment-specific configs**:

```yaml
# For production
environment:
  - NODE_ENV=production
  - VITE_API_URL=https://api.example.com
```

## Troubleshooting

### Container won't start
```bash
docker-compose logs dashboard
```

### Port already in use
Change the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "8080:3000"  # Access at localhost:8080
```

### Clear Docker cache and rebuild
```bash
docker-compose down
docker system prune -a
docker-compose up --build
```

## Health Check

The container includes a health check. Check container health:

```bash
docker ps
# Look for the STATUS column showing (healthy) or (unhealthy)
```
