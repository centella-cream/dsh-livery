# Wallpaper source gate — 0.2.3 candidate research

Status: **research note, not acceptance evidence.** Baseline: published
`dsh-livery@0.2.2` (Wikimedia Commons is the only offered online source).
Probes were taken on 2026-11-25 (Asia/Shanghai) from the review network with
`curl` and a headless system Chrome `156.0.8078.48`.

This note does not accept a provider. A provider becomes offered only after the
gate record is updated and the real-browser checks are committed (see
[`provider-access-gate.json`](provider-access-gate.json) and the 0.2.2 gate
rules).

## 1. What “publicly accessible” has to mean here

The 0.2.2 gate is **keyless + no Host proxy + one explicit request per user
action**. A candidate must provide:

1. an anonymous JSON API that a browser can read (CORS or same-origin);
2. image URLs that a browser can display without credentials;
3. a licence/attribution record per item that the panel can show;
4. no API key, no login, no backend proxy, no scraping;
5. a rate-limit story compatible with one batch per Online activation.

CORS matters twice:

- the **API** must send `Access-Control-Allow-Origin` for `fetch`;
- the **image bytes** do not need CORS when they are used by `<img>` or
  `background-image`, but the cached-image path (`fetch` → Blob → IndexedDB)
  does need it.

That distinction is why CORS-clean APIs can still be unusable by the current
cache design, and why a **direct-display provider mode** is the key 0.2.3
architecture decision.

## 2. Live probe results

| Source | API / CORS | Image host / CORS | Browser `<img>` | Licence / key | Verdict |
| --- | --- | --- | --- | --- | --- |
| Wikimedia Commons | existing, `origin=*`, ACAO `*` | `upload.wikimedia.org`, ACAO `*` | existing | CC0/CC BY/CC BY-SA per file; keyless | **Keep** (cached) |
| **Cleveland Museum of Art** | `openaccess-api.clevelandart.org` 200, ACAO `*` | `openaccess-cdn.clevelandart.org` 200 `image/jpeg`, **no ACAO** | 748×893 loaded | CC0, no key | **Accept candidate — direct mode** |
| **The Met** | `collectionapi.metmuseum.org` 200, ACAO `*` | `images.metmuseum.org` 200 `image/jpeg`, **no ACAO**, Imperva headers | 600×439 loaded | public-domain filter, CC0, no key, 80 req/s guideline | **Conditional — direct mode + browser gate** |
| Openverse | three API probes timed out at 25 s from this network; official OAuth tiers; anonymous 20/min + 200/day | proxied thumb; gate-accepted in 0.2.1 | not usable in this probe | CC0/PD filter; **higher limits require OAuth** | **Not a 0.2.3 candidate — legacy only** |
| Art Institute of Chicago | Cloudflare 403 challenge | Cloudflare 403 challenge | not reachable | open-access CC0 | **Blocked** |
| Library of Congress | Cloudflare 403 challenge | not tested | not reachable | rights per item | **Blocked** |
| Brooklyn Museum | Vercel 429 challenge | not tested | not reachable | open access | **Blocked** |
| NASA Image Library | API 200, ACAO `*` | `images-assets.nasa.gov` 200 `image/jpeg`, **no ACAO** | 1005×1280 loaded | public-domain-ish, but per-item rights/third-party content missing; acknowledgement required | **Deferred** (rights) |
| Pexels / Unsplash / Pixabay | APIs require keys | image hosts generally CORS-clean | not in keyless scope | custom platform licences, not CC0 | **Deferred** (key UX) |
| Picsum | removed | removed | n/a | Unsplash licence does not permit this use | **Rejected** |

The browser probe used a plain `<img>` element with
`referrerpolicy="no-referrer"`; it is the same display path a direct provider
would use. This is **one probe, not acceptance**: the 0.2.3 plan requires three
Met runs across two networks/days plus a real DSH Web and Desktop `<img>` check.
The Met image host sends Imperva cookies and has returned an HTML challenge in
earlier gate reviews; the browser probe passed this time, so Met is conditional
on a repeatable acceptance probe, not just this result. The Met object record
also has no pixel-dimension or file-size field (`measurements` is physical
size), so a universal 15 MiB/40 MP precheck cannot be claimed for Met; the plan
uses `primaryImage` for the wallpaper with `primaryImageSmall` as the error
fallback and a browser load timeout, and records the limitation.

## 3. Source-by-source notes

### Cleveland Museum of Art

- API: `https://openaccess-api.clevelandart.org/api/artworks/`
- Query used: `?q=landscape&has_image=1&cc0=1&limit=2` → `total: 1595`, CC0
  records with `images.web` / `images.print` / `images.full`.
- Example image: `https://openaccess-cdn.clevelandart.org/1915.534/1915.534_web.jpg`
  — `image/jpeg`, 405,819 B, 748×893; no `Access-Control-Allow-Origin`.
