# Remée Hutchings: Portfolio

Static site, no build step. Same look as the main site (shares `makeitlookcool.css`).

```
index.html                 the board (every show)
show.html                  one page that renders any show: show.html?show=<folder>
includes/css/              makeitlookcool.css (shared) + portfolio.css
includes/JS/portfolio.js   reads the JSON and builds the pages
includes/images/           main_bg.jpeg (copy from the main site) + favicons
shows/shows.json           which shows appear on the board
shows/<folder>/show.json   everything about one show
shows/<folder>/*           that show's poster, photos, PDFs…
tools/new-show.mjs         optional helper to create a new show
```

## Adding a show

1. Make a folder in `shows/`, e.g. `shows/les-mis/`
2. Copy `shows/example-show/show.json` into it and fill it in (delete what you don't need)
3. Put the poster and photos in the same folder
4. Add the folder name to `shows/shows.json`

Or do steps 1, 2 and 4 in one go:

```
node tools/new-show.mjs "Les Misérables" les-mis
```

The show is now on the board and at `show.html?show=les-mis`.

**Order:** the board shows the newest `year` first. Shows from the same year (or with no year)
keep the order they have in `shows.json`.

**Drafts:** set `"hidden": true` to keep a show off the board. Its page still works by link,
so you can check it before it goes live. `example-show` is hidden this way:
`show.html?show=example-show`.

## show.json fields

Only `title` is required. Leave anything out and that part of the page just doesn't appear.

| Field | What it does |
|---|---|
| `title` | Show name |
| `category` | e.g. Musicals/Plays, Live Event. Builds the filter buttons on the board |
| `year` | Number. Used for sorting and shown on the card |
| `dates` | Free text, e.g. "12–14 March 2026" (falls back to `year`) |
| `venue`, `company`, `role` | Shown in the details panel. `role` also goes on the card |
| `poster` | Image for the card and page header. No poster = "RH"-style monogram |
| `posterAlt` | Alt text for the poster |
| `heroImage` | Different image for the blurred header background (defaults to the poster) |
| `summary` | 1–2 sentences for the card and page header |
| `about` | Paragraphs about the show: a list, or one string with blank lines between paragraphs |
| `roleIntro`, `responsibilities` | Intro sentence + bullet list for "My Role" |
| `kit` | List of equipment, shown as tags |
| `facts` | Extra details-panel rows: `[{ "label": "Performances", "value": "6" }]` |
| `sections` | Any extra sections: `[{ "title": "...", "text": "..." }]` or `{ "title", "points": [...] }` |
| `video` | YouTube / Vimeo link, or a `.mp4` in the folder |
| `gallery` | Photos: `"file.jpg"` or `{ "src": "file.jpg", "caption": "..." }`. Click to enlarge |
| `credits` | `[{ "role": "Director", "name": "..." }]` |
| `links` | `[{ "label": "Programme", "url": "programme.pdf" }]` |
| `hidden` | `true` = not on the board |
| `aboutTitle`, `responsibilitiesTitle`, `galleryTitle`, `creditsTitle`, `videoTitle`, `kitTitle` | Rename a section heading |

File paths are relative to the show's folder. Start a path with `/` or `https://` to point anywhere else.

## Running it locally

The pages load JSON, so browsers won't run them straight from a file. Serve the folder:

```
npx serve .        # or: python3 -m http.server
```

`.assetsignore` keeps `README.md` and `tools/` from being published if the folder is deployed as Cloudflare Workers static assets.
