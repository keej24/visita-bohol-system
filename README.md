# VISITA: Bohol Churches Information System

A comprehensive system for exploring, documenting, and preserving the rich heritage of Bohol's churches. This monorepo contains both the mobile application for public users and the admin dashboard for diocesan management.

## 🏛️ Overview

VISITA (Visit, Investigate, Study, Integrate, Tour, and Appreciate) is designed to promote cultural heritage tourism while providing robust administrative tools for church documentation and management across the Diocese of Tagbilaran and Diocese of Talibon.

## 📁 Repository Structure

```
visita-bohol-system/
├── mobile-app/           # Flutter mobile application
├── admin-dashboard/      # React admin dashboard
├── shared/              # Shared resources
└── README.md            # Main project overview
```

## 🚀 Applications

### 📱 Mobile App (Flutter)
**Target Users**: Public users, tourists, parishioners

**Quick Start**:
```bash
cd mobile-app
flutter pub get
flutter run
```

### 💻 Admin Dashboard (React/TypeScript)
**Target Users**: Chancery offices, museum researchers, parish secretaries

**Quick Start**:
```bash
cd admin-dashboard
npm install
npm run dev
```

**Features**:
- Administrative interface for church data management
- Data visualization with Recharts
- Role-based access control
- Firebase integration
- Modern UI with shadcn/ui components

## 👥 User Roles & Access

- **Tagbilaran Chancery**: Diocese of Tagbilaran jurisdiction
- **Talibon Chancery**: Diocese of Talibon jurisdiction
- **Parish Secretaries**: Individual parish management
- **Museum Researchers**: Heritage site verification

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

**VISITA** - *Explore, Learn, and Preserve Bohol's Amazing Churches*