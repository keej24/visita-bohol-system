import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Load debug tools in development
if (import.meta.env.DEV) {
  import('./utils/announcementDebug').then(() => {
    console.log('🛠️ Debug tools loaded. Run debugAnnouncements() to diagnose issues.');
  });
  import('./utils/debugAnnouncements').then(() => {
    console.log('🛠️ Enhanced debug tools loaded. Run debugAnnouncements() for detailed analysis.');
  });
}

createRoot(document.getElementById("root")!).render(<App />);

