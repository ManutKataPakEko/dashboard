# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install a simple HTTP server to serve the dist folder
RUN npm install -g serve

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create startup script that generates config.json from environment variable
RUN echo '#!/bin/sh\n\
echo "{\"apiUrl\": \"${API_URL:-http://localhost:8000}\"}" > /app/dist/config.json\n\
serve -s dist -l 3000' > /app/start.sh && chmod +x /app/start.sh

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('\''http'\'').get('\''http://localhost:3000'\'', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
CMD ["/app/start.sh"]
