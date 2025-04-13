# Usamos una imagen base de Node.js (la versión que necesites)
FROM node:22-alpine

# Instalamos las dependencias necesarias para node-gyp (Python, make, y gcc)
RUN apk add --no-cache g++ make python3

# Establecemos un directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos el archivo package.json y package-lock.json para instalar las dependencias antes de copiar el resto del proyecto
COPY package*.json ./

# Instalamos las dependencias del proyecto
RUN npm install --production  
# Usa '--production' para solo instalar dependencias necesarias en producción

# Ahora copiamos todo el código de la aplicación al contenedor
COPY . .

# Exponemos el puerto en el que va a correr la aplicación (ajusta el puerto si es necesario)
EXPOSE 3000

# Definimos la variable de entorno (si es que tienes alguna como BOT_TOKEN o algo importante)
# (Recuerda que tu token lo configuras desde un archivo .env)

# Comando para iniciar el bot
CMD ["node", "polaris.js"]