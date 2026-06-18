(function() {
    let currentCollection = null;
    let currentPoem = null;
    let currentFontSize = 1.3;
    let speechUtterance = null;
    let isSpeaking = false;
    let allWords = [];
    let focusScrollHandler = null;

    function getBestVoice() {
        const voices = window.speechSynthesis.getVoices();
        if (!voices.length) return null;
        const preferred = voices.filter(v => v.lang === 'en-US' && (
            v.name.includes('Microsoft David') ||
            v.name.includes('Microsoft Zira') ||
            v.name.includes('Samantha') ||
            v.name.includes('Google UK English Female') ||
            v.name.includes('Google UK English Male') ||
            v.name.includes('Daniel')
        ));
        if (preferred.length) return preferred[0];
        const english = voices.filter(v => v.lang.startsWith('en'));
        if (english.length) return english[0];
        return voices[0];
    }

    function splitForSpeech(text) {
        return text.replace(/([.!?])\s+/g, '$1\u200B ');
    }

    function waitForData(callback) {
        if (window.appState && window.appState.appData) {
            callback();
        } else {
            const checkInterval = setInterval(() => {
                if (window.appState && window.appState.appData) {
                    clearInterval(checkInterval);
                    callback();
                }
            }, 50);
        }
    }

    async function init(params) {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        isSpeaking = false;

        waitForData(() => {
            let poemName = null;
            if (params && params.poemName) {
                poemName = params.poemName;
            } else {
                const path = window.location.pathname;
                const match = path.match(/^\/poem\/(.+)$/);
                if (match) poemName = decodeURIComponent(match[1]);
            }

            if (!poemName) {
                window.navigateTo('/collections');
                return;
            }

            const allCollections = window.appState.appData.collections;
            let found = false;
            for (const coll of allCollections) {
                // Try exact match first
                let poem = coll.poems.find(p => p.name === poemName);
                // Fall back to case-insensitive match
                if (!poem) {
                    poem = coll.poems.find(p => p.name.toLowerCase() === poemName.toLowerCase());
                }
                if (poem) {
                    currentCollection = coll;
                    currentPoem = poem;
                    found = true;
                    break;
                }
            }

            if (!found) {
                window.navigateTo('/collections');
                return;
            }

            window.appState.currentCollection = currentCollection;
            window.appState.currentPoem = currentPoem;

            const localProgress = document.getElementById('poemReadingProgress');
            const localProgressBar = document.getElementById('poemReadingProgressBar');
            if (localProgress) localProgress.style.display = 'block';
            if (localProgressBar) localProgressBar.style.width = '0%';

            const globalProgress = document.getElementById('readingProgress');
            if (globalProgress) globalProgress.style.display = 'none';

            loadPoemContent();
            updateNavButtons();
            updateBackLinks();
            setupToolButtons();
            setupKeyboardShortcuts();
            setupScrollToTop();
        });
    }

    function getSortedPoems() {
        const sort = window.appState.poemsSort || 'newest';
        const poems = [...currentCollection.poems];
        switch (sort) {
            case 'newest': return poems.sort((a,b) => (b.order ?? 0) - (a.order ?? 0));
            case 'oldest': return poems.sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
            case 'name-asc': return poems.sort((a,b) => a.name.localeCompare(b.name));
            case 'name-desc': return poems.sort((a,b) => b.name.localeCompare(a.name));
            case 'words-desc': return poems.sort((a,b) => b.wordCount - a.wordCount);
            case 'words-asc': return poems.sort((a,b) => a.wordCount - b.wordCount);
            default: return poems;
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
                coverHtml = `<div class="poem-cover"><img src="/works/${encodeURIComponent(currentCollection.name)}/${encodeURIComponent(currentPoem.name)}/p-cover.png" alt="Poem illustration"></div>`;
            }
            const escapedContent = window.escapeHtml(fullContent);
            const newHTML = `
                <h2 class="poem-detail-title">${window.escapeHtml(currentPoem.name)}</h2>
                ${coverHtml}
                <div class="poem-detail-meta">${window.formatNumber(currentPoem.wordCount)} words · ${window.formatNumber(currentPoem.readingTime)} min read<br>${currentPoem.tags.map(t => `<span class="tag">${window.escapeHtml(t)}</span>`).join(' ')}</div>
                <div class="poem-content" id="poemContentDiv" style="font-size:${currentFontSize}rem;"></div>
                <div class="poem-signature"><i class="fas fa-feather-alt"></i> Soul</div>
            `;
            detailContainer.innerHTML = newHTML;
            detailContainer.classList.add('animate-content');
            detailContainer.addEventListener('animationend', function() {
                this.classList.remove('animate-content');
            }, { once: true });

            const poemContentDiv = document.getElementById('poemContentDiv');
            if (poemContentDiv) {
                const words = escapedContent.split(/(\s+)/);
                poemContentDiv.innerHTML = words.map((seg, idx) => {
                    if (/^\s+$/.test(seg)) return seg;
                    return `<span class="word" data-index="${idx}">${seg}</span>`;
                }).join('');
                allWords = Array.from(poemContentDiv.querySelectorAll('.word'));
                poemContentDiv.style.userSelect = 'none';
                poemContentDiv.style.webkitUserSelect = 'none';
            }

            const scrollDiv = document.querySelector('.poem-detail');
            if (scrollDiv) {
                scrollDiv.onscroll = () => {
                    const percent = (scrollDiv.scrollTop / (scrollDiv.scrollHeight - scrollDiv.clientHeight)) * 100;
                    const bar = document.getElementById('poemReadingProgressBar');
                    if (bar) bar.style.width = Math.min(percent, 100) + '%';
                };
            }
        } catch (err) {
            detailContainer.innerHTML = '<div class="empty-state">Could not load poem content. Please try again.</div>';
        }
    }

    function updateNavButtons() {
        const sorted = getSortedPoems();
        const idx = sorted.findIndex(p => p.name === currentPoem.name);
        const prevBtn = document.getElementById('prevPoemBtn');
        const nextBtn = document.getElementById('nextPoemBtn');
        const prevPoem = idx > 0 ? sorted[idx - 1] : null;
        const nextPoem = idx < sorted.length - 1 ? sorted[idx + 1] : null;
        if (prevBtn) {
            const textSpan = prevBtn.querySelector('.nav-text');
            if (textSpan) textSpan.textContent = prevPoem ? prevPoem.name : '';
            prevBtn.disabled = !prevPoem;
            prevBtn.onclick = () => { if (prevPoem) navigateTo(prevPoem); };
        }
        if (nextBtn) {
            const textSpan = nextBtn.querySelector('.nav-text');
            if (textSpan) textSpan.textContent = nextPoem ? nextPoem.name : '';
            nextBtn.disabled = !nextPoem;
            nextBtn.onclick = () => { if (nextPoem) navigateTo(nextPoem); };
        }
    }

    function navigateTo(poem) {
        if (!currentCollection) return;
        window.navigateTo('/poem/' + encodeURIComponent(poem.name));
    }

    function updateBackLinks() {
        const collectionPath = '/collections/' + window.slugify(currentCollection.name);
        const backLink = document.getElementById('back-to-collection-link');
        if (backLink) {
            backLink.href = collectionPath;
            backLink.onclick = (e) => {
                e.preventDefault();
                window.navigateTo(collectionPath);
            };
        }
        const collectionBreadcrumb = document.getElementById('collection-breadcrumb-link');
        if (collectionBreadcrumb) {
            collectionBreadcrumb.href = collectionPath;
            collectionBreadcrumb.textContent = currentCollection.name;
            collectionBreadcrumb.onclick = (e) => {
                e.preventDefault();
                window.navigateTo(collectionPath);
            };
        }
        document.getElementById('current-poem-title').innerText = currentPoem.name;
    }

    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', handleKeyDown);
    }

    function handleKeyDown(e) {
        const moduleActive = document.getElementById('module-poem-detail')?.classList.contains('active');
        if (!moduleActive) return;
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const prevBtn = document.getElementById('prevPoemBtn');
            if (prevBtn && !prevBtn.disabled) prevBtn.click();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            const nextBtn = document.getElementById('nextPoemBtn');
            if (nextBtn && !nextBtn.disabled) nextBtn.click();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeFocusMode();
        }
    }

    function setupScrollToTop() {
        const scrollBtn = document.getElementById('scrollTopBtn');
        const scrollDiv = document.querySelector('.poem-detail');
        if (!scrollBtn || !scrollDiv) return;
        scrollBtn.addEventListener('click', () => {
            scrollDiv.scrollTo({ top: 0, behavior: 'smooth' });
        });
        scrollDiv.addEventListener('scroll', () => {
            if (scrollDiv.scrollTop > 300) {
                scrollBtn.classList.add('visible');
            } else {
                scrollBtn.classList.remove('visible');
            }
        });
    }

    function openFocusMode() {
        const contentDiv = document.getElementById('poemContentDiv');
        if (!contentDiv) return;
        const focusMode = document.getElementById('poemFocusOverlay');
        const focusContent = document.getElementById('poemFocusContent');
        if (!focusMode || !focusContent) return;

        focusContent.innerHTML = contentDiv.outerHTML.replace('id="poemContentDiv"', '');
        const poemContent = focusContent.querySelector('.poem-content');
        if (poemContent) {
            poemContent.style.setProperty('font-size', '1.8rem', 'important');
            poemContent.style.setProperty('line-height', '2.4');
        }

        focusMode.classList.add('active');

        const mainScroll = document.querySelector('.poem-detail');
        if (mainScroll) {
            focusContent.scrollTop = mainScroll.scrollTop;
        }

        const progressBar = document.getElementById('poemReadingProgressBar');
        if (progressBar) {
            const syncProgress = () => {
                const percent = (focusContent.scrollTop / (focusContent.scrollHeight - focusContent.clientHeight)) * 100;
                progressBar.style.width = Math.min(percent, 100) + '%';
            };
            focusContent.addEventListener('scroll', syncProgress);
            if (focusScrollHandler) {
                focusContent.removeEventListener('scroll', focusScrollHandler);
            }
            focusScrollHandler = syncProgress;
        }
    }

    function closeFocusMode() {
        const focusMode = document.getElementById('poemFocusOverlay');
        const focusContent = document.getElementById('poemFocusContent');
        if (!focusMode || !focusContent) return;

        const mainScroll = document.querySelector('.poem-detail');
        if (mainScroll) {
            mainScroll.scrollTop = focusContent.scrollTop;
        }

        focusMode.classList.remove('active');

        if (focusScrollHandler) {
            focusContent.removeEventListener('scroll', focusScrollHandler);
            focusScrollHandler = null;
        }
    }

    function setupToolButtons() {
        const focusToggle = document.getElementById('focusToggle');
        if (focusToggle) {
            focusToggle.onclick = openFocusMode;
        }

        const focusCloseBtn = document.getElementById('poemFocusCloseBtn');
        if (focusCloseBtn) {
            focusCloseBtn.onclick = closeFocusMode;
        }

        const shareBtn = document.getElementById('sharePoemBtn');
        if (shareBtn) {
            shareBtn.onclick = async () => {
                if (!currentCollection || !currentPoem) return;
                const url = `${window.location.origin}/poem/${encodeURIComponent(currentPoem.name)}`;
                try {
                    await navigator.clipboard.writeText(url);
                    window.showAlert('Link copied to clipboard!', 'Success');
                } catch {
                    window.showPrompt('Copy this link to share:', () => {}, null, 'Share Poem', url);
                }
            };
        }

        const speakBtn = document.getElementById('speakPoemBtn');
        if (speakBtn) {
            let bestVoice = null;
            const loadVoice = () => {
                bestVoice = getBestVoice();
            };
            loadVoice();
            if (window.speechSynthesis.getVoices().length) loadVoice();
            else window.speechSynthesis.onvoiceschanged = loadVoice;

            speakBtn.onclick = () => {
                if (isSpeaking && speechUtterance) {
                    window.speechSynthesis.cancel();
                    clearWordHighlight();
                    isSpeaking = false;
                    speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                    speakBtn.title = 'Read aloud';
                    return;
                }

                const poemContentDiv = document.getElementById('poemContentDiv');
                if (!poemContentDiv) return;
                const rawText = poemContentDiv.textContent.trim();
                if (!rawText) return;

                if (speechUtterance) window.speechSynthesis.cancel();

                const textToSpeak = splitForSpeech(rawText);
                speechUtterance = new SpeechSynthesisUtterance(textToSpeak);
                speechUtterance.rate = 0.85;
                speechUtterance.pitch = 0.95;
                speechUtterance.lang = 'en-US';

                if (bestVoice) {
                    speechUtterance.voice = bestVoice;
                }

                const computeWordPositions = () => {
                    const text = poemContentDiv.textContent || '';
                    allWords = [];
                    const wordSpans = poemContentDiv.querySelectorAll('.word');
                    if (!wordSpans) return;
                    let pos = 0;
                    Array.from(wordSpans).forEach(span => {
                        const wordPos = text.indexOf(span.textContent, pos);
                        if (wordPos !== -1) {
                            span.setAttribute('data-start', wordPos);
                            span.setAttribute('data-end', wordPos + span.textContent.length);
                            allWords.push(span);
                            pos = wordPos + span.textContent.length;
                        }
                    });
                };
                computeWordPositions();

                speechUtterance.onboundary = (e) => {
                    if (e.name === 'word' && allWords.length) {
                        clearWordHighlight();
                        const charIdx = e.charIndex;
                        const currentSpan = allWords.find(span => {
                            const start = parseInt(span.getAttribute('data-start') || '0');
                            const end = parseInt(span.getAttribute('data-end') || '0');
                            return charIdx >= start && charIdx < end;
                        });
                        if (currentSpan) currentSpan.classList.add('speaking');
                    }
                };

                speechUtterance.onend = () => {
                    clearWordHighlight();
                    isSpeaking = false;
                    speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                    speakBtn.title = 'Read aloud';
                };
                speechUtterance.onerror = () => {
                    clearWordHighlight();
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

        const increaseFont = document.getElementById('increaseFontBtn');
        const decreaseFont = document.getElementById('decreaseFontBtn');
        if (increaseFont) {
            increaseFont.onclick = () => {
                currentFontSize = Math.min(2.2, currentFontSize + 0.1);
                applyFontSize();
            };
        }
        if (decreaseFont) {
            decreaseFont.onclick = () => {
                currentFontSize = Math.max(1, currentFontSize - 0.1);
                applyFontSize();
            };
        }
    }

    function applyFontSize() {
        const pc = document.getElementById('poemContentDiv');
        if (pc) pc.style.fontSize = `${currentFontSize}rem`;
    }

    function clearWordHighlight() {
        allWords.forEach(span => span.classList.remove('speaking'));
    }

    window.addEventListener('moduleShown', (e) => {
        if (e.detail.module === 'poem-detail') {
            const params = e.detail.params || {};
            init(params);
        }
    });

    if (document.getElementById('module-poem-detail')?.classList.contains('active')) {
        const params = window.getRouteParams ? window.getRouteParams() : {};
        init(params);
    }
})();