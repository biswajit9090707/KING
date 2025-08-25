// login.js - Google Sign-In with Firebase Auth (compat)
(function () {
  function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }

  function bindGoogle() {
    const btn = document.getElementById('googleLoginBtn');
    const msg = document.getElementById('loginMsg');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
        msg.textContent = 'Login successful! Redirecting...';
        const redirect = getQueryParam('redirect') || 'index.html';
        window.location.href = redirect;
      } catch (err) {
        console.error('Google login error (popup). Trying redirect...', err);
        // Fallback to redirect in environments where popups are blocked or unsupported
        const code = err && err.code ? String(err.code) : '';
        if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
          try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await auth.signInWithRedirect(provider);
            msg.textContent = 'Redirecting to Google...';
          } catch (e2) {
            console.error('Google redirect error:', e2);
            msg.textContent = 'Login failed. Please try again.';
          }
        } else {
          msg.textContent = 'Login failed. Please try again.';
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase === 'undefined') return;
    // Ensure session persists
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(()=>{});
    // If returning from redirect flow, handle result
    auth.getRedirectResult()
      .then((result) => {
        if (result && result.user) {
          const redirect = getQueryParam('redirect') || 'index.html';
          window.location.href = redirect;
        }
      })
      .catch((e) => console.warn('getRedirectResult error:', e))
      .finally(() => {
        bindGoogle();
      });
  });
})();
