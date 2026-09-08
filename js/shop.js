/* Premium Acrylics 415 — shop page: filter + search */

(async () => {
  const grid = document.getElementById('productGrid');
  const filterBar = document.getElementById('filterBar');
  const searchInput = document.getElementById('searchInput');

  const products = await Products.all();
  const params = new URLSearchParams(window.location.search);
  let currentCat = params.get('category') || 'all';
  let currentQuery = '';

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
      applyFilters();
    });
  });

  searchInput.addEventListener('input', () => {
    currentQuery = searchInput.value;
    applyFilters();
  });

  syncChips();
  applyFilters();
})();
