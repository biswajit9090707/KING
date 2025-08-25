// billing.js - handles checkout summary, form submit, order creation, and success animation
(function () {
  function getCheckoutItem() {
    try {
      const raw = localStorage.getItem('checkoutItem');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function currency(n) {
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n || 0));
    } catch (_) {
      return `₹${(Number(n || 0)).toFixed(2)}`;
    }
  }

  function renderSummary() {
    const item = getCheckoutItem();
    const wrap = document.getElementById('summaryContent');
    if (!wrap) return null;

    if (!item) {
      wrap.innerHTML = '<p class="error">No item to checkout. <a href="index.html">Go back</a>.</p>';
      return null;
    }

    const subtotal = item.price;
    const quantity = 1;
    const total = subtotal * quantity;

    wrap.innerHTML = `
      <div style="display:grid; grid-template-columns: 120px 1fr; gap: 1rem; align-items:center;">
        <img src="${item.image}" alt="${item.title}" style="width:120px; height:150px; object-fit:cover; border-radius:8px;" onerror="this.style.display='none'"/>
        <div>
          <h3 style="margin:0 0 .25rem 0;">${item.title}</h3>
          <p style="margin:0; color:#7f8c8d;">Size: ${item.size}</p>
          <p style="margin:.25rem 0 0 0; font-weight:600;">${currency(item.price)}</p>
        </div>
      </div>
      <hr style="margin:1rem 0; border:none; border-top:1px solid #eee;" />
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span>Subtotal</span>
        <strong>${currency(subtotal)}</strong>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:.25rem;">
        <span>Quantity</span>
        <strong id="summaryQty">${quantity}</strong>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:.25rem;">
        <span>Total</span>
        <strong id="summaryTotal">${currency(total)}</strong>
      </div>
    `;

    return item;
  }

  function bindQuantitySync(item) {
    const form = document.getElementById('billingForm');
    if (!form) return;
    const qtyInput = form.querySelector('input[name="quantity"]');
    const qtyEl = document.getElementById('summaryQty');
    const totalEl = document.getElementById('summaryTotal');
    if (!qtyInput || !qtyEl || !totalEl) return;

    const recalc = () => {
      const q = Math.max(1, Number(qtyInput.value || 1));
      qtyInput.value = q;
      qtyEl.textContent = q;
      totalEl.textContent = currency(q * Number(item.price || 0));
    };
    qtyInput.addEventListener('input', recalc);
  }

  // Auto-detect City/State from Indian PIN code
  function setupZipAutoFill(){
    const form = document.getElementById('billingForm');
    if(!form) return;
    const zipInput = form.querySelector('input[name="zip"]');
    const cityInput = form.querySelector('input[name="city"]');
    const stateInput = form.querySelector('input[name="state"]');
    if(!zipInput || !cityInput || !stateInput) return;

    let debounceTimer = null;
    async function lookup(pin){
      if(!/^\d{6}$/.test(pin)) return;
      try{
        cityInput.setAttribute('placeholder','Detecting...');
        stateInput.setAttribute('placeholder','Detecting...');
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if(Array.isArray(data) && data[0] && data[0].Status === 'Success' && Array.isArray(data[0].PostOffice) && data[0].PostOffice[0]){
          const po = data[0].PostOffice[0];
          const city = po.District || po.Block || po.Division || po.Name || '';
          const state = po.State || '';
          if(city) cityInput.value = city;
          if(state) stateInput.value = state;
        }
      }catch(e){
        // silently ignore; user can type manually
        console.warn('PIN lookup failed', e);
      }finally{
        cityInput.setAttribute('placeholder','City');
        stateInput.setAttribute('placeholder','State');
      }
    }
    function onChange(){
      const pin = (zipInput.value || '').trim();
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(()=> lookup(pin), 350);
    }
    zipInput.addEventListener('input', onChange);
    zipInput.addEventListener('blur', ()=> lookup((zipInput.value||'').trim()));
  }

  function submitHandler(item) {
    const form = document.getElementById('billingForm');
    const modal = document.getElementById('successModal');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      // Ensure Firestore is ready
      if (typeof firebase === 'undefined' || !firebase.apps?.length) {
        console.error('Firebase app not initialized.');
        alert('App not connected. Please refresh the page.');
        return;
      }
      if (typeof db === 'undefined' || !db || !db.collection) {
        console.error('Firestore (db) is not available.');
        alert('Database not available. Please refresh the page.');
        return;
      }
      const data = new FormData(form);
      const order = {
        productId: item.id,
        title: item.title,
        price: Number(item.price || 0),
        size: item.size,
        image: item.image || '',
        quantity: Math.max(1, Number(data.get('quantity') || 1)),
        total: 0, // calculate after
        customer: {
          name: (data.get('name') || '').toString().trim(),
          email: (data.get('email') || '').toString().trim(),
          phone: (data.get('phone') || '').toString().trim(),
          address: (data.get('address') || '').toString().trim(),
          city: (data.get('city') || '').toString().trim(),
          state: (data.get('state') || '').toString().trim(),
          zip: (data.get('zip') || '').toString().trim(),
        },
        status: 'paid',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      order.total = order.quantity * order.price;

      // Basic front-end validation
      if (!order.customer.name || !order.customer.email || !order.customer.address || !order.customer.city || !order.customer.state || !order.customer.zip) {
        alert('Please fill all required fields.');
        return;
      }

      // Disable button while processing
      const btn = document.getElementById('payBtn');
      if (btn) { btn.disabled = true; btn.textContent = 'Processing...'; }

      try {
        console.log('Placing order...', order);
        const ref = await db.collection('orders').add(order);
        console.log('Order saved with id:', ref.id);
        // show success modal & animation
        if (modal) {
          modal.setAttribute('aria-hidden', 'false');
          modal.classList.add('open');
          const h2 = modal.querySelector('h2');
          if (h2) h2.textContent = 'Order Successful';
          const p = modal.querySelector('p');
          if (p) p.textContent = `Your order ID is ${ref.id}`;
        }
        // clear checkout storage
        try { localStorage.removeItem('checkoutItem'); } catch (_) {}
      } catch (err) {
        console.error('Order error:', err);
        alert('Failed to place order. Please try again.');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Pay Now'; }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const item = renderSummary();
    // Wait for auth state. If not logged in, redirect to login with redirect back to billing.
    if (typeof auth === 'undefined') {
      // If auth not initialized, still allow attempt but warn
      console.warn('Auth not available; redirecting to login');
      window.location.href = 'login.html?redirect=billing.html';
      return;
    }
    auth.onAuthStateChanged((user) => {
      if (!user) {
        window.location.href = 'login.html?redirect=billing.html';
        return;
      }
      // augment submit handler to include user info
      const originalSubmitHandler = submitHandler;
      submitHandler = function(itemWithUser) {
        const form = document.getElementById('billingForm');
        const modal = document.getElementById('successModal');
        if (!form) return;
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          if (typeof db === 'undefined' || !db) {
            alert('Database not available. Please refresh.');
            return;
          }
          const data = new FormData(form);
          const order = {
            productId: itemWithUser.id,
            title: itemWithUser.title,
            price: Number(itemWithUser.price || 0),
            size: itemWithUser.size,
            image: itemWithUser.image || '',
            quantity: Math.max(1, Number(data.get('quantity') || 1)),
            total: 0,
            customer: {
              name: (data.get('name') || '').toString().trim(),
              email: (data.get('email') || '').toString().trim(),
              phone: (data.get('phone') || '').toString().trim(),
              address: (data.get('address') || '').toString().trim(),
              city: (data.get('city') || '').toString().trim(),
              state: (data.get('state') || '').toString().trim(),
              zip: (data.get('zip') || '').toString().trim(),
            },
            userId: user.uid,
            userPhone: user.phoneNumber || '',
            userEmail: user.email || '',
            status: 'paid',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          };
          order.total = order.quantity * order.price;

          if (!order.customer.name || !order.customer.email || !order.customer.address || !order.customer.city || !order.customer.state || !order.customer.zip) {
            alert('Please fill all required fields.');
            return;
          }

          const btn = document.getElementById('payBtn');
          if (btn) { btn.disabled = true; btn.textContent = 'Processing...'; }
          try {
            const ref = await db.collection('orders').add(order);
            if (modal) {
              modal.setAttribute('aria-hidden', 'false');
              modal.classList.add('open');
              const p = modal.querySelector('p');
              if (p) p.textContent = `Your order ID is ${ref.id}`;
            }
            try { localStorage.removeItem('checkoutItem'); } catch (_) {}
          } catch (err) {
            console.error('Order error:', err);
            alert('Failed to place order. Please try again.');
          } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Pay Now'; }
          }
        });
      }
      if (item) {
        bindQuantitySync(item);
        submitHandler(item);
        setupZipAutoFill();
      }
    });
  });
})();
