# Menu QR & commandes restaurant — Bayt Zaytoun (V1)

Application de commande par QR code pour restaurant, avec quatre interfaces temps
réel : **client**, **cuisine**, **serveur** et **gérant**. Bilingue arabe (RTL) /
anglais. Projet de portfolio réalisé d'après le cahier des charges fourni.

## Stack technique

- **Backend** : Node.js, Express, Socket.IO (temps réel), Prisma ORM, SQLite,
  JWT (auth staff), bcrypt, PDFKit + `qrcode` (export PDF des QR codes),
  `express-rate-limit` (anti-abus).
- **Frontend** : React 18, Vite, Tailwind CSS, `react-router-dom`,
  `react-i18next` (ar/en, RTL), `socket.io-client`.
- **Monorepo** npm workspaces : `server/` (API) + `web/` (SPA).

## Démarrage rapide

```bash
# 1. Backend
cd server
cp .env.example .env
npm install
npm run prisma:migrate      # crée la base SQLite + les 9 tables
npm run seed                 # restaurant fictif, staff, ~24 plats, 8 tables
npm run dev                  # http://localhost:4000

# 2. Frontend (autre terminal)
cd web
cp .env.example .env
npm install
npm run dev                  # http://localhost:5173
```

Le script de seed affiche dans la console :
- les comptes de démonstration (admin / cuisine / serveur)
- les liens `/t/<qr_token>` de chaque table (à ouvrir sur mobile pour simuler
  un scan de QR code)

### Comptes de démonstration

| Rôle    | Email                        | Mot de passe   |
|---------|-------------------------------|----------------|
| Gérant  | admin@baytzaytoun.demo       | Admin123!      |
| Cuisine | kitchen@baytzaytoun.demo     | Kitchen123!    |
| Serveur | waiter@baytzaytoun.demo      | Waiter123!     |

## Architecture

### Base de données (9 tables, cf. cahier des charges)

`restaurants`, `users`, `dining_tables`, `table_sessions`, `categories`,
`menu_items`, `orders`, `order_items`, `service_requests`.

Le `restaurant_id` sur `users`, `dining_tables` et `categories` prépare le
passage en multi-restaurants (V2).

### Temps réel (Socket.IO)

| Événement | Déclencheur | Salle |
|---|---|---|
| `order.created` | Commande envoyée par le client | `restaurant:{id}` (staff), `table:{qrToken}` |
| `order.status_changed` | Cuisine/serveur change le statut | `restaurant:{id}`, `table:{qrToken}` |
| `service_request.created` | Appel serveur / demande d'addition | `restaurant:{id}` |
| `menu_item.availability_changed` | Bouton « Épuisé » | `menu:{slug}` (public) |

Le staff s'authentifie sur le socket avec son JWT (`staff:auth`) ; les
clients rejoignent la salle de leur table avec le `qr_token` (public, le
token aléatoire suffit à la protéger, comme demandé dans le cahier des
charges).

### Règles techniques respectées

- **QR sécurisé** : toutes les routes client utilisent le `qr_token`
  aléatoire dans l'URL (`/t/:qrToken`), jamais l'id numérique de la table.
  Bouton de régénération dans l'admin (`Tables`).
- **Prix côté serveur** : le total est toujours recalculé depuis les prix en
  base ; le prix envoyé par le navigateur est ignoré (`routes/client.js`).
- **Historique juste** : `order_items` copie le nom et le prix du plat au
  moment de la commande.
- **Anti-abus** : limite de 5 commandes/minute par table
  (`RATE_LIMIT_ORDERS_PER_MINUTE`).
- **Son en cuisine** : bouton « Démarrer le service » qui débloque l'audio
  (Web Audio API) après une interaction utilisateur, contournement du
  blocage autoplay des navigateurs.
- **Arabe et RTL dès le début** : `dir="rtl"` posé dynamiquement sur
  `<html>`, uniquement des propriétés CSS logiques (`ms-`, `me-`,
  `text-start`, jamais `ml-`/`mr-`/`text-left`).

## Mode sombre

Bascule manuelle (icône lune/soleil) sur chaque écran, avec détection de la
préférence système au premier chargement et persistance du choix en
`localStorage`. Implémenté via `darkMode: "class"` de Tailwind (`web/src/theme.js`
+ un script inline dans `index.html` pour éviter le flash blanc au chargement) —
la teinte olive de la marque est réutilisée pour les surfaces sombres plutôt
qu'un gris générique.

## Upload d'images

Les photos de plats sont de vrais fichiers envoyés depuis l'admin (pas
seulement un champ URL) : `POST /api/admin/uploads` (multipart, `multer`)
valide le type MIME et la taille (5 Mo max), enregistre le fichier sous un
nom généré aléatoirement dans `server/uploads/` (non versionné) et renvoie
une URL absolue, servie statiquement via `express.static`. Le champ reste
aussi éditable manuellement pour coller un lien externe (Unsplash, etc.).

## Fonctionnalités par interface

- **Client** (`/t/:qrToken`, mobile, sans compte) : menu par catégories,
  fiche plat (photo/description/prix), panier avec quantité et note, envoi
  de commande, suivi de statut en direct, appel serveur, demande d'addition,
  sélecteur de langue ar/en.
- **Cuisine** (`/kitchen`) : cartes de commande en temps réel, minuteur
  vert/orange/rouge (seuils configurables), alerte sonore sur nouvelle
  commande, avancement de statut, annulation.
- **Serveur** (`/waiter`) : commandes prêtes à servir, appels de table,
  clôture d'addition (espèces/carte).
- **Gérant** (`/admin`) : gestion du menu (catégories, plats, bouton
  « Épuisé »), gestion des tables (ajout, activation, régénération de QR,
  export PDF de tous les QR codes), gestion du personnel, tableau de bord
  (chiffre d'affaires du jour, plats les plus vendus, heures de pointe).

## Pour la présentation Mostaql

- Restaurant fictif "Bayt Zaytoun" avec logo et ~24 plats illustrés
  (photos Unsplash), répartis en 7 catégories.
- Pour la vidéo de démo : ouvrir `/t/<qr_token>` d'une table sur un
  téléphone et `/kitchen` sur un écran, commander depuis le téléphone et
  montrer la carte apparaître instantanément en cuisine.
- Un QR code scannable vers `/t/<qr_token>` peut être généré depuis
  `/admin/tables` (bouton PDF) pour l'inclure dans les visuels de la fiche.
- Identifiants de démo à indiquer dans la description Mostaql : voir
  tableau ci-dessus.

## Pour plus tard (V2, hors périmètre V1)

- Options de plats (tailles, suppléments).
- Paiement en ligne de l'addition (mode test).
- Impression automatique des tickets en cuisine.
- Multi-restaurants en SaaS (le `restaurant_id` est déjà en place).
- Réinitialisation nocturne automatique des données de démo (tâche planifiée).
