# # Base image
# FROM debian:bullseye

# # Dependencies + LibreOffice
# RUN apt-get update && apt-get install -y \
#     libreoffice \
#     python3 \
#     python3-pip \
#     && rm -rf /var/lib/apt/lists/*

# # Workdir
# WORKDIR /app

# # Copy package.json and install deps
# COPY package*.json ./
# RUN npm install

# # Copy all project files
# COPY . .

# # Expose port
# EXPOSE 8080

# # Start command
# CMD ["npm", "start"]


# # Base image with Node.js
# FROM node:18

# # Install Python3 and LibreOffice
# RUN apt-get update && apt-get install -y \
#     python3 \
#     python3-pip \
#     libreoffice \
#     && rm -rf /var/lib/apt/lists/*

# # Set working directory
# WORKDIR /app

# # Copy package.json and install Node deps
# COPY package*.json ./
# RUN npm install

# # Copy Python requirements if any
# COPY requirements.txt ./
# RUN pip3 install -r requirements.txt || true

# # Copy rest of the app
# COPY . .

# # Expose the port (backend server.js runs on 8080 for example)
# EXPOSE 8080

# # Start the Node.js app
# CMD ["node", "server.js"]




# Base image with Node.js
FROM node:18

# Set environment variables (optional but recommended)
ENV DEBIAN_FRONTEND=noninteractive

# Install Python3, pip, LibreOffice, and clean apt cache
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    libreoffice \
    && pip3 install --no-cache-dir pdf2docx \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if any)
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of the app
COPY . .

# Expose port (change if needed)
EXPOSE 8080

# Start the Node.js server
CMD ["node", "server.js"]
