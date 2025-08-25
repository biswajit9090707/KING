// Global variables
let products = [];
let currentProductId = null;

// DOM Elements
const productsGrid = document.getElementById('adminProductsGrid');
const productModal = document.getElementById('productModal');
const productForm = document.getElementById('productForm');
const modalTitle = document.getElementById('modalTitle');
const addProductBtn = document.getElementById('addProductBtn');
const cancelBtn = document.getElementById('cancelBtn');
const closeBtn = document.querySelector('.close');

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Load products when the page loads
    if (productsGrid) {
        loadProducts();
    }
    
    // Add Product Button
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => openAddProductModal());
    }
    
    // Form Submission
    if (productForm) {
        productForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Cancel Button
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
    
    // Close Button
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === productModal) {
            closeModal();
        }
    });
});

function currencyINR(n){
    try{
        return new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:2 }).format(Number(n||0));
    }catch(_){
        return `₹${(Number(n||0)).toFixed(2)}`;
    }
}

// Load products from Firestore
function loadProducts() {
    productsGrid.innerHTML = '<div class="loading">Loading products...</div>';
    
    db.collection("products").get()
        .then((querySnapshot) => {
            products = [];
            productsGrid.innerHTML = '';
            
            if (querySnapshot.empty) {
                productsGrid.innerHTML = '<p>No products found. Click "Add New Product" to get started.</p>';
                return;
            }
            
            querySnapshot.forEach((doc) => {
                const product = {
                    id: doc.id,
                    ...doc.data()
                };
                products.push(product);
                renderProductCard(product);
            });
        })
        .catch((error) => {
            console.error("Error loading products: ", error);
            productsGrid.innerHTML = '<p class="error">Error loading products. Please try again later.</p>';
        });
}

// Render a product card
function renderProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.id = product.id;
    
    const cover = Array.isArray(product.imageUrls) && product.imageUrls.length > 0
        ? product.imageUrls[0]
        : (product.imageUrl || 'https://via.placeholder.com/600x400?text=No+Image');

    card.innerHTML = `
        <img src="${cover}" alt="${product.title}">
        <div class="card-body">
            <h3>${product.title}</h3>
            <p class="price">${currencyINR(product.price)}</p>
            <div class="meta">
                <span>Size: ${product.size}</span>
                <span>Stock: ${product.stock}</span>
            </div>
            <div class="product-actions">
                <button class="btn-edit" data-id="${product.id}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn-delete" data-id="${product.id}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners to the buttons
    const editBtn = card.querySelector('.btn-edit');
    const deleteBtn = card.querySelector('.btn-delete');
    
    editBtn.addEventListener('click', () => openEditProductModal(product.id));
    deleteBtn.addEventListener('click', () => deleteProduct(product.id));
    
    productsGrid.appendChild(card);
}

// Open modal for adding a new product
function openAddProductModal() {
    currentProductId = null;
    modalTitle.textContent = 'Add New Product';
    productForm.reset();
    productModal.style.display = 'flex';
}

// Open modal for editing a product
function openEditProductModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    currentProductId = productId;
    modalTitle.textContent = 'Edit Product';
    
    // Fill the form with product data
    document.getElementById('title').value = product.title || '';
    document.getElementById('price').value = product.price || '';
    const urls = Array.isArray(product.imageUrls) ? product.imageUrls : (product.imageUrl ? [product.imageUrl] : []);
    const imageTextarea = document.getElementById('imageUrls');
    if (imageTextarea) imageTextarea.value = urls.join('\n');
    document.getElementById('size').value = product.size || 'A3';
    document.getElementById('stock').value = product.stock || 0;
    
    productModal.style.display = 'flex';
}

// Handle form submission (URLs only)
function handleFormSubmit(e) {
    e.preventDefault();
    
    // Collect multiple image URLs (one per line)
    const imageTextarea = document.getElementById('imageUrls');
    const imageUrls = imageTextarea ? imageTextarea.value.split(/\n|\r/).map(s => s.trim()).filter(Boolean).slice(0,4) : [];

    const formData = {
        title: document.getElementById('title').value.trim(),
        price: parseFloat(document.getElementById('price').value),
        imageUrls,
        // Maintain legacy single imageUrl for compatibility
        imageUrl: (imageUrls[0] || ''),
        size: document.getElementById('size').value,
        stock: parseInt(document.getElementById('stock').value, 10),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Basic validation
    if (!formData.title || imageUrls.length === 0 || isNaN(formData.price) || isNaN(formData.stock)) {
        alert('Please fill in all fields with valid values.');
        return;
    }
    
    const submitBtn = productForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    if (currentProductId) {
        // Update existing product
        updateProduct(currentProductId, formData, submitBtn, originalBtnText);
    } else {
        // Add new product
        formData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        addProduct(formData, submitBtn, originalBtnText);
    }
}

// Add a new product to Firestore
function addProduct(productData, submitBtn, originalBtnText) {
    console.log("Attempting to add product:", productData);
    
    db.collection("products")
        .add(productData)
        .then((docRef) => {
            console.log("Product added with ID: ", docRef.id);
            closeModal();
            loadProducts();
        })
        .catch((error) => {
            console.error("Error adding product: ", error);
            console.error("Error details:", {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
            alert('Error adding product: ' + (error.message || 'Please check the console for details.'));
        })
        .finally(() => {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
}

// Update an existing product in Firestore
function updateProduct(productId, productData, submitBtn, originalBtnText) {
    console.log("Attempting to update product:", productId, productData);
    
    db.collection("products")
        .doc(productId)
        .update(productData)
        .then(() => {
            console.log("Product updated successfully");
            closeModal();
            loadProducts();
        })
        .catch((error) => {
            console.error("Error updating product: ", error);
            console.error("Error details:", {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
            alert('Error updating product: ' + (error.message || 'Please check the console for details.'));
        })
        .finally(() => {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
}

// Delete a product from Firestore
function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        return;
    }
    
    db.collection("products")
        .doc(productId)
        .delete()
        .then(() => {
            // Remove the product card from the UI
            const productCard = document.querySelector(`.product-card[data-id="${productId}"]`);
            if (productCard) {
                productCard.remove();
            }
            // Show a message if no products left
            if (productsGrid.children.length === 0) {
                productsGrid.innerHTML = '<p>No products found. Click "Add New Product" to get started.</p>';
            }
        })
        .catch((error) => {
            console.error("Error deleting product: ", error);
            alert('Error deleting product. Please try again.');
        });
}

// Close the modal
function closeModal() {
    productModal.style.display = 'none';
    currentProductId = null;
    productForm.reset();
}
