(function() {
    let currentCollection = null;
    let selectedTags = new Set();
    let currentSort = 'newest';
    window.appState.poemsSort = currentSort;

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
        applyFilters();
    }

    function getSortedPoems() {
        const poems = [...currentCollection.poems];
        switch (currentSort) {
            case 'newest': return poems.sort((a, b) => (b.order ?? 0) - (a.order ?? 0));
            case 'oldest': return poems.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            case 'name-asc': return poems.sort((a, b) => a.name.localeCompare(b.name));
            case 'name-desc': return poems.sort((a, b) => b.name.localeCompare(a.name));
            case 'words-desc': return poems.sort((a, b) => b.wordCount - a.wordCount);
            case 'words-asc': return poems.sort((a, b) => a.wordCount - b.wordCount);
            default: return poems;
        }
    }

    function applyFilters() {
        const query = document.getElementById('poem-search')?.value.toLowerCase() || '';
        let filtered = getSortedPoems();
        if (query) {
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(query) ||
                (p.preview || '').toLowerCase().includes(query)
            );
        }
        if (selectedTags.size > 0) {
            filtered = filtered.filter(p => p.tags.some(t => selectedTags.has(t)));
        }
        renderPoemsList(filtered);
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
            <div class="poem-item" data-poem-name="${encodeURIComponent(poem.name)}">
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


        container.querySelectorAll('.poem-item').forEach(item => {
            item.addEventListener('animationend', function() {
                this.style.opacity = '1';
                this.style.transform = 'translateY(0)';
                this.style.animation = 'none';
            }, { once: true });
        });


        document.querySelectorAll('.poem-item').forEach((item, i) => {
            item.style.animationDelay = `${i * 0.04}s`;
            item.onclick = () => {
                const poemName = decodeURIComponent(item.getAttribute('data-poem-name'));
                const poem = currentCollection.poems.find(p => p.name === poemName);
                if (poem) {
                    window.appState.currentPoem = poem;
                    window.location.hash = `poem/${encodeURIComponent(currentCollection.name)}/${encodeURIComponent(poem.name)}`;
                    window.showModule('poem-detail');
                }
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
        Array.from(allTags).sort().forEach(tag => {
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
                applyFilters();
            };
            container.appendChild(btn);
        });
    }

    const searchInput = document.getElementById('poem-search');
    if (searchInput) searchInput.addEventListener('input', applyFilters);

    const searchBtn = document.getElementById('search-poems-btn');
    if (searchBtn) searchBtn.onclick = applyFilters;

    const sortToggleBtn = document.getElementById('poemSortToggleBtn');
    const sortDropdown = document.getElementById('poemSortDropdown');
    const sortOptions = document.querySelectorAll('#poemSortDropdown .sort-option');

    if (sortToggleBtn && sortDropdown) {
        sortToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sortDropdown.classList.toggle('active');
            document.getElementById('poemFilterPanel')?.classList.remove('active');
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
                window.appState.poemsSort = currentSort;
                sortDropdown.classList.remove('active');
                applyFilters();
            });
        });
    }

    const filterToggle = document.getElementById('poemFilterToggle');
    const filterPanel = document.getElementById('poemFilterPanel');
    if (filterToggle) {
        filterToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            filterPanel.classList.toggle('active');
            sortDropdown.classList.remove('active');
        });
    }

    const clearFilters = document.getElementById('clearPoemFilters');
    if (clearFilters) {
        clearFilters.onclick = () => {
            selectedTags.clear();
            document.querySelectorAll('#poemFilterTags .filter-tag').forEach(btn => btn.classList.remove('active'));
            applyFilters();
        };
    }

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
