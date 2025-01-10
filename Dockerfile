FROM node:23-slim AS builder

WORKDIR /app

# Set extremely conservative memory limits for t2.micro
ENV NODE_OPTIONS="--max-old-space-size=256"
# Reduce NPM memory usage
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install dependencies with minimal memory usage and install svelte-kit globally
RUN npm i --no-audit --no-optional --max-parallel=1 && \
    npm install -g @sveltejs/kit

# Copy all other files
COPY . .

# Sync SvelteKit files and build with production optimizations
RUN svelte-kit sync && \
    npm run build

# Production stage
FROM node:23-slim AS runner

WORKDIR /app

# Copy built assets and package files
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev --no-audit --no-optional --max-parallel=1

EXPOSE 3000

# Start the server using Node directly
CMD ["node", "build"] 