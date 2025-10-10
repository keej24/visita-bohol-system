# 🔥 Hot Reload Guide for VISITA Mobile App

## What is Hot Reload?

Hot reload instantly reflects code changes in your running app **without losing the current state**. This means:
- ✅ No need to restart the app
- ✅ Preserves current screen, data, and user input
- ✅ See changes in ~1 second
- ✅ Significantly faster development

---

## Quick Start (Easiest Method)

### Step 1: Run the batch file
Double-click: **`run-with-hot-reload.bat`**

This will:
- Start Flutter on Chrome
- Enable hot reload
- Show available commands

### Step 2: Edit your code
Make changes to any `.dart` file in the `lib/` folder

### Step 3: Save and press 'r'
- **Save your file** (Ctrl+S)
- Switch to the terminal
- **Press `r`** for hot reload

---

## Hot Reload Commands

When the app is running, you can use these commands in the terminal:

| Key | Command | Description |
|-----|---------|-------------|
| `r` | **Hot Reload** | Apply code changes instantly (preserves state) |
| `R` | **Hot Restart** | Restart app from scratch (resets state) |
| `h` | Help | List all available commands |
| `c` | Clear | Clear the terminal screen |
| `q` | Quit | Stop the app |

---

## Method 1: Using the Batch File ⭐ (Recommended)

```bash
# Simply double-click this file:
run-with-hot-reload.bat
```

**Advantages:**
- One-click setup
- Pre-configured for optimal performance
- Clear command instructions

---

## Method 2: Manual Command Line

### Windows Command Prompt / PowerShell:
```bash
cd C:\Users\Kejay\OneDrive\Desktop\visita-system\mobile-app
flutter run -d chrome
```

### When app is running:
1. Edit any `.dart` file
2. Save the file (Ctrl+S)
3. Switch to terminal
4. Press `r` to hot reload

---

## Method 3: VS Code (Best for Development)

### Setup:
1. Install **Flutter extension** in VS Code
2. Open `mobile-app` folder
3. Open any `.dart` file (e.g., `lib/main.dart`)

### Run with Hot Reload:
1. Press `F5` or click **"Run > Start Debugging"**
2. Choose **"Chrome (web-javascript)"** as target
3. Make code changes and save
4. **Hot reload happens automatically on save!**

### VS Code Shortcuts:
- `Ctrl+F5` - Run without debugging
- `F5` - Run with debugging
- Save file - Auto hot reload
- `Ctrl+Shift+F5` - Hot restart

---

## What Can Be Hot Reloaded?

### ✅ Works with Hot Reload:
- UI changes (widgets, layouts)
- Text and style updates
- Adding/removing widgets
- Changing colors, fonts, sizes
- Updating business logic
- Modifying functions

### ❌ Requires Hot Restart (Press `R`):
- Changes to `main()` function
- Adding new dependencies
- Changing initialization code
- Modifying app state structure
- Adding new assets

---

## Troubleshooting

### Hot reload not working?
1. **Save the file** - Hot reload only works after saving
2. **Press `r` in terminal** - It's not always automatic
3. **Use `R` for hot restart** - If hot reload fails

### Terminal shows no output?
- Make sure you're running in the correct directory
- Check that Flutter is properly installed: `flutter doctor`

### Changes not appearing?
1. Try hot restart (`R`)
2. If still not working, stop (`q`) and restart the app
3. Clear browser cache (Ctrl+Shift+Del)

---

## Development Workflow

### Optimal Hot Reload Workflow:
```
1. Run app → run-with-hot-reload.bat
2. Edit code → Make changes in VS Code
3. Save file → Ctrl+S
4. Hot reload → Press 'r' in terminal
5. Test → Verify changes in browser
6. Repeat → Steps 2-5
```

### When to Hot Restart (R):
- After changing `main()` function
- After adding new packages
- When hot reload doesn't apply changes
- When you want to reset app state

---

## Tips for Faster Development

1. **Keep terminal visible** - Easy access to hot reload commands
2. **Use dual monitors** - Code on one, app on another
3. **Save frequently** - Get instant feedback
4. **Use hot reload (r)** first, hot restart (R) only when needed
5. **Watch the terminal** - Shows reload status and errors

---

## Chrome DevTools Integration

While app is running, you can use Chrome DevTools:

1. Press `F12` in Chrome to open DevTools
2. **Console** - See debug logs and errors
3. **Network** - Monitor API calls
4. **Application** - Check local storage, cookies
5. **Performance** - Profile app performance

---

## Additional Resources

### Flutter Docs:
- [Hot Reload Documentation](https://docs.flutter.dev/development/tools/hot-reload)
- [Debugging Flutter Apps](https://docs.flutter.dev/testing/debugging)

### Keyboard Shortcuts:
- `Ctrl+S` - Save file (triggers hot reload in VS Code)
- `Ctrl+C` - Stop running app (in terminal)
- `F12` - Open Chrome DevTools

---

## Summary

**Hot reload is ALREADY ENABLED by default in Flutter!**

Just:
1. ✅ Run `run-with-hot-reload.bat` (or `flutter run -d chrome`)
2. ✅ Edit your code and save
3. ✅ Press `r` in the terminal
4. ✅ See instant changes!

No configuration needed - it just works! 🚀
