# Deployment Guide - Attack Detection Dashboard

## Prerequisites

- Docker installed
- Docker Compose installed
- Git

## Quick Start with Docker Compose

### 1. Build and Run (Local Development)

```bash
docker-compose up --build
```

The dashboard will be available at `http://localhost:3000`

### 2. Deploy to Production with Your Domain

Create a `.env` file with your production API URL:

```bash
# .env
API_URL=https://api.yourdomain.com
```

Then run:

```bash
docker-compose up --build -d
```

### 3. View Logs

```bash
docker-compose logs -f dashboard
```

### 4. Stop the Container

```bash
docker-compose down
```

## How API URL Configuration Works

The dashboard now loads API configuration at **runtime** (not build time):

1. When container starts, it generates `/dist/config.json` with your `API_URL`
2. The dashboard loads this config.json when it starts
3. **No rebuild needed** - just change `API_URL` and restart container

### Via Environment Variable

```bash
# Set API_URL before running
export API_URL=https://api.yourdomain.com
docker-compose up --build -d
```

### Via .env File

Create `.env` file in project root:

```
API_URL=https://api.yourdomain.com
```

Run:

```bash
docker-compose up --build -d
```

### Via docker-compose.yml Direct Edit

Edit `docker-compose.yml`:

```yaml
services:
  dashboard:
    environment:
      - API_URL=https://api.yourdomain.com
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
  -e API_URL=https://api.yourdomain.com \
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
  - API_URL=https://api.yourdomain.com
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

### Dashboard not connecting to API
1. Check that `API_URL` is correct
2. Ensure backend API is accessible from container
3. Check CORS settings on backend API
4. View config.json: `curl http://localhost:3000/config.json`

### View Generated Config

```bash
# Inside container
docker exec attack-detection-dashboard cat /app/dist/config.json

# Or via curl
curl http://localhost:3000/config.json
```

## Health Check

The container includes a health check. Check container health:

```bash
docker ps
# Look for the STATUS column showing (healthy) or (unhealthy)
```

