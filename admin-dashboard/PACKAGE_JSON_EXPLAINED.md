# package.json Explained - Admin Dashboard Dependencies

## Overview

`package.json` is the **"recipe book"** for your project. It lists:
- All libraries (dependencies) your app needs
- Commands (scripts) to run your app
- Project metadata (name, version)

**Important**: JSON files can't have comments, so this separate file explains everything!

---

## 📜 NPM Scripts

These are commands you run in the terminal. Use: `npm run <script-name>`

### Development Scripts

#### `npm run dev`
**What it does**: Starts local development server  
**When to use**: While coding and testing  
**Result**: Opens http://localhost:8080 with hot reload (auto-refresh on code changes)

```powershell
npm run dev
```

#### `npm run build`
**What it does**: Creates production-ready files  
**When to use**: Before deploying to production  
**Result**: Generates `dist/` folder with optimized, minified code  
**Why important**: Makes app load faster for users

```powershell
npm run build
```

#### `npm run build:dev`
**What it does**: Builds with development settings  
**When to use**: Testing build process without full optimization  
**Difference from build**: Easier to debug, not minified

```powershell
npm run build:dev
```

#### `npm run lint`
**What it does**: Checks code for errors and style issues  
**When to use**: Before committing code  
**Tool used**: ESLint  
**Why important**: Catches bugs before they happen

```powershell
npm run lint
```

#### `npm run preview`
**What it does**: Preview production build locally  
**When to use**: After `npm run build`, test how production will look  
**Steps**:
```powershell
npm run build
npm run preview
```

### Deployment Scripts

#### `npm run deploy`
**What it does**: Deploys to production on Vercel  
**When to use**: Push live version to users  
**Result**: Updates https://visita-admin.vercel.app

```powershell
npm run deploy
```

#### `npm run deploy:preview`
**What it does**: Creates preview deployment  
**When to use**: Test changes before going live  
**Result**: Temporary URL for testing

```powershell
npm run deploy:preview
```

---

## 📦 Dependencies (Production)

These libraries are used in the live application.

### 🎨 UI Components (@radix-ui/*)

**What**: Accessible, unstyled UI components (shadcn/ui foundation)  
**Why**: Professional, accessible components without starting from scratch  
**Used for**: Dialogs, dropdowns, tooltips, tabs, switches, checkboxes, etc.

**Libraries**:
- `@radix-ui/react-alert-dialog` - Confirmation popups
- `@radix-ui/react-avatar` - User profile pictures
- `@radix-ui/react-checkbox` - Checkboxes with proper accessibility
- `@radix-ui/react-dialog` - Modal windows
- `@radix-ui/react-dropdown-menu` - Dropdown menus (like user menu)
- `@radix-ui/react-label` - Form labels
- `@radix-ui/react-popover` - Floating content (like date picker)
- `@radix-ui/react-progress` - Progress bars
- `@radix-ui/react-radio-group` - Radio button groups
- `@radix-ui/react-scroll-area` - Custom scrollbars
- `@radix-ui/react-select` - Dropdown selects
- `@radix-ui/react-separator` - Horizontal/vertical dividers
- `@radix-ui/react-slot` - Component composition utility
- `@radix-ui/react-switch` - Toggle switches
- `@radix-ui/react-tabs` - Tabbed interfaces
- `@radix-ui/react-toast` - Notification toasts
- `@radix-ui/react-tooltip` - Hover tooltips

**Where used**: Throughout entire admin dashboard (every button, dialog, form)

---

### 📝 Form Handling

#### `react-hook-form` (v7.61.1)
**What**: Form state management library  
**Why**: Handles form inputs, validation, submission efficiently  
**Used in**: All forms (church edit, user creation, announcements)  
**Key features**:
- Tracks input values
- Validates data before submission
- Shows error messages
- Better performance than manual state

**Example**:
```typescript
const form = useForm({
  defaultValues: { name: '', email: '' }
});
```

