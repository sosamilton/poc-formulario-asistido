# Dockerfile para desarrollo del frontend
FROM node:20-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache git

# Crear directorio de trabajo
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm install --legacy-peer-deps

# Copiar código fuente (node_modules se excluye con .dockerignore)
COPY . .

# Exponer puerto de desarrollo
EXPOSE 3000

# Comando por defecto
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
