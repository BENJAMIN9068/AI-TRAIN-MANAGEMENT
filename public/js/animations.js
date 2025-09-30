// IRTOMS Railway Management - Ultra-Realistic GSAP Animations
// Advanced animations for enhanced user experience with white & purple theme

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// Animation configuration
const animConfig = {
    duration: 0.8,
    ease: "power3.out",
    stagger: 0.15
};

/**
 * Initialize all animations when DOM is loaded
 */
function initializeAnimations() {
    // Page load animations
    initPageLoadAnimations();
    
    // Scroll-triggered animations
    initScrollAnimations();
    
    // Interactive element animations
    initInteractiveAnimations();
    
    // Advanced particle system
    initParticleSystem();
    
    console.log('IRTOMS Ultra-Realistic Animations initialized');
}

/**
 * Page load animations with elegant entrance effects
 */
function initPageLoadAnimations() {
    // Animate navbar entrance
    gsap.from('.navbar', {
        y: -100,
        opacity: 0,
        duration: 1.2,
        ease: "power4.out"
    });
    
    // Animate navbar brand with bounce
    gsap.from('.navbar-brand', {
        scale: 0,
        rotation: -360,
        duration: 1.5,
        delay: 0.3,
        ease: "elastic.out(1, 0.3)"
    });
    
    // Animate navbar links with stagger
    gsap.from('.navbar-nav .nav-link', {
        y: -50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        delay: 0.6,
        ease: "power3.out"
    });
    
    // Hero section dramatic entrance
    gsap.from('.jumbotron', {
        scale: 0.8,
        y: 100,
        opacity: 0,
        duration: 1.5,
        delay: 0.4,
        ease: "power4.out"
    });
    
    // Hero content animation
    gsap.from('.jumbotron .display-4', {
        y: 50,
        opacity: 0,
        duration: 1.2,
        delay: 0.8,
        ease: "power3.out"
    });
    
    gsap.from('.jumbotron .lead', {
        y: 30,
        opacity: 0,
        duration: 1,
        delay: 1.0,
        ease: "power3.out"
    });
    
    // Hero buttons with bounce effect
    gsap.from('.jumbotron .btn', {
        scale: 0,
        rotation: 180,
        duration: 1.2,
        delay: 1.2,
        stagger: 0.2,
        ease: "elastic.out(1, 0.4)"
    });
}

/**
 * Scroll-triggered animations for elements coming into view
 */
function initScrollAnimations() {
    // Feature cards entrance animation
    gsap.from('.feature-card', {
        scrollTrigger: {
            trigger: '.feature-card',
            start: 'top 80%',
            end: 'bottom 20%',
            toggleActions: 'play none none reverse'
        },
        y: 100,
        opacity: 0,
        scale: 0.8,
        rotation: 5,
        duration: 1.2,
        stagger: 0.3,
        ease: "power4.out"
    });
    
    // Feature card icons floating animation
    gsap.from('.feature-card .fa-3x', {
        scrollTrigger: {
            trigger: '.feature-card',
            start: 'top 70%'
        },
        y: -30,
        opacity: 0,
        duration: 1.5,
        delay: 0.5,
        stagger: 0.2,
        ease: "elastic.out(1, 0.3)"
    });
    
    // Map container entrance
    gsap.from('.railway-map-container', {
        scrollTrigger: {
            trigger: '.railway-map-container',
            start: 'top 75%'
        },
        scale: 0.9,
        y: 60,
        opacity: 0,
        duration: 1.5,
        ease: "power4.out"
    });
    
    // Map controls slide in
    gsap.from('.map-controls .btn', {
        scrollTrigger: {
            trigger: '.map-controls',
            start: 'top 80%'
        },
        x: 100,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out"
    });
    
    // Stats counters animation
    gsap.from('.text-center .col-md-3', {
        scrollTrigger: {
            trigger: '.text-center',
            start: 'top 80%'
        },
        y: 50,
        opacity: 0,
        duration: 1,
        stagger: 0.15,
        ease: "power3.out"
    });
}

/**
 * Interactive animations for hover and click effects
 */
