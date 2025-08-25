// product.js - renders a single product page with an image gallery

(function () {
  function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }

  // INR currency formatter used across the product page
  function currencyINR(n){
    try{
      return new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:2 }).format(Number(n||0));
    }catch(_){
      return `₹${(Number(n||0)).toFixed(2)}`;
    }
  }

  // Render a skeleton UI while loading the product
  function renderProductSkeleton() {
    const container = document.getElementById('productContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="product-view">
        <div class="gallery">
          <div class="main-image">
            <div class="skeleton-box" style="width:100%;aspect-ratio:4/5;border-radius:8px;"></div>
          </div>
          <div class="thumbnails" id="thumbs">
            <div class="skeleton-box" style="width:100%;aspect-ratio:1/1;border-radius:6px;"></div>
            <div class="skeleton-box" style="width:100%;aspect-ratio:1/1;border-radius:6px;"></div>
            <div class="skeleton-box" style="width:100%;aspect-ratio:1/1;border-radius:6px;"></div>
            <div class="skeleton-box" style="width:100%;aspect-ratio:1/1;border-radius:6px;"></div>
          </div>
        </div>
        <div class="details">
          <div class="skeleton-line skeleton-line-lg"></div>
          <div class="skeleton-line skeleton-line-md"></div>
          <div class="skeleton-line skeleton-line-sm"></div>
          <div class="skeleton-line skeleton-line-md"></div>
          <div class="skeleton-line skeleton-line-sm"></div>
        </div>
      </div>
    `;
  }

  function renderProduct(product, id) {
    const container = document.getElementById('productContainer');
    if (!container) return;

    const images = Array.isArray(product.imageUrls) && product.imageUrls.length > 0
      ? product.imageUrls
      : (product.imageUrl ? [product.imageUrl] : []);

    const placeholder = 'https://via.placeholder.com/800x1000?text=No+Image';
    const cover = images[0] || placeholder;

    container.innerHTML = `
      <div class="product-view">
        <div class="gallery">
          <div class="main-image">
            <img id="mainImage" src="${cover}" alt="${product.title || 'Poster'}" width="800" height="1000" decoding="async" fetchpriority="high" onerror="this.onerror=null;this.src='${placeholder}';">
          </div>
          <div class="thumbnails" id="thumbs">
            ${
              (images.length ? images : [placeholder]).map((src, i) => `
                <img src="${src}" alt="thumb ${i+1}" class="thumb ${i===0 ? 'active' : ''}" data-index="${i}" width="120" height="120" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${placeholder}';">
              `).join('')
            }
          </div>
        </div>
        <div class="details">
          <h1>${product.title || 'Untitled Poster'}</h1>
          <p class="price">${currencyINR(product.price)}</p>
          <p class="meta"><strong>Size:</strong> ${product.size || 'N/A'}</p>
          <p class="meta ${product.stock > 0 ? 'in' : 'out'}">${product.stock > 0 ? 'In Stock' : 'Out of Stock'}</p>
          <div class="actions">
            <button id="buyNowBtn" class="btn-primary" ${product.stock > 0 ? '' : 'disabled'}>Buy Now</button>
          </div>
        </div>
      </div>
    `;

    // Hook up thumbnails
    const mainImage = document.getElementById('mainImage');
    const thumbs = document.getElementById('thumbs');
    if (thumbs) {
      thumbs.addEventListener('click', (e) => {
        const t = e.target;
        if (t && t.classList.contains('thumb')) {
          const idx = parseInt(t.dataset.index, 10);
          if (!isNaN(idx) && images[idx]) {
            mainImage.src = images[idx];
            thumbs.querySelectorAll('.thumb').forEach(el => el.classList.remove('active'));
            t.classList.add('active');
          }
        }
      });
    }

    // Buy Now click: persist selection and go to billing page
    const buyNow = document.getElementById('buyNowBtn');
    if (buyNow) {
      buyNow.addEventListener('click', () => {
        const selectedImage = mainImage && mainImage.src ? mainImage.src : (images[0] || '');
        const checkoutItem = {
          id,
          title: product.title || 'Untitled Poster',
          price: Number(product.price || 0),
          size: product.size || 'N/A',
          image: selectedImage,
          createdAt: Date.now()
        };
        try {
          localStorage.setItem('checkoutItem', JSON.stringify(checkoutItem));
        } catch (e) {}
        window.location.href = 'billing.html';
      });
    }
  }

  function loadProduct() {
    const id = getQueryParam('id');
    const container = document.getElementById('productContainer');
    if (!id) {
      if (container) container.innerHTML = '<p class="error">No product specified.</p>';
      return;
    }

    // Show skeleton while fetching
    renderProductSkeleton();

    // Fetch product by ID
    const safeRenderError = (msg)=>{
      if (container) container.innerHTML = `<p class="error">${msg}</p>`;
    };
    if (typeof db === 'undefined' || !db || !db.collection) {
      console.error('Firestore not initialized on product page.');
      safeRenderError('App not connected. Please refresh the page.');
      return;
    }

    const tryFetch = (attempt=1)=>{
      db.collection('products').doc(id).get()
        .then((doc) => {
          if (!doc.exists) {
            safeRenderError('Product not found.');
            return;
          }
          renderProduct(doc.data(), doc.id);
        })
        .catch((error) => {
          console.error('Error loading product (attempt ' + attempt + '):', error);
          const perm = (error && error.code === 'permission-denied') ? ' (permission denied - check Firestore rules)' : '';
          const offline = (typeof navigator !== 'undefined' && navigator && navigator.onLine === false) ? ' You appear to be offline.' : '';
          if (attempt < 2) {
            setTimeout(()=> tryFetch(attempt+1), 350);
          } else {
            safeRenderError('Error loading product. Please try again later.' + offline + perm);
          }
        });
    };
    tryFetch();
  }

  document.addEventListener('DOMContentLoaded', loadProduct);
})();
