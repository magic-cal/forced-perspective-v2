FROM node:18-alpine

WORKDIR /app

# Install deps first (leveraging Docker cache)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

ARG BACKEND_PORT=8080
ENV PORT=${BACKEND_PORT}

EXPOSE ${BACKEND_PORT}

# Use the dev server (nodemon -> tsx) so source changes reflect with the mounted volume
CMD ["npm", "run", "dev:server"]
