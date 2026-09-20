#!/usr/bin/env python3
"""Static build for treeservicebeaverton.net.
Reads config.json, pages/, partials/ and data/ and writes the finished HTML, sitemap, robots and vercel.json.
In the GitHub repo this file lives in /_src and writes into the repo root.
Run:  python3 _src/build.py
Pages live in src/pages/*.html with a leading <!--meta ... --> block. Shared chrome lives in src/partials/."""
import json, re, hashlib, html, os, sys, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(ROOT) == "_src":          # repo layout: sources in /_src, built files in the repo root
    SRC, OUT = ROOT, os.path.dirname(ROOT)
else:                                         # working layout: src/ and site/ side by side
    SRC, OUT = os.path.join(ROOT, "src"), os.path.join(ROOT, "site")
cfg = json.load(open(os.path.join(ROOT, "config.json"), encoding="utf-8"))
D = cfg["domain"].rstrip("/")
TODAY = datetime.date.today().isoformat()

def read(*p):
    return open(os.path.join(*p), encoding="utf-8").read()

def write(path, text):
    full = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, "w", encoding="utf-8").write(text)

def asset_v(path):
    return hashlib.sha1(open(os.path.join(OUT, path), "rb").read()).hexdigest()[:8]

ICON_PHONE = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24'
              ' 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>')
TAG_SVG = ('<svg viewBox="0 0 44 44" aria-hidden="true"><path class="tag-shape" fill-rule="evenodd" d="M13 2H31L42 13V35a7 7 0 0 1-7 7H9a7 7 0 0 1-7-7V13Z'
           'M22 6.2a2.8 2.8 0 1 0 0 5.6a2.8 2.8 0 0 0 0-5.6Z"/></svg>')

SERVICES = [
    ("Tree removal", "/tree-removal/", "Sectional and whole-tree removal of dead, hazardous and overgrown trees."),
    ("Emergency tree service", "/emergency-tree-service/", "Storm-damaged, fallen and hanging trees and limbs made safe and cleared."),
    ("Tree trimming and maintenance", "/tree-trimming/", "Pruning, crown cleaning, thinning and reduction, clearance, fruit trees and hedges."),
    ("Stump grinding", "/stump-grinding/", "Stumps ground below grade after an 811 utility locate."),
    ("Stump removal", "/stump-removal/", "Full extraction of stump and main roots ahead of construction or replanting."),
]
AREAS = ["Beaverton", "Aloha", "Cedar Mill", "Cedar Hills", "Bethany", "Rock Creek", "Tanasbourne", "Oak Hills",
         "Raleigh Hills", "Garden Home-Whitford", "Hillsboro", "Tigard"]

