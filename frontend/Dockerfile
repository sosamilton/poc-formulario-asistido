# Dockerfile para frontend (Vite + SurveyJS)

# Etapa 1: build
FROM node:20-alpine AS build

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

RUN \
  if [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm install; \
  elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  else npm install; \
  fi

# Copiar código fuente
COPY . .

# Args para variables VITE_* (se pasan en build)
ARG VITE_WINDMILL_URL
ARG VITE_AUTH_MODE
ARG VITE_WINDMILL_WORKSPACE

ENV VITE_WINDMILL_URL=$VITE_WINDMILL_URL \
    VITE_AUTH_MODE=$VITE_AUTH_MODE \
    VITE_WINDMILL_WORKSPACE=$VITE_WINDMILL_WORKSPACE

# Build
RUN npm run build

# Etapa 2: Nginx estático
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
