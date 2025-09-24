# Base image
FROM debian:bullseye

# Dependencies + LibreOffice
RUN apt-get update && apt-get install -y \
    libreoffice \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Workdir
WORKDIR /app

# Copy package.json and install deps
COPY package*.json ./
RUN npm install

# Copy all project files
COPY . .

# Expose port
EXPOSE 8080

# Start command
CMD ["npm", "start"]
