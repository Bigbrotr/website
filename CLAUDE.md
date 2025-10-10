# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the documentation website for **Bigbrotr** - a full archive and monitoring system for the Nostr protocol. The site is built with **Astro** using the **Starlight** documentation theme and is deployed on Vercel.

Bigbrotr itself is a separate project that consists of multiple Docker containers (database, monitor, synchronizer, finder, etc.) that work together to archive all Nostr events and monitor relay health. This website serves as its public documentation.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (available at http://localhost:4321)
npm run dev
# or
npm start

# Build the site for production
npm build

# Preview production build locally
npm run preview
```

## Architecture

### Site Structure

- **Astro + Starlight**: Static site generator with Starlight providing documentation-specific features
- **Content Collections**: Documentation content lives in `src/content/docs/` as MDX/Markdown files
- **Content Config**: Defined in `src/content.config.ts` using Starlight's loaders and schemas
- **Navigation**: Sidebar structure is configured in `astro.config.mjs` (not auto-generated from files)

### Content Organization

```
src/content/docs/
├── index.mdx           # Homepage (splash template)
├── guides/             # Conceptual documentation
│   ├── getting-started.md
│   ├── system-architecture.md
│   └── database-schema.md
└── api/                # API/Component documentation
    ├── bigbrotr.md
    ├── event.md
    ├── relay.md
    ├── relay-metadata.md
    └── utils.md
```

### Sidebar Configuration

The sidebar is explicitly defined in [astro.config.mjs](astro.config.mjs#L11-L29), organized into two main sections:
- **Guides**: Conceptual/tutorial content
- **API**: Technical reference documentation

When adding new documentation pages, you must manually add them to the sidebar configuration in `astro.config.mjs` - they won't appear automatically.

### Content Authoring

- Files use MDX (`.mdx`) or Markdown (`.md`) format
- Frontmatter includes `title`, `description`, and optionally `template` (e.g., `splash` for the homepage)
- Starlight components can be imported and used in MDX files (e.g., `Card`, `CardGrid` on homepage)
- Assets like images go in `src/assets/` and are referenced using relative paths

## Deployment

- **Platform**: Vercel
- **Trigger**: Automatic deployment on push to `main` branch
- **Config**: Minimal Vercel configuration in `vercel.json` (currently empty object)

## Key Files

- [astro.config.mjs](astro.config.mjs) - Astro configuration, Starlight setup, sidebar navigation
- [src/content.config.ts](src/content.config.ts) - Content collections schema
- [package.json](package.json) - Dependencies and scripts
- [tsconfig.json](tsconfig.json) - TypeScript configuration
