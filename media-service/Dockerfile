FROM node:24-alpine
WORKDIR /app

# 1. Copy package files first to isolate the dependency layer cache
COPY package*.json ./

# 2. Install production dependencies exclusively
RUN npm install --omit=dev

# 3. Copy the rest of your application code
COPY . .

CMD ["node", "server.js"]

# Informational port tracking 
EXPOSE 5000