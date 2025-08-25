// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Mobile nav toggle
    const toggle = document.querySelector('.menu-toggle');
    const links = document.getElementById('navLinks');
    if (toggle && links) {
        toggle.addEventListener('click', () => {
            const isOpen = links.classList.toggle('open');
            toggle.setAttribute('aria-expanded', String(isOpen));
        });
        // Close menu when a link is clicked (mobile UX)
        links.addEventListener('click', (e) => {
            if (e.target.tagName === 'A' && links.classList.contains('open')) {
                links.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    loadProducts();
});

function currencyINR(n){
    try{
        return new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:2 }).format(Number(n||0));
    }catch(_){
        return `₹${(Number(n||0)).toFixed(2)}`;
    }
}

// Render skeleton placeholders
function renderSkeletons(container, count = 6) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
        const card = document.createElement('div');
        card.className = 'product-card skeleton-card';
        card.innerHTML = `
            <div class="product-image skeleton-box"></div>
            <div class="product-info">
                <div class="skeleton-line skeleton-line-lg"></div>
                <div class="skeleton-line skeleton-line-md"></div>
                <div class="skeleton-line skeleton-line-sm"></div>
            </div>
        `;
        frag.appendChild(card);
    }
    container.innerHTML = '';
    container.appendChild(frag);
}

// Function to load products from Firestore
function loadProducts() {
    const productGrid = document.getElementById('productGrid');
    
    // Show skeletons while loading
    renderSkeletons(productGrid, 6);
    
    // Get a limited set of products from Firestore to avoid heavy initial loads
    db.collection("products").limit(24).get().then((querySnapshot) => {
        productGrid.innerHTML = ''; // Clear loading message

        if (querySnapshot.empty) {
            productGrid.innerHTML = '<p>No products available at the moment.</p>';
            return;
        }

        const frag = document.createDocumentFragment();
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const id = doc.id;
            const cover = (Array.isArray(product.imageUrls) && product.imageUrls.length > 0)
                ? product.imageUrls[0]
                : (product.imageUrl || 'https://via.placeholder.com/300x400?text=No+Image');

            // Create product card (wrapped in link)
            const link = document.createElement('a');
            link.href = `product.html?id=${encodeURIComponent(id)}`;
            link.className = 'product-link';

            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <div class="product-image">
                    <img src="${cover}"
                         alt="${(product.title || 'Poster').replace(/"/g, '&quot;')}"
                         referrerpolicy="no-referrer"
                         loading="lazy" decoding="async" fetchpriority="low"
                         width="300" height="400"
                         onerror="this.onerror=null;this.src='https://via.placeholder.com/300x400?text=No+Image';" />
                </div>
                <div class="product-info">
                    <h3>${product.title || 'Untitled Product'}</h3>
                    <p class="price">${currencyINR(product.price)}</p>
                    <p class="size">Size: ${product.size || 'N/A'}</p>
                    <p class="stock">${(product.stock > 0) ? 'In Stock' : 'Out of Stock'}</p>
                </div>
            `;

            link.appendChild(productCard);
            frag.appendChild(link);
        });
        productGrid.appendChild(frag);
    }).catch((error) => {
        console.error("Error getting products: ", error);
        const offlineHint = (typeof navigator !== 'undefined' && navigator && navigator.onLine === false)
          ? ' You appear to be offline.'
          : '';
        productGrid.innerHTML = `<p class="error">Error loading products. Please try again later.${offlineHint}</p>`;
    });
}
