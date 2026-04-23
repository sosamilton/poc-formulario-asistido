FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm install; \
  elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  else npm install; \
  fi

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables públicas para Next (se leen en build y runtime)
ARG NEXT_PUBLIC_WINDMILL_URL
ARG NEXT_PUBLIC_AUTH_MODE
ARG NEXT_PUBLIC_WINDMILL_WORKSPACE
ENV NEXT_PUBLIC_WINDMILL_URL=$NEXT_PUBLIC_WINDMILL_URL \
    NEXT_PUBLIC_AUTH_MODE=$NEXT_PUBLIC_AUTH_MODE \
    NEXT_PUBLIC_WINDMILL_WORKSPACE=$NEXT_PUBLIC_WINDMILL_WORKSPACE

RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# La carpeta public es opcional; si no existe, omitimos la copia

EXPOSE 3000
ENV HOSTNAME=0.0.0.0 PORT=3000
CMD ["node", "server.js"]

FROM builder AS dev
CMD ["npm", "run", "dev"]

