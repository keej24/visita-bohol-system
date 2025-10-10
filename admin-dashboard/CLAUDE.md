# VISITA: Bohol Churches Information System - Admin Dashboard

## Project Overview

VISITA is a comprehensive church information management system for the Dioceses of Tagbilaran and Talibon in Bohol, Philippines. The system serves four primary actors and manages five core use cases to facilitate church documentation, heritage preservation, and community engagement.

## System Architecture

### Actors & Roles

#### 1. Chancery Office (Admin)
- **Diocese of Tagbilaran** and **Diocese of Talibon**
- Central administrative authority and system administrator
- Chief notary for official diocesan documentation
- **Capabilities:**
  - Complete administrative control
  - Create, edit, or deactivate Parish user accounts
  - Assign roles and access levels
  - Validate and approve church/announcement entries
  - Moderate feedback across diocese
  - Generate diocesan-wide summary reports

#### 2. Museum Researcher
- **National Museum of the Philippines–Bohol** professionals
- Specialized heritage and cultural documentation experts
- **Capabilities:**
  - Secure system access with profile management
  - Review and verify heritage church entries (ICP and NCT)
  - Upload museum declarations for heritage sites
  - Validate historical and cultural content
  - Enhance system's cultural documentation

#### 3. Parish Secretary
- Designated church staff for parish-level management
- **Capabilities:**
  - Maintain and update own church profile
  - Upload schedules, images, documents, coordinates, 360° photos
  - Post, edit, and archive church-specific announcements
  - Submit church data for approval workflow
  - Moderate parish-specific feedback
  - Generate parish-level reports

#### 4. Public User
- General users: parishioners, researchers, tourists
- **Capabilities:**
  - Self-registration through sign-up form
  - Browse church profiles and announcements
  - Filter churches by name, year, classification, location
  - Interactive maps and 360° virtual tours
  - Mark churches as "visited" or "for visit"
  - Submit feedback (text, ratings, images)
  - Personal profile management

## Core Use Cases

### 1. Manage Account
**Actors:** All (Chancery, Museum Researcher, Parish, Public)

- **Account Creation & Management**
  - Chancery Office creates Parish accounts
  - Parish and Museum Researcher modify profile details
  - Public User self-registration required for enhanced features
  - Administrative accounts (Chancery/Museum) are pre-configured

- **Access Control**
  - Role-based permissions and access levels
  - Profile information maintenance
  - Password and security management

### 2. Manage Church
**Actors:** All (Chancery, Museum Researcher, Parish, Public)

#### Parish Responsibilities:
- Create/update church entries via comprehensive forms
- Required details: name, location, founding year, architectural style, historical background, mass schedules, assigned priest, classification
- Upload supporting materials: photos, historical documents, heritage declarations
- Upload 360° images for virtual tour conversion
- Include GPS coordinates (latitude/longitude) for mapping

#### Approval Workflow:
1. **Parish Submission** → "Pending Review" status
2. **Chancery Office Review** → Evaluate completeness and accuracy
   - **Non-heritage churches:** Direct approval if complete
   - **Heritage churches:** Forward to Museum Researcher
   - **Incomplete/Inaccurate:** Return for revision or direct correction
3. **Museum Researcher Review** (Heritage sites)
   - Assess historical and cultural accuracy
   - Upload museum declarations
   - Edit for factual information if needed
   - Final approval for publication

#### Public Access:
- Browse with search/filter functionality
- Interactive maps and virtual tours
- Submit feedback and visit tracking
- Tag churches as "For Visit" or "Visited"

### 3. Manage Announcement
**Actors:** Chancery Office, Parish, Public User

#### Content Creation:
- **Chancery Office:** Diocese-wide announcements (pastoral letters, major events)
  - Displayed prominently on announcement page and homepage carousel
- **Parish:** Church-specific announcements (feast days, local activities)
  - Displayed within associated church profile only

#### Announcement Structure:
- Title, description, date, time, venue
- Automatic archiving after event conclusion
- Create, edit, and archive capabilities for authorized users

### 4. Manage Feedback
**Actors:** Chancery Office, Parish, Public User

#### Feedback Submission (Public):
- Textual comments about church visits
- Star ratings (1-5 scale)
- Image uploads
- Public display under corresponding church profiles

#### Content Moderation (Chancery/Parish):
- Review submitted feedback
- Remove inappropriate or violating content
- Maintain community standards
- Ensure transparency and engagement

### 5. Generate Report
**Actors:** Parish, Chancery Office

