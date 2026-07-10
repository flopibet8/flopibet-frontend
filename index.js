document.addEventListener('DOMContentLoaded', () => {
    const authButtons = document.querySelectorAll('a[href="login.html"], a[href="signup.html"]');

    authButtons.forEach((button) => {
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-1px)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = '';
        });
    });

    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    if (revealElements.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.18,
            rootMargin: '0px 0px -8% 0px'
        });

        revealElements.forEach((element) => {
            observer.observe(element);
        });
    }

    const typedElement = document.getElementById('hero-typed-text');
    if (typedElement) {
        const phrases = [
            'Grow your TRX wallet with a clean, secure profit flow.',
            'Earn daily from the tier that fits you best.',
            'Withdraw profits directly to your TRON wallet.'
        ];

        const typingDelay = 55;
        const deletingDelay = 32;
        const pauseDelay = 1200;
        let phraseIndex = 0;
        let characterIndex = 0;
        let isDeleting = false;

        function tick() {
            const currentPhrase = phrases[phraseIndex];

            if (isDeleting) {
                characterIndex = Math.max(0, characterIndex - 1);
            } else {
                characterIndex = Math.min(currentPhrase.length, characterIndex + 1);
            }

            typedElement.textContent = currentPhrase.slice(0, characterIndex);

            let nextDelay = isDeleting ? deletingDelay : typingDelay;

            if (!isDeleting && characterIndex === currentPhrase.length) {
                isDeleting = true;
                nextDelay = pauseDelay;
            } else if (isDeleting && characterIndex === 0) {
                isDeleting = false;
                phraseIndex = (phraseIndex + 1) % phrases.length;
                nextDelay = 300;
            }

            setTimeout(tick, nextDelay);
        }

        tick();
    }

    const countUpElements = document.querySelectorAll('.count-up');
    if (countUpElements.length > 0) {
        const numberFormatter = new Intl.NumberFormat('en-US');
        const countObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;

                const element = entry.target;
                const targetValue = Number(element.dataset.target || '0');
                const duration = 1800;
                const startTime = performance.now();

                function animateCount(currentTime) {
                    const progress = Math.min((currentTime - startTime) / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    element.textContent = numberFormatter.format(Math.floor(targetValue * eased));

                    if (progress < 1) {
                        requestAnimationFrame(animateCount);
                    } else {
                        element.textContent = numberFormatter.format(targetValue);
                    }
                }

                requestAnimationFrame(animateCount);
                observer.unobserve(element);
            });
        }, {
            threshold: 0.35,
            rootMargin: '0px 0px -8% 0px'
        });

        countUpElements.forEach((element) => countObserver.observe(element));
    }
});
