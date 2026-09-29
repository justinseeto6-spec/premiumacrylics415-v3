/* Premium Acrylics 415 — shop page: filter + search */

(async () => {
  const grid = document.getElementById('productGrid');
  const filterBar = document.getElementById('filterBar');
  const searchInput = document.getElementById('searchInput');

  const products = await Products.all();
  const params = new URLSearchParams(window.location.search);
  let currentCat = params.get('category') || 'all';
  let currentQuery = '';

  const headingEl = document.getElementById('shopHeading');
  const subheadEl = document.getElementById('shopSubhead');

  // A category filter doesn't get its own canonical URL (it's still
  // /shop.html for SEO purposes — see the static canonical tag in
  // shop.html), but the on-page heading/title should still reflect what's
  // actually showing, both for clarity and because a shared filtered link
  // (e.g. /shop.html?category=pokemon) should look intentional, not generic.
  function updateHeading() {
    if (currentCat === 'all') {
      document.title = 'Shop All Display Cases | Premium Acrylics 415';
      if (headingEl) headingEl.textContent = 'Shop All Cases';
      if (subheadEl) subheadEl.textContent = 'Precision-fit acrylic display cases for your sealed product.';
    } else {
      const label = Products.categoryLabel(currentCat);
      document.title = `${label} Acrylic Display Cases | Premium Acrylics 415`;
      if (headingEl) headingEl.textContent = `${label} Cases`;
      if (subheadEl) subheadEl.textContent = `Precision-fit acrylic display cases for ${label} sealed product.`;
    }
  }

  function syncChips() {
    filterBar.querySelectorAll('.filter-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.cat === currentCat);
    });
  }

  function applyFilters() {
    let list = products;
    if (currentCat !== 'all') {
      list = list.filter(p => p.category === currentCat);
    }
    if (currentQuery.trim()) {
      const q = currentQuery.trim().toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q)
      );
    }
    Products.renderGrid(grid, list);
  }

  filterBar.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      currentCat = chip.dataset.cat;
      const url = new URL(window.location);
      if (currentCat === 'all') url.searchParams.delete('category');
      else url.searchParams.set('category', currentCat);
      window.history.replaceState({}, '', url);
      syncChips();
      updateHeading();
      applyFilters();
    });
  });

  searchInput.addEventListener('input', () => {
    currentQuery = searchInput.value;
    applyFilters();
  });

  syncChips();
  updateHeading();
  applyFilters();
})();
