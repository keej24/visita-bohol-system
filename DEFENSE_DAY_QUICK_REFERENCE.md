# DEFENSE DAY QUICK REFERENCE CARD

**Print this and bring it to your defense! 📄**

---

## 🎯 MEMORIZE THESE NUMBERS

- **3** active workflow states (pending, heritage_review, approved)
- **5** valid transitions in workflow
- **4** user roles (chancery_office, museum_researcher, parish_secretary, public_user)
- **2** dioceses (tagbilaran, talibon)
- **~55-58K** lines of code (verify exact before defense)
- **~10-15%** automated test coverage
- **80%** target coverage for production

---

## ⚡ INSTANT ANSWERS

### "How many workflow states?"
**"Three: pending, heritage_review, and approved."**

### "What about Draft status?"
**"Defined in TypeScript type for extensibility, but not implemented in workflow state machine. See workflow-state-machine.ts lines 45-98."**

### "Why low test coverage?"
**"Timeline prioritized features. Extensive manual + UAT testing. Core algorithms tested. Production roadmap targets 80% coverage."**

### "Can Parish approve own church?"
**"No. Only Chancery (non-heritage) or Museum (heritage) can approve."**

### "How long does approval take?"
**"Non-heritage: 1-2 days. Heritage: 3-7 days (needs museum validation)."**

---

## 📂 KEY FILES TO REFERENCE

If panelist asks to see code:

1. **Workflow**: `admin-dashboard/src/lib/workflow-state-machine.ts`
2. **Status Types**: `admin-dashboard/src/lib/churches.ts` (line 7)
3. **Heritage Detection**: `admin-dashboard/src/lib/heritage-detection.ts`
4. **Auth/RBAC**: `admin-dashboard/src/contexts/AuthContext.tsx`
5. **Audit Trail**: Firestore collection `church_status_audit`

---

## 🔥 WORKFLOW DIAGRAM (Draw This If Asked)

```
┌──────────┐
│ PENDING  │ ← Parish submits
└────┬─────┘
     │
     ├──→ APPROVED (Chancery: non-heritage)
     │
     └──→ HERITAGE_REVIEW (Chancery: heritage)
              │
              └──→ APPROVED (Museum validates)
```

**5 Transitions:**
1. pending → pending (re-submit)
2. pending → approved (direct approval)
3. pending → heritage_review (send to museum)
4. heritage_review → approved (museum approves)
5. approved → heritage_review (re-evaluation)

---

## 💡 HERITAGE DETECTION SCORING

**Automatic Scoring System:**
- ICP/NCT classification: **100 points** (auto-review)
- Founded < 1900: **50 points**
- Historic architecture: **30 points**
- Heritage keywords: **20 points**

**Thresholds:**
- Score > 100: High confidence (definitely museum review)
- Score 50-100: Medium confidence (recommend review)
- Score < 50: Low confidence (standard approval)

---

## 🛡️ SECURITY LAYERS

**Two-Level Enforcement:**
1. **Client-Side** (AuthContext): Hide unauthorized UI
2. **Server-Side** (Firestore Rules): Actual security

**Always emphasize:** Security enforced server-side!

---

## 📱 TECH STACK VERSIONS

**Admin Dashboard:**
- React: 18.3.1
- TypeScript: 5.8.3
- Vite: 5.4.19
- Firebase: 11.10.0

**Mobile App:**
- Flutter: 3.0+
- Dart: 3.0+
- Drift: 2.28.2

---

## 🎓 DEFENSE TIPS

1. **Start Strong**: "The system uses a 3-state approval workflow..."
2. **Reference Code**: "Let me show you in workflow-state-machine.ts..."
3. **Be Honest**: "Test coverage is limited but we have a production roadmap..."
4. **Stay Confident**: You know this system inside and out!
5. **Breathe**: You've prepared well. You've got this!

---

## 🚨 IF YOU BLANK OUT

**Workflow Question?** → "Three states: pending, heritage_review, approved. Five transitions. See workflow-state-machine.ts."

**Test Question?** → "10-15% coverage. Manual + UAT focus. Core algorithms tested. Production roadmap ready."

**Code Question?** → "Let me show you the actual implementation..." [Open VS Code]

---

## ✅ PRE-DEFENSE CHECKLIST

- [ ] Verified LOC count with `cloc`
- [ ] Read corrected defense guide
- [ ] Printed this quick reference
- [ ] Printed workflow-state-machine.ts source
- [ ] Admin dashboard running
- [ ] Mobile app running
- [ ] VS Code open to codebase
- [ ] Sample churches ready to demo
- [ ] Water bottle ready
- [ ] Deep breath taken

---

## 🏆 YOU'VE GOT THIS!

**Remember:**
- ✅ Your guide is 95% accurate
- ✅ All critical fixes applied
- ✅ You've prepared thoroughly
- ✅ You know this system better than anyone

**Trust your preparation. Speak confidently. Reference the code when needed.**

**Good luck! 🚀**

---

**Last-Minute Affirmations:**
- "I built this system. I understand every design decision."
- "I can reference the actual code to prove my answers."
- "I'm prepared for workflow questions. Three states, five transitions."
- "I'm honest about test coverage and have a production plan."
- "I'm ready to defend my work with confidence."

**Now go crush that defense! 💪**
