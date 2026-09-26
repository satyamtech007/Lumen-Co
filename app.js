/**
 * LUMEN & CO. — E-Commerce Storefront Application Logic
 * Features:
 * - LocalStorage persistence for Cart and Dynamic Products Catalog
 * - Real-time Product Review Submission & Dynamic Rating Recalculation
 * - Admin Store Management Interface with Passcode Gate ('lumen2026')
 * - Interactive 5-Star Review Rating Selector
 * - 3-Step Guest Checkout Wizard & Promo Code System
 */

(function () {
  'use strict';

  // --- Constants & Storage Keys ---
  const STORAGE_KEY_CART = 'lumen_cart_v2';
  const STORAGE_KEY_PRODUCTS = 'lumen_products_v2';
  const ADMIN_PASSCODE = 'lumen2026';
  const FREE_SHIPPING_THRESHOLD = 150.00;
  const STANDARD_SHIPPING_RATE = 15.00;
  const VALID_PROMO_CODES = {
    'LUMEN10': 0.10,
    'WELCOME10': 0.10,
    'DESIGN20': 0.20
  };

  const CATEGORY_MAP = {
    'audio': 'Audio & Sound',
    'workspace': 'Workspace & Desk',
    'wearables': 'Watches & Wearables',
    'home': 'Living & Lighting',
    'lifestyle': 'Travel & Lifestyle'
  };

  // --- Application State ---
  const state = {
    products: [],
    testimonials: typeof TESTIMONIALS_DATA !== 'undefined' ? TESTIMONIALS_DATA : [],
    cart: [],
    selectedCategory: 'all',
    currentSection: 'catalog',
    searchQuery: '',
    sortOption: 'featured',
    appliedPromo: null,
    activeModalProduct: null,
    activeReviewRating: 5,
    adminEditingProductId: null,
    adminUploadedImageDataUrl: null,
    checkoutShippingInfo: null,
  };

  // --- DOM Selectors ---
  const dom = {
    // Nav & Search
    globalSearchInput: document.getElementById('globalSearchInput'),
    manageStoreBtn: document.getElementById('manageStoreBtn'),
    footerAdminTrigger: document.getElementById('footerAdminTrigger'),
    cartToggleBtn: document.getElementById('cartToggleBtn'),
    cartCountBadge: document.getElementById('cartCountBadge'),
    navLinks: document.querySelectorAll('.nav-links .nav-link, .footer-links a[data-filter]'),

    // Hero Metrics
    heroRatingDisplay: document.getElementById('heroRatingDisplay'),
    heroReviewsCountDisplay: document.getElementById('heroReviewsCountDisplay'),

    // Catalog & Filters
    categoryPills: document.querySelectorAll('.category-pills .pill'),
    sortSelect: document.getElementById('sortSelect'),
    productGrid: document.getElementById('productGrid'),
    emptyCatalogState: document.getElementById('emptyCatalogState'),
    resetCatalogBtn: document.getElementById('resetCatalogBtn'),

    // Testimonials & Newsletter
    testimonialsGrid: document.getElementById('testimonialsGrid'),
    newsletterForm: document.getElementById('newsletterForm'),
    newsletterEmailInput: document.getElementById('newsletterEmailInput'),
    newsletterValidationMsg: document.getElementById('newsletterValidationMsg'),

    // Product Modal
    productModal: document.getElementById('productModal'),
    closeProductModalBtn: document.getElementById('closeProductModalBtn'),
    modalProductImg: document.getElementById('modalProductImg'),
    modalCategoryBadge: document.getElementById('modalCategoryBadge'),
    modalProductTitle: document.getElementById('modalProductTitle'),
    modalStarRating: document.getElementById('modalStarRating'),
    modalReviewsCount: document.getElementById('modalReviewsCount'),
    modalPrice: document.getElementById('modalPrice'),
    modalOriginalPrice: document.getElementById('modalOriginalPrice'),
    modalDescription: document.getElementById('modalDescription'),
    modalSpecsList: document.getElementById('modalSpecsList'),
    modalQtyInput: document.getElementById('modalQtyInput'),
    qtyMinusBtn: document.getElementById('qtyMinusBtn'),
    qtyPlusBtn: document.getElementById('qtyPlusBtn'),
    modalAddToCartBtn: document.getElementById('modalAddToCartBtn'),

    // Product Modal Reviews
    modalReviewsTotal: document.getElementById('modalReviewsTotal'),
    modalReviewsAvgStars: document.getElementById('modalReviewsAvgStars'),
    modalReviewsAvgScore: document.getElementById('modalReviewsAvgScore'),
    toggleWriteReviewBtn: document.getElementById('toggleWriteReviewBtn'),
    productReviewForm: document.getElementById('productReviewForm'),
    interactiveStarSelector: document.getElementById('interactiveStarSelector'),
    reviewRatingVal: document.getElementById('reviewRatingVal'),
    starRatingHint: document.getElementById('starRatingHint'),
    reviewAuthorName: document.getElementById('reviewAuthorName'),
    reviewComment: document.getElementById('reviewComment'),
    cancelReviewBtn: document.getElementById('cancelReviewBtn'),
    modalReviewsList: document.getElementById('modalReviewsList'),

    // Passcode Modal
    passcodeModal: document.getElementById('passcodeModal'),
    closePasscodeModalBtn: document.getElementById('closePasscodeModalBtn'),
    closePasscodeBtn: document.getElementById('closePasscodeBtn'),
    passcodeForm: document.getElementById('passcodeForm'),
    adminPasscodeInput: document.getElementById('adminPasscodeInput'),
    passcodeErrorMsg: document.getElementById('passcodeErrorMsg'),

    // Admin Modal
    adminModal: document.getElementById('adminModal'),
    closeAdminModalBtn: document.getElementById('closeAdminModalBtn'),
    adminProductCount: document.getElementById('adminProductCount'),
    tabInventoryBtn: document.getElementById('tabInventoryBtn'),
    tabAddProductBtn: document.getElementById('tabAddProductBtn'),
    adminInventoryPanel: document.getElementById('adminInventoryPanel'),
    adminProductFormPanel: document.getElementById('adminProductFormPanel'),
    adminSearchInput: document.getElementById('adminSearchInput'),
    adminQuickAddBtn: document.getElementById('adminQuickAddBtn'),
    adminProductsTableBody: document.getElementById('adminProductsTableBody'),
    adminProductForm: document.getElementById('adminProductForm'),
    editProductId: document.getElementById('editProductId'),
    productFormHeading: document.getElementById('productFormHeading'),
    adminProdName: document.getElementById('adminProdName'),
    adminProdCategory: document.getElementById('adminProdCategory'),
    adminProdPrice: document.getElementById('adminProdPrice'),
    adminProdOrigPrice: document.getElementById('adminProdOrigPrice'),
    adminProdBadge: document.getElementById('adminProdBadge'),
    adminProdTagline: document.getElementById('adminProdTagline'),
    adminProdImageUrl: document.getElementById('adminProdImageUrl'),
    adminProdImageFile: document.getElementById('adminProdImageFile'),
    adminImagePreviewBox: document.getElementById('adminImagePreviewBox'),
    adminImagePreview: document.getElementById('adminImagePreview'),
    adminImageSrcLabel: document.getElementById('adminImageSrcLabel'),
    adminProdDesc: document.getElementById('adminProdDesc'),
    adminProdSpecs: document.getElementById('adminProdSpecs'),
    adminCancelFormBtn: document.getElementById('adminCancelFormBtn'),

    // Cart Drawer
    cartDrawerBackdrop: document.getElementById('cartDrawerBackdrop'),
    cartDrawer: document.getElementById('cartDrawer'),
    closeCartBtn: document.getElementById('closeCartBtn'),
    cartDrawerCount: document.getElementById('cartDrawerCount'),
    shippingTrackerText: document.getElementById('shippingTrackerText'),
    shippingProgressBar: document.getElementById('shippingProgressBar'),
    cartItemsContainer: document.getElementById('cartItemsContainer'),
    cartEmptyState: document.getElementById('cartEmptyState'),
    cartFooter: document.getElementById('cartFooter'),
    promoCodeInput: document.getElementById('promoCodeInput'),
    applyPromoBtn: document.getElementById('applyPromoBtn'),
    promoFeedbackMsg: document.getElementById('promoFeedbackMsg'),
    cartSubtotal: document.getElementById('cartSubtotal'),
    discountLine: document.getElementById('discountLine'),
    cartDiscount: document.getElementById('cartDiscount'),
    cartShipping: document.getElementById('cartShipping'),
    cartTotal: document.getElementById('cartTotal'),
    proceedToCheckoutBtn: document.getElementById('proceedToCheckoutBtn'),
    cartStartShoppingBtn: document.getElementById('cartStartShoppingBtn'),

    // Checkout Modal
    checkoutModal: document.getElementById('checkoutModal'),
    closeCheckoutBtn: document.getElementById('closeCheckoutBtn'),
    stepIndicator1: document.getElementById('stepIndicator1'),
    stepIndicator2: document.getElementById('stepIndicator2'),
    stepIndicator3: document.getElementById('stepIndicator3'),
    checkoutStep1: document.getElementById('checkoutStep1'),
    checkoutStep2: document.getElementById('checkoutStep2'),
    checkoutStep3: document.getElementById('checkoutStep3'),
    shippingForm: document.getElementById('shippingForm'),
    paymentForm: document.getElementById('paymentForm'),
    backToCartBtn: document.getElementById('backToCartBtn'),
    backToShippingBtn: document.getElementById('backToShippingBtn'),
    completeOrderBtn: document.getElementById('completeOrderBtn'),
    checkoutFinalAmount: document.getElementById('checkoutFinalAmount'),
    confirmedCustomerName: document.getElementById('confirmedCustomerName'),
    confirmedOrderId: document.getElementById('confirmedOrderId'),
    confirmedDate: document.getElementById('confirmedDate'),
    confirmedItemsList: document.getElementById('confirmedItemsList'),
    confirmedTotalAmount: document.getElementById('confirmedTotalAmount'),
    confirmedContinueBtn: document.getElementById('confirmedContinueBtn'),

    // Toast
    toastNotification: document.getElementById('toastNotification'),
  };

  // --- Helper Utilities ---
  function generateId(prefix = 'item') {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);
  }

  function formatCurrency(amount) {
    return '$' + Number(amount).toFixed(2);
  }

  function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    let starsHtml = '★'.repeat(fullStars);
    if (halfStar && fullStars < 5) starsHtml += '★';
    return starsHtml.padEnd(5, '☆');
  }

  function getRatingSummary(product) {
    if (!product.reviews || product.reviews.length === 0) {
      return { rating: 5.0, count: 0 };
    }
    const sum = product.reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    const avg = sum / product.reviews.length;
    return { rating: avg, count: product.reviews.length };
  }

  function showToast(message) {
    dom.toastNotification.textContent = message;
    dom.toastNotification.classList.add('show');
    clearTimeout(dom.toastNotification._timeout);
    dom.toastNotification._timeout = setTimeout(() => {
      dom.toastNotification.classList.remove('show');
    }, 2800);
  }

  // --- Data Persistence ---
  function loadProducts() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PRODUCTS);
      if (stored) {
        state.products = JSON.parse(stored);
      } else {
        state.products = typeof PRODUCTS_DATA !== 'undefined' ? JSON.parse(JSON.stringify(PRODUCTS_DATA)) : [];
        saveProducts();
      }
    } catch (e) {
      console.error('Failed to load products from storage:', e);
      state.products = typeof PRODUCTS_DATA !== 'undefined' ? JSON.parse(JSON.stringify(PRODUCTS_DATA)) : [];
    }
  }

  function saveProducts() {
    try {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(state.products));
    } catch (e) {
      console.error('Failed to save products:', e);
      showToast('Storage limit reached while saving catalog');
    }
  }

  function loadCartFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CART);
      if (stored) {
        state.cart = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load cart:', e);
      state.cart = [];
    }
  }

  function saveCartToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_CART, JSON.stringify(state.cart));
    } catch (e) {
      console.error('Failed to save cart:', e);
    }
  }

  // --- Dynamic Hero Metrics Recalculation ---
  function updateHeroTrustMetrics() {
    let totalReviews = 0;
    let totalScoreSum = 0;

    state.products.forEach((p) => {
      if (p.reviews && p.reviews.length > 0) {
        p.reviews.forEach((r) => {
          totalReviews++;
          totalScoreSum += Number(r.rating) || 5;
        });
      }
    });

    if (totalReviews > 0) {
      const overallAvg = (totalScoreSum / totalReviews).toFixed(1);
      dom.heroRatingDisplay.textContent = `${overallAvg} / 5`;
      dom.heroReviewsCountDisplay.textContent = `from ${totalReviews} verified ${totalReviews === 1 ? 'review' : 'reviews'}`;
    } else {
      dom.heroRatingDisplay.textContent = `5.0 / 5`;
      dom.heroReviewsCountDisplay.textContent = `from verified reviews`;
    }
  }

  // --- Catalog Rendering & Filtering ---
  function getFilteredAndSortedProducts() {
    let list = [...state.products];

    // Category Filter
    if (state.selectedCategory !== 'all') {
      list = list.filter((p) => p.category === state.selectedCategory);
    }

    // Search Query
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      list = list.filter((p) => 
        p.name.toLowerCase().includes(q) || 
        (p.tagline && p.tagline.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // Sorting
    if (state.sortOption === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (state.sortOption === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (state.sortOption === 'rating') {
      list.sort((a, b) => getRatingSummary(b).rating - getRatingSummary(a).rating);
    }

    return list;
  }

  function renderCatalog() {
    const products = getFilteredAndSortedProducts();

    if (products.length === 0) {
      dom.productGrid.innerHTML = '';
      dom.emptyCatalogState.classList.remove('hidden');
      return;
    }

    dom.emptyCatalogState.classList.add('hidden');

    let html = '';
    products.forEach((product) => {
      const { rating, count } = getRatingSummary(product);
      const badgeHtml = product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : '';
      const origPriceHtml = product.originalPrice ? `<span class="product-original-price">${formatCurrency(product.originalPrice)}</span>` : '';
      const displayCategory = product.categoryLabel || CATEGORY_MAP[product.category] || 'Collection';

      html += `
        <article class="product-card" data-id="${product.id}">
          <div class="product-card-media" data-action="view-details" data-id="${product.id}">
            <img src="${product.image}" alt="${escapeHtml(product.name)}" class="product-card-img" loading="lazy" />
            ${badgeHtml}
            <button class="btn-quick-view" data-action="view-details" data-id="${product.id}">Quick View</button>
          </div>
          <div class="product-card-body">
            <span class="product-category-tag">${escapeHtml(displayCategory)}</span>
            <h3 class="product-card-title" data-action="view-details" data-id="${product.id}">${escapeHtml(product.name)}</h3>
            <p class="product-card-tagline">${escapeHtml(product.tagline || '')}</p>
            <div class="product-card-rating">
              <span class="star-rating">${generateStars(rating)}</span>
              <span>${rating.toFixed(1)} (${count})</span>
            </div>
            <div class="product-card-footer">
              <div class="product-price-box">
                <span class="product-price">${formatCurrency(product.price)}</span>
                ${origPriceHtml}
              </div>
              <button class="btn btn-card-add" data-action="add-to-cart" data-id="${product.id}">+ Add</button>
            </div>
          </div>
        </article>
      `;
    });

    dom.productGrid.innerHTML = html;

    // Attach click listeners to cards
    dom.productGrid.querySelectorAll('[data-action="view-details"]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-id');
        openProductModal(id);
      });
    });

    dom.productGrid.querySelectorAll('[data-action="add-to-cart"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        addToCart(id, 1);
      });
    });

    setupScrollReveal();
    updateHeroTrustMetrics();
  }

  function setupScrollReveal() {
    const cards = dom.productGrid.querySelectorAll('.product-card');
    if (!('IntersectionObserver' in window)) {
      cards.forEach((card) => card.classList.add('revealed'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('revealed');
          }, index * 50);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    cards.forEach((card) => observer.observe(card));
  }

  function renderTestimonials() {
    let html = '';
    state.testimonials.forEach((t) => {
      html += `
        <div class="testimonial-card">
          <p class="testimonial-quote">“${t.quote}”</p>
          <div class="testimonial-author-row">
            <img src="${t.avatar}" alt="${t.author}" class="author-avatar" loading="lazy" />
            <div class="author-info">
              <h4>${t.author}</h4>
              <span>${t.role}</span>
            </div>
          </div>
        </div>
      `;
    });
    dom.testimonialsGrid.innerHTML = html;
  }

  // --- Product Detail Modal & Reviews Suite ---
  function openProductModal(productId) {
    const product = state.products.find((p) => p.id === productId);
    if (!product) return;

    state.activeModalProduct = product;
    dom.modalProductImg.src = product.image;
    dom.modalProductImg.alt = product.name;
    dom.modalCategoryBadge.textContent = product.categoryLabel || CATEGORY_MAP[product.category] || 'Collection';
    dom.modalProductTitle.textContent = product.name;
    
    const { rating, count } = getRatingSummary(product);
    dom.modalStarRating.textContent = generateStars(rating);
    dom.modalReviewsCount.textContent = `${rating.toFixed(1)} rating (${count} ${count === 1 ? 'review' : 'reviews'})`;
    dom.modalPrice.textContent = formatCurrency(product.price);
    
    if (product.originalPrice) {
      dom.modalOriginalPrice.textContent = formatCurrency(product.originalPrice);
      dom.modalOriginalPrice.classList.remove('hidden');
    } else {
      dom.modalOriginalPrice.classList.add('hidden');
    }

    dom.modalDescription.textContent = product.description;

    // Specs List
    let specsHtml = '';
    if (product.specs && product.specs.length > 0) {
      product.specs.forEach((s) => {
        specsHtml += `<li>${escapeHtml(s)}</li>`;
      });
    } else {
      specsHtml = `<li>Engineered with sustainable, premium materials</li><li>2-Year comprehensive global coverage included</li>`;
    }
    dom.modalSpecsList.innerHTML = specsHtml;

    dom.modalQtyInput.value = '1';

    // Reset and Render Reviews
    hideReviewForm();
    renderModalReviews(product);

    dom.productModal.classList.remove('hidden');
  }

  function closeProductModal() {
    dom.productModal.classList.add('hidden');
    state.activeModalProduct = null;
  }

  function renderModalReviews(product) {
    const reviews = product.reviews || [];
    const { rating, count } = getRatingSummary(product);

    dom.modalReviewsTotal.textContent = count;
    dom.modalReviewsAvgStars.textContent = generateStars(rating);
    dom.modalReviewsAvgScore.textContent = `${rating.toFixed(1)} / 5`;

    if (reviews.length === 0) {
      dom.modalReviewsList.innerHTML = `<p class="text-muted" style="font-size: 0.88rem; font-style: italic;">No reviews yet. Be the first to share your experience with this artifact!</p>`;
      return;
    }

    let html = '';
    // Most recent reviews at top
    [...reviews].reverse().forEach((r) => {
      const stars = generateStars(Number(r.rating) || 5);
      const dateStr = r.date || 'Recently';
      html += `
        <div class="review-item">
          <div class="review-item-header">
            <span class="review-item-author">
              ${escapeHtml(r.author)}
              <span class="verified-badge">✓ Verified Buyer</span>
            </span>
            <span class="review-item-date">${escapeHtml(dateStr)}</span>
          </div>
          <div class="review-item-rating star-rating">${stars}</div>
          <p class="review-item-text">${escapeHtml(r.text)}</p>
        </div>
      `;
    });

    dom.modalReviewsList.innerHTML = html;
  }

  function showReviewForm() {
    dom.productReviewForm.classList.remove('hidden');
    dom.toggleWriteReviewBtn.classList.add('hidden');
    setStarRatingSelection(5);
    dom.reviewAuthorName.value = '';
    dom.reviewComment.value = '';
    dom.reviewAuthorName.focus();
  }

  function hideReviewForm() {
    dom.productReviewForm.classList.add('hidden');
    dom.toggleWriteReviewBtn.classList.remove('hidden');
  }

  function setStarRatingSelection(rating) {
    state.activeReviewRating = rating;
    dom.reviewRatingVal.value = rating;

    const stars = dom.interactiveStarSelector.querySelectorAll('.star-select-btn');
    stars.forEach((s) => {
      const r = parseInt(s.getAttribute('data-rating'), 10);
      if (r <= rating) {
        s.classList.add('active');
      } else {
        s.classList.remove('active');
      }
    });

    const hints = {
      1: '1.0 — Disappointing',
      2: '2.0 — Below Expectations',
      3: '3.0 — Acceptable',
      4: '4.0 — Very Good',
      5: '5.0 — Exceptional'
    };
    dom.starRatingHint.textContent = hints[rating] || `${rating}.0`;
  }

  function handleReviewSubmit(e) {
    e.preventDefault();
    if (!state.activeModalProduct) return;

    const author = dom.reviewAuthorName.value.trim();
    const comment = dom.reviewComment.value.trim();
    const rating = parseInt(dom.reviewRatingVal.value, 10) || 5;

    if (!author || !comment) {
      showToast('Please provide your name and review comments');
      return;
    }

    const newReview = {
      id: generateId('rev'),
      author: author,
      rating: rating,
      date: new Date().toISOString().slice(0, 10),
      text: comment
    };

    // Find product in state and append review
    const prodIndex = state.products.findIndex((p) => p.id === state.activeModalProduct.id);
    if (prodIndex > -1) {
      if (!state.products[prodIndex].reviews) {
        state.products[prodIndex].reviews = [];
      }
      state.products[prodIndex].reviews.push(newReview);
      state.activeModalProduct = state.products[prodIndex];

      saveProducts();
      renderModalReviews(state.activeModalProduct);
      hideReviewForm();
      renderCatalog();
      updateHeroTrustMetrics();

      showToast('Thank you! Your verified review has been published.');
    }
  }

  // --- Admin Passcode & Management Suite ---
  function openPasscodePrompt() {
    dom.adminPasscodeInput.value = '';
    dom.passcodeErrorMsg.classList.add('hidden');
    dom.passcodeModal.classList.remove('hidden');
    setTimeout(() => dom.adminPasscodeInput.focus(), 150);
  }

  function closePasscodePrompt() {
    dom.passcodeModal.classList.add('hidden');
  }

  function handlePasscodeSubmit(e) {
    e.preventDefault();
    const entered = dom.adminPasscodeInput.value.trim();

    if (entered === ADMIN_PASSCODE) {
      closePasscodePrompt();
      openAdminModal();
      showToast('Store administration unlocked');
    } else {
      dom.passcodeErrorMsg.classList.remove('hidden');
      dom.adminPasscodeInput.select();
    }
  }

  function openAdminModal() {
    renderAdminInventoryTable();
    switchAdminTab('inventory');
    dom.adminModal.classList.remove('hidden');
  }

  function closeAdminModal() {
    dom.adminModal.classList.add('hidden');
    resetAdminForm();
  }

  function switchAdminTab(tabName) {
    if (tabName === 'inventory') {
      dom.tabInventoryBtn.classList.add('active');
      dom.tabAddProductBtn.classList.remove('active');
      dom.adminInventoryPanel.classList.remove('hidden');
      dom.adminProductFormPanel.classList.add('hidden');
      renderAdminInventoryTable();
    } else {
      dom.tabAddProductBtn.classList.add('active');
      dom.tabInventoryBtn.classList.remove('active');
      dom.adminProductFormPanel.classList.remove('hidden');
      dom.adminInventoryPanel.classList.add('hidden');
    }
  }

  function renderAdminInventoryTable() {
    const filterQuery = dom.adminSearchInput ? dom.adminSearchInput.value.toLowerCase().trim() : '';
    let list = [...state.products];

    if (filterQuery) {
      list = list.filter((p) => 
        p.name.toLowerCase().includes(filterQuery) || 
        (p.categoryLabel && p.categoryLabel.toLowerCase().includes(filterQuery)) ||
        p.category.toLowerCase().includes(filterQuery)
      );
    }

    dom.adminProductCount.textContent = state.products.length;

    let html = '';
    list.forEach((product) => {
      const { rating, count } = getRatingSummary(product);
      const displayCategory = product.categoryLabel || CATEGORY_MAP[product.category] || product.category;

      html += `
        <tr>
          <td>
            <div class="admin-prod-cell">
              <img src="${product.image}" alt="${escapeHtml(product.name)}" class="admin-prod-thumb" />
              <div>
                <div class="admin-prod-title">${escapeHtml(product.name)}</div>
                <small class="text-muted">${escapeHtml(product.tagline || '')}</small>
              </div>
            </div>
          </td>
          <td><span class="product-category-tag">${escapeHtml(displayCategory)}</span></td>
          <td><strong>${formatCurrency(product.price)}</strong></td>
          <td>
            <span class="star-rating">${generateStars(rating)}</span>
            <small>(${count})</small>
          </td>
          <td><span class="stock-badge in-stock">Active</span></td>
          <td class="text-right">
            <div class="admin-actions-cell">
              <button type="button" class="btn-admin-edit" data-edit-id="${product.id}">Edit</button>
              <button type="button" class="btn-admin-delete" data-delete-id="${product.id}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    });

    if (list.length === 0) {
      html = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No products found matching your search.</td></tr>`;
    }

    dom.adminProductsTableBody.innerHTML = html;

    // Attach row action listeners
    dom.adminProductsTableBody.querySelectorAll('[data-edit-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-edit-id');
        startEditProduct(id);
      });
    });

    dom.adminProductsTableBody.querySelectorAll('[data-delete-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-delete-id');
        deleteProduct(id);
      });
    });
  }

  function startEditProduct(productId) {
    const product = state.products.find((p) => p.id === productId);
    if (!product) return;

    state.adminEditingProductId = productId;
    dom.editProductId.value = productId;
    dom.productFormHeading.textContent = `Edit Product: ${product.name}`;

    dom.adminProdName.value = product.name;
    dom.adminProdCategory.value = product.category || 'audio';
    dom.adminProdPrice.value = product.price;
    dom.adminProdOrigPrice.value = product.originalPrice || '';
    dom.adminProdBadge.value = product.badge || '';
    dom.adminProdTagline.value = product.tagline || '';
    dom.adminProdImageUrl.value = product.image.startsWith('data:') ? '' : product.image;
    dom.adminProdDesc.value = product.description || '';
    dom.adminProdSpecs.value = product.specs ? product.specs.join('\n') : '';

    // Preview
    state.adminUploadedImageDataUrl = product.image;
    dom.adminImagePreview.src = product.image;
    dom.adminImageSrcLabel.textContent = product.image.startsWith('data:') ? 'Custom Uploaded Image' : 'Linked Image URL';
    dom.adminImagePreviewBox.classList.remove('hidden');

    switchAdminTab('form');
  }

  function deleteProduct(productId) {
    const product = state.products.find((p) => p.id === productId);
    if (!product) return;

    if (confirm(`Are you sure you want to delete "${product.name}" from your catalog?`)) {
      state.products = state.products.filter((p) => p.id !== productId);
      // Also remove from cart if present
      state.cart = state.cart.filter((item) => item.id !== productId);
      
      saveProducts();
      saveCartToStorage();
      renderAdminInventoryTable();
      renderCatalog();
      updateCartUI();
      updateHeroTrustMetrics();

      showToast(`Product "${product.name}" deleted`);
    }
  }

  function resetAdminForm() {
    state.adminEditingProductId = null;
    state.adminUploadedImageDataUrl = null;
    dom.editProductId.value = '';
    dom.productFormHeading.textContent = 'Create New Product';
    dom.adminProductForm.reset();
    dom.adminImagePreviewBox.classList.add('hidden');
    dom.adminImagePreview.src = '';
  }

  function handleAdminFormSubmit(e) {
    e.preventDefault();

    const name = dom.adminProdName.value.trim();
    const category = dom.adminProdCategory.value;
    const price = parseFloat(dom.adminProdPrice.value) || 0;
    const originalPrice = dom.adminProdOrigPrice.value ? parseFloat(dom.adminProdOrigPrice.value) : null;
    const badge = dom.adminProdBadge.value.trim() || null;
    const tagline = dom.adminProdTagline.value.trim();
    const desc = dom.adminProdDesc.value.trim();
    const specsRaw = dom.adminProdSpecs.value.trim();
    const specs = specsRaw ? specsRaw.split('\n').map((s) => s.trim()).filter(Boolean) : [];

    let image = state.adminUploadedImageDataUrl || dom.adminProdImageUrl.value.trim();
    if (!image) {
      image = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80"; // fallback
    }

    const categoryLabel = CATEGORY_MAP[category] || 'Collection';

    if (state.adminEditingProductId) {
      // Update existing
      const index = state.products.findIndex((p) => p.id === state.adminEditingProductId);
      if (index > -1) {
        state.products[index] = {
          ...state.products[index],
          name,
          category,
          categoryLabel,
          price,
          originalPrice,
          badge,
          tagline,
          image,
          description: desc,
          specs
        };
        showToast(`Product "${name}" updated`);
      }
    } else {
      // Create new
      const newProduct = {
        id: generateId('prod'),
        name,
        category,
        categoryLabel,
        price,
        originalPrice,
        badge,
        tagline,
        image,
        description: desc,
        specs,
        inStock: true,
        reviews: []
      };
      state.products.unshift(newProduct);
      showToast(`Product "${name}" created`);
    }

    saveProducts();
    renderCatalog();
    renderAdminInventoryTable();
    updateHeroTrustMetrics();
    resetAdminForm();
    switchAdminTab('inventory');
  }

  function handleAdminImageFileUpload(file) {
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      state.adminUploadedImageDataUrl = event.target.result;
      dom.adminImagePreview.src = event.target.result;
      dom.adminImageSrcLabel.textContent = file.name;
      dom.adminImagePreviewBox.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  // --- Cart Operations & Micro-Animations ---
  function addToCart(productId, quantity = 1) {
    const product = state.products.find((p) => p.id === productId);
    if (!product) return;

    const existingIndex = state.cart.findIndex((item) => item.id === productId);
    if (existingIndex > -1) {
      state.cart[existingIndex].qty += quantity;
    } else {
      state.cart.push({
        id: productId,
        qty: quantity,
        product: product
      });
    }

    saveCartToStorage();
    updateCartUI();

    // Trigger Cart Badge Bounce / Pop Micro-Animation
    dom.cartCountBadge.classList.remove('badge-pop');
    void dom.cartCountBadge.offsetWidth; // Force reflow
    dom.cartCountBadge.classList.add('badge-pop');

    showToast(`Added "${product.name}" to cart`);
  }

  function updateCartItemQty(productId, delta) {
    const index = state.cart.findIndex((item) => item.id === productId);
    if (index > -1) {
      state.cart[index].qty += delta;
      if (state.cart[index].qty <= 0) {
        state.cart.splice(index, 1);
      }
      saveCartToStorage();
      updateCartUI();
    }
  }

  function removeCartItem(productId) {
    state.cart = state.cart.filter((item) => item.id !== productId);
    saveCartToStorage();
    updateCartUI();
    showToast('Item removed from cart');
  }

  function calculateCartTotals() {
    let subtotal = 0;
    let totalItems = 0;

    state.cart.forEach((item) => {
      subtotal += item.product.price * item.qty;
      totalItems += item.qty;
    });

    let discount = 0;
    if (state.appliedPromo && VALID_PROMO_CODES[state.appliedPromo]) {
      discount = subtotal * VALID_PROMO_CODES[state.appliedPromo];
    }

    const eligibleForFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
    const shipping = subtotal > 0 ? (eligibleForFreeShipping ? 0 : STANDARD_SHIPPING_RATE) : 0;
    const total = Math.max(0, subtotal - discount + shipping);

    return {
      subtotal,
      discount,
      shipping,
      total,
      totalItems,
      eligibleForFreeShipping
    };
  }

  function updateCartUI() {
    const { subtotal, discount, shipping, total, totalItems, eligibleForFreeShipping } = calculateCartTotals();

    // Nav Badge & Header Count
    dom.cartCountBadge.textContent = totalItems;
    dom.cartDrawerCount.textContent = `${totalItems} ${totalItems === 1 ? 'item' : 'items'}`;

    // Free Shipping Progress Tracker
    if (eligibleForFreeShipping || subtotal === 0) {
      dom.shippingTrackerText.textContent = subtotal > 0 ? '🎉 You unlocked Free Worldwide Shipping!' : 'Add $150.00 to qualify for Free Global Shipping';
      dom.shippingProgressBar.style.width = subtotal > 0 ? '100%' : '0%';
    } else {
      const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
      const percent = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
      dom.shippingTrackerText.textContent = `Add ${formatCurrency(remaining)} more for Free Worldwide Shipping`;
      dom.shippingProgressBar.style.width = `${percent}%`;
    }

    // Cart Items List
    if (state.cart.length === 0) {
      dom.cartItemsContainer.innerHTML = '';
      dom.cartEmptyState.classList.remove('hidden');
      dom.cartFooter.classList.add('hidden');
      return;
    }

    dom.cartEmptyState.classList.add('hidden');
    dom.cartFooter.classList.remove('hidden');

    let html = '';
    state.cart.forEach((item) => {
      const lineTotal = item.product.price * item.qty;
      html += `
        <div class="cart-item" data-id="${item.id}">
          <img src="${item.product.image}" alt="${escapeHtml(item.product.name)}" class="cart-item-img" />
          <div class="cart-item-info">
            <div class="cart-item-header">
              <h4 class="cart-item-title">${escapeHtml(item.product.name)}</h4>
              <button class="cart-item-remove" data-id="${item.id}" aria-label="Remove item">✕</button>
            </div>
            <span class="cart-item-price">${formatCurrency(lineTotal)}</span>
            <div class="cart-item-qty-controls">
              <button class="cart-qty-btn minus" data-id="${item.id}">−</button>
              <span>${item.qty}</span>
              <button class="cart-qty-btn plus" data-id="${item.id}">+</button>
            </div>
          </div>
        </div>
      `;
    });

    dom.cartItemsContainer.innerHTML = html;

    // Attach listeners
    dom.cartItemsContainer.querySelectorAll('.cart-item-remove').forEach((btn) => {
      btn.addEventListener('click', () => removeCartItem(btn.getAttribute('data-id')));
    });

    dom.cartItemsContainer.querySelectorAll('.cart-qty-btn.minus').forEach((btn) => {
      btn.addEventListener('click', () => updateCartItemQty(btn.getAttribute('data-id'), -1));
    });

    dom.cartItemsContainer.querySelectorAll('.cart-qty-btn.plus').forEach((btn) => {
      btn.addEventListener('click', () => updateCartItemQty(btn.getAttribute('data-id'), 1));
    });

    // Summary Totals
    dom.cartSubtotal.textContent = formatCurrency(subtotal);
    if (discount > 0) {
      dom.discountLine.classList.remove('hidden');
      dom.cartDiscount.textContent = `-${formatCurrency(discount)}`;
    } else {
      dom.discountLine.classList.add('hidden');
    }

    dom.cartShipping.textContent = subtotal === 0 ? '$0.00' : (shipping === 0 ? 'FREE' : formatCurrency(shipping));
    dom.cartTotal.textContent = formatCurrency(total);
  }

  function openCartDrawer() {
    dom.cartDrawerBackdrop.classList.remove('hidden');
    dom.cartDrawer.classList.add('open');
    dom.cartDrawer.setAttribute('aria-hidden', 'false');
  }

  function closeCartDrawer() {
    dom.cartDrawerBackdrop.classList.add('hidden');
    dom.cartDrawer.classList.remove('open');
    dom.cartDrawer.setAttribute('aria-hidden', 'true');
  }

  // --- Promo Code Application ---
  function applyPromoCode() {
    const code = dom.promoCodeInput.value.trim().toUpperCase();
    if (!code) return;

    if (VALID_PROMO_CODES[code]) {
      state.appliedPromo = code;
      const discountPercent = VALID_PROMO_CODES[code] * 100;
      dom.promoFeedbackMsg.className = 'promo-msg success';
      dom.promoFeedbackMsg.textContent = `Promo code "${code}" applied: ${discountPercent}% off!`;
      updateCartUI();
      showToast(`Promo applied: ${discountPercent}% discount`);
    } else {
      dom.promoFeedbackMsg.className = 'promo-msg error';
      dom.promoFeedbackMsg.textContent = 'Invalid promo code. Try LUMEN10 or WELCOME10.';
    }
  }

  // --- 3-Step Checkout Modal Flow ---
  function openCheckout() {
    if (state.cart.length === 0) {
      showToast('Your cart is empty');
      return;
    }

    closeCartDrawer();
    setCheckoutStep(1);
    
    // Update summary preview
    const { total } = calculateCartTotals();
    dom.checkoutFinalAmount.textContent = formatCurrency(total);

    dom.checkoutModal.classList.remove('hidden');
  }

  function closeCheckout() {
    dom.checkoutModal.classList.add('hidden');
  }

  function setCheckoutStep(stepNumber) {
    // Stepper Indicators
    [dom.stepIndicator1, dom.stepIndicator2, dom.stepIndicator3].forEach((ind, i) => {
      if (i + 1 <= stepNumber) {
        ind.classList.add('active');
      } else {
        ind.classList.remove('active');
      }
    });

    // Step Panels
    dom.checkoutStep1.classList.add('hidden');
    dom.checkoutStep2.classList.add('hidden');
    dom.checkoutStep3.classList.add('hidden');

    if (stepNumber === 1) {
      dom.checkoutStep1.classList.remove('hidden');
    } else if (stepNumber === 2) {
      dom.checkoutStep2.classList.remove('hidden');
    } else if (stepNumber === 3) {
      dom.checkoutStep3.classList.remove('hidden');
    }
  }

  function handleShippingSubmit(e) {
    e.preventDefault();
    state.checkoutShippingInfo = {
      email: document.getElementById('shipEmail').value,
      phone: document.getElementById('shipPhone').value,
      firstName: document.getElementById('shipFirstName').value,
      lastName: document.getElementById('shipLastName').value,
      address: document.getElementById('shipAddress').value,
      city: document.getElementById('shipCity').value,
      state: document.getElementById('shipState').value,
      zip: document.getElementById('shipZip').value,
    };

    setCheckoutStep(2);
  }

  function handlePaymentSubmit(e) {
    e.preventDefault();

    // Show simulated processing state
    const btn = dom.completeOrderBtn;
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span>Processing Order…</span>`;
    btn.disabled = true;

    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;

      // Complete Order
      const orderNumber = 'LMN-' + Math.floor(10000 + Math.random() * 90000);
      const { total } = calculateCartTotals();
      const customerName = state.checkoutShippingInfo ? state.checkoutShippingInfo.firstName : 'Valued Patron';

      dom.confirmedCustomerName.textContent = customerName;
      dom.confirmedOrderId.textContent = `#${orderNumber}`;
      dom.confirmedDate.textContent = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      dom.confirmedTotalAmount.textContent = formatCurrency(total);

      // Receipt items
      let receiptHtml = '';
      state.cart.forEach((item) => {
        receiptHtml += `
          <div class="receipt-item-row">
            <span>${escapeHtml(item.product.name)} (×${item.qty})</span>
            <strong>${formatCurrency(item.product.price * item.qty)}</strong>
          </div>
        `;
      });
      dom.confirmedItemsList.innerHTML = receiptHtml;

      // Reset cart
      state.cart = [];
      state.appliedPromo = null;
      saveCartToStorage();
      updateCartUI();

      setCheckoutStep(3);
      showToast('Order successfully confirmed!');
    }, 900);
  }

  // --- Newsletter Handler ---
  function handleNewsletterSubmit(e) {
    e.preventDefault();
    const email = dom.newsletterEmailInput.value.trim();
    if (!email || !email.includes('@')) {
      dom.newsletterValidationMsg.className = 'newsletter-msg error';
      dom.newsletterValidationMsg.textContent = 'Please enter a valid email address.';
      return;
    }

    dom.newsletterValidationMsg.className = 'newsletter-msg success';
    dom.newsletterValidationMsg.textContent = 'Welcome to the Luminary Circle! Check your inbox for your 10% promo code.';
    dom.newsletterEmailInput.value = '';
    showToast('Subscribed! 10% promo code sent.');
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Admin Open Triggers
    if (dom.manageStoreBtn) {
      dom.manageStoreBtn.addEventListener('click', openPasscodePrompt);
    }
    if (dom.footerAdminTrigger) {
      dom.footerAdminTrigger.addEventListener('click', openPasscodePrompt);
    }

    // Passcode Modal Controls
    dom.closePasscodeModalBtn.addEventListener('click', closePasscodePrompt);
    dom.closePasscodeBtn.addEventListener('click', closePasscodePrompt);
    dom.passcodeModal.addEventListener('click', (e) => {
      if (e.target === dom.passcodeModal) closePasscodePrompt();
    });
    dom.passcodeForm.addEventListener('submit', handlePasscodeSubmit);

    // Admin Modal Controls
    dom.closeAdminModalBtn.addEventListener('click', closeAdminModal);
    dom.adminModal.addEventListener('click', (e) => {
      if (e.target === dom.adminModal) closeAdminModal();
    });
    dom.tabInventoryBtn.addEventListener('click', () => switchAdminTab('inventory'));
    dom.tabAddProductBtn.addEventListener('click', () => {
      resetAdminForm();
      switchAdminTab('form');
    });
    dom.adminQuickAddBtn.addEventListener('click', () => {
      resetAdminForm();
      switchAdminTab('form');
    });
    dom.adminCancelFormBtn.addEventListener('click', () => switchAdminTab('inventory'));
    dom.adminProductForm.addEventListener('submit', handleAdminFormSubmit);
    dom.adminSearchInput.addEventListener('input', renderAdminInventoryTable);

    dom.adminProdImageFile.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleAdminImageFileUpload(e.target.files[0]);
      }
    });

    dom.adminProdImageUrl.addEventListener('input', (e) => {
      const url = e.target.value.trim();
      if (url) {
        state.adminUploadedImageDataUrl = null;
        dom.adminImagePreview.src = url;
        dom.adminImageSrcLabel.textContent = 'Linked URL';
        dom.adminImagePreviewBox.classList.remove('hidden');
      } else {
        dom.adminImagePreviewBox.classList.add('hidden');
      }
    });

    // Navigation & Category Filtering (Single Source of Truth)
    dom.categoryPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const cat = pill.getAttribute('data-category') || 'all';
        setCategory(cat, false);
      });
    });

    // Top Navigation & Footer Category Links
    dom.navLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        const filter = link.getAttribute('data-filter');
        const href = link.getAttribute('href');

        if (filter) {
          e.preventDefault();
          setCategory(filter, true);
        } else if (href === '#catalog') {
          e.preventDefault();
          setCategory('all', true);
        } else if (href === '#story') {
          state.currentSection = 'story';
          updateNavActiveState();
        } else if (href === '#reviews') {
          state.currentSection = 'reviews';
          updateNavActiveState();
        } else if (href === '#hero') {
          state.currentSection = 'catalog';
          updateNavActiveState();
        }
      });
    });

    // Hero Action Buttons
    const heroExploreBtn = document.querySelector('.hero-cta-group a[href="#catalog"]');
    if (heroExploreBtn) {
      heroExploreBtn.addEventListener('click', () => {
        setCategory('all', false);
      });
    }

    const heroPhilosophyBtn = document.querySelector('.hero-cta-group a[href="#story"]');
    if (heroPhilosophyBtn) {
      heroPhilosophyBtn.addEventListener('click', () => {
        state.currentSection = 'story';
        updateNavActiveState();
      });
    }

    // Search Input
    dom.globalSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim();
      renderCatalog();
    });

    // Sorting Dropdown
    dom.sortSelect.addEventListener('change', (e) => {
      state.sortOption = e.target.value;
      renderCatalog();
    });

    // Reset Catalog Button
    dom.resetCatalogBtn.addEventListener('click', () => {
      setCategory('all', false);
      state.searchQuery = '';
      dom.globalSearchInput.value = '';
    });

    // Product Detail Modal Controls
    dom.closeProductModalBtn.addEventListener('click', closeProductModal);
    dom.productModal.addEventListener('click', (e) => {
      if (e.target === dom.productModal) closeProductModal();
    });

    dom.qtyMinusBtn.addEventListener('click', () => {
      let val = parseInt(dom.modalQtyInput.value, 10) || 1;
      if (val > 1) dom.modalQtyInput.value = val - 1;
    });

    dom.qtyPlusBtn.addEventListener('click', () => {
      let val = parseInt(dom.modalQtyInput.value, 10) || 1;
      if (val < 10) dom.modalQtyInput.value = val + 1;
    });

    dom.modalAddToCartBtn.addEventListener('click', () => {
      if (state.activeModalProduct) {
        const qty = parseInt(dom.modalQtyInput.value, 10) || 1;
        addToCart(state.activeModalProduct.id, qty);
        closeProductModal();
      }
    });

    // Reviews Interactive Star Rating & Submission
    dom.toggleWriteReviewBtn.addEventListener('click', showReviewForm);
    dom.cancelReviewBtn.addEventListener('click', hideReviewForm);
    dom.productReviewForm.addEventListener('submit', handleReviewSubmit);

    dom.interactiveStarSelector.querySelectorAll('.star-select-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const rating = parseInt(btn.getAttribute('data-rating'), 10);
        setStarRatingSelection(rating);
      });

      btn.addEventListener('mouseenter', () => {
        const rating = parseInt(btn.getAttribute('data-rating'), 10);
        dom.interactiveStarSelector.querySelectorAll('.star-select-btn').forEach((s) => {
          const r = parseInt(s.getAttribute('data-rating'), 10);
          if (r <= rating) s.classList.add('hover');
          else s.classList.remove('hover');
        });
      });
    });

    dom.interactiveStarSelector.addEventListener('mouseleave', () => {
      dom.interactiveStarSelector.querySelectorAll('.star-select-btn').forEach((s) => {
        s.classList.remove('hover');
      });
    });

    // Cart Drawer Controls
    dom.cartToggleBtn.addEventListener('click', openCartDrawer);
    dom.closeCartBtn.addEventListener('click', closeCartDrawer);
    dom.cartDrawerBackdrop.addEventListener('click', closeCartDrawer);
    dom.cartStartShoppingBtn.addEventListener('click', () => {
      closeCartDrawer();
      document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
    });

    // Promo Code Box
    dom.applyPromoBtn.addEventListener('click', applyPromoCode);
    dom.promoCodeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyPromoCode();
      }
    });

    // Checkout Flow
    dom.proceedToCheckoutBtn.addEventListener('click', openCheckout);
    dom.closeCheckoutBtn.addEventListener('click', closeCheckout);
    dom.checkoutModal.addEventListener('click', (e) => {
      if (e.target === dom.checkoutModal) closeCheckout();
    });

    dom.shippingForm.addEventListener('submit', handleShippingSubmit);
    dom.paymentForm.addEventListener('submit', handlePaymentSubmit);

    dom.backToCartBtn.addEventListener('click', () => {
      closeCheckout();
      openCartDrawer();
    });

    dom.backToShippingBtn.addEventListener('click', () => {
      setCheckoutStep(1);
    });

    dom.confirmedContinueBtn.addEventListener('click', () => {
      closeCheckout();
      document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
    });

    // Newsletter Form
    dom.newsletterForm.addEventListener('submit', handleNewsletterSubmit);

    // Global Key Listener (Escape to close modals)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!dom.productModal.classList.contains('hidden')) closeProductModal();
        if (!dom.checkoutModal.classList.contains('hidden')) closeCheckout();
        if (!dom.passcodeModal.classList.contains('hidden')) closePasscodePrompt();
        if (!dom.adminModal.classList.contains('hidden')) closeAdminModal();
        if (dom.cartDrawer.classList.contains('open')) closeCartDrawer();
      }
    });
  }

  // --- Navigation & Category Active State (Single Source of Truth) ---
  function updateNavActiveState() {
    const desktopNavLinks = document.querySelectorAll('.nav-links .nav-link');
    desktopNavLinks.forEach((link) => {
      link.classList.remove('active');
    });

    if (state.currentSection === 'story') {
      const philosophyLink = document.querySelector('.nav-links a[href="#story"]');
      if (philosophyLink) philosophyLink.classList.add('active');
      return;
    }

    if (state.currentSection === 'reviews') {
      const reviewsLink = document.querySelector('.nav-links a[href="#reviews"]');
      if (reviewsLink) reviewsLink.classList.add('active');
      return;
    }

    // When viewing catalog section or default state
    if (state.selectedCategory === 'audio') {
      const audioLink = document.querySelector('.nav-links a[data-filter="audio"]');
      if (audioLink) audioLink.classList.add('active');
    } else if (state.selectedCategory === 'workspace') {
      const wsLink = document.querySelector('.nav-links a[data-filter="workspace"]');
      if (wsLink) wsLink.classList.add('active');
    } else if (state.selectedCategory === 'home') {
      const livingLink = document.querySelector('.nav-links a[data-filter="home"]');
      if (livingLink) livingLink.classList.add('active');
    } else {
      // General catalog ('all', etc.)
      const catalogLink = document.querySelector('.nav-links a[href="#catalog"]:not([data-filter])');
      if (catalogLink) catalogLink.classList.add('active');
    }
  }

  function setCategory(category, shouldScrollToCatalog = false) {
    state.selectedCategory = category;
    state.currentSection = 'catalog';

    dom.categoryPills.forEach((pill) => {
      const pillCat = pill.getAttribute('data-category');
      if (pillCat === category) {
        pill.classList.add('active');
        pill.setAttribute('aria-selected', 'true');
      } else {
        pill.classList.remove('active');
        pill.setAttribute('aria-selected', 'false');
      }
    });

    updateNavActiveState();
    renderCatalog();

    if (shouldScrollToCatalog) {
      const catalogEl = document.getElementById('catalog');
      if (catalogEl) catalogEl.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function initSectionScrollSpy() {
    if (!('IntersectionObserver' in window)) return;

    const sections = [
      { id: 'hero', section: 'catalog' },
      { id: 'catalog', section: 'catalog' },
      { id: 'story', section: 'story' },
      { id: 'reviews', section: 'reviews' }
    ];

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const match = sections.find(s => s.id === entry.target.id);
          if (match) {
            state.currentSection = match.section;
            updateNavActiveState();
          }
        }
      });
    }, {
      rootMargin: '-30% 0px -50% 0px'
    });

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }

  // --- Scroll-Triggered Heading Character Convergence Animation ---
  function initHeadingConvergenceAnimations() {
    const headings = document.querySelectorAll('.hero-title, .section-title, .newsletter-title');

    headings.forEach((heading) => {
      if (heading.dataset.charSplit) return;
      heading.dataset.charSplit = 'true';

      const rawText = heading.textContent.trim();
      heading.setAttribute('aria-label', rawText);

      // Split into words
      const words = rawText.split(/\s+/);
      
      // Calculate total characters (excluding spaces) to establish center position
      const totalChars = words.reduce((sum, w) => sum + w.length, 0);
      const centerIndex = (totalChars - 1) / 2;

      let globalCharIdx = 0;
      const container = document.createElement('span');
      container.className = 'char-reveal-container';
      container.setAttribute('aria-hidden', 'true');

      words.forEach((word, wordIdx) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'char-word';

        for (let i = 0; i < word.length; i++) {
          const char = word[i];
          const charSpan = document.createElement('span');
          charSpan.className = 'char-unit';
          charSpan.textContent = char;

          // Distance relative to center character (-1 to +1 ratio)
          const distanceFromCenter = globalCharIdx - centerIndex;
          const normalizedDist = totalChars > 1 ? (distanceFromCenter / (totalChars / 2)) : 0;

          // Horizontal offset: characters to the left start shifted left, right shifted right
          const maxOffset = 85; // px
          const tx = Math.round(normalizedDist * maxOffset);

          // Stagger start time by ~20ms relative to distance from center (inward-to-outward wave)
          const staggerDelay = (Math.abs(distanceFromCenter) * 0.020).toFixed(3);

          charSpan.style.setProperty('--tx', `${tx}px`);
          charSpan.style.setProperty('--delay', `${staggerDelay}s`);

          wordSpan.appendChild(charSpan);
          globalCharIdx++;
        }

        container.appendChild(wordSpan);

        // Word spacing separator
        if (wordIdx < words.length - 1) {
          const spaceSpan = document.createElement('span');
          spaceSpan.className = 'char-space';
          spaceSpan.innerHTML = '&nbsp;';
          container.appendChild(spaceSpan);
        }
      });

      heading.textContent = '';
      heading.appendChild(container);
    });

    // IntersectionObserver to trigger and re-trigger animation every time heading enters/exits viewport
    if (!('IntersectionObserver' in window)) {
      headings.forEach((h) => h.classList.add('reveal-triggered'));
      return;
    }

    const headingObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-triggered');
        } else {
          // Reset to scattered starting state when exiting viewport so it re-animates on next entry
          entry.target.classList.remove('reveal-triggered');
        }
      });
    }, {
      threshold: 0.35, // Trigger when 35% visible for clear runway
      rootMargin: '0px 0px -20px 0px'
    });

    headings.forEach((h) => headingObserver.observe(h));
  }

  // --- Application Initialization ---
  function init() {
    loadProducts();
    loadCartFromStorage();
    renderCatalog();
    renderTestimonials();
    updateCartUI();
    setupEventListeners();
    updateNavActiveState();
    initSectionScrollSpy();
    initHeadingConvergenceAnimations();
  }

  // Run on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
