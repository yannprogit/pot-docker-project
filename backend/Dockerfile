FROM node:18-alpine

#Installe bash
RUN apk update && apk add --no-cache bash

#Crée un utilisateur non-root
RUN addgroup -S pot-group && adduser -S pot-user -G pot-group

#Dossier de travail
WORKDIR /usr/src/app

#Copie les manifests
COPY package*.json ./

#Installe seulement les dépendances de production
RUN npm ci --only=production && npm cache clean --force

#Copie le code
COPY . .

#Ajoute des droits de lecture sur le dossier
RUN chown -R pot-user:pot-group /usr/src/app

#Bascule vers l’utilisateur non-root
USER pot-user

#Expose le port
EXPOSE 3000

#Démarre avec le script qui gère SIGTERM (dans le code)
CMD ["node", "index.js"]