- Official terms: the dataset and images are released under CC0 for
  unrestricted commercial and noncommercial use; no key or registration.
  See [Cleveland Open Access API](https://www.clevelandart.org/open-access-api).
- Why it fits: keyless, CC0, real title/creator/date/source URL, stable CDN,
  browser `<img>` works. The image CDN is **direct-display only**.
- Risks: no CORS cache; image URLs can be large (`print` 5.9 MB, `full` TIFF
  76 MB); use `web` for thumbnails and `print` for the wallpaper, never `full`.
  Direct mode has **no byte-cap guarantee**: the API `filesize` can drive a UI
  warning but cannot stop the browser from loading a changed asset.

### The Metropolitan Museum of Art

- API: `https://collectionapi.metmuseum.org/public/collection/v1.1/search`
  (the `/v1/search` endpoint retires on 2026-10-01); objects:
  `/public/collection/v1/objects/{id}`.
- Search response contains object IDs; each object record has
  `isPublicDomain`, `primaryImage`, `primaryImageSmall`, `title`,
  `artistDisplayName`, `objectURL`, `creditLine`.
- Example: object `340468` → `images.metmuseum.org/.../DP811071.jpg`,
  `image/jpeg` 69,190 B, no ACAO; headless Chrome loaded a 600×439 image.
- Official terms: public-domain images, CC0 dataset, no key, 80 requests/second
  guideline. See [The Met Collection API](https://metmuseum.github.io/).
- Why it fits: keyless, public-domain filter, high-resolution image URLs,
  direct display works.
- Risks: image CDN is behind Imperva and has produced an HTML challenge in the
  gate review; one search plus N object requests per batch; use the v1.1
  paginated search; require `isPublicDomain === true` and a browser
  `naturalWidth > 0` probe.

### Openverse — tested and rejected for 0.2.3

- API: `https://api.openverse.org/v1/images/`; query filter
  `license=cc0,pdm`, `page_size=12`.
- **I re-tested it before writing the plan:** three requests to
  `https://api.openverse.org/v1/images/?q=…`, `/v1/images/` and `/v1/` all timed
  out after 25 s from the review network. That is not proof of universal
  outage, but it is not a working dependency.
- Openverse’s official [Authentication and Throttling](https://docs.openverse.org/api/reference/authentication_and_throttling.html)
  documents OAuth rate tiers; the 0.2.2 gate recorded anonymous limits of
  **20/min + 200/day** and “registration required for higher limits”. There is
  **no supported bypass**: using more than the anonymous allowance requires
  OAuth credentials (and a secret-storage UX this keyless plugin does not have).
  Circumventing the limit would violate the API terms.
- The 0.2.2 decision to remove Openverse was therefore correct. Openverse is
  **not** a 0.2.3 re-add candidate and the 0.2.3 plan does not ask the user to
  decide whether to bring it back. If it is ever added again, it must be a
  separate **authenticated/OAuth key source**, not a keyless one.
- The 0.2.2 notice was removed together with the offered provider. Legacy
  `providerId: openverse` selections still render; the notice must be restored
  in 0.2.3 even though Openverse stays legacy-only. This is a compliance fix,
  not a re-add.

### NASA, AIC, LoC, Brooklyn

- **NASA** is a good visual source and the API is CORS-clean, but the gate
  rejected it for missing per-item rights metadata and image-host CORS; NASA
  also asks for acknowledgement and no-endorsement language. Keep it deferred
  until a rights/credit policy is accepted.
- **Art Institute of Chicago**, **Library of Congress** and **Brooklyn Museum**
  returned Cloudflare/Vercel challenges from the review network; they are not
  dependable for a client-only browser fetch. Do not code against them until a
  clean-network browser probe passes.

### Key-based sources

Pexels, Unsplash and Pixabay are the natural stock-photo sources, but all three
require an API key and use custom platform licences, not CC0. They are a
separate product decision (user-supplied key, secret storage, key UX) and are
**not** part of the keyless 0.2.3 target. They are also the only way to add a
third or fourth source if Cleveland/Met are not enough and NASA rights cannot be
resolved.

## 4. Recommendation

The keyless, no-proxy portfolio that can actually ship without Openverse:

1. **Wikimedia Commons** — existing, cached.
2. **Cleveland Museum of Art** — new, CC0, direct display.
3. **The Metropolitan Museum of Art** — new, public domain, direct display,
   conditional on a repeatable browser image probe.

That is **two new sources, three offered total**. If Met fails its repeatable
browser gate, 0.2.3 must either gate NASA (keyless rights/credit) or re-scope to
**one new source**; keyed sources are a 0.2.4 decision, not a 0.2.3 fallback. It
must not silently ship one new source and call the portfolio “three.”

## 5. Open gate questions for 0.2.3

- Is direct display acceptable when the image host has no CORS and no local
  Blob cache? It changes offline/reload behaviour and needs an explicit UI note.
- Is the Met Imperva image host stable enough for a shipped provider?
- If Met fails, do we gate NASA (keyless rights/credit) or re-scope 0.2.3 to one
  new source? Keyed sources are a separate 0.2.4 decision.
- Should key-based stock-photo sources be a separate 0.2.4 proposal rather than
  mixing keys into 0.2.3?

Openverse is **not** an open question: it needs authentication/limits beyond the
keyless policy, has no supported bypass, and remains legacy-only.
