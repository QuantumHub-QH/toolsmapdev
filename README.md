# MAPDEV // Tools Dev Map & Free Assets Hub 🛠️🌌

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
![License: MIT](https://img.shields.io/badge/License-MIT-white.svg)
![Next.js](https://img.shields.io/badge/Next.js-16_App_Router-black?logo=next.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-black?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)

An ultra-modern, high-performance developer hub and free resource suite for Roblox Studio builders, map designers, and level artists. Built with a sleek black & white cyber/dev aesthetic, fully responsive across Mobile & PC, with built-in REST API backend endpoints and deployment support for Cloudflare Workers and Vercel.

---

## ✨ Features

### 1. 📦 Free Asset & Map Resource Library
- **Separate Products Tab**: Filter the catalog into Free and Premium assets without scrolling past the upload tools.
- **3D Models & Props**: Modular street lamps, low-poly nature & pine tree packs, city props, warehouse kits.
- **4K PBR Materials & Textures**: Seamless wet asphalt, grunge concrete, tileable terrain maps with Color, Normal, and Roughness maps.
- **Atmosphere & Lighting Presets**: Cyberpunk Noir, Golden Hour, Clean Studio Noon, Silent Hill Horror Mist.
- **Luau Mechanics & Scripts**: Smooth sliding doors with TweenService, Day/Night cycles, teleport pads with debounce, region audio detectors.
- **8K Skyboxes & Soundscapes**: Seamless cosmic nebula skyboxes, ambient rain, and city hum loops.
- **Developer UI Kits**: Dark mode ScreenGui, health bars, inventory grids, and prompt dialogs.
- **Instant Actions**: 1-Click Roblox Asset ID Copy (`rbxassetid://`), direct source download, Luau script preview, and local bookmarks.

### 2. 🧰 Interactive Developer Tools
- **Roblox Audio & Image Uploaders**: Batch upload up to 10 files to each user's own Roblox account with Discord-based daily quotas.
- **Audio Adjustments**: Preview and process user-provided audio with speed and volume controls. Upload only files you own or are authorized to use.
- **Session-Only API Keys**: Each uploader uses the user's own scoped Roblox Open Cloud key; the browser does not persist the key after the tab is closed.
- **🎨 Luau Color3 Converter**: Visual color picker generating `Color3.fromRGB(...)`, `Color3.fromHex(...)`, `Color3.new(...)`, and CSS hex with instant copy.
- **📏 Studs to Real-World Scale Calculator**: Precision converter between Roblox Studs, Meters, Feet, and Centimeters (1 Stud = 0.28m, Character = 5 Studs = 1.4m).
- **☀️ Lighting & Atmosphere Studio**: Real-time sliders for ClockTime, Brightness, FogEnd, Bloom, and OutdoorAmbient with 1-click Luau script export for Roblox Studio Command Bar.
- **⚡ Luau Mechanics Generator**: Interactive code generator for Doors, Hazard parts, Teleporters, and Server Leaderstats.
- **🔊 Roblox Asset ID Resolver & Audio Tester**: Convert raw Asset IDs into Studio format, catalog URLs, and CDN endpoints.

### 3. 🛡️ Discord Access & Admin Panel
- **Discord Authorization**: Signed server-side sessions gate the product catalog and upload quota.
- **Free & Premium Access**: Premium-only product downloads and server-verified upload entitlements.
- **Admin Panel**: Manage Free/Premium products and grant or revoke Premium access for Discord users.

### 4. 🌐 Backend REST API Endpoints
- `GET /api/assets`: Search, category filtering, and tag queries.
- `GET /api/assets/file?id=<product-id>`: Download a private Supabase Storage product file after Discord/Premium checks.
- `POST /api/assets`: Submit community assets and resources.
- `GET /api/tools`: Retrieve dev tools, lighting presets, and code snippets.
- `GET /api/stats`: Live statistics on assets, downloads, and community metrics.

### 5. 📱 Responsive Dark-Themed GUI
- Pitch-black cyber aesthetic (`#08080a`, `#101014`, crisp pure white text, subtle glowing borders).
- Mobile navigation drawer and touch-friendly controls.
- Separate Products and Uploader tabs, with Audio and Image sub-tabs to keep mobile navigation short.
- Keyboard shortcuts (`Ctrl + K` / `⌘K` for instant search, `ESC` for modal dismiss).
- Local storage bookmarks system.

---

## 🔐 Roblox Upload Key Handling

Each user enters their own Roblox Open Cloud API key and creator ID. The key is held in page memory and sent over HTTPS to the server only when calling Roblox; it is not saved in browser storage by this app. Use a key scoped to the intended creator and the minimum Assets permissions. Disconnecting or closing the tab clears the in-memory key. Roblox's own moderation, file restrictions, and upload quotas still apply.

Audio and image uploads require a confirmation that the user owns the content or has permission to upload it. The uploader accepts local files; it does not download audio from third-party media links.

---

## 🚀 Quick Start (Local Development)

```bash
# Clone the application repository
git clone https://github.com/QuantumHub-QH/toolsmapdev.git

# Enter the project directory
cd toolsmapdev

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deploy to Cloudflare Workers

This Next.js app uses the OpenNext Cloudflare adapter. In Cloudflare Workers & Pages, connect the `QuantumHub-QH/toolsmapdev` repository and use:

- **Build command:** `npx opennextjs-cloudflare build`
- **Deploy command:** `npx wrangler deploy`
- **Preview command:** `npx opennextjs-cloudflare preview`
- Leave **Protect with Cloudflare Access** off for a public website.

Create a **private** Supabase Storage bucket named `product-files` with a 25 MB file-size limit. Do not make the bucket public. Product metadata stays in the private GitHub data repository; uploaded product files are stored in Supabase Storage and served only through the Worker after Discord and Premium authorization checks. Deleting a product commits the catalog removal first, then deletes its Storage object; the Admin Panel reports if cleanup fails.

Add these server-side values in the Worker's **Settings → Variables and Secrets** before relying on app features. Never commit their values:

- `GITHUB_TOKEN` — least-privilege token with access to `QuantumHub-QH/mchlern`, where catalog, Premium, and upload-limit data are currently stored.
- `ADMIN_PASSWORD` — strong admin password and signing secret for sessions.
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, and `DISCORD_REDIRECT_URI`.
- `SUPABASE_URL` — the project URL shown in the Supabase dashboard.
- `SUPABASE_SECRET_KEY` — the project's server-side secret API key. Never expose it in a `NEXT_PUBLIC_*` variable or browser code.
- `NEXT_PUBLIC_FIREBASE_API_KEY` and `NEXT_PUBLIC_FIREBASE_PROJECT_ID` if the Firebase fallback is used; add the other `NEXT_PUBLIC_FIREBASE_*` settings when applicable.

Set `DISCORD_REDIRECT_URI` to `https://<worker-domain>/api/auth/discord/callback` and register that exact callback in the Discord Developer Portal. Update it again if you later switch to a custom domain. The website repository (`toolsmapdev`) and the data repository (`mchlern`) are separate; the GitHub token must have access to the latter.

The local Cloudflare runtime can be checked with `npm run preview`. OpenNext currently warns that Windows support is not guaranteed; if local Workers preview fails on Windows, use WSL or Cloudflare's Linux-based GitHub deployment.

---

## 🔒 Discord-Gated Product Catalog

The public website requires a verified Discord login before showing the product catalog. Product API requests, favorites, and download-stat updates also require the server-signed HTTP-only Discord session cookie; product data is not embedded in the homepage bundle or browser storage. Products marked **Premium** show **ADD PREMIUM** to users without an active entitlement; active Premium users receive the normal download, asset-ID, and script actions. The **BUY PREMIUM** menu lists the manual Discord-contact plans: Rp10.000/week, Rp30.000/month, Rp50.000/3 months, and Rp100.000/8 months.

To prevent direct access to the catalog outside the website:

1. Change the data repository `QuantumHub-QH/mchlern` to **Private** in GitHub Settings → General → Danger Zone. The Cloudflare Worker must retain access through its `GITHUB_TOKEN` secret.
2. Keep `GITHUB_TOKEN` configured as a server-side secret, with private-repository **Contents: Read and write** permission. The server uses the authenticated GitHub API to load and publish `data/products.json`, `data/premium-users.json`, and `data/limits.json`; unauthenticated raw GitHub fallback is disabled. Premium entitlements and upload limits are stored in the private repository. The catalog API only includes Premium IDs, scripts, file data, and download links for users whose server-verified Discord entitlement has not expired.
3. Keep `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, and `DISCORD_REDIRECT_URI` configured; register the exact callback URL (`https://your-domain/api/auth/discord/callback`) in Discord Developer Portal. The client secret signs the Discord session cookie.
4. Publish [`firestore.rules`](./firestore.rules) to Cloud Firestore if Firebase is used, so browser clients cannot read the fallback `products` collection directly.
5. Keep a strong `ADMIN_PASSWORD` configured as a server-side secret. Set all variables for the target environment and redeploy after changing them.
6. In Admin Panel → **Kelola User Premium**, enter the buyer's Discord user ID and choose a duration from one week through one year. Re-adding an active user extends from their current expiry; deleting the user revokes Premium immediately. Expired users automatically lose Premium features. Premium accounts have unlimited daily audio/image uploads; free accounts retain the server-enforced limit of 10 successful uploads per day.

Product file objects are stored in the private `product-files` Supabase Storage bucket. Keep the bucket private; the Worker serves file downloads only after checking the Discord session and, for Premium products, the current entitlement. Product deletions remove the corresponding Storage object after the GitHub catalog update succeeds. Older Base64 files already committed in Git history are not erased by this migration or by catalog deletion; re-save those products to move their current files into Supabase Storage, and clean repository history separately if historical GitHub storage must also be reclaimed.

The data repository is separate from the website's public availability: making `mchlern` private does not make the deployed site private, provided the Worker has a valid `GITHUB_TOKEN`.

**Previously public data cannot be made secret retroactively.** Making the repository private blocks future anonymous access to its current GitHub pages, but does not erase copies, forks, downloads, caches, screenshots, or old data already obtained by others. Rotate any exposed Roblox IDs/files where possible. Any user who can view/download a product after logging in can still copy or redistribute it; this gate prevents anonymous direct access, not redistribution by authorized visitors.

---

## 📤 Push ke GitHub (Step-by-Step)

Buka terminal di folder project (`tools-dev-map`):

```bash
# Inisialisasi Git
git init

# Tambahkan semua file
git add .

# Buat commit pertama
git commit -m "feat: initial commit Tools Dev Map & Free Assets Hub"

# Ganti branch ke main
git branch -M main

# Hubungkan ke repository GitHub kamu (buat repo baru di github.com/new terlebih dahulu)
git remote add origin https://github.com/USERNAME_KAMU/tools-dev-map.git

# Push ke GitHub
git push -u origin main
```

---

## ⚡ Deploy ke Vercel

This project also supports deployment to Vercel:

1. Buka [vercel.com](https://vercel.com) dan login dengan akun GitHub kamu.
2. Klik tombol **"Add New..."** -> **"Project"**.
3. Pilih repository `tools-dev-map` yang baru saja kamu push ke GitHub.
4. Framework Preset akan otomatis terdeteksi sebagai **Next.js**.
5. Klik **"Deploy"**.
6. Website kamu langsung online dalam waktu ~1 menit dengan URL gratis dari Vercel (misal: `https://tools-dev-map.vercel.app`)!

---

## 📁 Struktur Project

```
tools-dev-map/
├── app/
│   ├── api/
│   │   ├── assets/route.ts       # Backend REST API untuk Assets
│   │   ├── tools/route.ts        # Backend REST API untuk Dev Tools
│   │   └── stats/route.ts        # Backend REST API untuk Statistics
│   ├── globals.css               # Dark theme, grid patterns & typography
│   ├── layout.tsx                # Root layout & SEO meta tags
│   └── page.tsx                  # Main single-page application
├── components/
│   ├── Navbar.tsx                # Header & mobile drawer navigation
│   ├── Hero.tsx                  # Hero banner, search bar & category filters
│   ├── AssetCard.tsx             # Card component dengan copy & modal trigger
│   ├── AssetModal.tsx            # Modal detail asset & Luau script preview
│   ├── DevToolsSection.tsx       # 5 interactive developer utility engines
│   ├── SubmitModal.tsx           # Form submission dengan backend POST
│   ├── BookmarksModal.tsx        # Saved favorites via localStorage
│   └── Footer.tsx                # Developer footer & documentation links
├── lib/
│   └── data.ts                   # Initial asset data, lighting presets & snippets
├── types/
│   └── index.ts                  # TypeScript data models
├── tailwind.config.ts            # Dark mode palette & animations
├── tsconfig.json                 # TypeScript compiler configuration
└── package.json                  # Dependencies & scripts
```

---

## 📄 Lisensi
Didistribusikan di bawah Lisensi MIT. Bebas digunakan untuk keperluan pribadi maupun komersial.
