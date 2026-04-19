# Caliper · Körperfett-Rechner

Präzise Körperfett-Berechnung über Hautfaltenmessung mit Caliper. Vier wissenschaftliche Formeln, visuelle Messpunkte auf anatomischer Körper-Silhouette, FFMI-Berechnung und PDF-Export.

**Version:** 1.3.0
**Made by:** Chang · [physiques-unlimited.de](http://www.physiques-unlimited.de)

---

## Features

- **4 wissenschaftliche Formeln:** Jackson & Pollock (3 und 7 Falten), Durnin & Womersley (4 Falten), Parrillo (9 Falten)
- **Interaktive Körper-Silhouette** mit Vorder- und Rückansicht, anatomischer Muskeldarstellung und Messpunkt-Markierung
- **FFMI-Berechnung** (Fat-Free-Mass-Index) mit Kouri-Normalisierung
- **Formel-Vergleich** mit Mittelwert aus allen berechenbaren Methoden
- **PDF-Export** für professionelle Kunden-Protokolle
- **PWA-Support** (Add-to-Homescreen auf iOS und Android)
- **Mobile-first Design** mit iOS-Zoom-Schutz, WCAG AA Touch-Targets, Screen-Reader-Support
- **Automatisierter Build-Check** via GitHub Actions

---

## Lokal starten

**Voraussetzung:** Node.js 18 oder höher ([nodejs.org](https://nodejs.org))

```bash
npm install       # Dependencies installieren
npm run dev       # Entwicklungsserver auf http://localhost:5173
```

---

## Produktions-Build

```bash
npm run build     # Optimierten Build nach dist/ erzeugen
npm run preview   # Build lokal auf http://localhost:4173 testen
```

---

## Deployment

### Vercel (empfohlen)

1. Repository auf GitHub pushen
2. Auf [vercel.com](https://vercel.com) einloggen → **Add New Project** → Repo auswählen
3. Vercel erkennt Vite automatisch → **Deploy**
4. Die `vercel.json` im Projekt konfiguriert SPA-Routing, Security-Header und Asset-Caching

Für Custom Domain (z. B. `caliper.physiques-unlimited.de`):
Vercel → Project → Settings → Domains → Add

### Netlify

1. Repository auf GitHub pushen
2. Auf [netlify.com](https://netlify.com) → **Add new site** → **Import existing project**
3. Die `netlify.toml` im Projekt konfiguriert alles automatisch

### GitHub Pages

Braucht zusätzliche Konfiguration in `vite.config.js` (`base: '/repo-name/'`). Vercel/Netlify sind einfacher.

---

## Projekt-Struktur

```
caliper-app/
├── .github/workflows/
│   └── build.yml           # CI: Build-Check bei jedem Push
├── public/
│   ├── favicon.svg         # App-Favicon (Orange A)
│   ├── robots.txt          # Suchmaschinen-Config
│   └── site.webmanifest    # PWA-Manifest (Add-to-Homescreen)
├── src/
│   ├── CaliperApp.jsx      # Haupt-Komponente (1.461 Zeilen, komplette App)
│   ├── main.jsx            # React-Einstiegspunkt
│   └── index.css           # Tailwind-Direktiven
├── index.html              # HTML-Einstiegspunkt mit SEO + Open Graph
├── package.json            # Dependencies & Scripts
├── vite.config.js          # Vite-Konfiguration
├── tailwind.config.js      # Tailwind-Konfiguration
├── postcss.config.js       # PostCSS-Plugins
├── vercel.json             # Vercel-Deploy-Konfiguration
├── netlify.toml            # Netlify-Deploy-Konfiguration (Alternative)
├── LICENSE                 # Proprietäres Copyright
├── .gitignore              # ignoriert node_modules, dist, .env
└── README.md               # Dieses Dokument
```

---

## Tech-Stack

- **React 18** – UI-Framework
- **Vite 5** – Build-Tool & Dev-Server
- **Tailwind CSS 3** – Utility-first Styling
- **Lucide React** – Icon-Library

---

## Wissenschaftliche Quellen

- **Jackson, A. S., & Pollock, M. L. (1978, 1980):** Generalized equations for predicting body density.
- **Durnin, J. V. G. A., & Womersley, J. (1974):** Body fat assessed from total body density.
- **Parrillo, J. (1980er):** 9-Site Bodybuilder Skinfold Method.
- **Siri, W. E. (1961):** Body composition from fluid spaces and density.
- **Kouri, E. M., et al. (1995):** FFMI-Normalisierung für Natural-Athleten.

---

## Lizenz

© 2026 Chang. Proprietäres Projekt für physiques-unlimited.de. Siehe [LICENSE](./LICENSE).
