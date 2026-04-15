(function() {
    // Back button and breadcrumb – direct event handlers (same as collections)
    const backBtn = document.getElementById('back-to-home');
    if (backBtn) {
        backBtn.onclick = (e) => {
            e.preventDefault();
            window.location.hash = 'home';
            window.showModule('home');
        };
    }
    const breadcrumbHome = document.getElementById('breadcrumb-home-5');
    if (breadcrumbHome) {
        breadcrumbHome.onclick = (e) => {
            e.preventDefault();
            window.location.hash = 'home';
            window.showModule('home');
        };
    }

    const contactForm = document.getElementById('contactForm');
    const formStatus = document.getElementById('formStatus');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('contactName').value.trim();
            const email = document.getElementById('contactEmail').value.trim();
            const message = document.getElementById('contactMessage').value.trim();
            if (!name || !email || !message) {
                formStatus.textContent = 'Please fill all fields.';
                formStatus.className = 'form-status error';
                window.showAlert('Please fill all fields.', 'Error');
                return;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                formStatus.textContent = 'Please enter a valid email address.';
                formStatus.className = 'form-status error';
                window.showAlert('Please enter a valid email address.', 'Error');
                return;
            }
            formStatus.textContent = 'Sending...';
            formStatus.className = 'form-status';
            try {
                const res = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, message })
                });
                const data = await res.json();
                if (res.ok) {
                    formStatus.textContent = 'Message sent successfully! I will respond soon.';
                    formStatus.className = 'form-status success';
                    contactForm.reset();
                    window.showAlert('Your message has been sent. I will respond soon.', 'Thank You');
                } else {
                    formStatus.textContent = data.error || 'Failed to send. Please try again.';
                    formStatus.className = 'form-status error';
                    window.showAlert(data.error || 'Failed to send. Please try again.', 'Error');
                }
            } catch (err) {
                formStatus.textContent = 'Network error. Please try again.';
                formStatus.className = 'form-status error';
                window.showAlert('Network error. Please check your connection and try again.', 'Error');
            }
        });
    }
})();