#!/usr/bin/env node

/**
 * Development environment setup script
 * Sets up the development environment for the VISITA project
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${colors.bright}${colors.blue}=== ${title} ===${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function execCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf-8',
      stdio: 'pipe',
      ...options
    });
    return result.trim();
  } catch (error) {
    if (!options.silent) {
      logError(`Failed to execute: ${command}`);
      if (error.stdout) log(error.stdout);
      if (error.stderr) log(error.stderr, colors.red);
    }
    throw error;
  }
}

function checkPrerequisites() {
  logSection('Checking Prerequisites');
  
  const requirements = [
    { name: 'Node.js', command: 'node --version', minVersion: 'v18.0.0' },
    { name: 'npm', command: 'npm --version', minVersion: '9.0.0' },
    { name: 'Flutter', command: 'flutter --version', optional: true },
    { name: 'Git', command: 'git --version', minVersion: '2.0.0' },
  ];
  
  let allGood = true;
  
  for (const req of requirements) {
    try {
      const version = execCommand(req.command, { silent: true });
      logSuccess(`${req.name}: ${version.split('\n')[0]}`);
    } catch (error) {
      if (req.optional) {
        logWarning(`${req.name}: Not installed (optional)`);
      } else {
        logError(`${req.name}: Not installed or not in PATH`);
        allGood = false;
      }
    }
  }
  
  if (!allGood) {
    logError('Please install missing prerequisites before continuing.');
    process.exit(1);
  }
}

function checkEnvironmentFiles() {
  logSection('Checking Environment Files');
  
  const envFiles = [
    {
      path: 'admin-dashboard/.env',
      example: 'admin-dashboard/.env.example',
      required: true
    }
  ];
  
  for (const envFile of envFiles) {
    if (fs.existsSync(envFile.path)) {
      logSuccess(`${envFile.path} exists`);
    } else if (fs.existsSync(envFile.example)) {
      logWarning(`${envFile.path} missing - copying from ${envFile.example}`);
      fs.copyFileSync(envFile.example, envFile.path);
      logSuccess(`Created ${envFile.path} from template`);
    } else if (envFile.required) {
      logError(`${envFile.path} and ${envFile.example} both missing`);
      logError('Please create environment files with proper Firebase configuration');
    }
  }
}

function installDependencies() {
  logSection('Installing Dependencies');
  
  // Admin Dashboard
  if (fs.existsSync('admin-dashboard/package.json')) {
    log('Installing admin dashboard dependencies...');
    try {
      execCommand('npm install', { cwd: 'admin-dashboard' });
      logSuccess('Admin dashboard dependencies installed');
    } catch (error) {
      logError('Failed to install admin dashboard dependencies');
      throw error;
    }
  }
  
  // Mobile App (Flutter)
  if (fs.existsSync('mobile-app/pubspec.yaml')) {
    log('Installing mobile app dependencies...');
    try {
      execCommand('flutter pub get', { cwd: 'mobile-app' });
      logSuccess('Mobile app dependencies installed');
    } catch (error) {
      logWarning('Failed to install mobile app dependencies (Flutter may not be installed)');
    }
  }
}

function setupGitHooks() {
  logSection('Setting up Git Hooks');
  
  const hooksDir = '.git/hooks';
  
  if (!fs.existsSync(hooksDir)) {
    logWarning('Git hooks directory not found - skipping');
    return;
  }
  
  const preCommitHook = `#!/bin/sh
# Pre-commit hook for VISITA project

echo "Running pre-commit checks..."

# Check if admin-dashboard has changes
if git diff --cached --name-only | grep -q "^admin-dashboard/"; then
  echo "Checking admin dashboard..."
  cd admin-dashboard
  
  # Run linting
  if ! npm run lint; then
    echo "❌ Linting failed in admin-dashboard"
    exit 1
  fi
  
  # Run type checking
  if ! npm run build:dev; then
    echo "❌ Type checking failed in admin-dashboard"
    exit 1
  fi
  
  cd ..
fi

# Check if mobile-app has changes
if git diff --cached --name-only | grep -q "^mobile-app/"; then
  echo "Checking mobile app..."
  cd mobile-app
  
  # Run Flutter analysis
  if command -v flutter >/dev/null 2>&1; then
    if ! flutter analyze; then
      echo "❌ Flutter analysis failed"
      exit 1
    fi
  fi
  
  cd ..
fi

echo "✅ Pre-commit checks passed"
`;
  
  const preCommitPath = path.join(hooksDir, 'pre-commit');
  fs.writeFileSync(preCommitPath, preCommitHook);
  
  // Make executable on Unix systems
  if (process.platform !== 'win32') {
    fs.chmodSync(preCommitPath, '755');
  }
  
  logSuccess('Git pre-commit hook installed');
}

function createDevScripts() {
  logSection('Creating Development Scripts');
  
  const scriptsDir = 'scripts';
  if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir);
  }
  
  // Development server script
  const devServerScript = `#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting VISITA development servers...');

// Start admin dashboard
const adminDashboard = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, '..', 'admin-dashboard'),
  stdio: 'inherit',
  shell: true
});

adminDashboard.on('error', (error) => {
  console.error('Failed to start admin dashboard:', error);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down development servers...');
  adminDashboard.kill('SIGINT');
  process.exit(0);
});

console.log('✅ Development servers started!');
console.log('📊 Admin Dashboard: http://localhost:8080');
console.log('');
console.log('Press Ctrl+C to stop all servers');
`;
  
  fs.writeFileSync(path.join(scriptsDir, 'dev-server.js'), devServerScript);
  
  // Build script
  const buildScript = `#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

function executeCommand(command, cwd) {
  console.log(\`Executing: \${command}\`);
  try {
    execSync(command, { 
      cwd: cwd, 
      stdio: 'inherit',
      encoding: 'utf-8'
    });
  } catch (error) {
    console.error(\`❌ Command failed: \${command}\`);
    process.exit(1);
  }
}

console.log('🏗️ Building VISITA project...');

// Build admin dashboard
console.log('\\n📊 Building admin dashboard...');
executeCommand('npm run build', path.join(__dirname, '..', 'admin-dashboard'));

// Build mobile app (if Flutter is available)
if (process.argv.includes('--mobile')) {
  console.log('\\n📱 Building mobile app...');
  try {
    executeCommand('flutter build apk --release', path.join(__dirname, '..', 'mobile-app'));
  } catch (error) {
    console.warn('⚠️ Mobile app build skipped (Flutter not available)');
  }
}

console.log('\\n✅ Build completed successfully!');
`;
  
  fs.writeFileSync(path.join(scriptsDir, 'build.js'), buildScript);
  
  // Make scripts executable on Unix systems
  if (process.platform !== 'win32') {
    fs.chmodSync(path.join(scriptsDir, 'dev-server.js'), '755');
    fs.chmodSync(path.join(scriptsDir, 'build.js'), '755');
  }
  
  logSuccess('Development scripts created');
}

function updatePackageJsonScripts() {
  logSection('Updating Package Scripts');
  
  // Update admin dashboard package.json
  const adminPackageJsonPath = 'admin-dashboard/package.json';
  if (fs.existsSync(adminPackageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(adminPackageJsonPath, 'utf-8'));
    
    packageJson.scripts = {
      ...packageJson.scripts,
      'dev:setup': 'node ../scripts/setup-dev.js',
      'dev:server': 'node ../scripts/dev-server.js',
      'build:all': 'node ../scripts/build.js',
      'build:mobile': 'node ../scripts/build.js --mobile',
      'check': 'npm run lint && npm run build:dev',
      'clean': 'rm -rf dist node_modules/.vite',
      'reset': 'rm -rf node_modules package-lock.json && npm install'
    };
    
    fs.writeFileSync(adminPackageJsonPath, JSON.stringify(packageJson, null, 2));
    logSuccess('Updated admin dashboard scripts');
  }
}

function createVSCodeConfig() {
  logSection('Creating VS Code Configuration');
  
  const vscodeDir = '.vscode';
  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir);
  }
  
  // Settings
  const settings = {
    "typescript.preferences.importModuleSpecifier": "relative",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": true
    },
    "files.exclude": {
      "**/node_modules": true,
      "**/dist": true,
      "**/.git": true,
      "**/build": true
    },
    "search.exclude": {
      "**/node_modules": true,
      "**/dist": true,
      "**/build": true
    },
    "emmet.includeLanguages": {
      "typescript": "typescriptreact",
      "javascript": "javascriptreact"
    },
    "[dart]": {
      "editor.formatOnSave": true,
      "editor.rulers": [80]
    }
  };
  
  fs.writeFileSync(
    path.join(vscodeDir, 'settings.json'),
    JSON.stringify(settings, null, 2)
  );
  
  // Extensions recommendations
  const extensions = {
    "recommendations": [
      "ms-vscode.vscode-typescript-next",
      "bradlc.vscode-tailwindcss",
      "esbenp.prettier-vscode",
      "ms-vscode.vscode-eslint",
      "dart-code.flutter",
      "dart-code.dart-code",
      "ms-vscode.vscode-json",
      "redhat.vscode-yaml",
      "ms-vscode.hexeditor"
    ]
  };
  
  fs.writeFileSync(
    path.join(vscodeDir, 'extensions.json'),
    JSON.stringify(extensions, null, 2)
  );
  
  // Launch configuration
  const launch = {
    "version": "0.2.0",
    "configurations": [
      {
        "name": "Launch Admin Dashboard",
        "type": "node",
        "request": "launch",
        "program": "${workspaceFolder}/admin-dashboard/node_modules/.bin/vite",
        "args": ["dev"],
        "cwd": "${workspaceFolder}/admin-dashboard",
        "console": "integratedTerminal"
      },
      {
        "name": "Launch Flutter App",
        "request": "launch",
        "type": "dart",
        "program": "mobile-app/lib/main.dart"
      }
    ]
  };
  
  fs.writeFileSync(
    path.join(vscodeDir, 'launch.json'),
    JSON.stringify(launch, null, 2)
  );
  
  logSuccess('VS Code configuration created');
}

