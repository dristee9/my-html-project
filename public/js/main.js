/**
 * Main JavaScript - Global Interactions
 */

// Initialize theme on page load
const theme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', theme);

document.addEventListener('DOMContentLoaded', function() {
    // Animate all progress bars on page load
    const progressBars = document.querySelectorAll('.progress-fill[data-width]');
    
    progressBars.forEach(bar => {
        const targetWidth = bar.getAttribute('data-width');
        
        // Use requestAnimationFrame to trigger CSS transition
        requestAnimationFrame(() => {
            bar.style.width = targetWidth + '%';
        });
    });
    
    // Mobile hamburger menu toggle
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('open');
        });
    }
    
    // Glassmorphic header scroll effect
    window.addEventListener('scroll', () => {
        const nav = document.querySelector('.site-navigation');
        if (nav) {
            nav.classList.toggle('scrolled', window.scrollY > 10);
        }
    }, { passive: true });
    
    // Parallax hero effect
    const hero = document.querySelector('.landing-hero');
    if (hero) {
        hero.addEventListener('mousemove', e => {
            const rect = hero.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
            const y = ((e.clientY - rect.top) / rect.height - 0.5) * 20;
            const heroContent = hero.querySelector('.hero-content');
            if (heroContent) {
                heroContent.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
            }
        }, { passive: true });
    }
    
    // Count-up animation for statistics
    function animateCountUp(el) {
        const target = parseInt(el.dataset.target);
        const duration = 1500;
        const step = 16;
        const increment = target / (duration / step);
        let current = 0;
        const timer = setInterval(() => {
            current = Math.min(current + increment, target);
            el.textContent = Math.floor(current).toLocaleString('en-BD');
            if (current >= target) clearInterval(timer);
        }, step);
    }
    
    const countUpObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCountUp(entry.target);
                countUpObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });
    
    document.querySelectorAll('.count-up').forEach(el => countUpObserver.observe(el));
    
    // Dark mode toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
        });
        
        // Set initial icon
        themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
});
