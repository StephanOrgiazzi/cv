# portfolio

Personal portfolio and writing site for Stephan Orgiazzi.

Live site: [stephanorgiazzi.github.io/portfolio](https://stephanorgiazzi.github.io/portfolio/)

This repo powers a small personal corner of the internet: part portfolio, part writing space, part public notebook for the kind of software work I like to do. It highlights selected open source projects, a bit of professional context, and longer articles on engineering, tooling, and agentic development.

Built with Astro and deployed to GitHub Pages.

## What is in the site

- A homepage with a short personal intro and links
- A curated open source section
- A writing section generated from Markdown files in `articles/`
- Individual article pages rendered through Astro content collections
- Static deployment via GitHub Pages

## Stack

- Astro 6
- TypeScript 5.9
- Astro Content Collections
- Plain CSS
- GitHub Pages via GitHub Actions

## Local development

```bash
npm install
npm run dev
```

The writing content lives in `articles/`, and the main landing page is in `src/pages/index.astro`.

## Build

```bash
npm run build
npm run preview
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Astro dev server |
| `npm run build` | Build the site into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run astro -- --help` | Run Astro CLI commands |

## Deploy

Pushes to `master` trigger the GitHub Pages workflow in `.github/workflows/deploy.yml`.
