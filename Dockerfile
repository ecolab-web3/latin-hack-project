# ---- Etapa 1: Builder ----
# Esta etapa instala todas las dependencias (incluidas las de desarrollo)
# y compila el código TypeScript a JavaScript.
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copia los archivos de definición de dependencias
COPY package*.json ./

# Instala todas las dependencias
RUN npm install

# Copia el resto del código fuente de la aplicación
COPY . .

# Compila la aplicación
RUN npm run build

# ---- Etapa 2: Production ----
# Esta etapa toma solo el código compilado y las dependencias de producción
# para crear una imagen final ligera y optimizada.
FROM node:20-alpine

WORKDIR /usr/src/app

# Copia las dependencias de producción desde la etapa de builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package*.json ./

# Copia el código compilado y los assets (ABIs) desde la etapa de builder
COPY --from=builder /usr/src/app/dist ./dist

# Expone el puerto en el que corre la aplicación
EXPOSE 3000

# Comando para iniciar la aplicación en producción
CMD ["node", "dist/main"]