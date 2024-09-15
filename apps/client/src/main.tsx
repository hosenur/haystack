import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import '@fontsource/dm-mono/300.css';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
