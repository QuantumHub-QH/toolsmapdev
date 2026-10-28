# MAPDEV // Tools Dev Map & Free Assets Hub 🛠️🌌

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
![License: MIT](https://img.shields.io/badge/License-MIT-white.svg)
![Next.js](https://img.shields.io/badge/Next.js-14_App_Router-black?logo=next.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-black?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)

An ultra-modern, high-performance developer hub and free resource suite for Roblox Studio builders, map designers, and level artists. Built with a sleek black & white cyber/dev aesthetic, fully responsive across Mobile & PC, with built-in REST API backend endpoints and zero-config deployment on Vercel.

---

## ✨ Features

### 1. 📦 Free Asset & Map Resource Library
- **3D Models & Props**: Modular street lamps, low-poly nature & pine tree packs, city props, warehouse kits.
- **4K PBR Materials & Textures**: Seamless wet asphalt, grunge concrete, tileable terrain maps with Color, Normal, and Roughness maps.
- **Atmosphere & Lighting Presets**: Cyberpunk Noir, Golden Hour, Clean Studio Noon, Silent Hill Horror Mist.
- **Luau Mechanics & Scripts**: Smooth sliding doors with TweenService, Day/Night cycles, teleport pads with debounce, region audio detectors.
- **8K Skyboxes & Soundscapes**: Seamless cosmic nebula skyboxes, ambient rain, and city hum loops.
- **Developer UI Kits**: Dark mode ScreenGui, health bars, inventory grids, and prompt dialogs.
- **Instant Actions**: 1-Click Roblox Asset ID Copy (`rbxassetid://`), direct source download, Luau script preview, and local bookmarks.

### 2. 🧰 Interactive Developer Tools
- **🎨 Luau Color3 Converter**: Visual color picker generating `Color3.fromRGB(...)`, `Color3.fromHex(...)`, `Color3.new(...)`, and CSS hex with instant copy.
- **📏 Studs to Real-World Scale Calculator**: Precision converter between Roblox Studs, Meters, Feet, and Centimeters (1 Stud = 0.28m, Character = 5 Studs = 1.4m).
- **☀️ Lighting & Atmosphere Studio**: Real-time sliders for ClockTime, Brightness, FogEnd, Bloom, and OutdoorAmbient with 1-click Luau script export for Roblox Studio Command Bar.
- **⚡ Luau Mechanics Generator**: Interactive code generator for Doors, Hazard parts, Teleporters, and Server Leaderstats.
- **🔊 Roblox Asset ID Resolver & Audio Tester**: Convert raw Asset IDs into Studio format, catalog URLs, and CDN endpoints.

### 3. 🌐 Backend REST API Endpoints
- `GET /api/assets`: Search, category filtering, and tag queries.
- `POST /api/assets`: Submit community assets and resources.
- `GET /api/tools`: Retrieve dev tools, lighting presets, and code snippets.
- `GET /api/stats`: Live statistics on assets, downloads, and community metrics.

### 4. 📱 Responsive Dark-Themed GUI
- Pitch-black cyber aesthetic (`#08080a`, `#101014`, crisp pure white text, subtle glowing borders).
- Mobile navigation drawer and touch-friendly controls.
- Keyboard shortcuts (`Ctrl + K` / `⌘K` for instant search, `ESC` for modal dismiss).
- Local storage bookmarks system.

---

## 🚀 Quick Start (Local Development)

```bash
# Clone the repository
git clone https://github.com/QuantumHub-QH/mchlern.git

# Enter the project directory
cd mchlern

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Premium Assets Setup

Premium access is granted to a Discord user ID for a selected number of days in the admin panel. Expired entitlements are denied by the server automatically. Public catalog responses include product details only; premium files, Roblox IDs, download URLs, and Luau code are kept in private Firebase collections/storage and released only after the server verifies the signed Discord session and current entitlement.

Before using Premium in production:

1. Enable **Cloud Firestore** and **Cloud Storage** in the Firebase project used by the site.
2. Create a Firebase service account with access to that project. In Vercel Project Settings → Environment Variables, set:
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: the full service-account JSON value. Keep it server-only; never add a `NEXT_PUBLIC_` prefix or commit the key.
   - `FIREBASE_STORAGE_BUCKET`: the exact bucket name shown in Firebase Storage (for example, `project-id.firebasestorage.app`).
   - `ADMIN_PASSWORD`: a strong password for the admin panel. The built-in weak default is intentionally disabled.
   - `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, and `DISCORD_REDIRECT_URI`: configure the Discord OAuth application and register the exact callback URL (`https://your-domain/api/auth/discord/callback`) in Discord Developer Portal. The client secret also signs the HTTP-only Discord session cookie.
   - Optionally set `NEXT_PUBLIC_BASE_URL` to the canonical site origin.
3. Publish [`storage.rules`](./storage.rules) to Firebase Storage and [`firestore.rules`](./firestore.rules) to Cloud Firestore. These deny direct browser access; Firebase Admin SDK server operations bypass client security rules. The public catalog remains served by the GitHub-backed API.
4. Redeploy Vercel after setting the environment variables, then log out and authorize Discord again.
5. In Admin Panel, add a Discord ID with a duration. Mark a product **Premium** and publish it. Use a private file upload for premium files; an external download URL is only revealed to entitled users and may itself be publicly shareable.

Premium download and ID endpoints re-check the signed Discord session and expiration on every request. Discord IDs/Roblox IDs are not passwords, and a user who has legitimately received an asset can still copy or redistribute it.

**Previously public data cannot be made secret retroactively.** Promoting a product removes its protected fields from the current public catalog, but old GitHub commits and already-copied files/IDs may remain accessible. Replace or rotate any Roblox asset ID that was previously published before relying on Premium protection.

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

## ⚡ Deploy ke Vercel (1-Click)

Web ini dibuat dengan **Next.js 14 App Router** sehingga **100% Zero-Config** saat dideploy ke Vercel:

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
