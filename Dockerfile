FROM node:latest

WORKDIR /app

# Copy package files
COPY package*.json ./

# Update npm first, then install dependencies
RUN npm install -g npm && \
    npm install

# Copy all other files
COPY . .

# Build the application
RUN npm run build

EXPOSE 3000

# Start the server using the correct path
CMD ["node", "build/index.js"] 