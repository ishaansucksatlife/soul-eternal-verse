(function() {
    const form = document.getElementById('contactForm');
    const status = document.getElementById('formStatus');

    if (form) {
        form.addEventListener('submit', handleSubmit);
    }

    function handleSubmit(e) {
        e.preventDefault();
        clearShakes();

        const name = document.getElementById('contactName').value.trim();
        const email = document.getElementById('contactEmail').value.trim();
        const message = document.getElementById('contactMessage').value.trim();

        let hasError = false;

        if (!name) {
            shakeInput(document.getElementById('contactName'));
            hasError = true;
        }
        if (!email || !isValidEmail(email)) {
            shakeInput(document.getElementById('contactEmail'));
            hasError = true;
        }
        if (!message) {
            shakeInput(document.getElementById('contactMessage'));
            hasError = true;
        }

        if (hasError) {
            status.textContent = 'Please fill all fields correctly.';
            status.className = 'form-status error';
            window.showAlert('Please fill all fields correctly.', 'Error');
            return;
        }

        status.textContent = 'Sending...';
        status.className = 'form-status';

        fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, message })
        })
        .then(res => res.json().then(data => ({ res, data })))
        .then(({ res, data }) => {
            if (res.ok) {
                status.textContent = 'Message sent successfully! I will respond soon.';
                status.className = 'form-status success';
                form.reset();
                window.showAlert('Your message has been sent. I will respond soon.', 'Thank You');
            } else {
                status.textContent = data.error || 'Failed to send. Please try again.';
                status.className = 'form-status error';
                window.showAlert(data.error || 'Failed to send. Please try again.', 'Error');
            }
        })
        .catch(() => {
            status.textContent = 'Network error. Please try again.';
            status.className = 'form-status error';
            window.showAlert('Network error. Please check your connection and try again.', 'Error');
        });
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function shakeInput(input) {
        if (!input) return;
        input.classList.add('shake');
        input.addEventListener('animationend', function() {
            input.classList.remove('shake');
        }, { once: true });
    }

    function clearShakes() {
        document.querySelectorAll('.shake').forEach(el => el.classList.remove('shake'));
    }

    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const text = this.getAttribute('data-copy');
            if (!text) return;
            navigator.clipboard.writeText(text).then(() => {
                const icon = this.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-check';
                    this.classList.add('copied');
                    setTimeout(() => {
                        icon.className = 'fas fa-copy';
                        this.classList.remove('copied');
                    }, 1500);
                }
            }).catch(() => {});
        });
    });
})();