function initInteractiveAnimations() {
    // Enhanced card hover animations
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            gsap.to(card, {
                y: -12,
                scale: 1.03,
                duration: 0.4,
                ease: "power2.out",
                boxShadow: "0 20px 60px rgba(76, 29, 149, 0.3)"
            });
            
            // Animate card content
            gsap.to(card.querySelectorAll('.card-title, .card-text, .fa-3x'), {
                y: -5,
                duration: 0.3,
                stagger: 0.05,
                ease: "power2.out"
            });
        });
        
        card.addEventListener('mouseleave', () => {
            gsap.to(card, {
                y: 0,
                scale: 1,
                duration: 0.4,
                ease: "power2.out",
                boxShadow: "0 8px 35px rgba(76, 29, 149, 0.18)"
            });
            
            gsap.to(card.querySelectorAll('.card-title, .card-text, .fa-3x'), {
                y: 0,
                duration: 0.3,
                stagger: 0.05,
                ease: "power2.out"
            });
        });
    });
    
    // Button click animations with ripple effect
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', function(e) {
            // Create ripple effect
            const ripple = document.createElement('span');
            ripple.style.position = 'absolute';
            ripple.style.borderRadius = '50%';
            ripple.style.background = 'rgba(255, 255, 255, 0.6)';
            ripple.style.transform = 'scale(0)';
            ripple.style.pointerEvents = 'none';
            
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
            
            this.appendChild(ripple);
            
            // Animate ripple
            gsap.to(ripple, {
                scale: 2,
                opacity: 0,
                duration: 0.6,
                ease: "power2.out",
                onComplete: () => ripple.remove()
            });
            
            // Button press animation
            gsap.to(this, {
                scale: 0.95,
                duration: 0.1,
                yoyo: true,
                repeat: 1,
                ease: "power2.inOut"
            });
        });
    });
    
    // Train icon animations
    document.querySelectorAll('.fa-train').forEach(icon => {
        // Continuous gentle movement
        gsap.to(icon, {
            x: 3,
            duration: 2,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1
        });
        
        // Hover boost
        icon.addEventListener('mouseenter', () => {
            gsap.to(icon, {
                scale: 1.2,
                rotation: 5,
                duration: 0.3,
                ease: "power2.out"
            });
        });
        
        icon.addEventListener('mouseleave', () => {
            gsap.to(icon, {
                scale: 1,
                rotation: 0,
                duration: 0.3,
                ease: "power2.out"
            });
        });
    });
}

/**
 * Advanced particle system for enhanced visual appeal
 */
function initParticleSystem() {
    // Create floating particles
    function createParticle() {
        const particle = document.createElement('div');
        particle.style.position = 'fixed';
        particle.style.width = Math.random() * 4 + 2 + 'px';
        particle.style.height = particle.style.width;
        particle.style.background = `rgba(${Math.random() > 0.5 ? '76, 29, 149' : '139, 92, 246'}, ${Math.random() * 0.3 + 0.1})`;
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '1';
        
        // Random starting position
        particle.style.left = Math.random() * window.innerWidth + 'px';
        particle.style.top = window.innerHeight + 'px';
        
        document.body.appendChild(particle);
        
        // Animate particle
        gsap.to(particle, {
            y: -window.innerHeight - 100,
            x: (Math.random() - 0.5) * 200,
            rotation: Math.random() * 360,
            duration: Math.random() * 8 + 6,
            ease: "none",
            onComplete: () => particle.remove()
        });
        
        // Fade in and out
        gsap.fromTo(particle, 
            { opacity: 0 },
            { 
                opacity: 1, 
                duration: 2,
                ease: "power2.out",
                yoyo: true,
                repeat: 1,
                repeatDelay: Math.random() * 4
            }
        );
    }
    
    // Create particles at intervals
    setInterval(createParticle, 3000);
    
    // Initial burst of particles
    for (let i = 0; i < 5; i++) {
        setTimeout(createParticle, i * 600);
    }
}

/**
 * Map-specific animations
 */
function initMapAnimations() {
    // Animate train markers on the map
    document.querySelectorAll('.train-marker').forEach((marker, index) => {
        // Entrance animation
        gsap.from(marker, {
            scale: 0,
            rotation: 360,
            duration: 1,
            delay: index * 0.2,
            ease: "elastic.out(1, 0.3)"
        });
        
        // Continuous gentle pulsing
        gsap.to(marker, {
            scale: 1.1,
            duration: 2,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            delay: index * 0.3
        });
    });
    
    // Station markers animation
    document.querySelectorAll('.station-marker').forEach((marker, index) => {
        gsap.from(marker, {
            scale: 0,
            duration: 0.8,
            delay: index * 0.1,
            ease: "power3.out"
        });
    });
}

/**
 * Notification animations
 */
function animateNotification(element) {
    gsap.from(element, {
        x: 400,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out"
    });
    
    // Auto-hide animation
    gsap.to(element, {
        x: 400,
        opacity: 0,
        duration: 0.4,
        delay: 4.5,
        ease: "power3.in",
        onComplete: () => element.remove()
    });
}

/**
 * Loading animations
 */
function showLoadingAnimation() {
    const loader = document.createElement('div');
    loader.className = 'loading-overlay';
    loader.innerHTML = `
        <div class="loading-spinner-advanced">
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
        </div>
    `;
    document.body.appendChild(loader);
    
    gsap.from(loader, {
        opacity: 0,
        duration: 0.3,
        ease: "power2.out"
    });
    
    return loader;
}

function hideLoadingAnimation(loader) {
    gsap.to(loader, {
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => loader.remove()
    });
}

// Initialize animations when DOM is ready
document.addEventListener('DOMContentLoaded', initializeAnimations);

// Re-initialize map animations when map is loaded
window.addEventListener('mapLoaded', initMapAnimations);

// Export functions for use in other scripts
window.IRTOMS_Animations = {
    animateNotification,
    showLoadingAnimation,
    hideLoadingAnimation,
    initMapAnimations
};