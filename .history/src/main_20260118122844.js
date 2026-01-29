import './js/config.js'
import './js/script.js'
import { initCookieConsent } from './privacy/cookieConsent.js';
initCookieConsent();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
    })
  }
  