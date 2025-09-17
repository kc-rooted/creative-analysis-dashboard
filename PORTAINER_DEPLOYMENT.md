# Portainer Deployment Guide

## Quick Deploy with GitHub

### 1. Create New Stack in Portainer
- Navigate to **Stacks** → **Add stack**
- Name: `creative-analysis-dashboard`
- Build method: **Repository**

### 2. Repository Configuration
- **Repository URL**: `https://github.com/kc-rooted/creative-analysis-dashboard`
- **Repository reference**: `refs/heads/main`
- **Compose path**: Leave empty (uses root directory)

### 3. Docker Compose Configuration
Use this docker-compose.yml:

```yaml
version: '3.8'
services:
  creative-dashboard:
    build: .
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - NEXTAUTH_URL=https://ai.rootedsolutions.co
      - NEXTAUTH_SECRET=your-nextauth-secret-here
      - GOOGLE_CLIENT_ID=your-google-client-id
      - GOOGLE_CLIENT_SECRET=your-google-client-secret
      - ANTHROPIC_API_KEY=your-anthropic-api-key
      - OPENAI_API_KEY=your-openai-api-key
      - GOOGLE_API_KEY=your-google-api-key
    restart: unless-stopped
    volumes:
      - app_data:/app/data
    networks:
      - web

volumes:
  app_data:

networks:
  web:
    external: true
```

### 4. Required Environment Variables
Configure these in Portainer's environment variables section:

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXTAUTH_URL` | Your app's public URL | Yes |
| `NEXTAUTH_SECRET` | Random secret for NextAuth | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `GOOGLE_API_KEY` | Google API key for BigQuery | Yes |

### 5. Dockerfile
The repository includes this Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 4000

# Start the application
CMD ["npm", "start"]
```

### 6. Deploy
1. Click **Deploy the stack**
2. Wait for build and deployment to complete
3. Access your app at `http://your-server:4000`

### 7. Post-Deployment
- Verify logs show "Ready on http://localhost:4000"
- Test authentication flows
- Configure reverse proxy if needed

## Troubleshooting

### Build Fails
- Check that all environment variables are set
- Verify GitHub repository access
- Review build logs in Portainer

### App Won't Start
- Ensure port 4000 is not already in use
- Check environment variable values
- Review container logs

### Authentication Issues
- Verify `NEXTAUTH_URL` matches your domain
- Check Google OAuth redirect URIs are configured
- Ensure all auth-related environment variables are set