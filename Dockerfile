# Base image
FROM node:18-bullseye

# LibreOffice install karo
RUN apt-get update && apt-get install -y \
    libreoffice \
    && rm -rf /var/lib/apt/lists/*

# App ka kaam
WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

# Server start karega
CMD ["node", "server.js"]

# Render ko port chahiye
EXPOSE 10000
