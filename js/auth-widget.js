// auth-widget.js - renders a Profile tab in the header on index.html
(function(){
  function el(html){ const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }

  function renderSignedOut(host){
    host.innerHTML = '';
    const btn = el('<a href="login.html" class="btn-primary" style="padding:.4rem .7rem; border-radius:6px;">Login</a>');
    host.appendChild(btn);
  }

  function renderSignedIn(host, user){
    const name = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
    const email = user.email || '';
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=EDF2F7&color=111827&size=64&bold=true`;
    const photo = user.photoURL || fallback;

    host.innerHTML = '';
    const wrap = el(`
      <div class="auth-menu" style="position:relative;">
        <button id="authMenuBtn" style="display:flex;align-items:center;gap:.5rem;background:#ffffff;border:1px solid #e5e7eb;padding:.4rem .7rem;border-radius:999px;cursor:pointer; box-shadow:0 2px 10px rgba(0,0,0,.06);">
          <img src="${photo}" alt="avatar" referrerpolicy="no-referrer" style="width:28px;height:28px;border-radius:50%;object-fit:cover;" onerror="this.onerror=null; this.src='${fallback}';"/>
          <span style="max-width:160px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#111827;">${name}</span>
          <i class="fa fa-caret-down" aria-hidden="true" style="color:#6b7280;"></i>
        </button>
        <div id="authDropdown" style="position:absolute;right:0;top:110%;background:#ffffff;border:1px solid #e5e7eb;box-shadow:0 12px 28px rgba(0,0,0,.12);border-radius:10px;min-width:240px;display:none;z-index:50; overflow:hidden;">
          <div style="padding:.75rem .85rem;border-bottom:1px solid #f3f4f6;background:#fafafa;">
            <div style="font-weight:700; color:#111827;">${name}</div>
            <div style="color:#6b7280;font-size:.85rem;">${email}</div>
          </div>
          <a href="user-orders.html" style="display:block;padding:.7rem .85rem;text-decoration:none;color:#111827;">My Orders</a>
          <button id="logoutBtn" style="display:block;width:100%;text-align:left;padding:.7rem .85rem;background:#fff;border:0;cursor:pointer;color:#ef4444;">Logout</button>
        </div>
      </div>
    `);
    host.appendChild(wrap);

    const btn = wrap.querySelector('#authMenuBtn');
    const dd = wrap.querySelector('#authDropdown');
    btn.addEventListener('click', ()=>{
      dd.style.display = dd.style.display === 'none' || dd.style.display === '' ? 'block' : 'none';
    });
    document.addEventListener('click', (e)=>{
      if(!wrap.contains(e.target)) dd.style.display = 'none';
    });
    wrap.querySelector('#logoutBtn').addEventListener('click', async ()=>{
      try{ await auth.signOut(); }catch(e){ console.warn('signOut error', e); }
      window.location.href = 'index.html';
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    const host = document.getElementById('authWidget');
    if(!host || typeof auth === 'undefined') return;
    auth.onAuthStateChanged((user)=>{
      if(user) renderSignedIn(host, user); else renderSignedOut(host);
    });
  });
})();
