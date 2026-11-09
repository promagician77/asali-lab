# Rebuild & Intake Lab — Empowered by Asali

A proposal asset built from the client's Website Blueprint & Design Specification. It is one static site with eight tabs:

| Tab | What it is |
|---|---|
| 01 Overview | What was built, the numbers, and the three findings on the live site |
| 02 Site prototype | The 7 blueprint pages (Home, Consulting & Advisory, Programs & Intensives, Movement & Stage, About, Results, Intake), viewable at desktop and phone width |
| 03 Navigation & redirects | Old nav vs new nav, and the Squarespace URL Mappings text with a live validator |
| 04 Contact list sorter | Drop `.xlsx` / `.csv` files; get Work, Live, Play, Review and Do-not-import lists as Squarespace-ready CSVs. Runs in the browser; files never leave the machine |
| 05 Intake funnel | The 8-question 17hats form, the four workflows it starts, the emails, and a demo of why a typed budget field routes nobody |
| 06 Squarespace build sheet | Each blueprint rule mapped to the Squarespace setting, plus the Custom CSS |
| 07 Tests | Results from the scripts below |
| 08 Plan & handover | Phases, what's needed from the client, and simpler/cheaper options |

All contacts in `samples/` are fictional. Prototype pages use the blueprint's own copy; photo frames state the blueprint's photo direction instead of using images.

## Run it

```bash
npm install            # fflate (zip reader for .xlsx)
npm test               # 20 logic tests -> site/data/tests.json
npm run serve          # http://localhost:8311
npm run checks         # 7 pages x 3 widths in Chromium -> site/data/checks.json (needs Playwright)
npm run proto          # regenerate site/proto/*.html from the blueprint copy
npm run samples        # regenerate the 6 messy sample files (needs openpyxl)
```

## Deploy (Vercel)

Import the folder as a project. `vercel.json` serves `site/` as-is (no build step) and sends `X-Robots-Tag: noindex, nofollow` on every path, so the prototype never competes with the real site in search.

## Layout

```
site/            the deployable site (index.html, app.js, app.css)
site/lib/        xlsx-lite.js (reader), segment.js (sorter), funnel.js (17hats router), redirects.js (URL map)
site/proto/      the 7 prototype pages + proto.css / proto.js
site/samples/    copies of the sample files for the in-browser demo
samples/         6 messy sample files + expect.json
test/run.js      logic tests
tools/           sample generator, prototype builder, Chromium page checker, screenshot scripts
```

## Measured vs not measured

**Measured here (numbers are in `site/data/`):**

- 20/20 logic tests, 64,577 assertions: the spreadsheet reader (shared strings, rich text, inline strings, several sheets, header rows below a title, CSV with semicolons and BOM), the sorter, the redirect map, and every one of the 16,128 possible intake answer combinations starting exactly one workflow.
- The sorter on 6 messy files: 871 rows → 855 unique contacts, 12 duplicates merged, 4 bad addresses rejected with a reason; Work 280, Live 256, Play 189, Review 101, Do-not-import 29.
- A 50,000-row sheet sorted in about 0.5 s (493 ms on the last run, Node 22).
- 7 prototype pages × 3 widths (1440, 1024, 390) in Chromium 153: 21/21 clean — no horizontal overflow, contrast at least 4.64:1, all tap targets 44 px or more, no skipped headings, layout shift 0, every field labelled. The checker also checks the blueprint rules: 5 nav links + Apply button, #cbd5e1 hairlines with no shadows, green/amber fit panels, store link out of the header.

**Not measured (happens in the client's accounts):**

- The real Squarespace template, fonts and photos, and the real Excel lists.
- 17hats, Calendly and Gmail configured and run end to end, with a test lead through each of the four paths.
- Deliverability of the first campaign, which depends on how and when contacts opted in.
- Page speed on Squarespace's servers with real images.

## Platform facts the design relies on

- 17hats starts different workflows from a form only through a "Choose from a List" question, and a form uses either one form-level workflow or per-question workflows, not both. A typed budget field can't route.
- Calendly secret events hide a link from the booking page but don't stop it being shared; routing forms need the Teams plan.
- Squarespace Code Blocks run JavaScript and iframes only on Core and higher, so the 17hats embed needs Core (on Basic, the Apply button links to the hosted form).
- Not Linked pages stay public and indexable; collections can only be hidden from search as a whole.
- Squarespace mailing-list imports: a CSV with the email in the first column; re-importing does not resubscribe someone who unsubscribed.

Sources are linked in the site footer.
