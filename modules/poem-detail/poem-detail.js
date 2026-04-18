function setupToolButtons() {

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

            speechUtterance.rate = 0.75;
            speechUtterance.pitch = 0.5;
            speechUtterance.lang = 'en-US';

            if (window.speechSynthesis.getVoices) {
                const voices = window.speechSynthesis.getVoices();
                const preferredVoices = voices.filter(voice => 
                    voice.lang === 'en-US' && 
                    (voice.name.includes('Google UK English Male') || 
                     voice.name.includes('Microsoft David') || 
                     voice.name.includes('Samantha') === false) 

                );
                if (preferredVoices.length > 0) {
                    speechUtterance.voice = preferredVoices[0];
                }
            }

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