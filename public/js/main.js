/**
 * Main JavaScript - Global Interactions
 */

// Initialize theme on page load
const theme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', theme);

document.addEventListener('DOMContentLoaded', function() {
    // Particle System for Hero Background
    const heroCanvas = document.getElementById('particleCanvas');
    if (heroCanvas) {
        class ParticleSystem {
            constructor(canvas) {
                this.canvas = canvas;
                this.ctx = canvas.getContext('2d');
                this.particles = [];
                this.mouse = { x: 0, y: 0 };
                this.resize();
                this.spawnParticles(80);
                window.addEventListener('resize', () => this.resize(), { passive: true });
                canvas.closest('section')?.addEventListener('mousemove', e => {
                    const rect = canvas.getBoundingClientRect();
                    this.mouse.x = e.clientX - rect.left;
                    this.mouse.y = e.clientY - rect.top;
                }, { passive: true });
                this.loop();
            }
            resize() {
                this.canvas.width = this.canvas.offsetWidth;
                this.canvas.height = this.canvas.offsetHeight;
            }
            spawnParticles(n) {
                for (let i = 0; i < n; i++) {
                    this.particles.push({
                        x: Math.random() * this.canvas.width,
                        y: Math.random() * this.canvas.height,
                        vx: (Math.random() - 0.5) * 0.4,
                        vy: (Math.random() - 0.5) * 0.4,
                        r: Math.random() * 2 + 1,
                        alpha: Math.random() * 0.5 + 0.2,
                    });
                }
            }
            loop() {
                const ctx = this.ctx;
                ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.particles.forEach(p => {
                    // Mouse repulsion
                    const dx = p.x - this.mouse.x, dy = p.y - this.mouse.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < 100) { p.vx += dx / dist * 0.2; p.vy += dy / dist * 0.2; }
                    p.vx *= 0.99; p.vy *= 0.99;
                    p.x = (p.x + p.vx + this.canvas.width) % this.canvas.width;
                    p.y = (p.y + p.vy + this.canvas.height) % this.canvas.height;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
                    ctx.fill();
                });
                // Draw connecting lines
                this.particles.forEach((a, i) => {
                    this.particles.slice(i+1).forEach(b => {
                        const d = Math.hypot(a.x-b.x, a.y-b.y);
                        if (d < 120) {
                            ctx.beginPath();
                            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
                            ctx.strokeStyle = `rgba(255,255,255,${0.15 * (1 - d/120)})`;
                            ctx.lineWidth = 0.5;
                            ctx.stroke();
                        }
                    });
                });
                requestAnimationFrame(() => this.loop());
            }
        }
        new ParticleSystem(heroCanvas);
    }
    
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
    
    // Scroll-triggered entrance animations
    const scrollObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('is-visible');
                scrollObserver.unobserve(e.target);
            }
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.animate-on-scroll, .stagger-children').forEach(el => scrollObserver.observe(el));
    
    // Campaign card 3D tilt effect
    document.querySelectorAll('.campaign-card').forEach(card => {
        const handleTilt = (x, y, rect) => {
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const tiltX = ((y - cy) / (rect.height / 2)) * -8;
            const tiltY = ((x - cx) / (rect.width / 2)) * 8;
            card.style.transform = `translateY(-8px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.02)`;
        };
        card.addEventListener('mousemove', e => handleTilt(e.clientX, e.clientY, card.getBoundingClientRect()), { passive: true });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
        // Touch: no tilt, just scale
        card.addEventListener('touchstart', () => {
            card.style.transform = 'scale(0.98)';
        }, { passive: true });
        card.addEventListener('touchend', () => {
            card.style.transform = '';
        });
    });
    
    // Donation success confetti
    if (new URLSearchParams(location.search).get('donated') === 'true') {
        const confetti = (count = 80) => {
            for (let i = 0; i < count; i++) {
                const el = document.createElement('div');
                el.style.cssText = `position:fixed;width:10px;height:10px;border-radius:2px;
                    background:hsl(${Math.random()*360},70%,60%);
                    left:${Math.random()*100}vw;top:-20px;z-index:9999;
                    animation:confettiFall ${1+Math.random()*2}s ease-in ${Math.random()*1}s forwards;`;
                document.body.appendChild(el);
                setTimeout(() => el.remove(), 3500);
            }
        };
        const style = document.createElement('style');
        style.textContent = `@keyframes confettiFall{to{transform:translateY(105vh) rotate(720deg);opacity:0;}}`;
        document.head.appendChild(style);
        confetti();
    }
    
    // Skeleton loading for search/filter
    const searchForm = document.querySelector('.search-filter-form');
    const campaignGrid = document.getElementById('campaignGrid');
    if (searchForm && campaignGrid) {
        searchForm.addEventListener('submit', function(e) {
            // Show skeletons while loading
            const skeletonHTML = `
                <div class="skeleton skeleton-card"></div>
                <div class="skeleton skeleton-card"></div>
                <div class="skeleton skeleton-card"></div>
                <div class="skeleton skeleton-card"></div>
                <div class="skeleton skeleton-card"></div>
                <div class="skeleton skeleton-card"></div>
            `;
            campaignGrid.innerHTML = skeletonHTML;
        });
    }
});
