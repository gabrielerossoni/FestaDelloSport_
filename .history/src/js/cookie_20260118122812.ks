export function initCookieConsent() {
  if (localStorage.getItem('cookieConsent')) return;

  const banner = document.createElement('div');
  banner.innerHTML = `
    <div class="cookie-banner">
      Questo sito usa cookie tecnici.
      <button id="accept">OK</button>
    </div>
  `;

  document.body.appendChild(banner);

  document.getElementById('accept').onclick = () => {
    localStorage.setItem('cookieConsent', 'true');
    banner.remove();
  };
}
