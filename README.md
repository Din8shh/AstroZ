# AstroZ

A mobile-first, offline-first PWA for Telugu jyotisham (Andhra Pradesh and Telangana tradition):
panchangam, marriage matching, muhurtham and more, with free remedies only. Telugu by default, with an English toggle.
No accounts, no backend, no tracking: birth details stay on the phone.

- Live app: https://din8shh.github.io/AstroZ/
- Source code: https://github.com/Din8shh/AstroZ
- Spec: [docs/SPEC.md](docs/SPEC.md) · Design mapping: [docs/design-mapping.md](docs/design-mapping.md)

## Develop

```bash
npm ci
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run test:e2e
```

`npm run build` type-checks and builds to `dist/`. Pushing to `main` deploys to GitHub Pages
(`.github/workflows/deploy.yml`).

## Licence

AstroZ is free software under the **GNU Affero General Public License v3.0 or later** — see [LICENSE](LICENSE).
It uses the [Swiss Ephemeris](https://www.astro.com/swisseph/) (© Astrodienst AG) under the AGPL.
If you run a modified version for others over a network, you must offer them its source (AGPL §13).

Third-party components and fonts: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