function displayFinalInstructions() {
  logSection('Setup Complete!');
  
  log(`${colors.green}✅ Development environment setup completed successfully!${colors.reset}`);
  log('');
  log(`${colors.bright}Next steps:${colors.reset}`);
  log('1. Configure your Firebase credentials in admin-dashboard/.env');
  log('2. Start development server: npm run dev:server');
  log('3. Open http://localhost:8080 for admin dashboard');
  log('');
  log(`${colors.bright}Available scripts:${colors.reset}`);
  log('• npm run dev:server  - Start development server');
  log('• npm run build:all   - Build all applications');
  log('• npm run check       - Run linting and type checking');
  log('• npm run clean       - Clean build artifacts');
  log('');
  log(`${colors.bright}Development tools:${colors.reset}`);
  log('• VS Code settings configured with recommended extensions');
  log('• Git pre-commit hooks installed for code quality');
  log('• Development scripts in ./scripts/ directory');
  log('');
  log(`${colors.cyan}Happy coding! 🚀${colors.reset}`);
}

async function main() {
  try {
    log(`${colors.bright}${colors.magenta}VISITA Development Environment Setup${colors.reset}`);
    log('');
    
    checkPrerequisites();
    checkEnvironmentFiles();
    installDependencies();
    setupGitHooks();
    createDevScripts();
    updatePackageJsonScripts();
    createVSCodeConfig();
    displayFinalInstructions();
    
  } catch (error) {
    logError('Setup failed!');
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };