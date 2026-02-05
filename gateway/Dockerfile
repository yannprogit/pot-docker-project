FROM nginx:alpine

#Installe tini pour gérer correctement les signaux (SIGTERM, SIGINT)
RUN apk add --no-cache tini

#Crée un groupe et un utilisateur non‑root
RUN addgroup -S pot-group \
 && adduser -S pot-user -G pot-group

#Supprime la configuration par défaut
RUN rm /etc/nginx/conf.d/default.conf

#Copie la nouvelle configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

#Copie le script monitor.sh
COPY monitor.sh /monitor.sh
RUN chmod +x /monitor.sh

#Donne les droits sur /var/log/nginx et créer le fichier PID avec les bons droits
RUN mkdir -p /var/cache/nginx \
 && touch /var/run/nginx.pid \
 && chown -R pot-user:pot-group /var/cache/nginx /var/run/nginx.pid /var/log/nginx /etc/nginx/conf.d /usr/share/nginx/html

#Bascule vers l’utilisateur non‑root
USER pot-user

#Expose le port
EXPOSE 8080

#Utilise tini comme init (PID 1)
ENTRYPOINT ["/sbin/tini", "--"]

#Démarre Nginx
CMD ["nginx", "-g", "daemon off;"]
