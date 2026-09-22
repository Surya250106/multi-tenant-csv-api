FROM node:20-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY . .

EXPOSE 3000

CMD ["node", "src/index.js"]
