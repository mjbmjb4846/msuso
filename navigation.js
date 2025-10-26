/**
 * MSU Science Olympiad - Navigation Component System
 * Custom web components for navbar and footer with flexible link configuration
 */

// Default site-wide navigation links (pages)
const defaultSiteLinks = [
    { href: '/index.html', text: 'Home' },
    { href: '/future.html', text: 'Demo' }
];

// Global configuration
const siteConfig = {
    brandName: 'MSU SO',
    email: 'scioly@msuso.org',
    description: 'Supporting Michigan Science Olympiad through tournament volunteering, resources, and community building.'
};

/**
 * Custom Navigation Bar Component
 * Usage: <msu-navbar page-links='[{"href":"#about","text":"About"},...]'></msu-navbar>
 */
class MsuNavbar extends HTMLElement {
    constructor() {
        super();
        this.mobileMenuOpen = false;
    }

    connectedCallback() {
        // Parse page-specific links from attribute
        const pageLinksAttr = this.getAttribute('page-links');
        const pageLinks = pageLinksAttr ? JSON.parse(pageLinksAttr) : [];
        
        // Combine site links and page links
        const allLinks = [...defaultSiteLinks, ...pageLinks];
        
        this.render(allLinks);
        this.attachEventListeners();
    }

    render(links) {
        // Generate desktop navigation links
        const desktopNavLinks = links.map(link => 
            `<li><a href="${link.href}" class="navbar-link">${link.text}</a></li>`
        ).join('');

        // Generate mobile navigation links
        const mobileNavLinks = links.map(link =>
            `<li><a href="${link.href}" class="mobile-menu-link">${link.text}</a></li>`
        ).join('');

        this.innerHTML = `
            <nav class="navbar">
                <div class="container navbar-content">
                    <div class="navbar-brand">${siteConfig.brandName}</div>
                    
                    <!-- Desktop Navigation -->
                    <ul class="navbar-nav">
                        ${desktopNavLinks}
                    </ul>
                    
                    <!-- Theme Toggle & Mobile Menu Button -->
                    <div style="display: flex; align-items: center; gap: var(--space-3);">
                        <button class="theme-toggle" id="themeToggle" aria-label="Toggle dark mode">
                            <ion-icon id="themeIcon" name="moon-outline" style="font-size:1.2rem; vertical-align:middle;"></ion-icon>
                            <span id="themeText">Dark</span>
                        </button>
                        <button class="navbar-toggle" id="mobileMenuToggle" aria-label="Open menu">
                            <ion-icon id="mobileMenuIcon" name="menu-outline" style="font-size:1.4rem;"></ion-icon>
                        </button>
                    </div>
                </div>
            </nav>

            <!-- Mobile Menu Overlay -->
            <div class="mobile-menu-overlay" id="mobileMenuOverlay"></div>

            <!-- Mobile Menu Drawer -->
            <div class="mobile-menu" id="mobileMenu">
                <div class="mobile-menu-header">
                    <div class="mobile-menu-brand">${siteConfig.brandName}</div>
                    <button class="mobile-menu-close" id="mobileMenuClose" aria-label="Close menu">
                        <ion-icon id="mobileCloseIcon" name="close-outline" style="font-size:1.2rem;"></ion-icon>
                    </button>
                </div>
                <ul class="mobile-menu-nav">
                    ${mobileNavLinks}
                </ul>
                <div class="mobile-menu-footer">
                    <button class="theme-toggle" id="mobileThemeToggle" aria-label="Toggle dark mode" style="width: 100%; display:flex; align-items:center; justify-content:center; gap: .5rem;">
                        <ion-icon id="mobileThemeIcon" name="moon-outline" style="font-size:1.1rem;"></ion-icon>
                        <span id="mobileThemeText">Dark Mode</span>
                    </button>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Mobile menu toggle
        const toggleBtn = this.querySelector('#mobileMenuToggle');
        const closeBtn = this.querySelector('#mobileMenuClose');
        const overlay = this.querySelector('#mobileMenuOverlay');
        const mobileMenu = this.querySelector('#mobileMenu');
        const mobileLinks = this.querySelectorAll('.mobile-menu-link');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.openMobileMenu());
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeMobileMenu());
        }

        if (overlay) {
            overlay.addEventListener('click', () => this.closeMobileMenu());
        }

        // Close menu when clicking a link
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                setTimeout(() => this.closeMobileMenu(), 150);
            });
        });

        // Theme toggle
        this.setupThemeToggle();
    }

    openMobileMenu() {
        const overlay = this.querySelector('#mobileMenuOverlay');
        const mobileMenu = this.querySelector('#mobileMenu');
        
        if (overlay && mobileMenu) {
            overlay.classList.add('active');
            mobileMenu.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.mobileMenuOpen = true;
        }
    }

    closeMobileMenu() {
        const overlay = this.querySelector('#mobileMenuOverlay');
        const mobileMenu = this.querySelector('#mobileMenu');
        
        if (overlay && mobileMenu) {
            overlay.classList.remove('active');
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
            this.mobileMenuOpen = false;
        }
    }

    setupThemeToggle() {
        const desktopToggle = this.querySelector('#themeToggle');
        const mobileToggle = this.querySelector('#mobileThemeToggle');
        const html = document.documentElement;

        // Check for saved theme preference or default to light mode
        const currentTheme = localStorage.getItem('theme') || 'light';
        html.setAttribute('data-theme', currentTheme);
        this.updateThemeButtons(currentTheme);

        const toggleTheme = () => {
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            this.updateThemeButtons(newTheme);
        };

        if (desktopToggle) {
            desktopToggle.addEventListener('click', toggleTheme);
        }

        if (mobileToggle) {
            mobileToggle.addEventListener('click', toggleTheme);
        }
    }

    updateThemeButtons(theme) {
        const desktopIcon = this.querySelector('#themeIcon');
        const desktopText = this.querySelector('#themeText');
        const mobileIcon = this.querySelector('#mobileThemeIcon');
        const mobileText = this.querySelector('#mobileThemeText');

        // Use ionicon names
        const iconName = theme === 'dark' ? 'sunny-outline' : 'moon-outline';
        const text = theme === 'dark' ? 'Light' : 'Dark';

        if (desktopIcon) desktopIcon.setAttribute('name', iconName);
        if (desktopText) desktopText.textContent = text;
        if (mobileIcon) mobileIcon.setAttribute('name', iconName);
        if (mobileText) mobileText.textContent = `${text} Mode`;
    }
}

/**
 * Custom Footer Component
 * Usage: <msu-footer page-links='[{"href":"#about","text":"About"},...]'></msu-footer>
 */
class MsuFooter extends HTMLElement {
    connectedCallback() {
        // Parse page-specific links from attribute
        const pageLinksAttr = this.getAttribute('page-links');
        const pageLinks = pageLinksAttr ? JSON.parse(pageLinksAttr) : [];
        
        // Combine site links and page links (exclude home from quick links)
        const allLinks = [...defaultSiteLinks, ...pageLinks].filter(link => 
            !link.href.includes('#home') && link.href !== 'index.html'
        );
        
        this.render(allLinks);
    }

    render(links) {
        const quickLinks = links.map(link =>
            `<li><a href="${link.href}" style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">${link.text}</a></li>`
        ).join('');

