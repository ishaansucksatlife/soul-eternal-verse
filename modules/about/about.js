(function() {
    const quotes = [
        "“Some scars never heal. They just learn to breathe in the dark.”",
        "“You don't get over grief. You grow around it like roots through concrete.”",
        "“I am not what happened to me. I am what I chose to become after.”",
        "“Healing is not linear. It is a spiral. You will pass the same pain twice, but from a different angle.”",
        "“The hardest person to forgive is the one you see in the mirror at 3 a.m.”",
        "“Love doesn't leave you broken. It leaves you wide open. There is a difference.”",
        "“You were never too much. They were just not enough.”"
    ];
    let quoteIndex = 0;
    const quoteElement = document.querySelector('.about-quote p');
    if (quoteElement) {
        setInterval(() => {
            quoteIndex = (quoteIndex + 1) % quotes.length;
            quoteElement.style.opacity = '0';
            setTimeout(() => {
                quoteElement.textContent = quotes[quoteIndex];
                quoteElement.style.opacity = '1';
            }, 300);
        }, 6000);
    }
    const signature = document.querySelector('.about-signature');
    if (signature) {
        signature.style.opacity = '0';
        signature.style.transform = 'translateY(10px)';
        signature.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        setTimeout(() => {
            signature.style.opacity = '1';
            signature.style.transform = 'translateY(0)';
        }, 200);
    }
})();