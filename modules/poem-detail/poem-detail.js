(function() {
    let currentCollection = null;
    let currentPoem = null;
    let currentFontSize = 1.3;
    let speechUtterance = null;
    let isSpeaking = false;

    async function init() {
        const hash = window.location.hash.slice(1);
        const match = hash.match(/^poem\/([^\/]+)\/(.+)$/);
        if (match) {
            const collName = decodeURIComponent(match[1]);
            const poemName = decodeURIComponent(match[2]);
            currentCollection = window.appState.appData.collections.find(c => c.name === collName);
            if (!currentCollection) {
                window.location.hash = 'collections';
                window.showModule('collections');
                return;
            }
            currentPoem = currentCollection.poems.find(p => p.name === poemName);
            if (!currentPoem) {
                window.location.hash = `poems/${encodeURIComponent(collName)}`;
                window.showModule('poems');
                return;
            }
            window.appState.currentCollection = currentCollection;
            window.appState.currentPoem = currentPoem;
            
            // Reading progress bar
            const progressBar = document.getElementById('readingProgress');
            if (progressBar) progressBar.style.display = 'block';
            // Reset progress
            const progressFill = document.getElementById('readingProgressBar');
            if (progressFill) progressFill.style.width = '0%';
            
            await loadPoemContent();
            updateNavButtons();
            updateBackLinks();
            setupToolButtons();
        }
    }

    async function loadPoemContent() {
        const detailContainer = document.getElementById('poem-detail');
        detailContainer.innerHTML = '<div class="loading"><div class="spinner"></div>Unfolding the poem...</div>';
        try {
            const res = await fetch(`/api/poem/${encodeURIComponent(currentCollection.name)}/${encodeURIComponent(currentPoem.name)}`);
            const data = await res.json();
            const fullContent = data.content;
            let coverHtml = '';
            if (currentPoem.hasCover) {
                coverHtml = `<div class="poem-cover"><img src="/works/${encodeURIComponent(currentCollection.name)}/${encodeURIComponent(currentPoem.name)}/p-cover.png" alt="Poem illustration" loading="lazy"></div>`;
            }
            detailContainer.innerHTML = `
                <h2 class="poem-detail-title">${window.escapeHtml(currentPoem.name)}</h2>
                ${coverHtml}
                <div class="poem-detail-meta">${window.formatNumber(currentPoem.wordCount)} words · ${window.formatNumber(currentPoem.readingTime)} min read<br>${currentPoem.tags.map(t => `<span class="tag">${window.escapeHtml(t)}</span>`).join(' ')}</div>
                <div class="poem-content" style="font-size:${currentFontSize}rem; white-space: pre-wrap;">${window.escapeHtml(fullContent)}</div>
                <div class="poem-signature"><i class="fas fa-feather-alt"></i> Soul</div>
            `;
            // Anti-copy
            const poemContentDiv = document.querySelector('.poem-content');
            if (poemContentDiv) {
                poemContentDiv.style.userSelect = 'none';
                poemContentDiv.style.webkitUserSelect = 'none';
            }
            // Reading progress scroll handler
            const scrollDiv = document.querySelector('.poem-detail');
            if (scrollDiv) {
                scrollDiv.onscroll = () => {
                    const percent = (scrollDiv.scrollTop / (scrollDiv.scrollHeight - scrollDiv.clientHeight)) * 100;
                    const progressFill = document.getElementById('readingProgressBar');
                    if (progressFill) progressFill.style.width = percent + '%';
                };
            }
        } catch (err) {
            detailContainer.innerHTML = '<div class="empty-state">Could not load poem content. Please try again.</div>';
        }
    }

    function updateNavButtons() {
        const poems = currentCollection.poems;
        const idx = poems.findIndex(p => p.name === currentPoem.name);
        const prevBtn = document.getElementById('prevPoemBtn');
        const nextBtn = document.getElementById('nextPoemBtn');
        if (prevBtn) {
            prevBtn.onclick = () => {
                if (idx > 0) {
                    const prev = poems[idx - 1];
                    window.location.hash = `poem/${encodeURIComponent(currentCollection.name)}/${encodeURIComponent(prev.name)}`;
                    window.showModule('poem-detail');
                }
            };
        }
        if (nextBtn) {
            nextBtn.onclick = () => {
                if (idx < poems.length - 1) {
                    const next = poems[idx + 1];
                    window.location.hash = `poem/${encodeURIComponent(currentCollection.name)}/${encodeURIComponent(next.name)}`;
                    window.showModule('poem-detail');
                }
            };
        }
    }

    function updateBackLinks() {
        const collectionHref = `#poems/${encodeURIComponent(currentCollection.name)}`;
        const backLink = document.getElementById('back-to-collection-link');
        if (backLink) backLink.href = collectionHref;
        const collectionBreadcrumb = document.getElementById('collection-breadcrumb-link');
        if (collectionBreadcrumb) {
            collectionBreadcrumb.href = collectionHref;
            collectionBreadcrumb.textContent = currentCollection.name;
        }
        document.getElementById('current-poem-title').innerText = currentPoem.name;
    }

    function setupToolButtons() {
        // Focus mode
        const focusToggle = document.getElementById('focusToggle');
        if (focusToggle) {
            focusToggle.onclick = () => {
                const contentDiv = document.querySelector('#poem-detail .poem-content');
                if (contentDiv) {
                    const contentHTML = contentDiv.innerHTML;
                    const focusContent = document.getElementById('focusModeContent');
                    focusContent.innerHTML = `<div class="poem-content" style="font-size:1.6rem; line-height:2.2; white-space: pre-wrap;">${contentHTML}</div>`;
                    document.getElementById('focusMode').classList.add('active');
                    focusContent.style.overflowY = 'auto';
                    focusContent.style.maxHeight = '90vh';
                }
            };
        }
        // Share button
        const shareBtn = document.getElementById('sharePoemBtn');
        if (shareBtn) {
            shareBtn.onclick = async () => {
                if (!currentCollection || !currentPoem) return;
                const url = `${window.location.origin}${window.location.pathname}#poem/${encodeURIComponent(currentCollection.name)}/${encodeURIComponent(currentPoem.name)}`;
                try {
                    await navigator.clipboard.writeText(url);
                    window.showAlert('Link to this poem copied to clipboard!', 'Success');
                } catch (err) {
                    window.showPrompt('Copy this link to share:', (value) => {}, null, 'Share Poem', url);
                }
            };
        }
        // Speak / Stop button
        const speakBtn = document.getElementById('speakPoemBtn');
        if (speakBtn) {
            speakBtn.onclick = () => {
                const content = document.querySelector('#poem-detail .poem-content')?.innerText;
                if (!content) return;
                
                if (isSpeaking && speechUtterance) {
                    window.speechSynthesis.cancel();
                    isSpeaking = false;
                    speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                    speakBtn.title = 'Read aloud';
                    return;
                }
                
                if (speechUtterance) window.speechSynthesis.cancel();
                speechUtterance = new SpeechSynthesisUtterance(content);
                speechUtterance.rate = 0.9;
                speechUtterance.pitch = 1.1;
                speechUtterance.onend = () => {
                    isSpeaking = false;
                    speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                    speakBtn.title = 'Read aloud';
                };
                speechUtterance.onerror = () => {
                    isSpeaking = false;
                    speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                    speakBtn.title = 'Read aloud';
                };
                window.speechSynthesis.speak(speechUtterance);
                isSpeaking = true;
                speakBtn.innerHTML = '<i class="fas fa-stop"></i>';
                speakBtn.title = 'Stop reading';
            };
        }
        // Font size controls
        const increaseFont = document.getElementById('increaseFontBtn');
        if (increaseFont) {
            increaseFont.onclick = () => {
                currentFontSize = Math.min(2.2, currentFontSize + 0.1);
                const pc = document.querySelector('#poem-detail .poem-content');
                if (pc) pc.style.fontSize = `${currentFontSize}rem`;
            };
        }
        const decreaseFont = document.getElementById('decreaseFontBtn');
        if (decreaseFont) {
            decreaseFont.onclick = () => {
                currentFontSize = Math.max(1, currentFontSize - 0.1);
                const pc = document.querySelector('#poem-detail .poem-content');
                if (pc) pc.style.fontSize = `${currentFontSize}rem`;
            };
        }
    }

    window.addEventListener('moduleShown', (e) => {
        if (e.detail.module === 'poem-detail') init();
    });
    if (document.getElementById('module-poem-detail').classList.contains('active')) init();
})();