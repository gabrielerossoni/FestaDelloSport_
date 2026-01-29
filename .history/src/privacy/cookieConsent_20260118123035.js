export function initCookieConsent() {
  document.addEventListener("DOMContentLoaded", function () {
    const banner = document.getElementById('cookie-banner');
    const acceptBtn = document.getElementById('accept-cookies');
    const declineBtn = document.getElementById('decline-cookies');

    if (!localStorage.getItem('cookie-consent')) {
      banner.classList.remove('hidden');
    }

    acceptBtn.addEventListener('click', () => {
      localStorage.setItem('cookie-consent', 'accepted');
      banner.classList.add('hidden');
    });

    declineBtn.addEventListener('click', () => {
      localStorage.setItem('cookie-consent', 'declined');
      banner.classList.add('hidden');
    });
  });
}