def business_node():
    n = {
        "@type": "HomeAndConstructionBusiness", "@id": D + "/#business", "name": cfg["brand"], "url": D + "/",
        "telephone": cfg["phone_e164"], "image": D + "/assets/img/og-image.jpg",
        "logo": {"@type": "ImageObject", "url": D + "/assets/img/logo-mark-512.png", "width": 512, "height": 512},
        "description": "Local tree service in Beaverton, Oregon: tree removal, emergency tree service, tree trimming and maintenance, stump grinding and stump removal.",
        "address": {"@type": "PostalAddress", "streetAddress": cfg["street"], "addressLocality": cfg["city"],
                    "addressRegion": cfg["region"], "postalCode": cfg["zip"], "addressCountry": "US"},
        "geo": {"@type": "GeoCoordinates", "latitude": float(cfg["lat"]), "longitude": float(cfg["lng"])},
        "openingHoursSpecification": [{"@type": "OpeningHoursSpecification",
                                       "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                                       "opens": cfg["hours_opens"], "closes": cfg["hours_closes"]}],
        "areaServed": [{"@type": "City" if a in ("Beaverton", "Hillsboro", "Tigard") else "Place", "name": a + ", Oregon"} for a in AREAS],
        "founder": {"@id": D + "/#harry-fauver"},
        "knowsAbout": ["Tree removal", "Tree pruning", "Stump grinding", "Storm damage cleanup", "Emerald ash borer",
                       "Beaverton street tree permits", "Douglas-fir", "Bigleaf maple", "Arborvitae hedges"],
        "hasOfferCatalog": {"@type": "OfferCatalog", "name": "Tree services", "itemListElement": [
            {"@type": "Offer", "itemOffered": {"@type": "Service", "name": n_, "serviceType": n_, "url": D + u, "description": d_,
                                               "provider": {"@id": D + "/#business"},
                                               "areaServed": {"@type": "City", "name": "Beaverton, Oregon"}}}
            for n_, u, d_ in SERVICES]},
    }
    if has_ccb():
        n["identifier"] = {"@type": "PropertyValue", "propertyID": "Oregon CCB license", "value": cfg["ccb"]}
    return n

def schema_home(meta, faq):
    graph = [
        {"@type": "WebSite", "@id": D + "/#website", "url": D + "/", "name": cfg["brand"], "inLanguage": "en-US",
         "publisher": {"@id": D + "/#business"}},
        {"@type": "WebPage", "@id": D + "/#webpage", "url": D + "/", "name": meta["title"], "description": meta["description"],
         "isPartOf": {"@id": D + "/#website"}, "about": {"@id": D + "/#business"}, "inLanguage": "en-US",
         "primaryImageOfPage": {"@type": "ImageObject", "url": D + "/assets/img/og-image.jpg"}},
        business_node(),
        {"@type": "Person", "@id": D + "/#harry-fauver", "name": cfg["founder"], "jobTitle": "Founder", "image": D + "/assets/img/harry-fauver.jpg",
         "worksFor": {"@id": D + "/#business"}, "url": D + "/about/"},
        {"@type": "FAQPage", "@id": D + "/#faq", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
    ]
    return {"@context": "https://schema.org", "@graph": graph}

def faq_html(faq):
    out = []
    for i, (q, a) in enumerate(faq):
        out.append('      <details%s><summary>%s</summary><div class="a"><p>%s</p></div></details>'
                   % (" open" if i == 0 else "", html.escape(q, quote=False), html.escape(a, quote=False)))
    return "\n".join(out)

def has_ccb():
    return bool(cfg.get("ccb", "").strip().strip("X"))

AREA_NAMES = ["Beaverton", "Aloha", "Cedar Mill", "Cedar Hills", "Bethany", "Rock Creek", "Tanasbourne", "Oak Hills", "Raleigh Hills", "Garden Home-Whitford"]

def business_ref():
    # compact copy of the one business node, same @id as the home page, so provider links resolve on every page
    return {"@type": "HomeAndConstructionBusiness", "@id": D + "/#business", "name": cfg["brand"], "url": D + "/", "telephone": cfg["phone_e164"],
            "image": D + "/assets/img/og-image.jpg",
            "address": {"@type": "PostalAddress", "streetAddress": cfg["street"], "addressLocality": cfg["city"], "addressRegion": cfg["region"],
                        "postalCode": cfg["zip"], "addressCountry": "US"}}

def crumbs_node(path, trail):
    return {"@type": "BreadcrumbList", "@id": D + path + "#breadcrumb", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": D + u} for i, (n, u) in enumerate(trail)]}

def schema_service(meta, faq):
    path = meta["path"]; name = meta["service_name"]
    graph = [
        {"@type": "WebPage", "@id": D + path + "#webpage", "url": D + path, "name": meta["title"], "description": meta["description"],
         "isPartOf": {"@id": D + "/#website"}, "about": {"@id": D + path + "#service"}, "breadcrumb": {"@id": D + path + "#breadcrumb"},
         "inLanguage": "en-US", "dateModified": TODAY, "author": {"@id": D + "/#harry-fauver"},
         "primaryImageOfPage": {"@type": "ImageObject", "url": D + "/assets/img/og-image.jpg"}},
        {"@type": "WebSite", "@id": D + "/#website", "url": D + "/", "name": cfg["brand"], "publisher": {"@id": D + "/#business"}},
        crumbs_node(path, [("Home", "/"), ("Services", "/services/"), (name, path)]),
        {"@type": "Service", "@id": D + path + "#service", "name": name + " in Beaverton, OR", "serviceType": name, "url": D + path,
         "description": meta["description"], "provider": {"@id": D + "/#business"},
         "areaServed": [{"@type": "City" if a == "Beaverton" else "Place", "name": a + ", Oregon"} for a in AREA_NAMES],
         "audience": {"@type": "Audience", "audienceType": "Homeowners, HOAs and property managers"}},
        business_ref(),
        {"@type": "Person", "@id": D + "/#harry-fauver", "name": cfg["founder"], "jobTitle": "Founder", "worksFor": {"@id": D + "/#business"},
         "image": D + "/assets/img/harry-fauver.jpg", "url": D + "/about/"},
    ]
    if faq:
        graph.append({"@type": "FAQPage", "@id": D + path + "#faq", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]})
    return {"@context": "https://schema.org", "@graph": graph}

def schema_area(meta, faq):
    path = meta["path"]; name = meta["area_name"]; lat, lng = meta["area_geo"].split(",")
    place = {"@type": meta.get("area_type", "Place"), "name": name + ", Oregon",
             "geo": {"@type": "GeoCoordinates", "latitude": float(lat), "longitude": float(lng)},
             "containedInPlace": {"@type": "AdministrativeArea", "name": "Washington County, Oregon"}}
    graph = [
        {"@type": "WebPage", "@id": D + path + "#webpage", "url": D + path, "name": meta["title"], "description": meta["description"],
         "isPartOf": {"@id": D + "/#website"}, "about": {"@id": D + path + "#service"}, "breadcrumb": {"@id": D + path + "#breadcrumb"},
         "inLanguage": "en-US", "dateModified": TODAY, "author": {"@id": D + "/#harry-fauver"},
         "primaryImageOfPage": {"@type": "ImageObject", "url": D + "/assets/img/og-image.jpg"}},
        {"@type": "WebSite", "@id": D + "/#website", "url": D + "/", "name": cfg["brand"], "publisher": {"@id": D + "/#business"}},
        crumbs_node(path, [("Home", "/"), ("Service areas", "/service-areas/"), (name, path)]),
        {"@type": "Service", "@id": D + path + "#service", "name": "Tree service in " + name + ", OR", "serviceType": "Tree service", "url": D + path,
         "description": meta["description"], "provider": {"@id": D + "/#business"}, "areaServed": place,
         "hasOfferCatalog": {"@type": "OfferCatalog", "name": "Tree services in " + name, "itemListElement": [
             {"@type": "Offer", "itemOffered": {"@type": "Service", "name": n_, "url": D + u}} for n_, u, _ in SERVICES]}},
        business_ref(),
        {"@type": "Person", "@id": D + "/#harry-fauver", "name": cfg["founder"], "jobTitle": "Founder", "worksFor": {"@id": D + "/#business"},
         "image": D + "/assets/img/harry-fauver.jpg", "url": D + "/about/"},
    ]
    if faq:
        graph.append({"@type": "FAQPage", "@id": D + path + "#faq", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]})
    return {"@context": "https://schema.org", "@graph": graph}

def schema_areahub(meta):
    path = meta["path"]; items = json.load(open(os.path.join(SRC, "data", "areas_index.json")))
    return {"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "@id": D + path + "#webpage", "url": D + path, "name": meta["title"], "description": meta["description"],
         "isPartOf": {"@id": D + "/#website"}, "about": {"@id": D + "/#business"}, "breadcrumb": {"@id": D + path + "#breadcrumb"}, "inLanguage": "en-US"},
        {"@type": "WebSite", "@id": D + "/#website", "url": D + "/", "name": cfg["brand"], "publisher": {"@id": D + "/#business"}},
        crumbs_node(path, [("Home", "/"), ("Service areas", path)]),
        {"@type": "ItemList", "name": "Areas served by " + cfg["brand"], "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "url": D + u} for i, (n, u) in enumerate(items)]},
        business_ref()]}

def schema_article(meta, faq):
    path = meta["path"]
    graph = [
        {"@type": "Article", "@id": D + path + "#article", "headline": meta["headline"], "description": meta["description"], "inLanguage": "en-US",
         "datePublished": meta.get("published", "2026-09-19"), "dateModified": TODAY, "author": {"@id": D + "/#harry-fauver"},
         "publisher": {"@id": D + "/#business"}, "image": D + "/assets/img/og-image.jpg", "mainEntityOfPage": {"@id": D + path + "#webpage"},
         "about": {"@type": "Place", "name": "Beaverton, Oregon"}},
        {"@type": "WebPage", "@id": D + path + "#webpage", "url": D + path, "name": meta["title"], "description": meta["description"],
         "isPartOf": {"@id": D + "/#website"}, "breadcrumb": {"@id": D + path + "#breadcrumb"}, "inLanguage": "en-US", "dateModified": TODAY},
        {"@type": "WebSite", "@id": D + "/#website", "url": D + "/", "name": cfg["brand"], "publisher": {"@id": D + "/#business"}},
        crumbs_node(path, [("Home", "/"), ("Guides", "/guides/"), (meta["headline"], path)]),
        business_ref(),
        {"@type": "Person", "@id": D + "/#harry-fauver", "name": cfg["founder"], "jobTitle": "Founder", "worksFor": {"@id": D + "/#business"},
         "image": D + "/assets/img/harry-fauver.jpg", "url": D + "/about/"},
    ]
    if faq:
        graph.append({"@type": "FAQPage", "@id": D + path + "#faq", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]})
    return {"@context": "https://schema.org", "@graph": graph}

