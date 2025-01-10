FROM node:23-slim AS builder

WORKDIR /app

# Set very conservative memory limits for t2.micro
ENV NODE_OPTIONS="--max-old-space-size=512"

# Copy package files
COPY package*.json ./

# Install dependencies with reduced parallel operations and fix rollup
RUN npm ci --no-audit --no-optional --max-parallel=1 && \
    npm install @rollup/rollup-linux-x64-gnu

# Copy all other files
COPY . .

# Build the application with reduced memory usage
RUN npm run build

# Production stage
FROM node:23-slim AS runner

WORKDIR /app

# Copy built assets and package files
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./

# Install production dependencies only with reduced parallel operations
RUN npm ci --omit=dev --no-audit --no-optional --max-parallel=1

EXPOSE 3000

# Start the server using Node directly
CMD ["node", "build"] 