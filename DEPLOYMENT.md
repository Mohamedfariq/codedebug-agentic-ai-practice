# Deploying CodeMentor AI to Vercel

This guide walks you through deploying both the **FastAPI Multi-Agent Backend** and the **Frontend** to Vercel with serverless functions and configuring your API keys.

---

## 🏗️ Architecture on Vercel

- **Frontend**: Served as ultra-fast static assets (`index.html`, `styles.css`, `app.js`).
- **Backend API**: Runs as a Python Serverless Function (`api/index.py`) using `@vercel/python`.
- **Automatic Routing**: All API calls (`/analyze`, `/extract-problem`, `/health`) are automatically routed to the Python backend via [`vercel.json`](vercel.json).

---

## 🔑 Step 1: Get Your Groq API Key

1. Go to the [Groq Console](https://console.groq.com/keys).
2. Sign in or create a free account.
3. Click **Create API Key**, give it a name (e.g. `CodeMentor-Vercel`), and copy the key (starts with `gsk_...`).

---

## 🚀 Step 2: Deploy to Vercel

### Option A: Deploy via GitHub (Recommended)

1. **Push your code to GitHub**:
   If not already initialized:
   ```bash
   git init
   git add .
   git commit -m "feat: CodeMentor AI with Vercel deployment support"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

2. **Import into Vercel**:
   - Go to [vercel.com](https://vercel.com/) and sign in.
   - Click **Add New...** &rarr; **Project**.
   - Select your GitHub repository and click **Import**.

3. **Configure Environment Variables (Crucial Step)**:
   - In the project configuration screen, expand the **Environment Variables** section.
   - Add:
     - **Key**: `GROQ_API_KEY`
     - **Value**: Your Groq API key (`gsk_...`)
   - (Optional) If using OpenAI or Gemini fallback models, you can also add `OPENAI_API_KEY` or `GEMINI_API_KEY`.

4. **Deploy**:
   - Keep Framework Preset as **Other** (Vercel automatically detects `vercel.json`).
   - Click **Deploy**.
   - In ~1-2 minutes, your deployment will be live at `https://your-project.vercel.app`!

---

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Log in**:
   ```bash
   vercel login
   ```

3. **Link & Deploy**:
   ```bash
   vercel
   ```
   Follow the prompts (accept default settings).

4. **Add the API Key to Vercel**:
   ```bash
   vercel env add GROQ_API_KEY
   ```
   - Paste your key when prompted (`gsk_...`).
   - Select all environments: **Production**, **Preview**, **Development**.

5. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

---

## ⚙️ How to Update API Keys in Vercel Dashboard Later

If you ever need to change or rotate your API key:

1. Open your project in the [Vercel Dashboard](https://vercel.com/dashboard).
2. Go to **Settings** &rarr; **Environment Variables**.
3. Under **Environment Variables**, locate `GROQ_API_KEY` (or click **Add New**).
4. Enter the new value and select **Production**, **Preview**, and **Development**.
5. Click **Save**.
6. **Redeploy**: Go to the **Deployments** tab, click the three dots (`...`) on your latest deployment, and select **Redeploy** so the new key takes effect.

---

## ⏱️ Vercel Execution Timeout Notes

- **Vercel Hobby (Free Tier)**: Serverless functions have a maximum timeout of **60 seconds** (`"maxDuration": 60` is pre-configured in [`vercel.json`](vercel.json)).
- **Vercel Pro Tier**: If you have a Pro account, you can increase `"maxDuration": 300` in [`vercel.json`](vercel.json) for up to 5 minutes of execution time.

