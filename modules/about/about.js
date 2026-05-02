(function() {
    let quoteIndex = 0;
    let quoteInterval = null;
    let signatureTyped = false;

    const quotes = [
        "\u201cSome scars never heal. They just learn to breathe in the dark.\u201d",
        "\u201cYou don't get over grief. You grow around it like roots through concrete.\u201d",
        "\u201cI am not what happened to me. I am what I chose to become after.\u201d",
        "\u201cHealing is not linear. It is a spiral. You will pass the same pain twice, but from a different angle.\u201d",
        "\u201cThe hardest person to forgive is the one you see in the mirror at 3 a.m.\u201d",
        "\u201cLove doesn't leave you broken. It leaves you wide open. There is a difference.\u201d",
        "\u201cYou were never too much. They were just not enough.\u201d"
    ];

    function resetEntranceAnimations() {
        document.querySelectorAll('.entrance-item').forEach(el => {
            el.classList.remove('entrance-item');
            void el.offsetWidth;
            el.classList.add('entrance-item');
        });
    }

    function initQuote() {
        const container = document.querySelector('.about-quote .quote-text-container');
        if (!container) return;
        const pTags = container.querySelectorAll('.quote-text');
        if (pTags.length !== 2) return;
        pTags[0].textContent = quotes[0];
        pTags[1].textContent = quotes[1 % quotes.length];
        quoteIndex = 0;
        if (quoteInterval) clearInterval(quoteInterval);
        quoteInterval = setInterval(() => {
            const active = container.querySelector('.quote-text.active');
            const hidden = active === pTags[0] ? pTags[1] : pTags[0];
            quoteIndex = (quoteIndex + 1) % quotes.length;
            hidden.textContent = quotes[quoteIndex];
            active.classList.remove('active');
            hidden.classList.add('active');
        }, 6000);
    }

    function generateAmbientIcons() {
        const container = document.getElementById('ambientIcons');
        if (!container) return;
        container.innerHTML = '';


        for (let i = 0; i < 14; i++) {
            const el = document.createElement('div');
            el.className = 'ambient-icon fas fa-feather-alt';
            el.style.left = Math.random() * 100 + '%';
            el.style.setProperty('--start-offset', Math.random() * 0.3 + 'vh');
            el.style.animationDelay = Math.random() * 20 + 's';
            el.style.animationDuration = (18 + Math.random() * 30) + 's';
            container.appendChild(el);
        }


        for (let i = 0; i < 6; i++) {
            const el = document.createElement('div');
            el.className = 'ambient-icon fas fa-coffee coffee-cup';
            el.style.left = Math.random() * 100 + '%';
            el.style.animationDelay = Math.random() * 25 + 's';
            el.style.animationDuration = (22 + Math.random() * 35) + 's';
            container.appendChild(el);
        }
    }

    function updateStats() {
        const statsEl = document.getElementById('aboutStats');
        if (!statsEl || !window.appState.appData) return;
        const data = window.appState.appData;
        const poemCount = data.allPoems.length;
        const collCount = data.collections.length;
        let wordCount = 0;
        data.allPoems.forEach(p => { wordCount += p.wordCount; });
        statsEl.textContent = `Soul has woven ${poemCount} poems into ${collCount} collections, spilling ${window.formatNumber(wordCount)} words onto the page.`;
    }

    function typeSignature() {
        if (signatureTyped) return;
        signatureTyped = true;
        const strongEl = document.getElementById('signatureText');
        if (!strongEl) return;
        const fullText = '\u2014 Soul';
        strongEl.textContent = '';
        let i = 0;
        const interval = setInterval(() => {
            strongEl.textContent += fullText.charAt(i);
            i++;
            if (i >= fullText.length) {
                clearInterval(interval);
            }
        }, 120);
    }

    function init() {
        resetEntranceAnimations();
        generateAmbientIcons();
        initQuote();
        updateStats();

        const signatureEl = document.getElementById('aboutSignature');
        if (signatureEl) {
            const onAnimationEnd = () => {
                typeSignature();
                signatureEl.removeEventListener('animationend', onAnimationEnd);
            };
            signatureEl.addEventListener('animationend', onAnimationEnd);
        }
    }

    window.addEventListener('moduleShown', function(e) {
        if (e.detail.module === 'about') {
            quoteIndex = 0;
            signatureTyped = false;
            init();
        }
    });

    if (document.getElementById('module-about') && document.getElementById('module-about').classList.contains('active')) {
        init();
    }
})();