#### Report Types:

##### A. Church Summary Report
**Parish Level:**
- Single church documentation details
- Heritage classification and historical background
- Founding year, founders, key figures
- Architectural style and evolution
- Major historical events
- Heritage recognition records
- Preservation/restoration history
- Structured summaries and classification charts

**Diocesan Level (Chancery):**
- All municipalities with documented churches
- Aggregate church counts
- Key details: founding year, classification (ICP, NCT, non-heritage)
- Comprehensive diocesan overview

##### B. Engagement & Feedback Analytics Report
**Parish Level:**
- Visitor logs over time
- Parish-specific public feedback summaries
- Heat maps highlighting peak visiting periods
- Line/bar charts showing visitor activity trends
- Star rating trend graphs
- Date range filtering

**Diocesan Level (Chancery):**
- Consolidated visitor statistics across diocese
- Comparative parish engagement charts
- Heat maps identifying most-visited churches
- Rating distribution graphs
- Parish, classification, and date range filtering

#### Export Options:
- PDF format for formal documentation
- Excel format for data analysis
- Support for recordkeeping and administrative use

## Technical Implementation

### Current Tech Stack
- **Frontend:** React with TypeScript and Vite
- **UI Components:** shadcn/ui component library
- **Styling:** Tailwind CSS
- **Backend:** Firebase (Authentication, Firestore, Storage)
- **Data Validation:** Zod schemas
- **Charts:** Recharts for data visualization
- **State Management:** React Query for server state
- **Routing:** React Router for navigation

### Key Features
- **Role-based Access Control:** Firestore security rules
- **Real-time Updates:** Firebase Firestore subscriptions
- **File Storage:** Firebase Storage for images and documents
- **Responsive Design:** Mobile-first approach
- **Error Boundaries:** Comprehensive error handling
- **Code Splitting:** Lazy loading for performance
- **Data Validation:** Client and server-side validation

### Security Implementation
- Environment variable management for sensitive credentials
- Firestore security rules with role-based access
- Firebase Storage security rules for file uploads
- Input validation and sanitization
- Authentication state management

## Development Guidelines

### Code Organization
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── charts/         # Chart components
│   ├── filters/        # Filter components
│   └── forms/          # Form components
├── contexts/           # React contexts
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and configurations
├── pages/              # Page components
├── services/           # API service functions
└── types/              # TypeScript type definitions
```

### Testing Strategy
- Unit testing for utility functions
- Component testing for UI components
- Integration testing for API interactions
- E2E testing for critical user journeys

### Deployment
- Development: Local development server
- Staging: Firebase Hosting for testing
- Production: Firebase Hosting with custom domain

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Deploy to Firebase
npm run deploy

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Environment Setup

### Required Environment Variables
```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Firebase Services Setup
1. **Authentication:** Email/password and role-based access
2. **Firestore:** Document database with security rules
3. **Storage:** File storage for images and documents
4. **Hosting:** Web application deployment

## User Journey Examples

### Parish Secretary Workflow
1. Login with assigned credentials
2. Navigate to Parish Dashboard
3. Create/edit church profile
4. Upload photos and documents
5. Submit for Chancery approval
6. Manage announcements and schedules
7. Moderate feedback
8. Generate parish reports

### Chancery Office Workflow
1. Login with administrative credentials
2. Review pending church submissions
3. Approve or request revisions
4. Create diocesan announcements
5. Monitor feedback across diocese
6. Generate comprehensive reports
7. Manage parish user accounts

### Public User Workflow
1. Register for account
2. Browse church listings
3. Use filters and map navigation
4. View virtual tours
5. Submit feedback and ratings
6. Track visited churches
7. View announcements and events

## Future Enhancements

### Planned Features
- Mobile application integration
- Advanced analytics dashboard
- Automated backup systems
- Multi-language support
- API for third-party integrations
- Enhanced virtual tour capabilities
- Social sharing features
- Notification system

### Performance Optimizations
- Image compression and optimization
- Caching strategies
- Database query optimization
- CDN implementation
- Progressive Web App features

## Support and Maintenance

### Documentation
- API documentation for developers
- User guides for each actor type
- System administration manual
- Deployment and maintenance procedures

### Monitoring
- Error tracking and logging
- Performance monitoring
- User analytics
- System health checks
- Backup and recovery procedures

---

**Project Contact Information:**
- System Administrator: Chancery Office
- Technical Support: Development Team
- Heritage Consultation: National Museum of the Philippines–Bohol