# BigBrotr Documentation Website

This repository contains the source code for the BigBrotr documentation website—a comprehensive guide for the modular Nostr data archiving and monitoring system.

**Live site**: [bigbrotr.com](https://bigbrotr.com)

---

## Technologies Used

- **Astro**: Static site generator for optimized websites
- **Starlight**: Documentation theme for Astro
- **TypeScript**: Type-safe development

---

## Documentation Structure

```
src/content/docs/
├── index.mdx                    # Landing page
├── getting-started/             # Quick start, implementations
├── architecture/                # Core layer, service layer
├── services/                    # Initializer, Finder, Monitor, Synchronizer
├── database/                    # Schema, tables, views
├── configuration/               # Core and service configuration
└── resources/                   # FAQ, contributing guide
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Local Development

```bash
# Clone the repository
git clone https://github.com/bigbrotr/website.git
cd website

# Install dependencies
npm install

# Start development server
npm run dev
```

The website will be accessible at `http://localhost:4321`.

### Build for Production

```bash
npm run build
npm run preview  # Preview the build
```

---

## Deployment

The website is deployed on Vercel. Updates to the main branch automatically trigger deployment.

---

## Related Repositories

- **Main Project**: [github.com/bigbrotr/bigbrotr](https://github.com/bigbrotr/bigbrotr)

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b docs/my-improvement`
3. Make changes and commit: `git commit -m "docs: improve X section"`
4. Push and create a pull request

---

## License

MIT License - see [LICENSE](LICENSE) for details.
