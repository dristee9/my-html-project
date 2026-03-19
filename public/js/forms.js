/**
 * Form Loading State Handler
 * Adds loading indication to all forms with class 'js-form'
 */

document.addEventListener('DOMContentLoaded', function() {
    // Handle all forms with js-form class
    const forms = document.querySelectorAll('.js-form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const submitButton = form.querySelector('button[type="submit"]');
            
            if (submitButton && !submitButton.disabled) {
                // Store original text
                submitButton.dataset.originalText = submitButton.textContent.trim();
                
                // Set loading state
                submitButton.classList.add('btn--loading');
                submitButton.disabled = true;
                submitButton.textContent = 'Please wait...';
            }
        });
    });
});
