# treeservicebeaverton.net

Static site for Tree Service Beaverton (Beaverton, OR). Plain HTML, CSS and a little JavaScript, two small Vercel functions for the estimate form, and a password-protected leads dashboard. No framework and no build step on Vercel.

**Built so far:** logo, favicons, header and menus, footer, homepage, the services hub, all five service pages, the service areas hub, all eighteen service-area pages, the guides hub, all ten guides, the six company pages (About, Questions and answers, Contact, Privacy, Terms, Sitemap), thank-you page, 404 page, lead storage and dashboard. Every internal link on the site now resolves. Do not point the live domain at this until the privacy policy and the pages linked from the menus exist.

**To put the site live, follow `GO-LIVE.md`.** It covers GitHub, Vercel, the domain, the lead form, search engine verification and sitemap submission, step by step. This README is the reference for how the project is put together.

## What is in the repo

```
index.html                 Homepage
services/index.html        Services hub
tree-removal/, emergency-tree-service/, tree-trimming/, stump-grinding/, stump-removal/   The five service pages (each an index.html)
404.html                   Not-found page (Vercel serves it automatically)
thank-you/index.html       Shown after a form post without JavaScript (noindex)
admin/index.html           Leads dashboard at /admin/ (noindex, blocked in robots.txt)
api/lead.js                Estimate-form handler: saves the lead, then optional email / webhook
api/leads.js               Dashboard API (password protected): list, update status and notes, delete
api/_store.js              Database helper (Upstash Redis over REST). Not an endpoint
api/health.js              Set-up check at /api/health: shows which lead-form pieces are configured, never any secret
.env.example               Reference list of the environment variables (real values live in Vercel)
GO-LIVE.md                 Step-by-step launch guide (not deployed)
assets/css/site.css        Site stylesheet          assets/css/admin.css   Dashboard styles
assets/js/site.js          Menus, site plan, permit checker, form          assets/js/admin.js   Dashboard script
assets/fonts/              Barlow + Barlow Condensed, self-hosted (SIL Open Font License, text included)
assets/img/                logo.svg, logo-light.svg (footer), mark.svg, logo-mark-512.png (schema), og-image.jpg, photo-slot placeholders
favicon.ico, favicon.svg, apple-touch-icon.png, icon-192.png, icon-512.png, site.webmanifest
robots.txt, sitemap.xml, vercel.json, package.json, .vercelignore
_src/                      Page sources + build script (not deployed). See "Editing"
README.md, docs/           This file, plus the design notes and the entity map in docs/ (not deployed)
```

## Deploy

1. Create a GitHub repo and upload the **contents** of this folder (so `index.html` sits in the repo root).
2. Vercel > Add New > Project > import the repo. Framework preset **Other**. Leave Build Command and Output Directory empty.
3. Settings > Domains: add `treeservicebeaverton.net` and `www.treeservicebeaverton.net`. Make the **non-www** domain the primary one and let www redirect to it. Every canonical, the sitemap and the schema use `https://treeservicebeaverton.net/`. (There is deliberately no host redirect in vercel.json, because it would loop if www were ever set as primary.)
4. Set up leads (next section), redeploy, send yourself a test request.

## Leads: where the form goes, and the dashboard

Every estimate form posts to `/api/lead`. The function checks the fields, drops bot submissions (hidden field, and forms sent in under 2.5 seconds), limits one address to 6 requests per 10 minutes, and then:

1. **Saves the lead** to the database, if one is connected. This is what the dashboard reads.
2. **Emails you**, if the Resend variables are set (optional).
3. **Posts to a webhook**, if `LEAD_WEBHOOK_URL` is set (optional: Zapier, Make, a Google Sheet script).

If none of the three is set up, the function answers 503 and the page tells the visitor to call, so a lead is never silently lost.

**Set-up, once**

