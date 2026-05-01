(function() {
    let initialized = false;
    let appData = null;
    let statsElements = null;
    let featuredCard = null;

    const QUOTES = [
        "Poetry is the rhythm of the soul's deepest whisper.",
        "Words are the threads that weave the fabric of our dreams.",
        "Ink is the silent voice of the heart.",
        "A poem begins as a lump in the throat.",
        "Every sip, a story. Every verse, a feeling.",
        "The poet's eye, in a fine frenzy rolling.",
        "Poetry is when an emotion has found its thought.",
        "Listen to the silence; it has so much to say.",
        "To be a poet is a condition, not a profession.",
        "Painting is silent poetry, and poetry is painting that speaks."
    ];

    let quoteIndex = 0;
    let quoteInterval = null;
    const quoteEls = [null, null];

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
            updateGreeting();
            updateStats();
            pickFeaturedPoem();
            attachEvents();
            setupQuoteRotation();
        });
        initialized = true;
    }

    function updateGreeting() {
        const greetingEl = document.getElementById('greeting');
        if (!greetingEl) return;
        const hour = new Date().getHours();
        let text = 'Good ';
        if (hour < 12) text += 'morning';
        else if (hour < 18) text += 'afternoon';
        else text += 'evening';
        text += ', Soul';
        greetingEl.textContent = text;
    }

    function animateNumber(element, target) {
        const duration = 1000;
        const start = performance.now();
        function step(timestamp) {
            const elapsed = timestamp - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            element.innerText = window.formatNumber(Math.floor(eased * target));
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                element.innerText = window.formatNumber(target);
            }
        }
        requestAnimationFrame(step);
    }

    function updateStats() {
        if (!statsElements) return;
        const poemCount = appData.allPoems.length;
        const collectionCount = appData.collections.length;
        let totalWords = 0, totalReading = 0;
        for (let p of appData.allPoems) {
            totalWords += p.wordCount;
            totalReading += p.readingTime;
        }
        const avgReading = appData.allPoems.length ? Math.round(totalReading / appData.allPoems.length) : 0;

        animateNumber(statsElements.totalPoems, poemCount);
        animateNumber(statsElements.totalCollections, collectionCount);
        animateNumber(statsElements.totalWords, totalWords);

        const avgElement = statsElements.avgReadingTime;
        if (avgElement && avgReading > 0) {
            const duration = 1000;
            const start = performance.now();
            function step(timestamp) {
                const elapsed = timestamp - start;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                avgElement.innerText = Math.floor(eased * avgReading) + ' min';
                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    avgElement.innerText = avgReading + ' min';
                }
            }
            requestAnimationFrame(step);
        } else if (avgElement) {
            avgElement.innerText = '0 min';
        }
    }

    function pickFeaturedPoem() {
        if (!featuredCard) return;
        if (!appData.allPoems.length) {
            featuredCard.innerHTML = '<div class="featured-loading">No poems yet</div>';
            return;
        }
        const poem = appData.allPoems[0];

        featuredCard.classList.remove('poem-enter-active');
        void featuredCard.offsetWidth;
        featuredCard.innerHTML = `
            <div>
                <strong>☕ ${window.escapeHtml(poem.poemName)}</strong>
                <br><span style="font-size:0.9rem;">from ${window.escapeHtml(poem.collectionName)}</span>
                <br><small>${window.escapeHtml(poem.preview.substring(0, 100))}…</small>
            </div>`;
        featuredCard.classList.add('poem-enter-active');

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

    function setupQuoteRotation() {
        const container = document.getElementById('homeQuote');
        if (!container) return;
        const pTags = container.querySelectorAll('.quote-text');
        if (pTags.length !== 2) return;
        quoteEls[0] = pTags[0];
        quoteEls[1] = pTags[1];
        quoteEls[0].textContent = QUOTES[0];
        quoteEls[1].textContent = QUOTES[1];
        quoteIndex = 0;
        if (quoteInterval) clearInterval(quoteInterval);
        quoteInterval = setInterval(rotateQuote, 8000);
    }

    function rotateQuote() {
        const activeEl = quoteEls[0].classList.contains('active') ? quoteEls[0] : quoteEls[1];
        const hiddenEl = activeEl === quoteEls[0] ? quoteEls[1] : quoteEls[0];
        const nextIndex = (quoteIndex + 1) % QUOTES.length;
        hiddenEl.textContent = QUOTES[nextIndex];
        activeEl.classList.remove('active');
        hiddenEl.classList.add('active');
        quoteIndex = nextIndex;
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