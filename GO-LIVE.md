# Go live: treeservicebeaverton.net

Everything in this folder is ready to deploy. Nothing needs building on Vercel. Work through the six parts in order. Allow about an hour, most of it waiting for DNS.

## 1. Put the files on GitHub

Create a new **private** repository, for example `treeservicebeaverton`. Upload the **contents** of this folder, so that `index.html`, `vercel.json` and the `api` folder sit in the top level of the repository, not inside a subfolder.

The folder holds about 220 files, and GitHub's web uploader accepts 100 at a time. Pick one way:

- **GitHub Desktop (easiest).** Clone the empty repository to your computer, copy the contents of this folder into it, then Commit and Push.
- **Web uploader, in batches.** Drag in the loose top-level files first, then each folder one at a time (`api`, `admin`, `assets`, `service-areas`, `guides`, `_src`, and so on). Hidden files matter: make sure `.vercelignore` is uploaded.
- **Skip GitHub for the first deploy.** Install the Vercel CLI (`npm i -g vercel`), open a terminal in this folder and run `vercel --prod`. You can connect GitHub later.

## 2. Import the project into Vercel

1. vercel.com > Add New > Project > import the repository.
2. Framework Preset: **Other**.
3. Root Directory: leave as `./`. Build Command and Output Directory: leave **empty**. Install Command: leave as it is.
4. Deploy. You get a `something.vercel.app` address. Open it and click around. Every page should load, and the form will say "That didn't send" until part 4 is done. That is expected.

## 3. Connect the domain

1. Project > Settings > Domains > add `treeservicebeaverton.net`, then add `www.treeservicebeaverton.net`.
2. Make **`treeservicebeaverton.net` (without www) the primary domain** and set `www` to redirect to it. Every canonical tag, the sitemap and the schema use the non-www address. Vercel suggests the opposite by default, so change it.
3. At your domain registrar, create the DNS records Vercel shows on that screen: an **A record** for the root domain and a **CNAME** for `www`. Use the exact values Vercel displays, because they are specific to your project. Remove any old A, AAAA or CNAME records for the root and for `www`.
4. Wait until both domains show a green tick and a valid certificate. This can take from a few minutes to a few hours.

## 4. Set up the lead form

Every estimate form on the site posts to `/api/lead`. The function saves the lead, and can also email you and post to a webhook. If nothing is configured it tells the visitor to call instead, so a lead is never silently lost.

**A. Storage (required for the dashboard)**

1. Project > **Storage** > Create Database > **Upstash for Redis** > free plan > create.
2. Connect it to this project, for the Production and Preview environments.
3. Vercel adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` by itself. Don't type them.

**B. Dashboard password (required)**

Project > Settings > Environment Variables > add `ADMIN_PASSWORD`. Use 12 characters or more, long and random. Tick Production and Preview.

**C. Email alerts (optional, recommended)**

1. Create an account at resend.com, add and verify the domain `treeservicebeaverton.net` (Resend gives you DNS records to add), and create an API key.
2. Add three variables: `RESEND_API_KEY`, `LEAD_TO` (where alerts go, several addresses separated by commas are fine) and `LEAD_FROM`, for example `Tree Service Beaverton <leads@treeservicebeaverton.net>`.

**D. Webhook (optional)**

Add `LEAD_WEBHOOK_URL` to send each lead as JSON to Zapier, Make, a Google Sheets script or a CRM.

**E. Redeploy, then check**

1. Deployments > the latest one > ⋯ > **Redeploy**. Environment variables only take effect on a new deployment.
2. Open `https://treeservicebeaverton.net/api/health`. It lists which pieces are configured, without showing any secret values, and tells you the next step. You want `"form_will_deliver": true` and `"dashboard_ready": true`.
3. Send a test request from the home page form. You should see "Request sent".
4. Open `https://treeservicebeaverton.net/admin/`, enter the password, and find your test lead. Set a status, add a note, export the CSV, then delete it.

`.env.example` in this folder lists every variable with a comment. It is a reference only. Real values live in Vercel.

| Variable | Needed? | What it does |
|---|---|---|
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Yes, added by Vercel | Where leads are stored |
| `ADMIN_PASSWORD` | Yes | Password for `/admin/` |
| `RESEND_API_KEY`, `LEAD_TO`, `LEAD_FROM` | Optional | Email alert for each lead |
| `LEAD_WEBHOOK_URL` | Optional | Sends each lead to another tool |
| `LEAD_RETENTION_DAYS` | Optional | Days before a lead deletes itself. Default 730, which is what the privacy policy says |

## 5. Search engines

Both verification tags are already in the `<head>` of every page:

```
<meta name="google-site-verification" content="XvHiDV45iIN5TKXqk8naJaI-toDc3Vzy0oXj69EbL00">
<meta name="msvalidate.01" content="25414F13D0EB054ECDE73E4CB46E0176">
```

Do this only after the domain is live on `https://treeservicebeaverton.net/`.

**Google Search Console**

1. search.google.com/search-console > select the property for `https://treeservicebeaverton.net/` > Verify, using the HTML tag method.
2. Sitemaps > enter `sitemap.xml` > Submit. It lists all 43 indexable pages.
3. URL Inspection > paste the home page address > Request indexing. Repeat for the five service pages.

**Bing Webmaster Tools**

1. bing.com/webmasters > add `https://treeservicebeaverton.net/` > verify with the HTML meta tag. Or choose "Import from Google Search Console", which is quicker.
2. Sitemaps > Submit sitemap > `https://treeservicebeaverton.net/sitemap.xml`.

The sitemap address is also declared in `robots.txt`, so other search engines find it on their own. `/admin/`, `/api/` and `/thank-you/` are kept out of the index.

## 6. After launch

- [ ] `https://www.treeservicebeaverton.net/` and `http://treeservicebeaverton.net/` both end up at `https://treeservicebeaverton.net/`.
- [ ] A made-up address such as `/nope/` shows the custom "That page isn't here" page.
- [ ] Run the home page and one service page through Google's Rich Results Test and PageSpeed Insights.
- [ ] Phone links dial on a phone, and the bottom call bar shows on mobile.
- [ ] The Google maps on the contact page and the area pages load. If one stays blank, the "Open in Google Maps" link beside it still works. Tell us and we will switch the embed.
- [ ] Set up or claim the Google Business Profile, with exactly the same name, address and phone number as the site footer.

## Still placeholders

These are live-safe but should be replaced soon. Each is one edit followed by `python3 _src/build.py`, then commit and push.

- **Hours.** `Monday to Saturday, 7 am to 6 pm` is a guess. Set `hours_display`, `hours_opens` and `hours_closes` in `_src/config.json`.
- **CCB number.** Hidden for now. Oregon requires a contractor's license number on advertising, websites included, and the hiring guide tells readers to look for one. Put it in `ccb` in `_src/config.json` and it appears in the hero, the estimate panel, the contact page, the footer and the schema.
- **Harry's background.** The About page and the home page note make no claims. An HTML comment marks where real experience goes.
- **Photos.** The five service images and the crew image are drawings. See "Photo slots" in README.md.
- **Privacy policy and terms.** Written to match what the site does today. Have them read by someone qualified, and update the privacy policy before adding analytics, chat or advertising pixels.

## Making changes later

Business details live once in `_src/config.json`. Page copy lives in `_src/pages/`, and the generated sections (service areas, guides, company pages) in `_src/tools/`. After any edit run the matching `make_` script if there is one, then `python3 _src/build.py`, then commit and push. Vercel redeploys by itself. README.md has the detail.
