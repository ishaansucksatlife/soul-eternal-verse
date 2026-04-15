(function() {
    let currentCollection = null;
    let selectedTags = new Set();

    function init() {
        const hash = window.location.hash.slice(1);
        const match = hash.match(/^poems\/(.+)$/);
        if (match) {
            const collName = decodeURIComponent(match[1]);
            currentCollection = window.appState.appData.collections.find(c => c.name === collName);
            if (!currentCollection) {
                window.location.hash = 'collections';
                window.showModule('collections');
                return;
            }
            window.appState.currentCollection = currentCollection;
            render();
        }
    }

    function render() {
        document.getElementById('collection-title').innerText = currentCollection.name;
        document.getElementById('current-collection-name').innerText = currentCollection.name;
        renderPoemFilterTags(currentCollection.poems);
        applyPoemTagFilter();
    }

    function renderPoemsList(poems) {
        const container = document.getElementById('poems-list');
        const empty = document.getElementById('poems-empty');
        if (!poems.length) {
            container.innerHTML = '';
            empty.style.display = 'block';
            return;
        }
        empty.style.display = 'none';
        container.innerHTML = poems.map(poem => `
            <div class="poem-item" data-poem='${JSON.stringify(poem)}'>
                <h3 class="poem-title">${window.escapeHtml(poem.name)}</h3>
                <div class="poem-stats">
                    <span>${window.formatNumber(poem.wordCount)} words</span>
                    <span>${window.formatNumber(poem.readingTime)} min read</span>
                </div>
                <div class="poem-meta">
                    ${poem.tags.map(t => `<span class="tag">${window.escapeHtml(t)}</span>`).join('')}
                </div>
                <p class="poem-preview">${window.escapeHtml(poem.preview)}</p>
            </div>
        `).join('');
        document.querySelectorAll('.poem-item').forEach(item => {
            item.onclick = () => {
                const poem = JSON.parse(item.getAttribute('data-poem'));
                window.appState.currentPoem = poem;
                window.location.hash = `poem/${encodeURIComponent(currentCollection.name)}/${encodeURIComponent(poem.name)}`;
                window.showModule('poem-detail');
            };
        });
    }

    function renderPoemFilterTags(poems) {
        const container = document.getElementById('poemFilterTags');
        if (!container) return;
        const allTags = new Set();
        poems.forEach(p => p.tags.forEach(t => allTags.add(t)));
        container.innerHTML = '';
        if (allTags.size === 0) {
            container.innerHTML = '<span style="opacity:0.6;">No tags available</span>';
            return;
        }
        Array.from(allTags).forEach(tag => {
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
                applyPoemTagFilter();
            };
            container.appendChild(btn);
        });
    }

    function applyPoemTagFilter() {
        if (!currentCollection) return;
        if (selectedTags.size === 0) {
            renderPoemsList(currentCollection.poems);
        } else {
            const filtered = currentCollection.poems.filter(poem =>
                poem.tags.some(tag => selectedTags.has(tag))
            );
            renderPoemsList(filtered);
        }
    }

    // Search integration
    const searchBtn = document.getElementById('search-poems-btn');
    if (searchBtn) {
        searchBtn.onclick = () => {
            if (!currentCollection) return;
            const query = document.getElementById('poem-search').value.toLowerCase();
            let filtered = currentCollection.poems.filter(p =>
                p.name.toLowerCase().includes(query) ||
                (p.preview || '').toLowerCase().includes(query)
            );
            if (selectedTags.size > 0) {
                filtered = filtered.filter(p => p.tags.some(t => selectedTags.has(t)));
            }
            renderPoemsList(filtered);
        };
    }
    const searchInput = document.getElementById('poem-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            if (!currentCollection) return;
            const query = this.value.toLowerCase();
            if (!query && selectedTags.size === 0) {
                renderPoemsList(currentCollection.poems);
            } else {
                let filtered = currentCollection.poems.filter(p =>
                    p.name.toLowerCase().includes(query) ||
                    (p.preview || '').toLowerCase().includes(query)
                );
                if (selectedTags.size > 0) {
                    filtered = filtered.filter(p => p.tags.some(t => selectedTags.has(t)));
                }
                renderPoemsList(filtered);
            }
        });
    }

    const filterToggle = document.getElementById('poemFilterToggle');
    if (filterToggle) {
        filterToggle.onclick = () => {
            document.getElementById('poemFilterPanel').classList.toggle('active');
        };
    }
    const clearFilters = document.getElementById('clearPoemFilters');
    if (clearFilters) {
        clearFilters.onclick = () => {
            selectedTags.clear();
            document.querySelectorAll('#poemFilterTags .filter-tag').forEach(btn => btn.classList.remove('active'));
            renderPoemsList(currentCollection.poems);
        };
    }

    // Navigation (back buttons)
    const backToCollections = document.getElementById('back-to-collections');
    if (backToCollections) backToCollections.onclick = () => { window.location.hash = 'collections'; window.showModule('collections'); };
    const breadcrumbHome = document.getElementById('breadcrumb-home-2');
    if (breadcrumbHome) breadcrumbHome.onclick = () => { window.location.hash = 'home'; window.showModule('home'); };
    const breadcrumbCollections = document.getElementById('breadcrumb-collections');
    if (breadcrumbCollections) breadcrumbCollections.onclick = () => { window.location.hash = 'collections'; window.showModule('collections'); };

    window.addEventListener('moduleShown', (e) => {
        if (e.detail.module === 'poems') init();
    });
    if (document.getElementById('module-poems').classList.contains('active')) init();
})();