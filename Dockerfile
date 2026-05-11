FROM node:20-alpine AS base

RUN apk add --no-cache python3 py3-pip make g++ chromium

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/
COPY packages/ui/package.json packages/ui/

# Install all dependencies (workspaces)
RUN npm install --legacy-peer-deps

# Fix peer dependency: @better-auth/drizzle-adapter needs drizzle-orm ^0.45.2
# but server package.json specifies ^0.40.1, causing hoisting issues
RUN npm install drizzle-orm@0.45.2 --no-save --legacy-peer-deps

# Copy source
COPY . .

# Build frontend
RUN cd packages/web && npm run build

EXPOSE 3001

CMD ["node", "packages/server/src/index.js"]