def schema_guidehub(meta):
    path = meta["path"]; items = json.load(open(os.path.join(SRC, "data", "guides_index.json")))
    return {"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "@id": D + path + "#webpage", "url": D + path, "name": meta["title"], "description": meta["description"],
         "isPartOf": {"@id": D + "/#website"}, "breadcrumb": {"@id": D + path + "#breadcrumb"}, "inLanguage": "en-US"},
        {"@type": "WebSite", "@id": D + "/#website", "url": D + "/", "name": cfg["brand"], "publisher": {"@id": D + "/#business"}},
        crumbs_node(path, [("Home", "/"), ("Guides", path)]),
        {"@type": "ItemList", "name": "Tree guides for Beaverton, Oregon", "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "url": D + u} for i, (n, u) in enumerate(items)]},
        business_ref()]}

def schema_company(meta, faq):
    """about | contact | faqpage | basic : company pages. Same single business @id everywhere."""
    path = meta["path"]; kind = meta["schema"]; name = meta["crumb"]
    page_type = {"about": "AboutPage", "contact": "ContactPage", "faqpage": "FAQPage"}.get(kind, "WebPage")
    webpage = {"@type": page_type, "@id": D + path + "#webpage", "url": D + path, "name": meta["title"], "description": meta["description"],
               "isPartOf": {"@id": D + "/#website"}, "about": {"@id": D + "/#business"}, "breadcrumb": {"@id": D + path + "#breadcrumb"},
               "inLanguage": "en-US", "dateModified": TODAY}
    person = {"@type": "Person", "@id": D + "/#harry-fauver", "name": cfg["founder"], "jobTitle": "Founder", "worksFor": {"@id": D + "/#business"},
              "image": D + "/assets/img/harry-fauver.jpg", "url": D + "/about/"}
    if kind == "about":
        webpage["mainEntity"] = {"@id": D + "/#harry-fauver"}
        person["description"] = "Founder of Tree Service Beaverton, a tree service working in Beaverton and neighboring Washington County, Oregon."
        person["knowsAbout"] = ["Tree removal", "Tree pruning", "Stump grinding", "Storm damage cleanup", "Beaverton tree regulations", "Emerald ash borer"]
    if kind == "faqpage" and faq:
        webpage["mainEntity"] = [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]
    biz = business_node() if kind in ("contact", "about") else business_ref()
    return {"@context": "https://schema.org", "@graph": [
        webpage, {"@type": "WebSite", "@id": D + "/#website", "url": D + "/", "name": cfg["brand"], "publisher": {"@id": D + "/#business"}},
        crumbs_node(path, [("Home", "/"), (name, path)]), biz, person]}

