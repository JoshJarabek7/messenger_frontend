FROM node:23-slim AS builder

WORKDIR /app

# Set very conservative memory limits for t2.micro
ENV NODE_OPTIONS="--max-old-space-size=512"

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm i --no-audit

# Copy all other files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:23-slim AS runner

WORKDIR /app

# Copy built assets and package files
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev --no-audit --no-optional

EXPOSE 3000

# Start the server using Node directly
CMD ["node", "build"] 