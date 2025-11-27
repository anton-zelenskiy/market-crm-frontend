# Production Deployment Guide

## Prerequisites

- Docker and Docker Compose installed on the production server
- Access to the production server
- Backend API URL configured
- Nginx reverse proxy running (nginx-bot repository)
- Frontend container must be on the same Docker network as nginx

## Quick Start

1. **Ensure nginx reverse proxy is running:**
   ```bash
   # In nginx-bot directory
   cd /path/to/nginx-bot
   docker-compose up -d
   
   # Find the network name
   docker network ls | grep reverse_proxy
   # Note the network name (usually: nginx-bot_reverse_proxy)
   ```

2. **Update frontend docker-compose network name:**
   ```bash
   # In market-crm-frontend directory
   # Edit docker-compose.yml and update the network name in reverse_proxy section
   # Use the network name from step 1
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   # Edit .env and set your production API URL
   ```

4. **Build and start the container:**
   ```bash
   docker-compose up -d --build
   ```

5. **Configure nginx-bot:**
   ```bash
   # In nginx-bot directory, update .env:
   FRONTEND_ENABLED=true
   FRONTEND_HOST=market-crm-frontend
   FRONTEND_PORT=80
   FRONTEND_BASE_LOCATION=/
   
   # Restart nginx
   docker-compose restart nginx
   ```

3. **Check logs:**
   ```bash
   docker-compose logs -f frontend
   ```

4. **Verify health:**
   ```bash
   curl http://localhost/health
   ```

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# API Base URL - Backend API endpoint
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1

# Frontend port (for docker-compose)
FRONTEND_PORT=80

# Nginx host (optional)
NGINX_HOST=yourdomain.com
```

**Important:** In Vite, environment variables must be prefixed with `VITE_` to be exposed to the client-side code.

## Production Checklist

### Before Deployment

- [ ] Set up environment variables in `.env` file
- [ ] Update `VITE_API_BASE_URL` to point to your production backend
- [ ] Ensure backend API is accessible from the frontend domain
- [ ] Configure CORS on backend to allow your frontend domain
- [ ] Set up SSL/TLS certificates (recommended: use reverse proxy like Traefik or Nginx)

### Security Considerations

- [ ] Use HTTPS in production (configure reverse proxy with SSL)
- [ ] Set up proper CORS configuration on backend
- [ ] Review and update security headers in `nginx.conf` if needed
- [ ] Use environment variables for all sensitive configuration
- [ ] Regularly update dependencies: `npm audit` and `npm update`

### Server Configuration

- [ ] Configure firewall rules (allow ports 80/443)
- [ ] Set up reverse proxy (Nginx/Traefik) for SSL termination
- [ ] Configure domain DNS to point to your server
- [ ] Set up monitoring and logging
- [ ] Configure automatic container restart policies

### Reverse Proxy Setup (Nginx Example)

If you're using Nginx as a reverse proxy in front of the Docker container:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Monitoring & Maintenance

- [ ] Set up health check monitoring
- [ ] Configure log rotation
- [ ] Set up automated backups (if needed)
- [ ] Monitor container resource usage
- [ ] Set up alerts for container failures

## Common Commands

```bash
# Build and start
docker-compose up -d --build

# Stop containers
docker-compose down

# View logs
docker-compose logs -f frontend

# Restart container
docker-compose restart frontend

# Update and rebuild
git pull
docker-compose up -d --build

# Check container status
docker-compose ps

# Execute command in container
docker-compose exec frontend sh
```

## Troubleshooting

### Container won't start
- Check logs: `docker-compose logs frontend`
- Verify port 80 is not in use: `netstat -tulpn | grep :80`
- Check Docker daemon is running: `docker ps`

### API calls failing
- Verify `VITE_API_BASE_URL` is correctly set
- Check backend CORS configuration
- Verify network connectivity between frontend and backend

### Build fails
- Ensure Node.js version matches (20.x)
- Clear Docker cache: `docker-compose build --no-cache`
- Check for syntax errors in code

## Updating the Application

1. Pull latest code: `git pull`
2. Rebuild container: `docker-compose up -d --build`
3. Verify deployment: Check health endpoint and test application

