# Usar una imagen más ligera de Node.js
FROM node:22-slim

# Ya no necesitamos instalar Chrome, lo que simplifica enormemente el Dockerfile
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Instalar dependencias adicionales (incluyendo las necesarias para proxies)
RUN npm install puppeteer-core puppeteer-extra puppeteer-extra-plugin-stealth axios https-proxy-agent

# Copiar los archivos de la aplicación (incluyendo el nuevo proxy-manager)
COPY server.js ./
COPY scrap.js ./
COPY proxy-manager.js ./

# Exponer el puerto que usa Express
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "server.js"]