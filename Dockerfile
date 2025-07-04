# Usamos una imagen base de Node.js (versión 22 en modo slim para producción)
FROM node:22-bookworm-slim

# Instalamos las herramientas necesarias para compilar dependencias nativas,
# además de git y bash, que algunas librerías pueden requerir
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 make g++ git bash \
  && rm -rf /var/lib/apt/lists/*

# Establecemos el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos los archivos de dependencias para instalar primero
COPY package*.json ./

# Instalamos las dependencias del proyecto
# Puedes remover --production si necesitas dependencias de desarrollo
RUN npm install

# Copiamos el resto del código al contenedor
COPY . .

# Si usas un servidor web (como Express), puedes exponer el puerto correspondiente
# EXPOSE 3000

# Comando para iniciar el bot
CMD ["node", "polaris.js"]