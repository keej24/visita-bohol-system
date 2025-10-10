# Pannellum 360° Integration Roadmap for VISITA System

## 🎯 Overview
Integration of Pannellum 360° panoramic viewer to enable immersive virtual church tours for the VISITA Bohol Churches Information System.

## 📋 Implementation Phases

### **Phase 1: Core Integration (Week 1)**
#### Admin Dashboard
- [x] Create VirtualTour360 React component
- [x] Create Virtual360Uploader component
- [x] Update TypeScript types for 360° images
- [ ] Install pannellum dependencies
- [ ] Update ChurchProfileForm with 360° upload section
- [ ] Add 360° preview in church profile display

#### Mobile App
- [x] Create Pannellum360Viewer Flutter widget
- [ ] Add flutter_inappwebview dependency
- [ ] Integrate 360° viewer in church detail screens
- [ ] Add 360° tour section to church cards

#### Commands to run:
```bash
# Admin Dashboard
cd admin-dashboard
npm install pannellum-react
# or
npm install pannellum

# Mobile App
cd mobile-app
flutter pub add flutter_inappwebview
```

### **Phase 2: Upload & Processing (Week 2)**
#### Features
- [ ] File validation for equirectangular images (2:1 aspect ratio)
- [ ] Image compression and optimization
- [ ] Firebase Storage integration for 360° images
- [ ] Thumbnail generation for 360° images
- [ ] Batch upload capabilities

#### Processing Pipeline
```typescript
// Image processing workflow
const process360Image = async (file: File) => {
  // 1. Validate format and aspect ratio
  // 2. Compress for web delivery
  // 3. Generate thumbnail
  // 4. Upload to Firebase Storage
  // 5. Save metadata to Firestore
};
```

### **Phase 3: Enhanced Viewer Features (Week 3)**
#### Advanced Features
- [ ] Hotspot system for information markers
- [ ] Tour sequences (connecting multiple 360° views)
- [ ] Audio descriptions and narration
- [ ] Custom control themes
- [ ] Fullscreen mode optimization

#### Hotspot Implementation
```javascript
// Add information hotspots
viewer.addHotSpot({
    "pitch": 14.1,
    "yaw": 1.5,
    "type": "info",
    "text": "This is the main altar, built in 1875...",
    "URL": "#altar-info"
});
```

### **Phase 4: Mobile Optimization (Week 4)**
#### Mobile Features
- [ ] Touch gesture optimization
- [ ] Gyroscope support for device orientation
- [ ] Offline caching for downloaded tours
- [ ] Progressive loading for slow connections
- [ ] iOS/Android specific optimizations

### **Phase 5: Quality & Performance (Week 5)**
#### Optimization
- [ ] Image format optimization (WebP support)
- [ ] CDN integration for faster loading
- [ ] Lazy loading implementation
- [ ] Performance monitoring
- [ ] Error handling and fallbacks

## 🛠 Technical Implementation Details

### **File Structure**
```
admin-dashboard/
├── src/
│   ├── components/
│   │   ├── 360/
│   │   │   ├── VirtualTour360.tsx
│   │   │   ├── Virtual360Uploader.tsx
│   │   │   └── index.ts
│   │   └── parish/
│   │       ├── ChurchProfileForm.tsx (updated)
│   │       └── types.ts (updated)
│   └── lib/
│       └── 360-utils.ts

mobile-app/
├── lib/
│   ├── widgets/
│   │   ├── pannellum_360_viewer.dart
│   │   └── church_360_tour_section.dart
│   ├── models/
│   │   └── virtual_360_image.dart
│   └── services/
│       └── panorama_service.dart
```

### **Database Schema Updates**
```typescript
// Firestore: churches/{churchId}
interface ChurchDocument {
  // ... existing fields
  virtual360Images: {
    id: string;
    url: string;
    thumbnailUrl: string;
    description: string;
    category: 'interior' | 'exterior' | 'altar' | 'entrance';
    uploadDate: Timestamp;
    status: 'pending' | 'approved' | 'rejected';
    dimensions: { width: number; height: number };
    fileSize: number;
  }[];
}
```

### **Firebase Storage Structure**
```
/churches/{churchId}/360/
├── original/
│   ├── image1_original.jpg
│   └── image2_original.jpg
├── optimized/
│   ├── image1_web.jpg
│   └── image2_web.jpg
└── thumbnails/
    ├── image1_thumb.jpg
    └── image2_thumb.jpg
```

## 🎨 UI/UX Considerations

### **Admin Dashboard**
- Drag-and-drop upload interface
- Real-time aspect ratio validation
- Live 360° preview during upload
- Batch operations for multiple images
- Progress indicators and error handling

### **Mobile App**
- Smooth touch navigation
- Loading states and error fallbacks
- Orientation lock during viewing
- Share functionality for tours
- Accessibility features

## 📊 Success Metrics

### **Technical Metrics**
- Upload success rate > 95%
- 360° viewer load time < 3 seconds
- Mobile compatibility across iOS/Android
- Error rate < 2%

### **User Engagement**
- Average time spent in virtual tours
- Number of 360° images uploaded per church
- User feedback on virtual tour experience
- Mobile vs desktop usage patterns

## 🔧 Development Tools & Resources

### **Testing Tools**
- 360° image samples for development
- Cross-browser testing suite
- Mobile device testing matrix
- Performance monitoring tools

### **Documentation**
- Pannellum API documentation: https://pannellum.org/documentation/overview/
- Component usage examples
- Troubleshooting guide
- Best practices for 360° photography

## 🚀 Deployment Plan

### **Staging Environment**
1. Deploy to development environment
2. Internal testing with sample churches
3. Performance and compatibility testing
4. User acceptance testing

### **Production Rollout**
1. Feature flag implementation
2. Gradual rollout to select parishes
3. Monitor performance and user feedback
4. Full deployment after validation

## 📝 Notes
- Ensure proper image compression to maintain quality while optimizing load times
- Consider implementing progressive enhancement for older devices
- Plan for future VR/AR integration possibilities
- Maintain backward compatibility with existing church profiles