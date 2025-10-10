# Firebase Security Rules Documentation

## 🔒 Security Status: SECURED ✅

Your Firebase Realtime Database security rules have been successfully deployed and are now protecting your data.

## 📋 Security Rule Summary

### Public Access (No Authentication Required)
- **Churches Data** (`/churches`): Read-only access for public church information
- **Announcements** (`/announcements`): Read-only access for public announcements

### Authenticated Access Required
- **Feedback** (`/feedback`): Users can read all feedback, create their own
- **Reports** (`/reports`): Admin and parish secretary access only

### Admin-Only Access
- **Users** (`/users`): Chancery admin exclusive access
- **Analytics** (`/analytics`): Read access for admins/secretaries, write for admins only

## 🛡️ Role-Based Permissions

### Chancery Admin (`chancery_admin`)
- ✅ Full read/write access to all data
- ✅ User management capabilities
- ✅ Analytics and reporting access
- ✅ Church and announcement management

### Parish Secretary (`parish_secretary`)
- ✅ Read/write access to churches and announcements
- ✅ Read access to reports and analytics
- ✅ Feedback moderation capabilities
- ❌ No user management access

### Authenticated Users
- ✅ Can create and read feedback
- ✅ Can view public church information
- ❌ Cannot modify system data

### Public (Unauthenticated)
- ✅ Read-only access to churches and announcements
- ❌ No access to sensitive data

## 🚀 Deployment Commands

### Deploy All Security Rules
```bash
firebase deploy --only database,firestore:rules,storage
```

### Deploy Only Database Rules
```bash
firebase deploy --only database
```

### Test Rules Locally
```bash
firebase database:get /churches --project visitaproject-5cd9f
```

## 🔍 Validation Rules

### Feedback Validation
- User ID must match authenticated user
- Rating must be between 1-5
- Comments limited to 1000 characters
- Church ID must be provided
- Timestamp must be a number

### Data Structure Requirements
```json
{
  "feedback": {
    "feedbackId": {
      "userId": "string (must match auth.uid)",
      "churchId": "string (required)",
      "rating": "number (1-5)",
      "comment": "string (max 1000 chars)",
      "timestamp": "number",
      "status": "string (visible/hidden)"
    }
  }
}
```

## ⚠️ Important Security Notes

1. **Authentication Required**: Most operations require user authentication
2. **Role Validation**: User roles are validated via custom auth tokens
3. **Data Validation**: Input data is validated for type and length
4. **Public Safety**: Only church information and announcements are publicly readable
5. **Admin Protection**: Sensitive operations require admin privileges

## 🛠️ Troubleshooting

### Common Issues

**Error: "Permission denied"**
- Ensure user is authenticated
- Check user role permissions
- Verify data structure matches validation rules

**Error: "Validation failed"**
- Check required fields are present
- Verify data types match requirements
- Ensure string length limits are not exceeded

**Error: "Custom token verification failed"**
- Ensure auth tokens include proper role claims
- Check token signing and verification process

## 📞 Support

If you encounter security-related issues:

1. Check the Firebase Console for detailed error logs
2. Verify user authentication and role assignments
3. Test rules using Firebase Emulator Suite
4. Review data structure against validation requirements

---

**Last Updated**: September 17, 2025
**Rules Version**: 1.0
**Project**: visitaproject-5cd9f