def schema_hub(meta):
    path = meta["path"]
    return {"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "@id": D + path + "#webpage", "url": D + path, "name": meta["title"], "description": meta["description"],
         "isPartOf": {"@id": D + "/#website"}, "about": {"@id": D + "/#business"}, "breadcrumb": {"@id": D + path + "#breadcrumb"}, "inLanguage": "en-US"},
        {"@type": "WebSite", "@id": D + "/#website", "url": D + "/", "name": cfg["brand"], "publisher": {"@id": D + "/#business"}},
        crumbs_node(path, [("Home", "/"), ("Services", path)]),
        {"@type": "ItemList", "name": "Tree services in Beaverton, OR", "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "url": D + u} for i, (n, u, _) in enumerate(SERVICES)]},
        business_ref()]}

def fill(text, extra=None):
    def partial(m):
        name = m.group(1)
        ext = ".svg" if os.path.exists(os.path.join(SRC, "partials", name + ".svg")) else ".html"
        return read(SRC, "partials", name + ext)
    text = re.sub(r"\{\{>\s*([\w-]+)\s*\}\}", partial, text)
    # {{#ccb}} ... {{/ccb}} blocks show only when a real CCB number is set in config.json
    text = re.sub(r"\{\{#ccb\}\}(.*?)\{\{/ccb\}\}", lambda m: m.group(1) if has_ccb() else "", text, flags=re.S)
    vals = dict(cfg); vals.update({"icon_phone": ICON_PHONE, "tag_svg": TAG_SVG}); vals.update(extra or {})
    def rep(m):
        k = m.group(1)
        if k not in vals:
            sys.exit("Unknown token {{%s}}" % k)
        return str(vals[k])
    return re.sub(r"\{\{(\w+)\}\}", rep, text)