1. Vercel > your project > Storage > Create Database > **Upstash for Redis** (free plan is enough) > connect it to the project. Vercel adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` for you. Leads are stored under the key prefix `tsb:`, so the same database can be shared with another site.
2. Settings > Environment Variables > add **`ADMIN_PASSWORD`**: 12 characters or more, long and random.
3. Optional email alerts: `RESEND_API_KEY`, `LEAD_TO`, `LEAD_FROM` (verify the sending domain at resend.com first).
4. Optional: `LEAD_WEBHOOK_URL`, and `LEAD_RETENTION_DAYS` (default 730; older leads delete themselves).
5. Redeploy, then open `/admin/`.

**Dashboard:** counters (all, new, last 7 days, won), search, status and service filters, one row per lead. Open a row for tap-to-call phone, email, address, details and the page the request came from. Set a status (New, Contacted, Estimate booked, Quoted, Won, Lost, Spam), keep private notes, delete a lead, export the current view as CSV.

**Security:** one shared password, sent only over HTTPS, kept for the browser session only. Ten wrong passwords from one address lock that address out for 15 minutes. Visitor IPs are stored only as a one-way hash for rate limiting. The page and the API send noindex and no-store headers and are disallowed in robots.txt.

## Before launch

- [ ] **CCB number.** The license line is switched off. To show it, put the number in `ccb` in `_src/config.json` and rebuild: it then appears in the hero, the estimate panel, the footer and the schema. Oregon requires a Construction Contractors Board (or LCB) number on contractor advertising, websites included.
- [ ] **Hours.** `Monday to Saturday, 7 am to 6 pm` is a placeholder (config: `hours_display`, `hours_opens`, `hours_closes`).
- [ ] **Harry's note.** It makes no claims about experience or credentials. Add his real background where the HTML comment says so in `_src/pages/index.html`.
- [ ] **Claims.** Nothing on the page says licensed, insured, certified, 24/7 or a number of years. Add only what is true.
- [ ] **Permit checker.** Wording follows Beaverton Code 5.05 (right-of-way trees), Development Code 60.60 (protected trees) and Washington County's street-tree page. Confirm the Planning Division number 503-526-2420 and the yard-tree thresholds with the city before launch.
- [ ] **Photos.** The founder photo is in. Replace the remaining placeholder drawings (next section).
- [ ] **Search Console / Bing.** Put the verification codes in `google_verification` / `bing_verification` in config.json and rebuild.
- [ ] **No prices** appear anywhere, by design.

## Service pages

Each service page has its own title, meta description, canonical, Open Graph tags and a schema graph (WebPage, BreadcrumbList, Service, FAQPage, plus a compact copy of the one business node). Each has two drawings built as inline SVG, so they are sharp at any size, weigh almost nothing and need no image files:

| Page | Drawing 1 | Drawing 2 | Extra tool |
|---|---|---|---|
| Tree removal | Five-step sectional take-down (tabs) | Six warning signs on a tree (tags) | |
| Emergency tree service | First hour by scenario: house, car, wires, hanging limb (tabs) | Who fixes what on the service line | |
| Tree trimming | Collar cut vs flush cut, stub and topping (tabs) | Pruning by season (tabs) | |
| Stump grinding | Grind depth cross-section (tabs) | 811 utility paint colors on a yard plan | |
| Stump removal | Ground vs built-on vs removed cross-section (tabs) | Four-step extraction strip | Grind-or-remove chooser |

Page copy lives in `_src/pages/<slug>.html`. The FAQ for each page is the JSON block at the top of that file and feeds both the page and the FAQ schema. The estimate form is one shared partial (`_src/partials/estimate.html`) with the page's service preselected. No prices appear on any page, and the QA script fails the build check if a price word slips in.

## Service-area pages

`/service-areas/` is the hub and `/service-areas/<slug>/` holds the eighteen area pages: eight Beaverton neighborhoods and ten nearby communities. Each page has its own title, meta description, canonical, Open Graph tags and schema (WebPage, BreadcrumbList, a Service whose `areaServed` is that place with coordinates, FAQPage, and the compact business node). No page creates a second business.

Every area page carries: a locator map drawn from real coordinates, where each dot links to that area's page; a Google map of the area, embedded without an API key, with an "Open in Google Maps" link beside it; tabs of four local places with tree notes; the tree rules for that jurisdiction (Beaverton, unincorporated Washington County, Hillsboro, Tigard, or a mix); four local questions plus one shared one; and the estimate form.

The area pages are generated. Their copy lives in `_src/tools/areas_a.py`, `areas_b.py` and `areas_c.py`, and `_src/tools/make_areas.py` writes `_src/pages/area-<slug>.html` and the hub. To change an area, edit its entry, then run `python3 _src/tools/make_areas.py` followed by `python3 _src/build.py`. Rule text shared by several areas is in `RULES` inside `make_areas.py`.

## Guides

`/guides/` is the hub and `/guides/<slug>/` holds the ten guides: the Beaverton permit guide, emerald ash borer, street trees, ice and wind storm prep, a tree on the house or car, signs a tree is dangerous, the pruning calendar, stump grinding vs removal, tree problems by species, and how to hire a tree service in Oregon. Each has a title, meta description, canonical, Open Graph tags and schema: an Article with Harry Fauver as author and the business as publisher, a BreadcrumbList, a FAQPage and the compact business node.

Every guide opens with a "short version" box and carries at least two visual or interactive features: drawings, tagged drawings, tab and chooser tools, and on the pruning guide a month-by-month calendar. No prices appear in any guide.

The guides are generated. Their copy lives in `_src/tools/guides_1.py` to `guides_4.py`, the shared building blocks (tabs, choosers, tagged drawings, the calendar) are in `guide_kit.py`, and `make_guides.py` writes `_src/pages/guide-<slug>.html` and the hub. To change a guide, edit its entry, then run `python3 _src/tools/make_guides.py` followed by `python3 _src/build.py`.

## Company pages

`/about/` (AboutPage and Person schema), `/faq/` (34 questions in seven groups with a live filter, FAQPage schema), `/contact/` (ContactPage with the full business node, a Google map of the office and the estimate form), `/privacy-policy/`, `/terms/` and `/sitemap/`, an HTML sitemap that lists every indexable page and is rebuilt from the page sources.

They are generated by `_src/tools/make_company.py`. Run it after `make_areas.py` and `make_guides.py`, because the HTML sitemap lists whatever page sources exist, then run `python3 _src/build.py`.

The privacy policy describes what the site does today: form data stored for about two years, no cookies of its own, no analytics, Google map embeds on the contact and area pages. **If you add Google Analytics, a chat widget, a pixel or anything else that tracks visitors, update the "Cookies and tracking" section first.** Have the privacy policy and terms read by someone qualified before launch. The About page has an HTML comment marking where Harry's real background goes.

## Photo slots

| File now (placeholder) | Size | Used for |
|---|---|---|
| `assets/img/services/tree-removal.svg` | 300 x 300 | Homepage service row |
| `assets/img/services/emergency-tree-service.svg` | 300 x 300 | Homepage service row |
| `assets/img/services/tree-trimming.svg` | 300 x 300 | Homepage service row |
| `assets/img/services/stump-grinding.svg` | 300 x 300 | Homepage service row |
| `assets/img/services/stump-removal.svg` | 300 x 300 | Homepage service row |
| `assets/img/crew-at-work.svg` | 1200 x 800 | "How a job goes" |
| `assets/img/harry-fauver.jpg` + `.webp` | 300 x 300 | Founder note. **Filled** with the supplied photo. A 600 x 600 or larger original would look sharper on phones |
| `assets/img/og-image.jpg` | 1200 x 630 | Social sharing image (already final, replace only if you want a photo) |

To swap one: add the photo beside the placeholder (for example `tree-removal.jpg`), change the `src` in `_src/pages/index.html`, give it a real `alt`, rebuild. The hero is a drawing on purpose and needs no photo.

## Editing

Pages are assembled from `_src/pages/*.html` plus the shared `_src/partials/` (head, header, footer, site plan). Business details live once in `_src/config.json`. FAQ text lives in `_src/data/home_faq.json` and feeds both the page and the FAQ schema; the build stops if an answer passes 300 characters.

```
python3 _src/build.py
```

Python 3.8 or newer, no packages needed. The script rewrites the HTML files, sitemap.xml, robots.txt, site.webmanifest and vercel.json, and stamps the CSS and JS links with a version so browsers pick up changes. Edit `assets/css/site.css` and `assets/js/site.js` directly.

## Entities

The homepage copy is tuned to the MarketMuse topic model for "tree service beaverton": 43 of its 50 topics are used and each meets or exceeds its suggested count. The 7 skipped are competitor business names. `docs/entity-map.md` lists every topic with its count and where it is used. If you edit homepage copy, keep those phrases in place.

## Checked before delivery

Tag balance on every page, schema parses and matches the visible FAQ, all images sized, no sideways scroll at 390 px or 1440 px, no console errors. Browser tests: all 5 plan tags, all 20 permit-checker branches, form validation, failure and success paths, and the full dashboard flow (38 checks). API tests: validation, bot traps, no-JavaScript fallback, rate limit, edit, delete, lockout, and the nothing-configured case (29 checks). The functions were tested against a local stand-in for Upstash, not the real service, so send one real test request after connecting the database.
