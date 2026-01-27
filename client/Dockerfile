# Build stage
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
COPY . .
RUN sed -i 's/\r$//' package-client.sh
RUN chmod +x package-client.sh
RUN NO_ZIP=1 ./package-client.sh

# Runtime stage
FROM node:22-slim AS runtime
WORKDIR /app
COPY package*.json ./
ENV NODE_ENV=production
RUN npm i --omit=dev && npm cache clean --force
COPY --from=builder /tmp/ambrosia-client-dist/ .
EXPOSE 3000
CMD ["npm", "run", "start"]