def build_page(fname):
    raw = read(SRC, "pages", fname)
    m = re.match(r"<!--meta\n(.*?)\n-->\n", raw, re.S)
    meta = dict(line.split(": ", 1) for line in m.group(1).splitlines() if ": " in line)
    body = raw[m.end():]
    assert len(meta["title"]) <= 60, "title over 60: " + meta["title"]
    assert len(meta["description"]) <= 155, "description over 155 (%d): %s" % (len(meta["description"]), meta["path"])
    page_faq = None
    fm = re.match(r"<!--faq\n(.*?)\n-->\n", body, re.S)
    if fm:
        page_faq = json.loads(fm.group(1)); body = body[fm.end():]
        for q, a in page_faq:
            assert len(a) <= 300, "FAQ answer over 300 chars (%d) on %s: %s" % (len(a), meta["path"], q)
    path = meta["path"]
    extra = {"estimate_href": meta.get("estimate_href", "/#estimate"), "page_path": meta["path"]}
    if page_faq:
        extra["faq_html"] = faq_html(page_faq)
    schema = ""
    if meta.get("schema") == "home":
        faq = [[q, a.replace("{{ccb}}", cfg["ccb"])] for q, a in json.load(open(os.path.join(SRC, "data", "home_faq.json")))]
        for q, a in faq:
            assert len(a) <= 300, "FAQ answer over 300 chars: " + q
        extra["faq_html"] = faq_html(faq)
        schema = '<script type="application/ld+json">' + json.dumps(schema_home(meta, faq), ensure_ascii=False, separators=(",", ":")) + "</script>\n"
    if meta.get("schema") == "service":
        schema = '<script type="application/ld+json">' + json.dumps(schema_service(meta, page_faq), ensure_ascii=False, separators=(",", ":")) + "</script>\n"
    if meta.get("schema") == "area":
        schema = '<script type="application/ld+json">' + json.dumps(schema_area(meta, page_faq), ensure_ascii=False, separators=(",", ":")) + "</script>\n"
    if meta.get("schema") == "areahub":
        schema = '<script type="application/ld+json">' + json.dumps(schema_areahub(meta), ensure_ascii=False, separators=(",", ":")) + "</script>\n"
    if meta.get("schema") == "article":
        schema = '<script type="application/ld+json">' + json.dumps(schema_article(meta, page_faq), ensure_ascii=False, separators=(",", ":")) + "</script>\n"
    if meta.get("schema") == "guidehub":
        schema = '<script type="application/ld+json">' + json.dumps(schema_guidehub(meta), ensure_ascii=False, separators=(",", ":")) + "</script>\n"
    if meta.get("schema") in ("about", "contact", "faqpage", "basic"):
        schema = '<script type="application/ld+json">' + json.dumps(schema_company(meta, page_faq), ensure_ascii=False, separators=(",", ":")) + "</script>\n"
    if meta.get("schema") == "hub":
        schema = '<script type="application/ld+json">' + json.dumps(schema_hub(meta), ensure_ascii=False, separators=(",", ":")) + "</script>\n"
    ver = []
    if cfg.get("google_verification"):
        ver.append('<meta name="google-site-verification" content="%s">' % cfg["google_verification"])
    if cfg.get("bing_verification"):
        ver.append('<meta name="msvalidate.01" content="%s">' % cfg["bing_verification"])
    head_vals = {
        "title": html.escape(meta["title"], quote=False), "description": html.escape(meta["description"]),
        "canonical": D + path, "og_title": html.escape(meta.get("og_title", meta["title"])),
        "og_description": html.escape(meta.get("og_description", meta["description"])),
        "robots": '<meta name="robots" content="noindex, follow">\n' if meta.get("noindex") else "",
        "verification": "".join(v + "\n" for v in ver), "schema": schema,
    }
    page = fill(read(SRC, "partials", "head.html"), head_vals) + fill(read(SRC, "partials", "header.html"), extra) \
        + fill(body, extra) + fill(read(SRC, "partials", "footer.html"), extra)
    if meta.get("form_service"):
        opt = "<option>%s</option>" % meta["form_service"]
        assert page.count(opt) == 1, "form_service option not found: " + meta["form_service"]
        page = page.replace(opt, opt.replace("<option>", "<option selected>"))
    page = page.replace('/assets/css/site.css"', '/assets/css/site.css?v=%s"' % asset_v("assets/css/site.css"))
    page = page.replace('/assets/js/site.js"', '/assets/js/site.js?v=%s"' % asset_v("assets/js/site.js"))
    out = "404.html" if path == "/404.html" else (path.strip("/") + "/index.html").lstrip("/")
    write(out, page)
    return path, meta

