# Usar una imagen más ligera de Node.js
FROM node:22-slim

# Instalar herramientas básicas
RUN apt-get update && apt-get install -y \
    curl \
    dnsutils \
    net-tools \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Configurar el directorio de trabajo
WORKDIR /app

# Copiar los archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install puppeteer-extra puppeteer-extra-plugin-stealth express

# Copiar el resto del código
COPY server.js ./
COPY scrap.js ./

# Crear directorio para logs
RUN mkdir -p /app/logs && chmod 777 /app/logs

# Exponer el puerto para la API
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "server.js"]