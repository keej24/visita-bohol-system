## VISITA: Chancery Office Dashboard

Administrative dashboard for the VISITA Bohol Churches Information System.

### Stack
- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui components (Radix primitives)
- React Router
- Recharts (data visualization)
- TanStack Query (data fetching/caching)

### Getting Started
Prerequisites: Node.js 18+ (LTS recommended) and npm (comes with Node). On Windows you can optionally use nvm-windows.

Install dependencies:
```sh
npm install
```

Start development server (default port 8080 as configured in `vite.config.ts`):
```sh
npm run dev
```

Build for production:
```sh
npm run build
```

Preview production build locally:
```sh
npm run preview
```

### Project Structure (key folders)
`src/components` – UI components
`src/pages` – route-level pages
`src/hooks` – custom React hooks
`src/lib` – utilities

### Environment / Configuration
Currently no environment variables are required. If API endpoints are introduced, create a `.env` (and `.env.example`) and reference via `import.meta.env`.

### Linting
Run ESLint:
```sh
npm run lint
```

### Contributing
1. Create a feature branch
2. Commit with conventional style if possible
3. Open a PR

### License
Add license information here.
