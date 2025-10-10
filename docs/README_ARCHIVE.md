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

## 🚨 **CRITICAL: Implementation Required**

This project has **critical security vulnerabilities** and needs immediate attention:

- ❌ **Firebase API keys exposed publicly**
- ❌ **Authentication not properly configured**
- ❌ **45+ outdated dependencies**
- ❌ **Limited testing coverage**

### **🚀 Quick Start (URGENT)**

```bash
# 1. Immediate security fixes (15 minutes)
./implement-security-fixes.sh

# 2. Check overall health
./health-check.sh

# 3. Follow implementation plan
# See QUICK_START_GUIDE.md for step-by-step instructions
```

### **📚 Implementation Resources**

- 🔥 **[QUICK_START_GUIDE.md](QUICK_START_GUIDE.md)** - Start here for immediate fixes
- 📋 **[IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md)** - Track your progress
- 📖 **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)** - Detailed 4-week plan
- 🏥 **[health-check.sh](health-check.sh)** - Monitor project health

### **🎯 Success Timeline**

- **Week 1**: Security fixes + dependency updates
- **Week 2**: Performance optimization + testing
- **Week 3**: Production preparation
- **Week 4**: Launch ready

---

## 🤝 Contributing

1. **First**: Complete security fixes using the implementation plan
2. Fork the repository
3. Create a feature branch
4. Commit your changes
5. Push to the branch
6. Open a Pull Request

---

**VISITA** - *Explore, Learn, and Preserve Bohol's Amazing Churches*

**Status**: 🔴 Critical Issues Present - Implementation Required