        this.innerHTML = `
            <footer class="bg-secondary" style="padding: var(--space-12) 0; margin-top: var(--space-16);">
                <div class="container">
                    <div class="grid grid-3">
                        <div>
                            <h4 style="color: var(--color-primary); margin-bottom: var(--space-4);">MSU Science Olympiad</h4>
                            <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                                ${siteConfig.description}
                            </p>
                        </div>
                        <div>
                            <h5 style="margin-bottom: var(--space-3);">Quick Links</h5>
                            <ul style="list-style: none; display: flex; flex-direction: column; gap: var(--space-2);">
                                ${quickLinks}
                            </ul>
                        </div>
                        <div>
                            <h5 style="margin-bottom: var(--space-3);">Connect</h5>
                            <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                                Email: <a href="mailto:${siteConfig.email}">${siteConfig.email}</a><br>
                                Follow us on social media for updates and announcements.
                            </p>
                        </div>
                    </div>
                    <div style="text-align: center; margin-top: var(--space-8); padding-top: var(--space-6); border-top: 1px solid var(--color-border);">
                        <p style="color: var(--color-text-tertiary); font-size: var(--font-size-sm);">
                            &copy; ${new Date().getFullYear()} Michigan State University Science Olympiad
                        </p>
                    </div>
                </div>
            </footer>
        `;
    }
}

// Register custom elements
customElements.define('msu-navbar', MsuNavbar);
customElements.define('msu-footer', MsuFooter);

/**
 * Setup smooth scrolling for all anchor links
 */
function setupSmoothScrolling() {
    // Use event delegation for dynamically added links
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (link) {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
}

// Initialize smooth scrolling when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupSmoothScrolling);
} else {
    setupSmoothScrolling();
}

