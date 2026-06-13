# Stage 1: Build the NestJS application
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install build tools needed for native modules (bcrypt, etc.)
RUN apk add --no-cache python3 make g++

# Copy package configuration files
COPY package*.json ./
COPY nest-cli.json ./
COPY tsconfig*.json ./

# Install ALL dependencies (including devDependencies needed for build)
RUN npm ci

# Copy the rest of the application source code
COPY src ./src
COPY database ./database

# Build the NestJS project
RUN npm run build

# Verify the build output exists
RUN ls -la dist/ && echo "✅ Build succeeded: dist/main.js found" && test -f dist/main.js

# Stage 2: Production image
FROM node:20-alpine

WORKDIR /usr/src/app

# Install build tools for native modules in production too
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/database ./database
COPY tsconfig.json ./tsconfig.json
COPY tsconfig.build.json ./tsconfig.build.json
COPY nest-cli.json ./nest-cli.json

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Start the NestJS server
CMD ["node", "dist/main"]
