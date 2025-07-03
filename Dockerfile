# Usamos una imagen base de Node.js (la versión que necesites)
# RECOMENDACIÓN: Cambiar de 'alpine' a 'slim' o la versión estándar
FROM node:22-slim

# Instalamos las dependencias necesarias para node-gyp (Python, make, y gcc)
# Estas dependencias aún son necesarias si tienes módulos nativos
# Para imágenes no-Alpine (Debian-based), los paquetes son diferentes:
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

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

# Comando para iniciar el bot
CMD ["node", "polaris.js"]