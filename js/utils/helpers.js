// Shared utility functions
const moduleCache = { html: {}, css: {}, js: {} };

window.escapeHtml = function(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m]));
};

window.formatNumber = function(num) {
    if (num === null || num === undefined) return '0';
    const n = Number(num);
    if (isNaN(n)) return '0';
    if (Math.abs(n) < 1000) return n.toString();
    const abbreviations = [
        { value: 1e3, symbol: 'K' },
        { value: 1e6, symbol: 'M' },
        { value: 1e9, symbol: 'B' },
        { value: 1e12, symbol: 'T' },
        { value: 1e15, symbol: 'Qa' },
        { value: 1e18, symbol: 'Qi' },
        { value: 1e21, symbol: 'Sx' },
        { value: 1e24, symbol: 'Sp' },
        { value: 1e27, symbol: 'Oc' },
        { value: 1e30, symbol: 'No' },
        { value: 1e33, symbol: 'Dc' },
        { value: 1e36, symbol: 'Ud' },
        { value: 1e39, symbol: 'Dd' },
        { value: 1e42, symbol: 'Td' },
        { value: 1e45, symbol: 'Qad' },
        { value: 1e48, symbol: 'Qid' },
        { value: 1e51, symbol: 'Sxd' },
        { value: 1e54, symbol: 'Spd' },
        { value: 1e57, symbol: 'Ocd' },
        { value: 1e60, symbol: 'Nod' },
        { value: 1e63, symbol: 'Vg' },
        { value: 1e66, symbol: 'Uvg' }
    ];
    let abs = Math.abs(n);
    for (let i = abbreviations.length - 1; i >= 0; i--) {
        if (abs >= abbreviations[i].value) {
            const val = n / abbreviations[i].value;
            const formatted = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1);
            return formatted + abbreviations[i].symbol;
        }
    }
    // Fallback for extremely large numbers (beyond 1e66)
    return n.toExponential(2);
};

window.loadModuleCSS = function(moduleName) {
    return new Promise((resolve, reject) => {
        const link = document.querySelector(`link[href="/modules/${moduleName}/${moduleName}.css"]`);
        if (link) return resolve();
        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = `/modules/${moduleName}/${moduleName}.css`;
        newLink.onload = () => resolve();
        newLink.onerror = () => reject(new Error(`CSS failed: ${moduleName}`));
        document.head.appendChild(newLink);
    });
};

window.loadModule = async function(moduleName) {
    try {
        console.log(`Loading module: ${moduleName}`);
        const res = await fetch(`/modules/${moduleName}/${moduleName}.html`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const app = document.getElementById('app');
        if (!app) throw new Error('No #app element');
        app.innerHTML = html;

        await window.loadModuleCSS(moduleName);

        const oldScript = document.querySelector(`script[data-module="${moduleName}"]`);
        if (oldScript) oldScript.remove();

        const script = document.createElement('script');
        script.src = `/modules/${moduleName}/${moduleName}.js`;
        script.type = 'module';
        script.setAttribute('data-module', moduleName);
        document.body.appendChild(script);
        return true;
    } catch (err) {
        console.error(`Failed to load module ${moduleName}:`, err);
        const app = document.getElementById('app');
        if (app) app.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Could not load ${moduleName}. Check console.</p></div>`;
        return false;
    }
};

window.appState = window.appState || { appData: null, currentCollection: null, currentPoem: null };