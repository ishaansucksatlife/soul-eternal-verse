(function() {
    let initialized = false;
    let appData = null;
    let statsElements = null;
    let featuredCard = null;

    function init() {
        if (initialized) return;
        appData = window.appState.appData;
        if (!appData) {
            setTimeout(init, 50);
            return;
        }
        statsElements = {
            totalPoems: document.getElementById('totalPoems'),
            totalCollections: document.getElementById('totalCollections'),
            totalWords: document.getElementById('totalWords'),
            avgReadingTime: document.getElementById('avgReadingTime')
        };
        featuredCard = document.getElementById('featuredPoemCard');

        requestAnimationFrame(() => {
            updateStats();
            pickFeaturedPoem();
            attachEvents();
        });
        initialized = true;
    }

    function updateStats() {
        if (!statsElements) return;
        statsElements.totalPoems.innerText = window.formatNumber(appData.allPoems.length);
        statsElements.totalCollections.innerText = window.formatNumber(appData.collections.length);
        let totalWords = 0, totalReading = 0;
        for (let p of appData.allPoems) {
            totalWords += p.wordCount;
            totalReading += p.readingTime;
        }
        statsElements.totalWords.innerText = window.formatNumber(totalWords);
        const avg = appData.allPoems.length ? Math.round(totalReading / appData.allPoems.length) + ' min' : '0 min';
        statsElements.avgReadingTime.innerText = avg;
    }

    function pickFeaturedPoem() {
        if (!featuredCard) return;
        if (!appData.allPoems.length) {
            featuredCard.innerHTML = '<div class="featured-loading">No poems yet</div>';
            return;
        }
        const randomIndex = Math.floor(Math.random() * appData.allPoems.length);
        const poem = appData.allPoems[randomIndex];
        featuredCard.innerHTML = `<div><strong>☕ ${window.escapeHtml(poem.poemName)}</strong><br><span style="font-size:0.9rem;">from ${window.escapeHtml(poem.collectionName)}</span><br><small>${window.escapeHtml(poem.preview.substring(0, 100))}…</small></div>`;
        featuredCard.onclick = () => {
            const coll = appData.collections.find(c => c.name === poem.collectionName);
            if (coll) {
                window.appState.currentCollection = coll;
                window.appState.currentPoem = {
                    name: poem.poemName,
                    tags: poem.tags,
                    wordCount: poem.wordCount,
                    readingTime: poem.readingTime,
                    hasCover: poem.hasCover,
                    preview: poem.preview
                };
                window.location.hash = `poem/${coll.name}/${poem.poemName}`;
                window.showModule('poem-detail');
            }
        };
    }

    function attachEvents() {
        const btnCollections = document.getElementById('btn-collections');
        const btnAbout = document.getElementById('btn-about');
        const btnContact = document.getElementById('btn-contact');
        if (btnCollections) btnCollections.onclick = () => { window.location.hash = 'collections'; window.showModule('collections'); };
        if (btnAbout) btnAbout.onclick = () => { window.location.hash = 'about'; window.showModule('about'); };
        if (btnContact) btnContact.onclick = () => { window.location.hash = 'contact'; window.showModule('contact'); };
    }

    init();
})();