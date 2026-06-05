# Transvirex ERP — Back-end

Projet 2 — Transvirex Logistics

## Stack
- Node.js + Express
- MongoDB (persistance)
- Docker + Docker Compose

## Lancer le projet

```bash
docker-compose up --build
```

## Services & Ports

| Service       | Port | Description              |
|---------------|------|--------------------------|
| Gateway       | 3000 | Point d'entrée unique    |
| User          | 3001 | Auth + utilisateurs      |
| Mission       | 3002 | Gestion des missions     |
| Tracking      | 3003 | Suivi des livraisons     |
| Facturation   | 3004 | Factures                 |
| Notification  | 3005 | Alertes                  |
| MongoDB       | 27017| Base de données          |

---

## API Routes (via Gateway → port 3000)

### Auth
| Méthode | Route              | Description          |
|---------|--------------------|----------------------|
| POST    | /users/register    | Créer un compte      |
| POST    | /users/login       | Se connecter (→ JWT) |
| GET     | /users/me          | Profil courant       |

### Missions
| Méthode | Route                         | Description           |
|---------|-------------------------------|-----------------------|
| GET     | /missions                     | Liste des missions    |
| GET     | /missions/:id                 | Détail mission        |
| POST    | /missions                     | Créer une mission     |
| PATCH   | /missions/:id/statut          | Changer le statut     |
| PATCH   | /missions/:id/assigner        | Réassigner chauffeur  |
| POST    | /missions/:id/incidents       | Signaler un incident  |
| DELETE  | /missions/:id                 | Supprimer             |

### Tracking
| Méthode | Route                                   | Description              |
|---------|-----------------------------------------|--------------------------|
| GET     | /tracking                               | Tous les événements      |
| GET     | /tracking/mission/:missionId            | Historique d'une mission |
| GET     | /tracking/chauffeur/:id/derniere        | Dernière position        |
| POST    | /tracking                               | Ajouter un événement     |
| GET     | /tracking/stats                         | Statistiques             |

### Facturation
| Méthode | Route                         | Description          |
|---------|-------------------------------|----------------------|
| GET     | /facturation                  | Liste des factures   |
| GET     | /facturation/stats            | KPIs facturation     |
| GET     | /facturation/:id              | Détail facture       |
| POST    | /facturation                  | Créer facture        |
| PATCH   | /facturation/:id/statut       | Changer statut       |
| POST    | /facturation/:id/relances     | Ajouter relance      |
| DELETE  | /facturation/:id              | Supprimer            |

### Notifications
| Méthode | Route                                  | Description             |
|---------|----------------------------------------|-------------------------|
| GET     | /notification                          | Toutes les notifs       |
| GET     | /notification/user/:userId             | Notifs d'un utilisateur |
| POST    | /notification                          | Créer une notification  |
| PATCH   | /notification/:id/lire                 | Marquer comme lue       |
| PATCH   | /notification/user/:userId/tout-lire   | Tout marquer lu         |
| DELETE  | /notification/:id                      | Supprimer               |

### Health
```
GET /health → état de tous les services
```
