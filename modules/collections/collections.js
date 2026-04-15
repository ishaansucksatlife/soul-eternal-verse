(function() {
    let appData = window.appState.appData;
    let selectedTags = new Set();

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

    function applyTagFilter() {
        if (selectedTags.size === 0) {
            renderAllCollections();
        } else {
            const filtered = appData.collections.filter(coll =>
                coll.tags.some(tag => selectedTags.has(tag))
            );
            renderCollectionsGrid(filtered);
        }
    }

    function renderAllCollections() {
        renderCollectionsGrid(appData.collections);
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
        grid.innerHTML = collections.map((coll, index) => {
            const coverUrl = coll.hasCover ? `/works/${encodeURIComponent(coll.name)}/c-cover.png` : null;
            const bgStyle = coverUrl ? `background-image: url('${coverUrl}'); background-size: cover; background-position: center;` : 'background: var(--gradient);';
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
        
        document.querySelectorAll('.collection-card').forEach(card => {
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

    // Search and filter
    const searchBtn = document.getElementById('search-collections-btn');
    if (searchBtn) {
        searchBtn.onclick = () => {
            const query = document.getElementById('collection-search').value.toLowerCase();
            const filtered = appData.collections.filter(c =>
                c.name.toLowerCase().includes(query) ||
                c.description.toLowerCase().includes(query)
            );
            renderCollectionsGrid(filtered);
        };
    }
    const searchInput = document.getElementById('collection-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            if (!this.value && selectedTags.size === 0) renderAllCollections();
            else if (!this.value && selectedTags.size > 0) applyTagFilter();
            else {
                const query = this.value.toLowerCase();
                let filtered = appData.collections.filter(c =>
                    c.name.toLowerCase().includes(query) ||
                    c.description.toLowerCase().includes(query)
                );
                if (selectedTags.size > 0) {
                    filtered = filtered.filter(c => c.tags.some(t => selectedTags.has(t)));
                }
                renderCollectionsGrid(filtered);
            }
        });
    }

    const filterToggle = document.getElementById('filterToggle');
    if (filterToggle) {
        filterToggle.onclick = () => {
            document.getElementById('filterPanel').classList.toggle('active');
        };
    }
    const clearFilters = document.getElementById('clearCollectionFilters');
    if (clearFilters) {
        clearFilters.onclick = () => {
            selectedTags.clear();
            document.querySelectorAll('#collectionFilterTags .filter-tag').forEach(btn => btn.classList.remove('active'));
            renderAllCollections();
        };
    }

    renderCollectionTags();
    renderAllCollections();
})();