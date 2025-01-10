FROM node:23-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all other files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:23-alpine AS runner

WORKDIR /app

# Copy built assets and package files
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

EXPOSE 3000

# Start the server using Node directly
CMD ["node", "build"] 