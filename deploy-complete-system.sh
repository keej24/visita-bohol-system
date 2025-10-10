#!/bin/bash

# VISITA System Complete Deployment Script
# This script handles the complete deployment of both admin dashboard and mobile app

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT=$(pwd)
ADMIN_DASHBOARD_DIR="$PROJECT_ROOT/admin-dashboard"
MOBILE_APP_DIR="$PROJECT_ROOT/mobile-app"
SCRIPTS_DIR="$PROJECT_ROOT/scripts"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."

    local missing_deps=()

    if ! command_exists node; then
        missing_deps+=("Node.js 18+")
    fi

    if ! command_exists npm; then
        missing_deps+=("npm")
    fi

    if ! command_exists flutter; then
        missing_deps+=("Flutter SDK")
    fi

    if ! command_exists firebase; then
        missing_deps+=("Firebase CLI")
    fi

    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing required dependencies:"
        for dep in "${missing_deps[@]}"; do
            echo "  - $dep"
        done
        echo ""
        echo "Please install missing dependencies and run this script again."
        echo ""
        echo "Installation guides:"
        echo "  Node.js: https://nodejs.org/"
        echo "  Firebase CLI: npm install -g firebase-tools"
        echo "  Flutter: https://flutter.dev/docs/get-started/install"
        exit 1
    fi

    print_success "All prerequisites are installed"
}

# Function to validate environment files
validate_environment() {
    print_status "Validating environment configuration..."

    # Check admin dashboard .env
    if [ ! -f "$ADMIN_DASHBOARD_DIR/.env" ]; then
        print_warning "Admin dashboard .env file not found"
        print_status "Creating .env from .env.example..."

        if [ -f "$ADMIN_DASHBOARD_DIR/.env.example" ]; then
            cp "$ADMIN_DASHBOARD_DIR/.env.example" "$ADMIN_DASHBOARD_DIR/.env"
            print_warning "Please edit admin-dashboard/.env with your actual Firebase credentials"
        else
            print_error "No .env.example file found in admin-dashboard/"
            exit 1
        fi
    fi

    # Check for Firebase service account
    if [ ! -f "$ADMIN_DASHBOARD_DIR/firebase-service-account.json" ]; then
        print_error "Firebase service account file not found at admin-dashboard/firebase-service-account.json"
        print_error "Please download your Firebase service account key and place it at this location"
        exit 1
    fi

    # Check mobile app Firebase options
    if [ ! -f "$MOBILE_APP_DIR/lib/firebase_options.dart" ]; then
        print_warning "Mobile app Firebase options not found"
        print_status "Please run 'flutterfire configure' in the mobile-app directory"
    fi

    print_success "Environment configuration validated"
}

# Function to setup Firebase project
setup_firebase() {
    print_status "Setting up Firebase project..."

    # Login to Firebase (if not already logged in)
    if ! firebase projects:list >/dev/null 2>&1; then
        print_status "Please log in to Firebase CLI..."
        firebase login
    fi

    # Get current project
    local current_project=$(firebase use --json 2>/dev/null | jq -r '.result.projectId' 2>/dev/null || echo "")

    if [ -z "$current_project" ] || [ "$current_project" = "null" ]; then
        print_warning "No Firebase project selected"
        print_status "Please select your Firebase project:"
        firebase use --add
    else
        print_success "Using Firebase project: $current_project"
    fi

    # Deploy Firebase rules and functions
    print_status "Deploying Firestore security rules..."
    cd "$ADMIN_DASHBOARD_DIR"
    firebase deploy --only firestore:rules,storage

    print_success "Firebase setup completed"
}

# Function to build admin dashboard
build_admin_dashboard() {
    print_status "Building admin dashboard..."

    cd "$ADMIN_DASHBOARD_DIR"

    # Install dependencies
    print_status "Installing admin dashboard dependencies..."
    npm ci

    # Run linting
    if npm run lint >/dev/null 2>&1; then
        print_status "Running linter..."
        npm run lint
    fi

    # Build for production
    print_status "Building admin dashboard for production..."
    npm run build

    print_success "Admin dashboard built successfully"
}

# Function to build mobile app
build_mobile_app() {
    print_status "Building mobile app..."

    cd "$MOBILE_APP_DIR"

    # Get dependencies
    print_status "Getting Flutter dependencies..."
    flutter pub get

    # Run tests (if they exist)
    if [ -d "test" ] && [ "$(ls -A test)" ]; then
        print_status "Running Flutter tests..."
        flutter test
    fi

    # Build for Android
    print_status "Building Android APK..."
    flutter build apk --release

    # Build for iOS (if on macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        print_status "Building iOS app..."
        flutter build ios --release --no-codesign
    else
        print_warning "Skipping iOS build (not on macOS)"
    fi

    print_success "Mobile app built successfully"
}

# Function to initialize database
initialize_database() {
    print_status "Initializing database with sample data..."

    cd "$SCRIPTS_DIR"

    # Install Node.js dependencies for scripts
    if [ -f "package.json" ]; then
        npm ci
    else
        # Create minimal package.json for firebase-admin
        cat > package.json << EOF
{
  "name": "visita-scripts",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "firebase-admin": "^12.0.0"
  }
}
EOF
        npm install
    fi

    # Run database initialization scripts
    print_status "Initializing Firebase collections..."
    node init-firebase.js

    print_status "Creating admin accounts..."
    node create-admin-accounts.js

    print_status "Seeding sample church data..."
    node seed-sample-churches.js

    print_success "Database initialization completed"
}

