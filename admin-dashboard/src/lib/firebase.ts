/**
 * FILE PURPOSE: Firebase Initialization and Configuration
 *
 * This file is the central point for initializing and exporting Firebase services
 * used throughout the VISITA admin dashboard application.
 *
 * KEY RESPONSIBILITIES:
 * - Initialize Firebase app with project configuration
 * - Export Firebase service instances (Auth, Firestore, Storage)
 * - Provide single source of truth for Firebase connection
 * - Load configuration from environment variables for security
 *
 * INTEGRATION POINTS:
 * - Used by all services that need Firebase access (auth, database, storage)
 * - Imports environment variables from ./env for configuration
 * - Connects to Firebase project: visita-bohol-churches (or your project)
 *
 * TECHNICAL CONCEPTS:
 * - Firebase SDK: Google's Backend-as-a-Service platform
 * - Authentication: Firebase Auth for user management and login
 * - Firestore: NoSQL document database for real-time data
 * - Storage: Cloud storage for images, documents, and 360° photos
 * - Environment Variables: Sensitive config kept in .env files, not code
 * - Singleton Pattern: Initialize once, export instances for reuse
 *
 * SECURITY BEST PRACTICES:
 * - Never commit actual API keys to git (use .env.local)
 * - Firebase security rules protect database and storage access
 * - Environment variables prevent exposing credentials in source code
 *
 * WHY IMPORTANT:
 * - Central initialization prevents multiple Firebase instances
 * - Separates configuration from business logic
 * - Makes testing easier by allowing mock replacements
 * - Supports different environments (dev, staging, production)
 */

// Firebase SDK v9+ modular imports (tree-shakeable, smaller bundle size)
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
// Environment variable loader with validation
import { env } from "./env";

/**
 * Firebase Configuration Object
 *
 * Contains all necessary credentials to connect to Firebase project.
 * Values come from environment variables defined in .env files.
 *
 * IMPORTANT: These values are PUBLIC but protected by:
 * - Firebase security rules (database and storage access control)
 * - Authentication requirements (user must be logged in)
 * - Domain restrictions (only your domains can use this config)
 */
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,                    // Public API key (not secret)
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,           // Authentication domain
  projectId: env.VITE_FIREBASE_PROJECT_ID,             // Firebase project identifier
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,     // Cloud Storage bucket name
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID, // Cloud Messaging ID
  appId: env.VITE_FIREBASE_APP_ID,                     // Firebase App ID
};

/**
 * Initialize Firebase Application
 *
 * This creates the main Firebase app instance using the configuration above.
 * Should only be called once per application lifecycle.
 */
const app = initializeApp(firebaseConfig);

/**
 * Exported Firebase Service Instances
 *
 * These are the main services used throughout the application:
 *
 * - auth: Firebase Authentication service
 *   Used for: User login, role management, session handling
 *
 * - db: Cloud Firestore database
 *   Used for: Storing church data, announcements, user profiles, feedback
 *   Structure: NoSQL document database with collections and documents
 *
 * - storage: Firebase Cloud Storage
 *   Used for: Storing images, PDFs, 360° photos
 *   Organization: Files organized by type (churches/{id}/photos, documents, etc.)
 *
 * - functions: Firebase Cloud Functions
 *   Used for: Server-side operations like sending professional emails via Resend
 */
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

