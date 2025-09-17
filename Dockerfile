FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (needed for build)
RUN npm ci

# Copy source code
COPY . .

# Set build-time environment variables
ENV NODE_ENV=production
ENV NEXT_LINT=false
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=true

# Build the application with verbose output for debugging
RUN npm run build 2>&1 || (echo "Build failed, checking logs..." && cat /tmp/next-build.log 2>/dev/null && exit 1)

# Remove dev dependencies after build
RUN npm prune --production

# Expose port
EXPOSE 4000

# Start the application
CMD ["npm", "start"]