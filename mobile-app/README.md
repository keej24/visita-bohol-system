# VISITA: Bohol Churches Information System

A comprehensive Flutter application for exploring, documenting, and preserving the rich heritage of Bohol's churches. This system serves both public users interested in church tourism and administrative users managing diocesan records.

## 🏛️ Overview

VISITA (Visit, Investigate, Study, Integrate, Tour, and Appreciate) is designed to promote cultural heritage tourism while providing robust administrative tools for church documentation and management across the Diocese of Tagbilaran and Diocese of Talibon.

## ✨ Features

### For Public Users
- **Interactive Church Directory**: Browse 25+ churches with detailed information
- **Heritage Site Explorer**: Discover 12 heritage-classified churches
- **Virtual Tours**: Experience 360° immersive church interiors
- **Smart Filtering**: Search by location, founding year, architectural style
- **Visit Tracking**: Mark churches as "For Visit" or "Visited"
- **Feedback System**: Submit reviews, ratings, and photos
- **GPS Navigation**: Get directions to any church
- **Mass Schedule**: View current mass times and special events

### For Administrative Users
- **Church Management**: Create, update, and approve church profiles
- **Diocese-Specific Access**: Talibon and Tagbilaran chanceries manage their jurisdictions
- **Heritage Documentation**: Museum researchers verify and document heritage sites
- **Announcement System**: Publish diocese-wide and parish-level announcements
- **User Management**: Role-based access control
- **Analytics & Reports**: Generate visitor statistics and engagement reports

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Flutter (Dart)
- **Backend**: Firebase (Firestore, Auth, Storage)
- **Maps**: Google Maps Flutter, Flutter Map
- **State Management**: Provider Pattern
- **Architecture**: Clean Architecture with Repository Pattern

### Project Structure
```
lib/
├── models/           # Data models
├── repositories/     # Data access layer
├── services/         # Business logic
├── screens/          # UI screens
├── widgets/          # Reusable components
├── theme/           # App theming
└── util/            # Utilities
```

## 👥 User Roles

1. **Public Users**: Church visitors and tourists
2. **Parish Secretaries**: Manage individual parish information
3. **Chancery Office**: Oversee diocesan church management
4. **Museum Researchers**: Verify and document heritage sites

## 🚀 Getting Started

### Prerequisites
- Flutter SDK (>=3.0.0)
- Dart SDK (>=2.19.0)
- Firebase account and project setup
- Android Studio or VS Code

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/visita-bohol-churches.git
   cd visita-bohol-churches
   ```

2. **Install dependencies**
   ```bash
   flutter pub get
   ```

3. **Firebase Setup**
   - Create a Firebase project
   - Enable Authentication, Firestore, and Storage
   - Add your `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
   - Update `lib/firebase_options.dart` with your configuration

4. **Run the application**
   ```bash
   flutter run
   ```

## 🗃️ Database Structure

### Firestore Collections
- `churches`: Church profiles with location, history, and media
- `announcements`: Diocese and parish-level announcements
- `users`: User profiles with roles and permissions
- `feedback`: User reviews and ratings
- `mass_schedules`: Current mass times and special events

## 🎯 Key Features Implementation

### Church Management Workflow
1. Parish creates church profile
2. Chancery Office reviews for accuracy
3. Heritage sites forwarded to Museum Researcher
4. Approved churches become publicly visible

### Role-Based Access
- Diocese-specific data filtering
- Permission-based feature access
- Secure administrative functions

### Mobile-First Design
- Responsive layouts for all screen sizes
- Offline capability with local data caching
- Native platform integration

## 📱 Supported Platforms

- ✅ Android
- ✅ iOS  
- ✅ Web
- ✅ Windows Desktop

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Diocese of Tagbilaran and Diocese of Talibon
- Bohol Cultural Heritage Preservation Society
- Local parishes and communities
- Heritage documentation contributors

## 📞 Contact

For questions, suggestions, or collaboration opportunities, please contact the development team.

---

**VISITA** - *Explore, Learn, and Preserve Bohol's Amazing Churches*
