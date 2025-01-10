FROM node:23-slim

WORKDIR /app

# Set very conservative memory limits for t2.micro
ENV NODE_OPTIONS="--max-old-space-size=512"

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --no-audit --no-optional --max-parallel=1

# Copy all other files
COPY . .

EXPOSE 3000

# Start the server using Node directly
CMD ["npm", "run", "dev"] 