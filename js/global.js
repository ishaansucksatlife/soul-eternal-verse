// global.js – preloads all modules, forces home on reload, scrolls to top, disables copying and dev tools, custom modals, cursor fix, progress bar reset, API retry

window.showModule = function(moduleName) {
    document.querySelectorAll('.module-container').forEach(c => c.classList.remove('active'));
    const activeContainer = document.getElementById(`module-${moduleName}`);
    if (activeContainer) activeContainer.classList.add('active');
    document.querySelectorAll('[data-module]').forEach(link => {
        if (link.dataset.module === moduleName) link.classList.add('active');
        else link.classList.remove('active');
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Handle reading progress bar: hide when not in poem-detail
    const progressBar = document.getElementById('readingProgress');
    if (progressBar) {
        if (moduleName === 'poem-detail') {
            const progressFill = document.getElementById('readingProgressBar');
            if (progressFill) progressFill.style.width = '0%';
        } else {
            progressBar.style.display = 'none';
            const progressFill = document.getElementById('readingProgressBar');
            if (progressFill) progressFill.style.width = '0%';
        }
    }
    
    window.dispatchEvent(new CustomEvent('moduleShown', { detail: { module: moduleName } }));
};

const modules = ['home', 'collections', 'about', 'contact', 'poems', 'poem-detail'];

async function preloadAll() {
    const loader = document.getElementById('loading-screen');
    if (!loader) return;
    
    try {
        // Fetch poetry data with retry logic (prevents JSON parse error on HTML fallback)
        let dataRes = null;
        let retries = 3;
        while (retries > 0) {
            try {
                dataRes = await fetch('/api/data');
                if (dataRes.ok) break;
            } catch (e) {
                console.warn(`Fetch attempt failed (${retries} left)`, e);
            }
            retries--;
            await new Promise(r => setTimeout(r, 1000));
        }
        if (!dataRes || !dataRes.ok) throw new Error('Failed to fetch poetry data after retries');
        
        // Check if response is JSON (not HTML)
        const contentType = dataRes.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('API did not return JSON – check Vercel routing');
        }
        
        window.appState.appData = await dataRes.json();

        // Fetch all module assets in parallel
        const modulePromises = modules.map(async (moduleName) => {
            const [htmlRes, cssRes, jsRes] = await Promise.all([
                fetch(`/modules/${moduleName}/${moduleName}.html`),
                fetch(`/modules/${moduleName}/${moduleName}.css`).catch(() => ({ ok: false })),
                fetch(`/modules/${moduleName}/${moduleName}.js`)
            ]);
            const html = await htmlRes.text();
            const css = cssRes.ok ? await cssRes.text() : null;
            const js = await jsRes.text();
            return { moduleName, html, css, js };
        });
        
        const modulesData = await Promise.all(modulePromises);
        
        // Inject all module content into the DOM
        for (const { moduleName, html, css, js } of modulesData) {
            const container = document.getElementById(`module-${moduleName}`);
            if (container) container.innerHTML = html;
            if (css && !document.querySelector(`style[data-module="${moduleName}"]`)) {
                const style = document.createElement('style');
                style.textContent = css;
                style.setAttribute('data-module', moduleName);
                document.head.appendChild(style);
            }
            const script = document.createElement('script');
            script.textContent = js;
            script.setAttribute('data-module', moduleName);
            document.body.appendChild(script);
        }
        
        // Hide loading screen
        loader.classList.add('hide');
        
        // Initialize custom modal system
        initModal();
        
        // Force home module
        window.location.hash = 'home';
        window.showModule('home');
        
        // Small delay to ensure cursor is applied after DOM updates
        setTimeout(() => {
            document.body.style.cursor = 'url("/cursors/static.cur"), auto';
        }, 50);
        
    } catch (err) {
        console.error('Preload failed:', err);
        loader.innerHTML = '<div class="loading-text">Failed to load. Please refresh the page.</div>';
    }
}

// Navigation listeners
document.querySelectorAll('[data-module]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const module = link.dataset.module;
        window.location.hash = module;
        window.showModule(module);
    });
});

window.addEventListener('hashchange', () => {
    let hash = window.location.hash.slice(1) || 'home';
    let module = hash;
    if (hash.startsWith('poems/')) module = 'poems';
    else if (hash.startsWith('poem/')) module = 'poem-detail';
    window.showModule(module);
});

// Theme toggle
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    const isDark = document.body.classList.contains('dark-mode');
    themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    themeToggle.onclick = () => {
        document.body.classList.toggle('dark-mode');
        const nowDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', nowDark);
        themeToggle.innerHTML = nowDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    };
}