#### `@hookform/resolvers` (v3.10.0)
**What**: Connects react-hook-form with validation libraries  
**Why**: Integrates Zod schema validation with forms  
**Used with**: `zod` package

#### `zod` (v3.25.76)
**What**: TypeScript-first schema validation  
**Why**: Define data rules (email must be valid, name required, etc.)  
**Used in**: Form validation throughout app

**Example**:
```typescript
const schema = z.object({
  email: z.string().email(),
  name: z.string().min(3)
});
```

---

### 🔥 Firebase (Backend)

#### `firebase` (v11.10.0)
**What**: Firebase JavaScript SDK  
**Why**: Connects to Firebase services (Auth, Firestore, Storage)  
**Used for**:
- User authentication (login/logout)
- Database queries (churches, users, feedback)
- File uploads (images, 360° photos, PDFs)

**Where used**: Every page that loads or saves data

**Example**:
```typescript
import { auth, db, storage } from '@/lib/firebase';
```

#### `firebase-admin` (v13.5.0)
**What**: Firebase Admin SDK (server-side operations)  
**Why**: Create users with custom roles (bypasses client limitations)  
**Used in**: User management (creating parish/museum accounts)

**Important**: Only used for admin operations, not regular data access

---

### 📊 Data Fetching & Caching

#### `@tanstack/react-query` (v5.83.0)
**What**: Powerful data fetching and caching library  
**Why**: 
- Caches data (less re-fetching)
- Auto-retry on failure
- Loading/error states
- Background refetching

**Used in**: All data loading operations