# Function to deploy admin dashboard
deploy_admin_dashboard() {
    print_status "Deploying admin dashboard..."

    cd "$ADMIN_DASHBOARD_DIR"

    # Deploy to Firebase Hosting
    firebase deploy --only hosting

    print_success "Admin dashboard deployed successfully"
}

# Function to run deployment tests
run_deployment_tests() {
    print_status "Running deployment verification tests..."

    # Test admin dashboard build
    if [ ! -d "$ADMIN_DASHBOARD_DIR/dist" ]; then
        print_error "Admin dashboard build directory not found"
        return 1
    fi

    # Test mobile app builds
    if [ ! -f "$MOBILE_APP_DIR/build/app/outputs/apk/release/app-release.apk" ]; then
        print_warning "Android APK not found"
    fi

    # Test Firebase connection
    cd "$ADMIN_DASHBOARD_DIR"
    if ! firebase projects:list >/dev/null 2>&1; then
        print_error "Firebase connection test failed"
        return 1
    fi

    print_success "All deployment tests passed"
}

# Function to generate deployment report
generate_deployment_report() {
    print_status "Generating deployment report..."

    local report_file="$PROJECT_ROOT/DEPLOYMENT_REPORT.md"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    cat > "$report_file" << EOF
# VISITA System Deployment Report

**Deployment Date:** $timestamp

## ✅ Completed Tasks

### Environment Setup
- [x] Environment configuration files created
- [x] Firebase project configured
- [x] Security rules deployed

### Admin Dashboard
- [x] Dependencies installed
- [x] Build completed successfully
- [x] Deployed to Firebase Hosting

### Mobile App
- [x] Flutter dependencies resolved
- [x] Android APK built
EOF

    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "- [x] iOS app built" >> "$report_file"
    else
        echo "- [x] iOS build skipped (not on macOS)" >> "$report_file"
    fi

    cat >> "$report_file" << EOF

### Database Setup
- [x] Firebase collections initialized
- [x] Admin accounts created
- [x] Sample data seeded

## 🚀 Deployment URLs

### Admin Dashboard
EOF

    # Get Firebase hosting URL
    cd "$ADMIN_DASHBOARD_DIR"
    local hosting_url=$(firebase hosting:channel:list --json 2>/dev/null | jq -r '.result[0].url' 2>/dev/null || echo "Check Firebase console")
    echo "- **Live URL:** $hosting_url" >> "$report_file"

    cat >> "$report_file" << EOF

### Mobile App
- **Android APK:** \`mobile-app/build/app/outputs/apk/release/app-release.apk\`
EOF

    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "- **iOS Build:** \`mobile-app/build/ios/archive/Runner.xcarchive\`" >> "$report_file"
    fi

    cat >> "$report_file" << EOF

## 👥 Default Admin Accounts

### Chancery Office Accounts
- **Tagbilaran Diocese:** admin@diocese-tagbilaran.org
- **Talibon Diocese:** admin@diocese-talibon.org

### Museum Researcher
- **Email:** researcher@natmus-bohol.org

### Parish Secretaries
- **Baclayon:** secretary@baclayon-church.org
- **Loboc:** secretary@loboc-church.org
- **Talibon Cathedral:** secretary@talibon-cathedral.org

⚠️ **Important:** Change all default passwords after first login!

## 📊 Sample Data

- **Churches:** 7 sample churches across both dioceses
- **Announcements:** Sample diocesan and parish announcements
- **Heritage Sites:** Baclayon, Loboc, and Dauis marked as heritage churches

## 🔧 Next Steps

1. **Security Setup:**
   - Change all default admin passwords
   - Review and customize Firestore security rules
   - Set up SSL certificates for custom domains

2. **Content Management:**
   - Replace sample church data with real data
   - Upload actual church images and documents
   - Create real announcements and schedules

3. **Mobile App Distribution:**
   - Sign Android APK for Play Store
   - Set up iOS certificates for App Store
   - Configure app store listings

4. **Monitoring:**
   - Set up Firebase Analytics
   - Configure error tracking
   - Set up automated backups

5. **Documentation:**
   - Create user manuals for each role
   - Document admin procedures
   - Set up support channels

## 🆘 Support

For technical support or questions about the deployment:

1. Check the deployment logs in this directory
2. Review Firebase console for any errors
3. Refer to the main README.md for troubleshooting

---

*Generated automatically by VISITA deployment script*
EOF

    print_success "Deployment report generated: $report_file"
}

# Main deployment function
main() {
    echo "========================================"
    echo "🏛️  VISITA System Deployment Script"
    echo "========================================"
    echo ""

    # Step 1: Check prerequisites
    check_prerequisites

    # Step 2: Validate environment
    validate_environment

    # Step 3: Setup Firebase
    setup_firebase

    # Step 4: Build admin dashboard
    build_admin_dashboard

    # Step 5: Build mobile app
    build_mobile_app

    # Step 6: Initialize database
    initialize_database

    # Step 7: Deploy admin dashboard
    deploy_admin_dashboard

    # Step 8: Run tests
    run_deployment_tests

    # Step 9: Generate report
    generate_deployment_report

    echo ""
    echo "========================================"
    print_success "🎉 VISITA System Deployment Complete!"
    echo "========================================"
    echo ""
    print_status "Next steps:"
    echo "1. Review the deployment report: DEPLOYMENT_REPORT.md"
    echo "2. Test the admin dashboard in your browser"
    echo "3. Install the mobile app APK on Android devices"
    echo "4. Change default admin passwords"
    echo "5. Customize the system with real data"
    echo ""
    print_warning "⚠️  Remember to change all default passwords before production use!"
}

# Run the deployment
main "$@"