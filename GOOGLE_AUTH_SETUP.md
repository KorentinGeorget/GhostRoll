# Guide de configuration Google OAuth 2.0 pour GhostRoll

Ce guide détaille pas à pas la mise en place de l'authentification Google OAuth pour le projet.

---

## 1. Questions fréquentes

* **Peut-on s'en passer de Google Cloud ?**  
  **Non.** Tout service souhaitant déléguer l'authentification à Google doit posséder un identifiant d'application (`Client ID`) enregistré sur les serveurs d'authentification de Google.
* **Est-ce payant ?**  
  **Non, c'est 100% gratuit.** Les scopes d'authentification de base (`openid`, `email`, `profile`) ne sont soumis à aucune tarification, et aucune carte bancaire n'est exigée pour créer un projet OAuth standard sur Google Cloud Console.

---

## 2. Étapes dans Google Cloud Console (5 minutes)

### Étape 1 : Créer un projet Google Cloud
1. Rendez-vous sur la [Google Cloud Console](https://console.cloud.google.com/).
2. Connectez-vous avec votre compte Google standard.
3. En haut à gauche, cliquez sur le sélecteur de projet puis sur **"Nouveau projet"**.
4. Nommez le projet (ex : `GhostRoll`) puis cliquez sur **Créer**.

---

### Étape 2 : Configurer l'écran de consentement OAuth
1. Dans le menu latéral gauche, accédez à **APIs et services** > **Écran de consentement OAuth** (ou **Google Auth Platform**).
2. Sélectionnez **User Type : Externe** (External), puis cliquez sur **Créer**.
3. Remplissez les champs obligatoires :
   * **Nom de l'application :** `GhostRoll`
   * **Adresse e-mail d'assistance utilisateur :** votre adresse e-mail.
   * **Coordonnées du développeur :** votre adresse e-mail.
4. Cliquez sur **Enregistrer et continuer**.
5. **Champs d'application (Scopes) :** Cliquez sur **Ajouter ou supprimer des champs d'application**, cochez :
   * `.../auth/userinfo.email`
   * `.../auth/userinfo.profile`
   * `openid`
6. Cliquez sur **Mettre à jour**, puis **Enregistrer et continuer**.
7. **Utilisateurs tests :** Ajoutez votre adresse e-mail (celle avec laquelle vous allez tester la connexion), puis cliquez sur **Enregistrer et continuer**.

---

### Étape 3 : Créer les identifiants OAuth 2.0
1. Dans le menu latéral gauche, cliquez sur **Identifiants** (Credentials).
2. En haut, cliquez sur **+ Créer des identifiants** > **ID client OAuth**.
3. Dans **Type d'application**, choisissez **Application Web**.
4. Nommez l'identifiant (ex : `GhostRoll Web Client`).
5. Dans la section **Origines JavaScript autorisées** :
   * Cliquez sur **+ Ajouter un URI** : `http://localhost:5173` (client Vite)
   * Cliquez sur **+ Ajouter un URI** : `http://localhost:3001` (serveur Fastify)
6. Dans la section **URI de redirection autorisés** :
   * Cliquez sur **+ Ajouter un URI** : `http://localhost:3001/api/auth/google/callback`
   *(Si vous déployez plus tard en production, vous ajouterez l'URI de votre domaine, ex : `https://ghostroll.example.com/api/auth/google/callback`)*.
7. Cliquez sur **Créer**.
8. Une fenêtre s'affiche avec :
   * **Votre ID client** (ex : `123456789-abc.apps.googleusercontent.com`)
   * **Votre code secret client** (ex : `GOCSPX-xyz123...`)

---

## 3. Configuration dans le projet GhostRoll

1. À la racine du projet, créez un fichier `.env` (ou copiez `.env.example`) :
   ```bash
   cp .env.example .env
   ```

2. Renseignez vos deux clés obtenues à l'étape précédente :
   ```env
   PORT=3001
   GOOGLE_CLIENT_ID="123456789-abc.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="GOCSPX-xyz123..."
   ```

3. Redémarrez le serveur Fastify pour charger les nouvelles variables d'environnement :
   ```bash
   pnpm --filter @ghostroll/server build
   # Redémarrez le processus serveur si lancé manuellement
   ```

---

## 4. Test et validation

1. Ouvrez l'application dans votre navigateur : `http://localhost:5173`
2. Cliquez sur votre profil joueur en haut à droite (icône utilisateur).
3. Cliquez sur **"Continuer avec Google"**.
4. L'écran de consentement officiel Google s'affiche. Connectez-vous avec votre compte de test.
5. Une fois validé, vous êtes redirigé vers GhostRoll :
   * Votre avatar Google officiel et votre nom s'affichent dans la modale Profil et sur l'HUD.
   * La pastille verte de vérification apparaît à côté de votre pseudo.
   * Tous vos records et replays sont désormais synchronisés de façon permanente avec votre compte Google.
