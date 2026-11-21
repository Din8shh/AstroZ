# Third-party notices

AstroZ is licensed under the GNU Affero General Public License v3.0 or later (see `LICENSE`).
It includes or bundles the following third-party software and fonts, each under its own licence.

## Shipped in the app

| Component | Version | Licence | Notes |
|---|---|---|---|
| Swiss Ephemeris (via swisseph-wasm) | 2.10.03 | AGPL-3.0 or Swiss Ephemeris Professional Licence | © Astrodienst AG, Zürich. https://www.astro.com/swisseph/ — used here under the AGPL. Includes the ephemeris files `sepl_18.se1`, `semo_18.se1`, `seas_18.se1` (1800–2400 AD). |
| swisseph-wasm | 0.1.0 | GPL-3.0-or-later | © prolaxu. https://github.com/prolaxu/swisseph-wasm |
| React, React DOM | 19.3.1 | MIT | © Meta Platforms, Inc. and affiliates |
| Zustand | 5.1.0 | MIT | © Paul Henschel |
| Luxon | 3.7.2 | MIT | © JS Foundation and other contributors |
| Comlink | 4.4.2 | Apache-2.0 | © Google LLC |
| idb-keyval | 6.3.0 | Apache-2.0 | © Jake Archibald |
| Workbox (workbox-window, generated service worker) | 7.4.1 | MIT | © Google LLC |

## Data

| Data | Licence | Notes |
|---|---|---|
| City list `public/data/cities.json` | CC BY 4.0 | Derived from [GeoNames](https://www.geonames.org) (cities1000, cities15000, admin1 codes) by `scripts/build-cities.mjs`. |

## Fonts (self-hosted woff2 subsets from `design/handoff/`)

| Font | Licence |
|---|---|
| Noto Sans, Noto Sans Telugu | SIL Open Font License 1.1 — © The Noto Project Authors |
| Ramabhadra | SIL Open Font License 1.1 — © Silicon Andhra |
| Fraunces | SIL Open Font License 1.1 — © The Fraunces Project Authors |

The SIL Open Font License 1.1 is at https://openfontlicense.org. Licence texts for the npm packages
are in each package's `LICENSE` file under `node_modules/`.
