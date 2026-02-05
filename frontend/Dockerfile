# --- Étape 1 : Construction de l'application (Build Stage) ---
#Utilisation d'une image Node.js alpine légère pour construire l'application
FROM node:18-alpine AS build

#Définition du répertoire de travail dans le conteneur
WORKDIR /usr/src/app

#Récupération de l'argument de build défini dans docker-compose
ARG VUE_APP_API_BASE

#Injection de l'argument permettant d'avoir l'url de l'API pour le build
ENV VUE_APP_API_BASE=$VUE_APP_API_BASE

#Copie des fichiers de dépendances (package.json et lockfile)
COPY package*.json ./

#Installation des dépendances
RUN npm install

#Copie du code source du frontend
COPY . .

#Compilation de l'application pour la production (génère le dossier dist)
RUN npm run build

# --- Étape 2 : Production (Serveur Nginx) ---
#Utilisation d'une image Nginx alpine pour servir les fichiers statiques
FROM nginx:alpine

#Supprime la configuration par défaut de Nginx
RUN rm /etc/nginx/conf.d/default.conf

#Copie la nouvelle configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

#Copie des artefacts de build depuis l'étape précédente vers le dossier de Nginx
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

#Expose le port 80 
EXPOSE 80

#Démarre Nginx en mode non-démon (foreground) pour maintenir le conteneur en vie
CMD ["nginx", "-g", "daemon off;"]
