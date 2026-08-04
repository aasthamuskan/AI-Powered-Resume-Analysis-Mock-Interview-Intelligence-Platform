# GitHub Actions — CI/CD Setup Guide

## Workflow Overview

```
Push to any branch → CI (build + lint check)
Push to main       → CI + Deploy Frontend (Vercel) + Deploy Backend (Render)
```

## Files Created

| File | Trigger | Purpose |
|------|---------|---------|
| `.github/workflows/ci.yml` | Every push & PR | Build check + ESLint |
| `.github/workflows/deploy-frontend.yml` | Push to `main` (Frontend changes) | Deploy to Vercel |
| `.github/workflows/deploy-backend.yml` | Push to `main` (Backend changes) | Deploy to Render |

---

## Step 1 — GitHub Secrets Setup

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:

### Frontend (Vercel)

| Secret Name | Where to get it |
|-------------|----------------|
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) → Create token |
| `VERCEL_ORG_ID` | Run `vercel link` in `/Frontend` → check `.vercel/project.json` → `orgId` |
| `VERCEL_PROJECT_ID` | Same file → `projectId` |
| `VITE_API_URL` | Your backend URL e.g. `https://prepiq-backend.onrender.com` |

### Backend (Render)

| Secret Name | Where to get it |
|-------------|----------------|
| `RENDER_DEPLOY_HOOK_URL` | Render Dashboard → Your Service → **Settings** → **Deploy Hook** → Copy URL |

---

## Step 2 — Link Vercel Project (One-time)

```bash
# Install Vercel CLI
npm i -g vercel

# Inside /Frontend folder
cd Frontend
vercel link

# Follow prompts → select your project
# This creates Frontend/.vercel/project.json with org/project IDs
```

---

## Step 3 — Get Render Deploy Hook

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click on your **prepiq-backend** service
3. Go to **Settings** tab
4. Scroll to **Deploy Hook**
5. Click **Generate Deploy Hook**
6. Copy the URL → paste as `RENDER_DEPLOY_HOOK_URL` secret

---

## Step 4 — Push to GitHub

```bash
git add .github/
git commit -m "ci: add GitHub Actions workflows for CI/CD"
git push origin main
```

The workflows will appear in the **Actions** tab of your GitHub repo.

---

## Flow Diagram

```
Developer pushes code
        │
        ▼
┌─────────────────┐
│   CI Workflow   │  ← Runs on ALL branches
│  ─────────────  │
│  npm ci         │
│  eslint         │
│  vite build     │
│  node --check   │
└────────┬────────┘
         │ (only if branch = main)
         ▼
    ┌────────────────────────────────────┐
    │                                    │
    ▼                                    ▼
┌──────────────────┐          ┌──────────────────────┐
│ Deploy Frontend  │          │   Deploy Backend     │
│ ──────────────── │          │ ──────────────────── │
│ npm run build    │          │ node --check         │
│ vercel deploy    │          │ curl Render hook     │
│    --prod        │          │                      │
└──────────────────┘          └──────────────────────┘
         │                                    │
         ▼                                    ▼
   Vercel CDN                         Render.com
   (React App)                       (Node.js API)
```
