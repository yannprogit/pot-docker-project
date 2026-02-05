# Documentation du Projet Final - Docker

Ce document décrit l'architecture et les choix techniques réalisés pour conteneuriser l'application.

#### Crée par Yann SADY

## Sommaire
- [Dépendances installées](#dépendances-installées)
- [Manipulations sur l'OS](#manipulations-sur-los)
- [Arguments Docker Compose](#arguments-docker-compose)
- [Limitations des ressources](#limitations-des-ressources)
- [Entrypoints et CMD choisis](#entrypoints-et-cmd-choisis)
- [Orchestration (Docker Compose)](#orchestration-docker-compose)
- [Gestion des SIGTERM](#gestion-des-sigterm)

## Dépendances installées

Chaque service dispose de ses propres dépendances adaptées à son rôle :

*   **Backend (`/backend`)** :
    *   `express` : Framework web utiliser pour créer l'API REST.
*   **Frontend (`/frontend`)** :
    *   `vue` et `core-js` : Coeur du framework Vue.js.
    *   Dépendances de développement (`@vue/cli-service`, `eslint`) utilisées uniquement lors de la phase de build.
*   **Gateway (`/gateway`)** :
    *   `tini` : Gestionnaire d'init léger installé via Alpine pour gérer proprement les signaux systèmes (PID 1).

## Manipulations sur l'OS

Les Dockerfiles effectuent plusieurs opérations système spécifiques à chaque service pour sécuriser et optimiser les conteneurs :

*   **Gateway** :
    *   **Gestion des processus** : Installation de `tini` via `apk` pour agir comme init process (PID 1) et gérer correctement les signaux système.
        ```dockerfile
        RUN apk add --no-cache tini
        ENTRYPOINT ["/sbin/tini", "--"]
        ```
    *   **Sécurité (Non-root)** : Création d'un utilisateur (`pot-user`) et d'un groupe (`pot-group`) dédiés.
        ```dockerfile
        RUN addgroup -S pot-group && adduser -S pot-user -G pot-group
        ```
    *   **Permissions** : Modification des propriétaires (`chown`) sur les dossiers critiques de Nginx (`/var/cache/nginx`, `/var/run/nginx.pid`, `/var/log/nginx`) pour permettre l'écriture par l'utilisateur non-privilégié.
        ```dockerfile
        RUN chown -R pot-user:pot-group /var/cache/nginx /var/run/nginx.pid ...
        ```
    *   **Configuration** : Suppression de la configuration Nginx par défaut et ajout du script `monitor.sh`.
        ```dockerfile
        RUN rm /etc/nginx/conf.d/default.conf
        COPY monitor.sh /monitor.sh
        ```
    *   **Exécution** : Bascule vers l'instruction `USER pot-user` pour sécuriser l'exécution.
        ```dockerfile
        USER pot-user
        ```

*   **Frontend** :
    *   **Build Multi-stage** : Utilisation d'une image Node.js temporaire pour la compilation (`npm run build`), puis transfert des seuls fichiers statiques vers une image Nginx finale très légère.
        ```dockerfile
        FROM node:18-alpine AS build
        # ...
        FROM nginx:alpine
        COPY --from=build /usr/src/app/dist /usr/share/nginx/html
        ```
    *   **Configuration** : Suppression de la configuration par défaut de Nginx (`rm /etc/nginx/conf.d/default.conf`) pour la remplacer par une configuration adaptée au routing Vue.js.
        ```dockerfile
        RUN rm /etc/nginx/conf.d/default.conf
        COPY nginx.conf /etc/nginx/conf.d/default.conf
        ```

*   **Backend** :
    *   **Outils système** : Installation de `bash` pour faciliter les opérations de maintenance si nécessaire.
        ```dockerfile
        RUN apk update && apk add --no-cache bash
        ```
    *   **Sécurité (Non-root)** : Création du couple utilisateur/groupe `pot-user`/`pot-group`.
        ```dockerfile
        RUN addgroup -S pot-group && adduser -S pot-user -G pot-group
        ```
    *   **Optimisation** : Installation stricte des dépendances de production (`npm ci --only=production`) et nettoyage du cache npm pour réduire la taille de l'image.
        ```dockerfile
        RUN npm ci --only=production && npm cache clean --force
        ```
    *   **Permissions** : Attribution des droits (`chown`) du dossier de l'application à `pot-user`.
        ```dockerfile
        RUN chown -R pot-user:pot-group /usr/src/app
        ```
    *   **Exécution** : Démarrage du service sous l'identité de l'utilisateur restreint via `USER pot-user`.
        ```dockerfile
        USER pot-user
        ```

## Arguments Docker Compose

Le fichier `docker-compose.yml` configure les services avec des paramètres spécifiques pour assurer leur bonne communication et leur déploiement.

*   **Frontend** :
    *   `args` (Build) : L'argument de build `VUE_APP_API_BASE=/api` est injecté pour configurer l'URL de base des appels API dans l'application Vue.js. Cela permet au frontend d'adresser ses requêtes correctement à travers la Gateway.
*   **Gateway** :
    *   `ports` : Mappe le port **8081** de la machine hôte vers le port **8080** du conteneur. C'est le point d'entrée unique pour accéder à l'application depuis l'extérieur.
    *   `depends_on` : Définit une dépendance explicite vers `backend` et `frontend`, s'assurant que ces services sont instanciés avant le démarrage de la Gateway.
*   **Backend** :
    *   `expose` : Le port **3000** est exposé uniquement au sein du réseau Docker interne `pot-network`, le rendant accessible à la Gateway mais pas directement depuis l'extérieur par défaut.

## Limitations des ressources

Des quotas de ressources (CPU et RAM) sont appliqués via la section `deploy.resources` pour garantir la performance et éviter qu'un conteneur ne sature l'hôte.

*   **Backend** (`limits: cpus: "1.0", memory: 512M`) :
    *   Alloué avec les ressources les plus élevées (1 CPU complet, 512 Mo de RAM).
    *   **Raison** : C'est le cœur logique de l'application qui traite les requêtes, exécute le code JavaScript (Node.js) et manipule les données. Il nécessite donc plus de puissance de calcul et de mémoire.
*   **Gateway** (`limits: cpus: "0.5", memory: 256M`) :
    *   Ressources intermédiaires (0.5 CPU, 256 Mo de RAM).
    *   **Raison** : Nginx gère le routage et le proxy inverse. Bien que performant, il doit gérer le trafic entrant et sortant pour deux services, nécessitant plus de ressources que le simple serveur de fichiers statiques mais moins que le moteur d'exécution Node.js.
*   **Frontend** (`limits: cpus: "0.25", memory: 128M`) :
    *   Ressources les plus faibles (0.25 CPU, 128 Mo de RAM).
    *   **Raison** : Ce conteneur ne fait que servir des fichiers statiques (HTML/CSS/JS) via Nginx. Cette tâche est très peu gourmande en ressources.

## Entrypoints et CMD choisis

### Entrypoints
*   **Gateway** : Utilise `ENTRYPOINT ["/sbin/tini", "--"]`. Cela permet d'utiliser Tini comme processus initial (PID 1) qui "moissonne" les processus zombies et transmet correctement les signaux système (comme SIGTERM) au processus Nginx.

### Commandes par défaut (CMD)
*   **Gateway** : `CMD ["nginx", "-g", "daemon off;"]`. Lance Nginx en premier plan pour que le conteneur reste actif.
*   **Frontend** : Similaire à la Gateway, `CMD ["nginx", "-g", "daemon off;"]`.
*   **Backend** : `CMD ["node", "index.js"]`. Lance directement l'application Node.js.

## Orchestration (Docker Compose)

### Dépendances entre conteneurs
L'ordre de démarrage est contrôlé via `depends_on` dans le service `gateway`. La Gateway dépend des services `backend` et `frontend`.

### Schéma des communications

Toutes les communications passent par un réseau Docker interne privé `pot-network`.

![schema](/docs/architecture.png)

## Gestion des SIGTERM

### Service Backend

Le service `backend` implémente une gestion propre des signaux d'arrêt (`SIGTERM` et `SIGINT`).

Lorsqu'un conteneur est arrêté avec `docker stop` (qui envoie `SIGTERM`) :
1.  L'application intercepte le signal via `process.on('SIGTERM', ...)`.
2.  Le serveur HTTP arrête d'accepter de nouvelles connexions (`server.close()`).
3.  Il termine les requêtes en cours proprement.
4.  Si l'arrêt prend plus de **10 secondes**, un timeout force la fermeture du processus pour ne pas bloquer l'orchestrateur indéfiniment.

Voici l'implémentation dans `backend/index.js` :

```javascript
const shutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Forcing shutdown...");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown); 
```

### Services Frontend et Gateway

Pour les services `frontend` et `gateway`, il n'est pas nécessaire d'implémenter de logique particulière. La gestion de l'arrêt est prise en charge nativement via la commande :

```dockerfile
CMD ["nginx", "-g", "daemon off;"]
```
