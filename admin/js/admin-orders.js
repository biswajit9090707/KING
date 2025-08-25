// admin-orders.js - list all orders for admin with status updates
(function(){
  function fmt(ts){ try{ if(ts && ts.toDate) return ts.toDate().toLocaleString(); }catch(_){} return ''; }
  function currency(n){
    try{
      return new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:2 }).format(Number(n||0));
    }catch(_){
      return `₹${(Number(n||0)).toFixed(2)}`;
    }
  }
  const STATUSES = ['pending','processing','shipping','delivered','cancelled'];

  function renderRows(tbody, docs){
    if(!docs.length){
      tbody.innerHTML = '<tr><td colspan="10" class="muted">No orders found.</td></tr>';
      return;
    }
    const frag = document.createDocumentFragment();
    docs.forEach(d=>{
      const o = d.data();
      const current = (o.status || 'pending');
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fmt(o.createdAt)}</td>
        <td>${d.id}</td>
        <td>${o.customer?.name || ''}</td>
        <td>${o.customer?.phone || o.userPhone || ''}</td>
        <td>${o.title || ''}</td>
        <td>${o.quantity || 1}</td>
        <td>${currency(o.total || 0)}</td>
        <td><span class="status">${current}</span></td>
        <td>
          <select data-id="${d.id}" class="status-select" style="padding:.3rem .4rem; border:1px solid #e5e7eb; border-radius:6px;">
            ${STATUSES.map(s=>`<option value="${s}" ${s===current?'selected':''}>${s}</option>`).join('')}
          </select>
        </td>
      `;
      // attach order data for modal
      tr.dataset.orderId = d.id;
      tr.__order = o;
      frag.appendChild(tr);
    });
    tbody.innerHTML='';
    tbody.appendChild(frag);

    // bind row click -> open details modal
    const modal = document.getElementById('orderDetailModal');
    const modalBody = document.getElementById('orderDetailContent');
    const modalTitle = document.getElementById('detailTitle');
    const closeBtn = document.getElementById('detailClose');
    function openModal(orderId, o){
      if(!modal || !modalBody) return;
      modalTitle && (modalTitle.textContent = `Order ${orderId}`);
      const img = (o.image || (Array.isArray(o.imageUrls) && o.imageUrls[0]) || '');
      modalBody.innerHTML = `
        <div>
          <img class="thumb" src="${img}" alt="${o.title || ''}" onerror="this.style.display='none'"/>
        </div>
        <div>
          <div class="kv"><b>Title:</b> ${o.title || ''}</div>
          <div class="kv"><b>Quantity:</b> ${o.quantity || 1}</div>
          <div class="kv"><b>Price:</b> ${currency(o.price || 0)}</div>
          <div class="kv"><b>Total:</b> ${currency(o.total || 0)}</div>
          <div class="kv"><b>Status:</b> ${o.status || 'pending'}</div>
          <div class="kv"><b>Size:</b> ${o.size || ''}</div>
          <div class="kv"><b>Created:</b> ${fmt(o.createdAt)}</div>
          <hr style="margin:.5rem 0; border:none; border-top:1px solid #eee;"/>
          <div class="kv"><b>Customer:</b> ${o.customer?.name || ''}</div>
          <div class="kv"><b>Email:</b> ${o.customer?.email || o.userEmail || ''}</div>
          <div class="kv"><b>Phone:</b> ${o.customer?.phone || o.userPhone || ''}</div>
          <div class="kv"><b>Address:</b> ${o.customer?.address || ''}</div>
          <div class="kv"><b>City:</b> ${o.customer?.city || ''}</div>
          <div class="kv"><b>ZIP:</b> ${o.customer?.zip || ''}</div>
        </div>
      `;
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden','false');
    }
    function closeModal(){
      if(!modal) return;
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden','true');
    }
    closeBtn && closeBtn.addEventListener('click', closeModal);
    modal && modal.addEventListener('click', (e)=>{ if(e.target === modal) closeModal(); });

    Array.from(tbody.querySelectorAll('tr')).forEach(tr=>{
      tr.addEventListener('click', (e)=>{
        // ignore clicks on selects
        if(e.target && (e.target.tagName === 'SELECT' || e.target.closest('select'))){ return; }
        const o = tr.__order; const id = tr.dataset.orderId; if(o && id) openModal(id,o);
      });
    });

    // bind change handlers for status select
    tbody.querySelectorAll('.status-select').forEach(sel=>{
      sel.addEventListener('click', (e)=> e.stopPropagation());
      sel.addEventListener('change', async (e)=>{
        const orderId = sel.getAttribute('data-id');
        const value = sel.value;
        sel.disabled = true;
        try{
          await db.collection('orders').doc(orderId).update({
            status: value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
        }catch(err){
          console.error('Failed to update status', err);
          alert('Failed to update status. Check rules/connection.');
          // revert UI
          const opt = Array.from(sel.options).find(o=>o.defaultSelected);
          if(opt) sel.value = opt.value;
        }finally{
          sel.disabled = false;
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', async ()=>{
    const tbody = document.getElementById('ordersBody');
    const countEl = document.getElementById('count');
    try{
      // real-time listener
      db.collection('orders').orderBy('createdAt','desc').onSnapshot((snap)=>{
        renderRows(tbody, snap.docs);
        if(countEl) countEl.textContent = `${snap.size} orders`;
      }, (err)=>{
        console.error('Admin orders realtime error:', err);
        tbody.innerHTML = '<tr><td colspan="10" class="muted">Failed to load orders.</td></tr>';
      });
    }catch(err){
      console.error('Admin load orders error:', err);
      tbody.innerHTML = '<tr><td colspan="10" class="muted">Failed to load orders.</td></tr>';
    }
  });
})();
