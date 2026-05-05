(function() {
    let appData = window.appState.appData;
    let selectedTags = new Set();
    let currentSort = 'newest';

    function init() {
        if (!appData) {
            appData = window.appState.appData;
            if (!appData) return;
        }
        renderCollectionTags();
        renderAllCollections();
    }

    function renderCollectionTags() {
        const container = document.getElementById('collectionFilterTags');
        if (!container) return;
        container.innerHTML = '';
        if (!appData.allCollectionTags.length) {
            container.innerHTML = '<span style="opacity:0.6;">No tags available</span>';
            return;
        }
        appData.allCollectionTags.forEach(tag => {
            const btn = document.createElement('div');
            btn.className = 'filter-tag';
            btn.textContent = tag;
            if (selectedTags.has(tag)) btn.classList.add('active');
            btn.onclick = () => {
                if (selectedTags.has(tag)) {
                    selectedTags.delete(tag);
                    btn.classList.remove('active');
                } else {
                    selectedTags.add(tag);
                    btn.classList.add('active');
                }
                applyTagFilter();
            };
            container.appendChild(btn);
        });
    }

    function getSortedCollections() {
        const colls = [...appData.collections];
        switch (currentSort) {
            case 'newest': return colls.sort((a, b) => (b.order ?? 0) - (a.order ?? 0));
            case 'oldest': return colls.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            case 'name-asc': return colls.sort((a, b) => a.name.localeCompare(b.name));
            case 'name-desc': return colls.sort((a, b) => b.name.localeCompare(a.name));
            case 'poems-desc': return colls.sort((a, b) => b.poems.length - a.poems.length);
            case 'poems-asc': return colls.sort((a, b) => a.poems.length - b.poems.length);
            default: return colls;
        }
    }

    function renderCollectionsGrid(collections) {
        const grid = document.getElementById('collections-grid');
        const empty = document.getElementById('collections-empty');
        if (!collections.length) {
            grid.innerHTML = '';
            empty.style.display = 'block';
            return;
        }
        empty.style.display = 'none';
        grid.innerHTML = collections.map(coll => {
            const coverUrl = coll.hasCover ? `/works/${encodeURIComponent(coll.name)}/c-cover.png` : null;
            const bgStyle = coverUrl
                ? `background-image: url('${coverUrl}'); background-size: cover; background-position: center;`
                : 'background: var(--gradient);';
            return `
                <div class="collection-card" data-collection-name="${encodeURIComponent(coll.name)}">
                    <div class="collection-img" style="${bgStyle}">
                        <div class="collection-overlay">
                            <h3 class="collection-title">${window.escapeHtml(coll.name)}</h3>
                        </div>
                    </div>
                    <div class="collection-info">
                        <p>${window.escapeHtml(coll.description.substring(0, 120))}${coll.description.length > 120 ? '…' : ''}</p>
                        <div class="collection-tags">
                            ${coll.tags.map(t => `<span class="tag">${window.escapeHtml(t)}</span>`).join('')}
                        </div>
                        <div class="collection-count">📖 ${coll.poems.length} poems</div>
                    </div>
                </div>
            `;
        }).join('');

        const cards = grid.querySelectorAll('.collection-card');
        cards.forEach((card, i) => {
            card.style.animationDelay = `${i * 0.08}s`;

            card.addEventListener('animationend', function() {
                this.style.opacity = '1';
                this.style.transform = 'translateY(0) scale(1)';
                this.style.animation = 'none';
            }, { once: true });

            card.onclick = () => {
                const collName = decodeURIComponent(card.getAttribute('data-collection-name'));
                const coll = appData.collections.find(c => c.name === collName);
                if (coll) {
                    window.appState.currentCollection = coll;
                    window.location.hash = `poems/${encodeURIComponent(coll.name)}`;
                    window.showModule('poems');
                }
            };
        });
    }

    function renderAllCollections() {
        renderCollectionsGrid(getSortedCollections());
    }

    function applyTagFilter() {
        const sorted = getSortedCollections();
        if (selectedTags.size === 0) {
            renderCollectionsGrid(sorted);
        } else {
            const filtered = sorted.filter(coll =>
                coll.tags.some(tag => selectedTags.has(tag))
            );
            renderCollectionsGrid(filtered);
        }
    }

    const searchInput = document.getElementById('collection-search');
    const clearBtn = document.getElementById('clear-search-btn');

    function performSearch() {
        const query = searchInput.value.toLowerCase();
        let filtered = getSortedCollections();
        if (query) {
            filtered = filtered.filter(c =>
                c.name.toLowerCase().includes(query) ||
                c.description.toLowerCase().includes(query)
            );
        }
        if (selectedTags.size > 0) {
            filtered = filtered.filter(c => c.tags.some(t => selectedTags.has(t)));
        }
        renderCollectionsGrid(filtered);
    }

    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearBtn.classList.toggle('visible', this.value.length > 0);
            performSearch();
        });
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            searchInput.value = '';
            clearBtn.classList.remove('visible');
            performSearch();
        });
    }

    const searchBtn = document.getElementById('search-collections-btn');
    if (searchBtn) searchBtn.onclick = performSearch;

    const sortToggleBtn = document.getElementById('sortToggleBtn');
    const sortDropdown = document.getElementById('sortDropdown');
    const sortOptions = document.querySelectorAll('.sort-option');

    if (sortToggleBtn && sortDropdown) {
        sortToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sortDropdown.classList.toggle('active');
            const filterPanel = document.getElementById('filterPanel');
            if (filterPanel) filterPanel.classList.remove('active');
        });
        document.addEventListener('click', (e) => {
            if (!sortToggleBtn.contains(e.target) && !sortDropdown.contains(e.target)) {
                sortDropdown.classList.remove('active');
            }
        });
        sortOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                sortOptions.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                currentSort = opt.getAttribute('data-sort');
                sortDropdown.classList.remove('active');
                if (selectedTags.size > 0 || searchInput.value.trim()) {
                    performSearch();
                } else {
                    renderAllCollections();
                }
            });
        });
    }

    const filterToggle = document.getElementById('filterToggle');
    const filterPanel = document.getElementById('filterPanel');
    if (filterToggle) {
        filterToggle.onclick = (e) => {
            e.stopPropagation();
            filterPanel.classList.toggle('active');
            sortDropdown.classList.remove('active');
        };
    }

    const clearFilters = document.getElementById('clearCollectionFilters');
    if (clearFilters) {
        clearFilters.onclick = () => {
            selectedTags.clear();
            document.querySelectorAll('#collectionFilterTags .filter-tag').forEach(btn => btn.classList.remove('active'));
            performSearch();
        };
    }


    window.addEventListener('moduleShown', (e) => {
        if (e.detail.module === 'collections') init();
    });


    if (document.getElementById('module-collections')?.classList.contains('active')) {
        init();
    }
})();
