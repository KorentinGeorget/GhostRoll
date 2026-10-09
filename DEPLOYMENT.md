# Deploying Ghostroll on Coolify (OVH VPS)

This guide documents deploying **Ghostroll** on an existing Coolify instance running on an OVH VPS.

---

## 1. Architecture on Coolify

Ghostroll deploys as a multi-container Docker Compose application (or individual resources):

```
                        Internet
                           │
                 [Coolify Traefik Proxy]
                 (HTTPS / Let's Encrypt)
                           │
                ┌──────────┴──────────┐
                │                     │
                ▼                     ▼
          web (Nginx)           server (Fastify)
          Port 80               Port 3001
          (Static React SPA)    (Deterministic Replay API)
                                      │
                                      ▼
                               db (PostgreSQL 16)
```

---

## 2. Deployment via Coolify UI (Recommended)

### Step 1: Add New Project in Coolify
1. Navigate to your Coolify dashboard.
2. Click **+ Create New Project** $\rightarrow$ name it `ghostroll`.
3. Select your destination server (your OVH VPS) and environment (`production`).

### Step 2: Add Docker Compose Resource
1. Click **+ New Resource** $\rightarrow$ **Docker Compose**.
2. Select **Git Source**:
   - Provide your repository URL: `https://github.com/<your-username>/ghostroll`
   - Branch: `main` (or `master`)
3. Compose File Location: `docker-compose.yml`

### Step 3: Configure Environment Variables
In the **Environment Variables** tab of the service, configure:

| Variable | Recommended Value | Description |
|---|---|---|
| `COOKIE_SECRET` | *(Generated 32+ random characters)* | Signs player guest session cookies |
| `DATABASE_URL` | `postgres://ghostroll:<password>@db:5432/ghostroll` | Connection string to Postgres container |
| `NODE_ENV` | `production` | Enables production optimizations |

*(Optional)* If you prefer using a **Coolify-managed PostgreSQL Database** instead of the compose `db` service:
- Provision a standalone PostgreSQL service in Coolify.
- Paste its internal connection URL into `DATABASE_URL`.
- Comment out the `db` service in `docker-compose.yml`.

### Step 4: Configure Domains & SSL
1. Under the **web** service:
   - Set **FQDN / Domain**: `https://ghostroll.yourdomain.com`
   - Coolify Traefik will automatically provision a Let's Encrypt SSL certificate.
2. Click **Deploy**.

---

## 3. GitHub Actions Continuous Deployment (Webhook)

To automatically deploy new commits pushed to `main`:

1. In Coolify, open the **Webhooks** tab of your Ghostroll resource.
2. Copy the **Deploy Webhook URL**.
3. In your GitHub repository:
   - Navigate to **Settings** $\rightarrow$ **Secrets and variables** $\rightarrow$ **Actions**.
   - Add a repository secret: `COOLIFY_WEBHOOK_URL` = `<your webhook URL>`.
4. The GitHub Actions CI pipeline will trigger the webhook upon passing all determinism and end-to-end tests.

---

## 4. Resource Allocation & Limits (VPS Health)

To prevent replay validation from degrading other apps on your OVH VPS:
- Fastify server memory is capped at 512 MB in container definitions.
- Headless Rapier WASM physics executes on fixed $60\text{ Hz}$ timesteps and terminates within $\approx 20\text{ ms}$ per submission.
