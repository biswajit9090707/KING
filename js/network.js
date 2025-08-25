// network.js - shows a small banner when the device is offline/online
(function(){
  function ensureBanner(){
    let el = document.getElementById('offlineBanner');
    if(!el){
      el = document.createElement('div');
      el.id = 'offlineBanner';
      el.className = 'offline-banner';
      el.setAttribute('aria-live','polite');
      el.textContent = 'You are offline. Some features may not work.';
      document.body.appendChild(el);
    }
    return el;
  }
  function show(){ ensureBanner().classList.add('show'); }
  function hide(){ const el = document.getElementById('offlineBanner'); if(el) el.classList.remove('show'); }

  function update(){ navigator.onLine ? hide() : show(); }

  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  document.addEventListener('DOMContentLoaded', update);
})();
