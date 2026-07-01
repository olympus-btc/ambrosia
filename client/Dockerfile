# Build stage
FROM node:24-slim AS builder
WORKDIR /app
ARG NEXT_PUBLIC_PORT_API=9154
ENV NEXT_PUBLIC_PORT_API=${NEXT_PUBLIC_PORT_API}
COPY package*.json ./
COPY . .
RUN npm i
RUN sed -i 's/\r$//' package-client.sh
RUN chmod +x package-client.sh
RUN NO_ZIP=1 ./package-client.sh

# Runtime stage
FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /tmp/ambrosia-client-dist/ .
EXPOSE 3000
CMD ["node", "server.js"]
