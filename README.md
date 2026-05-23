# ⚡ Lightning Network Wallets Comparison

A beautiful, filterable, sortable comparison of open-source PWA Lightning Network wallets.

**Live at:** `http://localhost:8080`

## Quick Start

```bash
python3 server.py
# Open http://localhost:8080
```

Or just open `index.html` with any static file server:
```bash
python3 -m http.server 8080
npx serve .
```

## Features

- 🔍 **Full-text search** across all wallet data
- 🏷️ **Filter chips** — toggle Self-Hostable, Non-Custodial, LN-address, NWC, Ecash, Auto-Withdraw
- ↕️ **Sortable columns** — click any header to sort asc/desc
- 📱 **Responsive** — works on desktop and mobile
- 🎨 **Dark theme** — easy on the eyes with Bitcoin orange accents
- 📊 **Two sections** — Open-Source PWA wallets + Non-Open-Source Freemium

## Rebase / Update

To add or update wallets, edit `wallets.json`. The data structure:

```json
{
  "openSource": [{ ... }],
  "freemium": [{ ... }]
}
```

Each wallet entry:
```json
{
  "name": "Coinos",
  "link": "https://coinos.io",
  "repo": "https://github.com/coinos",
  "fees": "0.1%",
  "selfHostable": true,
  "nonCustodial": "Optional",
  "lnAddress": true,
  "autoWithdraw": true,
  "nwc": true,
  "ecash": true,
  "customMint": false,
  "multipleMints": false
}
```

- `nonCustodial`: `"Yes"`, `"No"`, `"Both"`, or `"Optional"`
- `lnAddress`: `true`, `false`, or a string like `"10 (limited)"`, `"∞"`
- All other feature columns: `true` or `false`

## Tests

```bash
# Requires Node.js
node tests/test.js
```

## Tech Stack

- Vanilla HTML/CSS/JS — zero dependencies
- JSON data file for easy rebasing
- Python dev server (optional)

## Source

Data from [stacker.news/items/1194605](https://stacker.news/items/1194605)