// Back to top
const backBtn = document.getElementById('backToTop');
if (backBtn) {
    window.onscroll = () => backBtn.classList.toggle('visible', window.scrollY > 500);
    backBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Random poem
document.getElementById('randomPoemBtn')?.addEventListener('click', async () => {
    if (!window.appState.appData) return;
    const poems = window.appState.appData.allPoems;
    if (!poems.length) return;
    const random = poems[Math.floor(Math.random() * poems.length)];
    const collection = window.appState.appData.collections.find(c => c.name === random.collectionName);
    if (collection) {
        window.appState.currentCollection = collection;
        window.appState.currentPoem = random;
        window.location.hash = `poem/${collection.name}/${random.poemName}`;
        window.showModule('poem-detail');
    }
});

// Focus mode close
document.getElementById('closeFocus')?.addEventListener('click', () => {
    document.getElementById('focusMode')?.classList.remove('active');
});

// ---------- ANTI‑COPY & ANTI‑DEV‑TOOLS PROTECTIONS ----------
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
});
document.addEventListener('selectstart', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    e.preventDefault();
    return false;
});
document.addEventListener('copy', function(e) {
    e.preventDefault();
    return false;
});
document.addEventListener('cut', function(e) {
    e.preventDefault();
    return false;
});
document.addEventListener('paste', function(e) {
    e.preventDefault();
    return false;
});
document.addEventListener('dragstart', function(e) {
    e.preventDefault();
    return false;
});
document.addEventListener('keydown', function(e) {
    if (e.key === 'F12') {
        e.preventDefault();
        return false;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
        e.preventDefault();
        return false;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
        e.preventDefault();
        return false;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        return false;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        return false;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        return false;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        return false;
    }
});

const style = document.createElement('style');
style.textContent = `
    body {
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
    }
    input, textarea {
        user-select: text;
        -webkit-user-select: text;
    }
`;
document.head.appendChild(style);

// ---------- CURSOR FLICKER FIX ----------
document.addEventListener('mousedown', function(e) {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        document.body.style.cursor = 'url("/cursors/static.cur"), auto';
    }
});
document.addEventListener('mouseup', function() {
    document.body.style.cursor = 'url("/cursors/static.cur"), auto';
});

// ---------- CUSTOM MODAL SYSTEM ----------
let modal = null;
let modalCallback = null;

function createModal() {
    const modalDiv = document.createElement('div');
    modalDiv.id = 'custom-modal';
    modalDiv.className = 'custom-modal';
    modalDiv.innerHTML = `
        <div class="custom-modal-overlay"></div>
        <div class="custom-modal-container">
            <div class="custom-modal-header">
                <h3 id="modal-title">Notice</h3>
                <button class="custom-modal-close">&times;</button>
            </div>
            <div class="custom-modal-body">
                <p id="modal-message"></p>
                <div id="modal-input-container" style="display: none;">
                    <input type="text" id="modal-input" placeholder="Enter value...">
                </div>
            </div>
            <div class="custom-modal-footer">
                <button id="modal-cancel-btn" class="modal-btn cancel-btn">Cancel</button>
                <button id="modal-ok-btn" class="modal-btn ok-btn">OK</button>
            </div>
        </div>
    `;
    document.body.appendChild(modalDiv);
    return modalDiv;
}

function initModal() {
    if (!modal) modal = createModal();
    const overlay = modal.querySelector('.custom-modal-overlay');
    const closeBtn = modal.querySelector('.custom-modal-close');
    const cancelBtn = modal.querySelector('#modal-cancel-btn');
    const okBtn = modal.querySelector('#modal-ok-btn');

    function hideModal() {
        modal.classList.remove('active');
        if (modalCallback && modalCallback.cancel) modalCallback.cancel();
        modalCallback = null;
        const inputField = modal.querySelector('#modal-input');
        if (inputField) inputField.value = '';
    }

    overlay.onclick = hideModal;
    closeBtn.onclick = hideModal;
    cancelBtn.onclick = () => {
        if (modalCallback && modalCallback.cancel) modalCallback.cancel();
        hideModal();
    };
    okBtn.onclick = () => {
        const inputField = modal.querySelector('#modal-input');
        if (modalCallback) {
            const value = inputField.style.display !== 'none' ? inputField.value : null;
            modalCallback.ok(value);
        }
        hideModal();
    };
}

window.showAlert = function(message, title = 'Notice') {
    if (!modal) initModal();
    modal.querySelector('#modal-title').innerText = title;
    modal.querySelector('#modal-message').innerText = message;
    modal.querySelector('#modal-input-container').style.display = 'none';
    modal.querySelector('#modal-cancel-btn').style.display = 'none';
    modal.querySelector('#modal-ok-btn').style.display = 'block';
    modal.classList.add('active');
    setTimeout(() => {
        if (modal && modal.classList.contains('active')) {
            modal.classList.remove('active');
            modalCallback = null;
        }
    }, 3000);
};

window.showConfirm = function(message, onOk, onCancel, title = 'Confirm') {
    if (!modal) initModal();
    modal.querySelector('#modal-title').innerText = title;
    modal.querySelector('#modal-message').innerText = message;
    modal.querySelector('#modal-input-container').style.display = 'none';
    modal.querySelector('#modal-cancel-btn').style.display = 'block';
    modal.querySelector('#modal-ok-btn').style.display = 'block';
    modalCallback = { ok: onOk, cancel: onCancel };
    modal.classList.add('active');
};

window.showPrompt = function(message, onOk, onCancel, title = 'Input', defaultValue = '') {
    if (!modal) initModal();
    modal.querySelector('#modal-title').innerText = title;
    modal.querySelector('#modal-message').innerText = message;
    const inputContainer = modal.querySelector('#modal-input-container');
    inputContainer.style.display = 'block';
    const inputField = modal.querySelector('#modal-input');
    inputField.value = defaultValue;
    modal.querySelector('#modal-cancel-btn').style.display = 'block';
    modal.querySelector('#modal-ok-btn').style.display = 'block';
    modalCallback = { ok: onOk, cancel: onCancel };
    modal.classList.add('active');
};

// Start preloading
preloadAll();