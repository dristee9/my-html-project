/**
 * Main JavaScript - Global Interactions
 */

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
});