**Example**:
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['churches', diocese],
  queryFn: () => getChurches(diocese)
});
```

**Where configured**: `App.tsx` (QueryClient setup)

---

### 🗺️ Maps & Location

#### `leaflet` (v1.9.4)
**What**: Interactive map library  
**Why**: Display church locations on map  
**Used in**: Church detail pages, map views

#### `react-leaflet` (v4.2.1)
**What**: React wrapper for Leaflet  
**Why**: Use Leaflet with React components

#### `leaflet.heat` (v0.2.0)
**What**: Heatmap plugin for Leaflet  
**Why**: Show visitor density across Bohol

#### `@types/leaflet` (v1.9.20)
**What**: TypeScript type definitions for Leaflet  
**Why**: Better autocomplete and type checking

**Where used**: Reports page (visitor analytics map)

---

### 🌐 360° Virtual Tours

#### `pannellum` (v2.5.6)
**What**: 360° photo viewer library  
**Why**: Show immersive church interiors  
**Used in**: Church detail pages (virtual tour feature)

**Example**:
```typescript
<VirtualTour360 photos={church.photo360} />
```

#### `@types/pannellum` (v2.5.0)
**What**: TypeScript types for Pannellum  
**Why**: Type safety when using Pannellum API

**Where used**: `components/360/VirtualTour360.tsx`

---

### 🧭 Routing

#### `react-router-dom` (v6.30.1)
**What**: Client-side routing library  
**Why**: Navigate between pages without full page reload  
**Used for**:
- URL-based navigation (/login, /parish, /diocese/tagbilaran)
- Protected routes (role-based access)
- Browser history management

**Where configured**: `App.tsx` (all route definitions)

**Example**:
```typescript
<Route path="/parish" element={<ParishDashboard />} />
```

---

### 🎨 Styling & UI Utilities

#### `tailwindcss` (v3.4.17) - devDependency
**What**: Utility-first CSS framework  
**Why**: Fast styling with pre-built classes  
**Used in**: Every component

**Example**:
```html
<div className="flex items-center justify-between p-4 bg-white rounded-lg">
```

#### `tailwindcss-animate` (v1.0.7)
**What**: Animation utilities for Tailwind  
**Why**: Easy animations (fade in, slide, spin)

#### `tailwind-merge` (v2.6.0)
**What**: Merges Tailwind classes intelligently  
**Why**: Prevents class conflicts when combining styles

#### `class-variance-authority` (v0.7.1)
**What**: Creates variant-based component APIs  
**Why**: Button variants (primary, secondary, destructive)

**Example**:
```typescript
const buttonVariants = cva("base-classes", {
  variants: {
    variant: {
      default: "bg-primary",
      destructive: "bg-red-500"
    }
  }
});
```

#### `clsx` (v2.1.1)
**What**: Utility for constructing className strings  
**Why**: Conditionally apply classes

**Example**:
```typescript
className={clsx("base", { "active": isActive })}
```

---

### 📈 Charts & Analytics

#### `recharts` (v2.15.4)
**What**: React charting library  
**Why**: Display analytics (visitor trends, rating charts, status breakdowns)  
**Used in**: Reports page, dashboard analytics

**Chart types used**:
- Bar charts (church status)
- Line charts (visitor trends)
- Pie charts (diocese breakdown)

**Where used**: `pages/Reports.tsx`, dashboard components

---

### 📅 Date Handling

#### `date-fns` (v3.6.0)
**What**: Modern JavaScript date utility library  
**Why**: Format dates, calculate differences, parse timestamps  
**Better than**: moment.js (smaller, faster)

**Example**:
```typescript
import { format } from 'date-fns';
format(new Date(), 'PPP'); // "November 15, 2025"
```

#### `react-day-picker` (v8.10.1)
**What**: Date picker component  
**Why**: Select dates in forms (announcement event date)  
**Used in**: Announcement creation, date filters

---

### 🖼️ Image Handling

#### `browser-image-compression` (v2.0.2)
**What**: Client-side image compression  
**Why**: Reduce file size before upload (faster uploads, less storage)  
**Used in**: Image upload forms (church photos, 360° photos)

**Example**:
```typescript
const compressed = await imageCompression(file, {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920
});
```

**Where used**: `services/uploadService.ts`

---

### 📄 PDF & Excel Export

#### `jspdf` (v3.0.3)
**What**: Generate PDF documents in browser  
**Why**: Export reports, church profiles as PDF  
**Used in**: Reports page (download analytics)

#### `jspdf-autotable` (v5.0.2)
**What**: Plugin for jsPDF to create tables  
**Why**: Format tabular data in PDFs

#### `xlsx` (v0.18.5)
**What**: Excel file parser and writer  
**Why**: Export data to Excel (.xlsx)  
**Used in**: Reports export, church data export

#### `html2canvas` (v1.4.1)
**What**: Convert HTML to canvas (screenshot)  
**Why**: Capture charts for PDF export

**Example workflow**:
1. User clicks "Export Report"
2. html2canvas captures chart
3. jsPDF creates PDF with chart image
4. User downloads PDF

---

### 🎭 Theme & Appearance

#### `next-themes` (v0.3.0)
**What**: Theme management (light/dark mode)  
**Why**: Let users choose preferred theme  
**Used in**: App-wide theme toggle

**Where configured**: `App.tsx` or theme provider

---

### 🍞 Toast Notifications

#### `sonner` (v1.7.4)
**What**: Toast notification library  
**Why**: Show success/error messages elegantly  
**Used for**:
- "Church updated successfully"
- "Error uploading image"
- "User created"

**Example**:
```typescript
import { toast } from 'sonner';
toast.success('Church approved!');
toast.error('Failed to save');
```

**Where used**: Throughout app for user feedback

---

### 🎠 Carousels & UI Panels

#### `embla-carousel-react` (v8.6.0)
**What**: Touch-friendly carousel/slider  
**Why**: Display multiple 360° photos, image galleries  
**Used in**: Church detail pages (photo galleries)

#### `react-resizable-panels` (v2.1.9)
**What**: Resizable split panels  
**Why**: Adjustable sidebar/content layout (if implemented)

#### `vaul` (v0.9.9)
**What**: Drawer component for mobile  
**Why**: Mobile-friendly slide-out panels

---

### 🔍 Search & Command Palette

#### `cmdk` (v1.1.1)
**What**: Command menu component (like Cmd+K)  
**Why**: Fast navigation, search commands  
**Used in**: (If implemented) Quick search for churches, users

---

### 🛠️ Utilities

#### `uuid` (v10.0.0)
**What**: Generate unique IDs  
**Why**: Create unique filenames for uploads

**Example**:
```typescript
import { v4 as uuidv4 } from 'uuid';
const uniqueId = uuidv4(); // "550e8400-e29b-41d4-a716-446655440000"
```

#### `lucide-react` (v0.462.0)
**What**: Beautiful, consistent icon set  
**Why**: Professional icons throughout app  
**Used in**: Buttons, navigation, status indicators

**Example**:
```typescript
import { Check, X, Upload } from 'lucide-react';
<Check className="h-4 w-4" />
```

**Where used**: Every page (icons everywhere!)

---

## 🛠️ Dev Dependencies (Development Only)

These are used during development but NOT included in production build.

### TypeScript

#### `typescript` (v5.8.3)
**What**: JavaScript with type checking  
**Why**: Catch errors before runtime, better autocomplete  
**Used for**: All `.ts` and `.tsx` files

#### `@types/react` (v18.3.23)
**What**: TypeScript types for React  
**Why**: Type safety for React components

#### `@types/react-dom` (v18.3.7)
**What**: TypeScript types for React DOM  
**Why**: Type safety for DOM operations

#### `@types/node` (v22.16.5)
**What**: TypeScript types for Node.js  
**Why**: Type safety for Node APIs (used in config files)

#### `@types/uuid` (v10.0.0)
**What**: TypeScript types for uuid library  
**Why**: Autocomplete for uuid functions

#### `typescript-eslint` (v8.38.0)
**What**: ESLint plugin for TypeScript  
**Why**: Lint TypeScript code specifically

---

### Build Tool (Vite)

#### `vite` (v5.4.19)
**What**: Next-generation build tool  
**Why**: 
- Super fast dev server (instant hot reload)
- Optimized production builds
- Better than Webpack (faster, simpler)

**Key features**:
- Instant server start
- Lightning-fast HMR (Hot Module Replacement)
- Optimized builds with Rollup

#### `@vitejs/plugin-react-swc` (v3.11.0)
**What**: Vite plugin for React with SWC compiler  
**Why**: Even faster React compilation  
**SWC**: Super-fast TypeScript/JavaScript compiler (written in Rust)

#### `terser` (v5.44.0)
**What**: JavaScript minifier  
**Why**: Compress production code (smaller file sizes)

---

### Code Quality (ESLint)

#### `eslint` (v9.32.0)
**What**: JavaScript/TypeScript linter  
**Why**: Enforce code style, catch bugs

#### `@eslint/js` (v9.32.0)
**What**: ESLint's JavaScript rules  
**Why**: Base configuration for ESLint

#### `eslint-plugin-react-hooks` (v5.2.0)
**What**: ESLint rules for React Hooks  
**Why**: Catch mistakes in useEffect, useState, etc.

**Example errors caught**:
- Missing dependency in useEffect
- Calling hooks conditionally (not allowed)

#### `eslint-plugin-react-refresh` (v0.4.20)
**What**: ESLint rules for React Fast Refresh  
**Why**: Ensure hot reload works correctly

#### `globals` (v15.15.0)
**What**: Global variables list  
**Why**: ESLint knows about browser globals (window, document)

---

### Styling Tools

#### `tailwindcss` (v3.4.17)
**What**: CSS framework  
**Why**: Utility-first styling

#### `autoprefixer` (v10.4.21)
**What**: Adds vendor prefixes to CSS  
**Why**: Browser compatibility (-webkit-, -moz-, etc.)

#### `postcss` (v8.5.6)
**What**: CSS transformation tool  
**Why**: Process Tailwind CSS

#### `@tailwindcss/typography` (v0.5.16)
**What**: Beautiful typography defaults  
**Why**: Better text formatting (used in markdown rendering)

---

## 📚 Understanding Dependencies vs DevDependencies

### Dependencies (Production)
```json
"dependencies": { ... }
```
- Included in final build
- Users download these
- Required for app to work

### DevDependencies (Development Only)
```json
"devDependencies": { ... }
```
- Only used during development
- NOT included in production build
- Tools like TypeScript, ESLint, Vite

---

## 🎯 Key Dependency Categories Summary

| Category | Libraries | Purpose |
|----------|-----------|---------|
| **UI Components** | Radix UI (17 packages) | Buttons, dialogs, forms, tooltips |
| **Styling** | Tailwind, CVA, clsx | CSS utilities and variants |
| **Forms** | react-hook-form, zod | Form handling and validation |
| **Backend** | Firebase | Auth, database, storage |
| **Data Fetching** | React Query | Caching and state management |
| **Routing** | React Router | Page navigation |
| **Maps** | Leaflet | Church location maps |
| **360° Photos** | Pannellum | Virtual tours |
| **Charts** | Recharts | Analytics visualization |
| **Dates** | date-fns, react-day-picker | Date handling |
| **Images** | browser-image-compression | Image optimization |
| **Export** | jsPDF, xlsx, html2canvas | PDF and Excel export |
| **Icons** | lucide-react | Icon library |
| **Notifications** | sonner | Toast messages |
| **Build** | Vite, TypeScript | Development tools |

---

## 🔍 How to Research a Dependency

If you want to learn more about any package:

1. **Official Docs**:
   ```
   https://www.npmjs.com/package/<package-name>
   ```

2. **GitHub Repository**:
   - Click "Homepage" or "Repository" on npm page

3. **Check Version**:
   - Look at package.json for current version
   - Check npm for latest version

4. **Find Usage in Code**:
   ```powershell
   # Search for imports
   grep -r "from 'package-name'" src/
   ```

---

## 💡 Common Questions

### Why so many @radix-ui packages?
**Answer**: shadcn/ui is built on top of Radix UI. Each component (dialog, dropdown, etc.) is a separate package to keep bundle size small. You only install what you use.

### Why both `sonner` and `@radix-ui/react-toast`?
**Answer**: Different toast implementations. Sonner is simpler and more modern. Radix toast is part of the UI system. Your project might use both in different contexts.

### What's the difference between `react` and `react-dom`?
**Answer**:
- `react`: Core library (components, hooks, logic)
- `react-dom`: Renders React to browser DOM

### Why `firebase` AND `firebase-admin`?
**Answer**:
- `firebase`: Client-side SDK (used in browser)
- `firebase-admin`: Server-side SDK (used for admin operations like creating users with roles)

### Do I need all these dependencies?
**Answer**: Yes! Each serves a purpose. Removing any might break features.

---

## 🚀 Quick Reference Commands

```powershell
# Install all dependencies
npm install

# Add new dependency (production)
npm install <package-name>

# Add new devDependency
npm install --save-dev <package-name>

# Remove dependency
npm uninstall <package-name>

# Update all dependencies
npm update

# Check for outdated packages
npm outdated

# Check installed package version
npm list <package-name>

# See all installed packages
npm list --depth=0
```

---

## 🎓 Learning Path

To understand how these work together:

1. **Start with**: `react`, `react-dom`, `typescript`
2. **Then learn**: `react-router-dom` (routing)
3. **Next**: `firebase` (backend)
4. **Then**: `@tanstack/react-query` (data fetching)
5. **Finally**: UI libraries (Radix UI, Tailwind)

---

## 📝 Notes

- Package versions use **semantic versioning** (major.minor.patch)
  - `^3.0.0` means "compatible with 3.x.x" (allows updates)
  - Locked versions prevent breaking changes
  
- `package-lock.json` locks exact versions for consistency

- Don't manually edit `package-lock.json`

- Run `npm install` after pulling code changes (updates dependencies)

---

This documentation explains every dependency in your `package.json`! Use it as a reference when studying your codebase. 📚
