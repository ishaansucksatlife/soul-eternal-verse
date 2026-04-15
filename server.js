require('dotenv').config();
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const compression = require('compression');
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3000;
const WORKS_DIR = path.join(process.cwd(), 'works');

const resendApiKey = process.env.RESEND_API_KEY;
const resend = new Resend(resendApiKey);
const TO_EMAIL = process.env.TO_EMAIL || 'sipsofthesoul@gmail.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

app.use(compression());
app.use(express.json());
// Serve static files with explicit paths for Vercel
app.use('/css', express.static(path.join(process.cwd(), 'css')));
app.use('/js', express.static(path.join(process.cwd(), 'js')));
app.use('/modules', express.static(path.join(process.cwd(), 'modules')));
app.use('/works', express.static(path.join(process.cwd(), 'works')));
app.use('/cursors', express.static(path.join(process.cwd(), 'cursors')));
app.use(express.static(process.cwd()));

let cachedData = null;

// ---------- File system helpers ----------
async function readTagsFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return [...new Set(content.split(/[,\n]/).map(t => t.trim()).filter(t => t.length > 0))];
    } catch { return []; }
}

async function readDescription(filePath) {
    try { return (await fs.readFile(filePath, 'utf-8')).trim(); } catch { return 'No description provided.'; }
}

// New: read poem description (pdes.txt) – used as preview
async function readPoemDescription(poemFolderPath) {
    try {
        const content = await fs.readFile(path.join(poemFolderPath, 'pdes.txt'), 'utf-8');
        return content.trim();
    } catch { return null; } // not present
}

async function readPoemContent(poemFolderPath) {
    try { return (await fs.readFile(path.join(poemFolderPath, 'poem.txt'), 'utf-8')).trim(); } catch { return 'Poem content not found.'; }
}

function computeStats(content) {
    const words = content.split(/\s+/).filter(w => w.length > 0).length;
    return { wordCount: words, readingTime: Math.ceil(words / 200) };
}

async function scanWorks() {
    const collections = [];
    const allCollectionTags = new Set();
    const allPoems = [];
    try {
        const collectionFolders = await fs.readdir(WORKS_DIR, { withFileTypes: true });
        for (const dirent of collectionFolders) {
            if (!dirent.isDirectory()) continue;
            const collectionPath = path.join(WORKS_DIR, dirent.name);
            const collectionTags = await readTagsFile(path.join(collectionPath, 'ctag.txt'));
            const description = await readDescription(path.join(collectionPath, 'cdes.txt'));
            collectionTags.forEach(tag => allCollectionTags.add(tag));

            let hasCover = false;
            try { await fs.access(path.join(collectionPath, 'c-cover.png')); hasCover = true; } catch {}

            const poems = [];
            const poemFolders = await fs.readdir(collectionPath, { withFileTypes: true });
            for (const poemDirent of poemFolders) {
                if (!poemDirent.isDirectory()) continue;
                const poemFolderPath = path.join(collectionPath, poemDirent.name);
                const poemTags = await readTagsFile(path.join(poemFolderPath, 'ptag.txt'));
                const poemContent = await readPoemContent(poemFolderPath);
                const { wordCount, readingTime } = computeStats(poemContent);

                // ---- NEW: use pdes.txt as preview if exists ----
                let preview = await readPoemDescription(poemFolderPath);
                if (!preview) {
                    // fallback to truncated poem content
                    preview = poemContent.length > 200 ? poemContent.substring(0, 200) + '…' : poemContent;
                }

                let hasPoemCover = false;
                try { await fs.access(path.join(poemFolderPath, 'p-cover.png')); hasPoemCover = true; } catch {}

                const poemObj = {
                    name: poemDirent.name,
                    tags: poemTags,
                    preview: preview,
                    wordCount: wordCount,
                    readingTime: readingTime,
                    hasCover: hasPoemCover
                };
                poems.push(poemObj);

                allPoems.push({
                    collectionName: dirent.name,
                    poemName: poemDirent.name,
                    tags: poemTags,
                    preview: preview,
                    wordCount: wordCount,
                    readingTime: readingTime,
                    hasCover: hasPoemCover
                });
            }
            collections.push({
                name: dirent.name,
                description: description,
                tags: collectionTags,
                poems: poems,
                hasCover: hasCover
            });
        }
    } catch (err) { console.error('Scan error:', err.message); }
    return { collections, allCollectionTags: Array.from(allCollectionTags).sort(), allPoems };
}

async function refreshCache() {
    console.log('Scanning works directory...');
    cachedData = await scanWorks();
    console.log(`Found ${cachedData.collections.length} collections, ${cachedData.allPoems.length} poems.`);
}

// ---------- API Routes ----------
app.get('/api/data', async (req, res) => {
    if (!cachedData) {
        await refreshCache();
    }
    res.json(cachedData);
});

app.get('/api/poem/:collectionName/:poemName', async (req, res) => {
    const { collectionName, poemName } = req.params;
    try {
        const content = await fs.readFile(path.join(WORKS_DIR, collectionName, poemName, 'poem.txt'), 'utf-8');
        res.json({ content: content.trim() });
    } catch (err) {
        res.status(404).json({ error: 'Poem not found' });
    }
});

// Contact endpoint (fixed to actually send emails)
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (!resendApiKey) {
        console.log(`[CONTACT DEMO] Name: ${name}, Email: ${email}, Message: ${message}`);
        return res.json({ success: true, message: 'Message received (demo mode). Please set RESEND_API_KEY in .env.' });
    }

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [TO_EMAIL],
            subject: `New poetry message from ${name}`,
            reply_to: email,
            html: `<h3>New message</h3><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Message:</strong><br>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
            text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
        });
        if (error) throw error;
        res.json({ success: true, message: 'Message sent successfully!' });
    } catch (err) {
        console.error('Email error:', err);
        res.status(500).json({ error: 'Failed to send message. Please try again later.' });
    }
});

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m]));
}

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'index.html'));
});

if (require.main === module) {
    app.listen(PORT, async () => {
        console.log(`✨ Server running at http://localhost:${PORT}`);
        await refreshCache();
    });
}

module.exports = app;