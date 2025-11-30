/**
 * =============================================================================
 * MAIN.TSX - APPLICATION ENTRY POINT
 * =============================================================================
 *
 * PURPOSE:
 * This is the FIRST file that runs when the app starts. It's the "ignition key"
 * that starts everything. Think of it as the main() function in other languages.
 *
 * WHAT IT DOES:
 * 1. Finds the HTML element where React will render (id="root")
 * 2. Creates a React "root" that manages the entire app
 * 3. Renders the <App /> component (which contains everything else)
 * 4. Loads debug tools in development mode
 *
 * FILE HIERARCHY:
 * index.html (has <div id="root">)
 *     ↓
 * main.tsx (this file - finds #root, renders App)
 *     ↓
 * App.tsx (routes, providers, layout)
 *     ↓
 * Individual pages (Login, Dashboard, etc.)
 *
 * WHY THIS PATTERN:
 * - Single Page Application (SPA): All UI is rendered by JavaScript
 * - React takes control of #root div and manages everything inside
 * - Hot Module Replacement (HMR): Changes update without full refresh
 *
 * RELATED FILES:
 * - index.html: The HTML skeleton with <div id="root">
 * - App.tsx: The main component containing all routes and providers
 * - index.css: Global CSS styles
 */

import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// ─────────────────────────────────────────────────────────────────────────────
// DEVELOPMENT-ONLY DEBUG TOOLS
// ─────────────────────────────────────────────────────────────────────────────
// These tools only load in development mode (npm run dev)
// They help debug announcement issues by providing console functions
// In production (npm run build), this code is removed automatically

if (import.meta.env.DEV) {
  // Lazy load debug utilities to avoid bloating the main bundle
  import('./utils/announcementDebug').then(() => {
    console.log('🛠️ Debug tools loaded. Run debugAnnouncements() to diagnose issues.');
  });
  import('./utils/debugAnnouncements').then(() => {
    console.log('🛠️ Enhanced debug tools loaded. Run debugAnnouncements() for detailed analysis.');
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MOUNT THE REACT APPLICATION
// ─────────────────────────────────────────────────────────────────────────────
// createRoot: Creates a React 18+ "root" that manages the DOM
// document.getElementById("root")!: Gets the #root div from index.html
//   - The "!" tells TypeScript we're sure this element exists
// .render(<App />): Starts rendering the App component

createRoot(document.getElementById("root")!).render(<App />);

/**
 * LEARNING NOTES:
 * ───────────────
 *
 * Q: Why createRoot instead of ReactDOM.render?
 * A: React 18 introduced createRoot for concurrent features.
 *    It enables automatic batching and other performance improvements.
 *
 * Q: What's import.meta.env.DEV?
 * A: Vite's way to check if we're in development mode.
 *    It's replaced with true/false at build time.
 *    Production builds remove this entire if-block.
 *
 * Q: Why dynamic imports for debug tools?
 * A: Dynamic imports (import(...)) load code on demand.
 *    This keeps the initial bundle small since debug
 *    tools aren't needed immediately.
 *
 * Q: What does "!" mean in getElementById("root")!?
 * A: It's TypeScript's non-null assertion operator.
 *    It tells TypeScript "trust me, this won't be null".
 *    We know #root exists because it's in index.html.
 */

