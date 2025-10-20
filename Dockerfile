FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better Docker layer caching)
COPY package*.json ./
RUN npm ci --prefer-offline --no-audit --progress=false --legacy-peer-deps

# Copy source code
COPY . .

# Set build-time environment variables to speed up build
ENV NODE_ENV=production
ENV NEXT_LINT=false
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=true
ENV CI=true

# Build the application
RUN npm run build

# Note: Skipping npm prune to keep TypeScript for next.config.ts at runtime
# The image size increase is acceptable for proper functionality

# Expose port
EXPOSE 4000

# Start the application
CMD ["npm", "start"]