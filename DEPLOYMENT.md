# ImmoStore — Déploiement Supabase + Stripe

## 1. Supabase — Schéma

1. Ouvre ton projet Supabase → **SQL Editor** → **New query**.
2. Copie-colle le contenu de [`supabase/schema.sql`](supabase/schema.sql) et lance.
3. Vérifie que les 17 tables, les 3 buckets Storage et les policies RLS sont créés (→ Database → Tables / Storage → Policies).

Toutes les requêtes du front sont scopées par `organization_id` via RLS — aucune donnée inter-clients n'est accessible.

## 2. Auth

- Aucune config supplémentaire requise : l'email/mot de passe est activé par défaut.
- Pour désactiver la confirmation email pendant le dev : **Authentication → Settings → Email Auth → "Confirm email"** off.

## 3. Local dev

```bash
npm install
npm run dev
```

Le fichier `.env.local` contient déjà l'URL Supabase et la clé anon. Ouvre l'app, crée un compte via **"Créer un compte"** (nom + nom de gérance + email + mot de passe). Une organisation est créée automatiquement, et tu es connecté en admin.

## 4. Stripe — setup one-time

### 4.1 Créer les 3 produits

Dans Stripe Dashboard → **Products** → New product, créer trois produits récurrents mensuels :

| Produit  | Prix (CHF/mois) |
|----------|-----------------|
| Starter  | 29              |
| Pro      | 79              |
| Business | 199             |

Pour chaque prix, récupère l'ID (`price_XXXXXXXXXXXX`).

### 4.2 Installer la Supabase CLI

```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref wbockwmwutzkapusedzr
```

### 4.3 Enregistrer les secrets des edge functions

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_xxx \
  STRIPE_WEBHOOK_SECRET=whsec_xxx \
  STRIPE_PRICE_STARTER=price_xxx_starter \
  STRIPE_PRICE_PRO=price_xxx_pro \
  STRIPE_PRICE_BUSINESS=price_xxx_business \
  PUBLIC_APP_URL=http://localhost:5173
```

(Remplace `PUBLIC_APP_URL` par ton URL prod une fois déployé.)

### 4.4 Déployer les 3 edge functions

```bash
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook --no-verify-jwt
```

L'URL du webhook à donner à Stripe sera :

```
https://wbockwmwutzkapusedzr.supabase.co/functions/v1/stripe-webhook
```

### 4.5 Configurer le webhook dans Stripe

Stripe Dashboard → **Developers → Webhooks → Add endpoint**.
- URL : l'URL ci-dessus
- Events : `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

Copie le `whsec_...` dans `STRIPE_WEBHOOK_SECRET` et redéploie la fonction si besoin.

## 5. Flow complet attendu

1. Utilisateur → `/` → **Créer un compte**
2. `organizations` + `profiles` + `subscriptions` (plan=starter, status=trialing) créés
3. Utilisateur crée bâtiments/locataires → écrits dans `buildings` / `tenants` via RLS
4. **Paramètres → Facturation** → bouton **Choisir ce plan** → redirection Stripe Checkout
5. Paiement OK → Stripe webhook → `stripe-webhook` edge function → `subscriptions.status=active` + `stripe_customer_id`
6. Au retour dans l'app, le bouton **Gérer la facturation** ouvre le Stripe Customer Portal

## 6. Architecture front

- `src/app/lib/supabase.ts` — client Supabase (session persistée en localStorage)
- `src/app/context/AuthContext.tsx` — login/signup/session + chargement du profil
- `src/app/utils/storage.ts` — API synchrone (identique à avant) **backed par un cache en mémoire hydraté depuis Supabase au boot**. Les writes sont fire-and-forget vers Supabase. Les 16 composants n'ont pas été modifiés.
- `src/app/lib/billing.ts` — helpers Stripe (startCheckout, openBillingPortal, fetchSubscription)

## 7. Limitations connues

- **Writes optimistes** : si une écriture Supabase échoue (réseau, RLS), le cache local ne rollback pas. Vérifier la console (prefix `[storage]`).
- **Pas de realtime sync** : les changements faits dans un autre onglet/utilisateur n'apparaissent qu'au prochain reload. Pour du temps réel → ajouter une souscription `supabase.channel(...)` dans `hydrateFromSupabase`.
- **Le role `tenant`** (espace locataire) n'a pas encore de flow d'invitation depuis l'admin → à brancher (côté admin : créer profil tenant + tenant_id + envoyer magic link).

## 8. Déploiement (Vercel)

```bash
# Dans Vercel, variables d'environnement :
VITE_SUPABASE_URL=https://wbockwmwutzkapusedzr.supabase.co
VITE_SUPABASE_ANON_KEY=<ta clé anon>
```

Ne jamais exposer la service_role key côté client.