pages = [build_page(f) for f in sorted(os.listdir(os.path.join(SRC, "pages"))) if f.endswith(".html")]

# sitemap: indexable pages only
urls = [p for p, m in pages if not m.get("noindex") and p != "/404.html"]
def _rank(p):  # home, services, service areas, guides, then company pages
    svc = ["/services/", "/tree-removal/", "/emergency-tree-service/", "/tree-trimming/", "/stump-grinding/", "/stump-removal/"]
    if p == "/": return (0, 0, p)
    if p in svc: return (1, svc.index(p), p)
    if p.startswith("/service-areas/"): return (2, 0 if p == "/service-areas/" else 1, p)
    if p.startswith("/guides/"): return (3, 0 if p == "/guides/" else 1, p)
    return (4, ["/about/", "/faq/", "/contact/", "/privacy-policy/", "/terms/", "/sitemap/"].index(p) if p in ["/about/", "/faq/", "/contact/", "/privacy-policy/", "/terms/", "/sitemap/"] else 9, p)
urls.sort(key=_rank)
write("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
      + "".join("  <url><loc>%s%s</loc><lastmod>%s</lastmod></url>\n" % (D, p, TODAY) for p in urls) + "</urlset>\n")
write("robots.txt", "User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: %s/sitemap.xml\n" % D)
write("site.webmanifest", json.dumps({
    "name": cfg["brand"], "short_name": "Tree Service", "start_url": "/", "display": "browser",
    "background_color": "#EEF2EC", "theme_color": "#12382C",
    "icons": [{"src": "/icon-192.png", "sizes": "192x192", "type": "image/png"},
              {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png"}]}, indent=2) + "\n")
write("vercel.json", json.dumps({
    "cleanUrls": True, "trailingSlash": True,
    "headers": [
        {"source": "/(.*)", "headers": [
            {"key": "X-Content-Type-Options", "value": "nosniff"},
            {"key": "X-Frame-Options", "value": "SAMEORIGIN"},
            {"key": "Referrer-Policy", "value": "strict-origin-when-cross-origin"},
            {"key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()"}]},
        {"source": "/assets/fonts/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=31536000, immutable"}]},
        {"source": "/assets/(css|js)/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=31536000, immutable"}]},
        {"source": "/assets/img/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=2592000"}]},
        {"source": "/admin/(.*)", "headers": [{"key": "X-Robots-Tag", "value": "noindex, nofollow"}, {"key": "Cache-Control", "value": "no-store"}]},
        {"source": "/api/(.*)", "headers": [{"key": "X-Robots-Tag", "value": "noindex"}, {"key": "Cache-Control", "value": "no-store"}]}]},
    indent=2) + "\n")

print("built:", ", ".join(p for p, _ in pages))
if not has_ccb():
    print("note: no CCB number in config.json, so the license line is hidden sitewide. Set \"ccb\" to show it in the hero, estimate panel, footer and schema.")
