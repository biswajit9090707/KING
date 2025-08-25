// user-orders.js - lists current user's orders
(function(){
  function fmt(ts){
    try{ if(ts && ts.toDate) return ts.toDate().toLocaleString(); }catch(_){}
    return '';
  }
  function currency(n){
    try{
      return new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:2 }).format(Number(n||0));
    }catch(_){
      return `₹${(Number(n||0)).toFixed(2)}`;
    }
  }

  function renderOrders(listEl, docs){
    if(!docs.length){
      listEl.innerHTML = '<p class="meta">No orders yet.</p>';
      return;
    }
    const frag = document.createDocumentFragment();
    docs.forEach(d=>{
      const o = d.data();
      const card = document.createElement('div');
      card.className = 'order-card';
      card.innerHTML = `
        <img src="${o.image || ''}" alt="${o.title || ''}" style="width:110px;height:130px;object-fit:cover;border-radius:8px;" onerror="this.style.display='none'"/>
        <div>
          <div style="display:flex; gap:.5rem; align-items:center;">
            <h3 style="margin:0;">${o.title || 'Poster'}</h3>
            <span class="badge">${o.status || 'paid'}</span>
          </div>
          <div class="order-meta">${fmt(o.createdAt)}</div>
          <div class="order-meta">Qty: ${o.quantity || 1} • Size: ${o.size || 'N/A'}</div>
        </div>
        <div class="order-price"><strong>${currency(o.total || 0)}</strong></div>
      `;
      frag.appendChild(card);
    });
    listEl.innerHTML = '';
    listEl.appendChild(frag);
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    const listEl = document.getElementById('ordersList');
    if(typeof auth === 'undefined'){
      window.location.href = 'login.html?redirect=user-orders.html';
      return;
    }
    auth.onAuthStateChanged(async (user)=>{
      if(!user){
        window.location.href = 'login.html?redirect=user-orders.html';
        return;
      }
      try{
        const snap = await db.collection('orders')
          .where('userId','==', user.uid)
          .get();
        // sort client-side by createdAt desc to avoid composite index requirement
        const docs = snap.docs.sort((a,b)=>{
          const ta = a.data().createdAt?.toMillis?.() || 0;
          const tb = b.data().createdAt?.toMillis?.() || 0;
          return tb - ta;
        });
        renderOrders(listEl, docs);
      }catch(err){
        console.error('Load orders error:', err);
        const hint = (err && err.code === 'permission-denied')
          ? ' (permission denied - check Firestore rules)'
          : (err && err.message && err.message.includes('index'))
            ? ' (requires index - open console link to create)'
            : '';
        listEl.innerHTML = `<p class="error">Failed to load orders${hint}.</p>`;
      }
    });
  });
})();
