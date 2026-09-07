/**
 * MSU Science Olympiad - Navigation Component System
 * Custom web components for navbar and footer with flexible link configuration
 */

// Default site-wide navigation links (pages)
const defaultSiteLinks = [
    { href: '/index.html', text: 'Home' }
];

// Default navigation links (can be overridden by page attributes)
const defaultNavbar = [
    {"href":"index.html#about","text":"About"},
    {"href":"index.html#events","text":"Events"},
    //{"href":"resources.html","text":"Resources"},
    {"href":"invitational.html","text":"2027 Invitational"},
    {"href":"join.html","text":"Join"},
    {"href":"index.html#contact","text":"Contact"}
];

// Default footer links (can be overridden by page attributes)
const defaultFooter = [
    {"href":"index.html#about","text":"About"},
    {"href":"index.html#events","text":"Events"},
    //{"href":"resources.html","text":"Resources"},
    {"href":"invitational.html","text":"2027 Invitational"},
    {"href":"join.html","text":"Join"},
    {"href":"index.html#contact","text":"Contact"}
];

// Global configuration
const siteConfig = {
    brandName: 'MSU SO',
    email: 'club@msuso.org',
    description: 'Supporting Michigan Science Olympiad through tournament volunteering, resources, and community building.'
};

// Resolve the base URL of this script for fetching sibling assets (e.g. notifications.json)
const navigationScriptUrl = (function () {
    if (document.currentScript && document.currentScript.src) {
        return document.currentScript.src;
    }
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
        const src = scripts[i].src || '';
        if (src.includes('navigation.js')) {
            return src;
        }
    }
    return window.location.href;
})();

/**
 * Helper to fetch notifications.json with robust fallback URLs
 */
async function fetchNotificationsConfig() {
    let scriptRelativeUrl = '';
    try {
        scriptRelativeUrl = new URL('notifications.json', navigationScriptUrl).href;
    } catch (e) {
        // ignore
    }

    const candidateUrls = [
        scriptRelativeUrl,
        '/scripts/notifications.json',
        'scripts/notifications.json',
        '../scripts/notifications.json',
        '../../scripts/notifications.json'
    ].filter(Boolean);

    const uniqueUrls = [...new Set(candidateUrls)];

    for (const url of uniqueUrls) {
        try {
            const res = await fetch(url, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                return data;
            }
        } catch (e) {
            // continue to next candidate
        }
    }
    return null;
}

/**
 * Determine if a notification is configured for the current page
 * Default: displays only on the index page if `pages` is omitted/empty.
 */
function isNotificationForPage(notif) {
    const pages = notif.pages || notif.displayPages || notif.display_pages;

    const pathname = window.location.pathname || '';
    const segments = pathname.split('/').filter(Boolean);
    const currentPage = segments.length > 0 ? segments[segments.length - 1].toLowerCase() : 'index.html';

    const isIndex = currentPage === '' ||
                    currentPage === 'index.html' ||
                    currentPage === 'index' ||
                    pathname.endsWith('/') ||
                    pathname === '';

    // If pages is not provided or empty, default to index page only
    if (!pages || (Array.isArray(pages) && pages.length === 0)) {
        return isIndex;
    }

    const pageList = Array.isArray(pages) ? pages : [pages];

    if (pageList.some(p => p === '*' || (typeof p === 'string' && p.toLowerCase() === 'all'))) {
        return true;
    }

    return pageList.some(p => {
        if (!p || typeof p !== 'string') return false;
        const clean = p.trim().toLowerCase().replace(/^\//, '');
        if (clean === 'index' || clean === 'index.html' || clean === '') {
            return isIndex;
        }
        const cleanNoExt = clean.replace(/\.html$/, '');
        const currentNoExt = currentPage.replace(/\.html$/, '');
        return currentPage === clean ||
               currentNoExt === cleanNoExt ||
               pathname.toLowerCase().endsWith(clean);
    });
}

/**
 * Determine if a notification is currently active based on start and end dates
 */
function isNotificationActiveDate(notif, now = new Date()) {
    const startStr = notif.startDate || notif.start_date || notif.start;
    const endStr = notif.endDate || notif.end_date || notif.end;

    if (startStr) {
        const start = new Date(startStr);
        if (!isNaN(start.getTime()) && now < start) {
            return false;
        }
    }

    if (endStr) {
        const end = new Date(endStr);
        if (!isNaN(end.getTime()) && now > end) {
            return false;
        }
    }

    return true;
}

/**
 * Get active notification from data
 */
function getActiveNotification(data) {
    if (!data) return null;
    let list = [];
    if (Array.isArray(data)) {
        list = data;
    } else if (Array.isArray(data.notifications)) {
        list = data.notifications;
    } else if (typeof data === 'object') {
        list = [data];
    }

    const now = new Date();
    for (const notif of list) {
        if (isNotificationActiveDate(notif, now) && isNotificationForPage(notif)) {
            return notif;
        }
    }
    return null;
}

/**
 * Generate unique dismissal key for storage
 */
function getNotificationKey(notif) {
    const text = notif.notification || notif.innerHTML || notif.inner_html || '';
    const start = notif.startDate || notif.start_date || '';
    let hash = 0;
    const str = text + '|' + start;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return 'msuso_notif_dismissed_' + Math.abs(hash);
}

/**
 * Create notification bar DOM element
 */
function createNotificationBarElement(notif) {
    const bar = document.createElement('aside');
    bar.className = 'msu-notification-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Site Announcement');

    const bgColor = notif.backgroundColor || notif.background_color || notif.background || '#18794e';
    const textColor = notif.textColor || notif.text_color || notif.color || '#ffffff';
    bar.style.backgroundColor = bgColor;
    bar.style.color = textColor;

    let contentHtml = '';
    if (notif.innerHTML || notif.inner_html) {
        contentHtml = notif.innerHTML || notif.inner_html;
    } else {
        const raw = notif.notification || notif.message || '';
        const temp = document.createElement('div');
        temp.textContent = raw;
        contentHtml = temp.innerHTML;
    }

    bar.innerHTML = `
        <div class="container msu-notification-content">
            <div class="msu-notification-message">
                <span class="msu-notification-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m3 11 18-5v12L3 14v-3z"></path>
                        <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path>
                    </svg>
                </span>
                <span class="msu-notification-text">${contentHtml}</span>
            </div>
            <button class="msu-notification-close" type="button" aria-label="Dismiss notification">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    `;

    const closeBtn = bar.querySelector('.msu-notification-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            try {
                const key = getNotificationKey(notif);
                sessionStorage.setItem(key, 'true');
            } catch (e) {
                // ignore
            }
            bar.classList.add('msu-notif-closing');
            setTimeout(() => {
                bar.remove();
            }, 350);
        });
    }

    return bar;
}

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
        const pageLinks = pageLinksAttr ? JSON.parse(pageLinksAttr) : defaultNavbar;
        
        // Combine site links and page links
        const allLinks = [...defaultSiteLinks, ...pageLinks];
        
        this.render(allLinks);
        this.attachEventListeners();
        this.loadNotifications();
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
                    <a href="/index.html" class="navbar-brand">
                        <img src="/assets/icons/logo.svg" alt="MSU SO Logo" class="navbar-logo navbar-logo-light" aria-hidden="true">
                        <img src="/assets/icons/logo_mono.svg" alt="MSU SO Logo" class="navbar-logo navbar-logo-dark" aria-hidden="true">
                        <span class="navbar-brand-text">${siteConfig.brandName}</span>
                    </a>
                    
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
                    <div class="mobile-menu-brand">
                        <img src="/assets/icons/logo.svg" alt="MSU SO Logo" class="navbar-logo navbar-logo-light" aria-hidden="true">
                        <img src="/assets/icons/logo_mono.svg" alt="MSU SO Logo" class="navbar-logo navbar-logo-dark" aria-hidden="true">
                        <span class="navbar-brand-text">${siteConfig.brandName}</span>
                    </div>
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

    async loadNotifications() {
        if (this.querySelector('.msu-notification-bar') || document.querySelector('.msu-notification-bar')) {
            return;
        }

        try {
            const data = await fetchNotificationsConfig();
            const activeNotif = getActiveNotification(data);
            if (!activeNotif) return;

            try {
                const key = getNotificationKey(activeNotif);
                if (sessionStorage.getItem(key) === 'true') {
                    return;
                }
            } catch (e) {
                // ignore
            }

            const bar = createNotificationBarElement(activeNotif);
            if (this.parentNode) {
                this.parentNode.insertBefore(bar, this);
            } else {
                this.prepend(bar);
            }
        } catch (e) {
            // Silently handle load errors
        }
    }
}

/**
 * Custom Footer Component
 * Usage: <msu-footer page-links='[{"href":"#about","text":"About"},...]' 
 *                    contact-emails='[{"label":"General","address":"club@msuso.org"}]'></msu-footer>
 */
class MsuFooter extends HTMLElement {
    connectedCallback() {
        // Parse page-specific links from attribute
        const pageLinksAttr = this.getAttribute('page-links');
        const pageLinks = pageLinksAttr ? JSON.parse(pageLinksAttr) : defaultFooter;
        
        // Combine site links and page links (exclude home from quick links)
        const allLinks = [...defaultSiteLinks, ...pageLinks].filter(link => 
            !link.href.includes('#home') && link.href !== 'index.html'
        );
        
        // Parse page-specific emails from attribute
        const emailsAttr = this.getAttribute('contact-emails');
        const emails = emailsAttr ? JSON.parse(emailsAttr) : [{ label: 'Email', address: siteConfig.email }];
        
        this.render(allLinks, emails);
    }

    render(links, emails) {
        const quickLinks = links.map(link =>
            `<li><a href="${link.href}" style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">${link.text}</a></li>`
        ).join('');

        const emailLinks = emails.map(e => 
            `${e.label}: <a href="mailto:${e.address}">${e.address}</a>`
        ).join('<br>');

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
                                ${emailLinks}<br>
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
 * Setup link handling with smart fallback for .html extensions
 * - On production (GitHub Pages): links work without .html
 * - In local testing: links try without .html first, then fall back to .html
 */
function setupLinkHandling() {
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (!link) return;
        
        const href = link.getAttribute('href');
        
        // Handle anchor links (smooth scroll)
        if (href.startsWith('#')) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
            return;
        }
        
        // Handle page links with smart .html fallback
        if (!href.startsWith('http') && !href.startsWith('mailto:')) {
            e.preventDefault();
            attemptNavigation(href);
        }
    });
}

/**
 * Attempt to navigate to a URL with smart .html fallback
 * Strategy: Try clean URL first (production/GitHub Pages), then fall back to .html (local testing)
 * This allows links to work seamlessly in both production and local testing
 */
async function attemptNavigation(url) {
    // Remove .html extension if present to get the clean URL
    let cleanUrl = url;
    if (url.endsWith('.html')) {
        cleanUrl = url.slice(0, -5); // Remove '.html' from end
    }
    
    // Try clean URL first (works on GitHub Pages)
    try {
        const response = await fetch(cleanUrl, { method: 'HEAD' });
        if (response.ok || response.status === 405) {
            // 200 OK or 405 Method Not Allowed - file exists
            window.location.href = cleanUrl;
            return;
        }
    } catch (e) {
        // Network error or file not found - will try fallback
    }
    
    // Fallback: try with .html (local testing scenario)
    const urlWithHtml = cleanUrl.endsWith('/') ? cleanUrl + 'index.html' : cleanUrl + '.html';
    window.location.href = urlWithHtml;
}

// Standalone fallback initialization if msu-navbar is not present
function initNotificationFallback() {
    if (!document.querySelector('msu-navbar') && !document.querySelector('.msu-notification-bar')) {
        fetchNotificationsConfig().then(data => {
            const activeNotif = getActiveNotification(data);
            if (!activeNotif) return;
            try {
                const key = getNotificationKey(activeNotif);
                if (sessionStorage.getItem(key) === 'true') return;
            } catch (e) {}
            const bar = createNotificationBarElement(activeNotif);
            const navbarEl = document.querySelector('msu-navbar');
            if (navbarEl && navbarEl.parentNode) {
                navbarEl.parentNode.insertBefore(bar, navbarEl);
            } else if (document.body) {
                document.body.prepend(bar);
            }
        }).catch(() => {});
    }
}

// Initialize link handling, smooth scrolling, and notifications when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupLinkHandling();
        initNotificationFallback();
    });
} else {
    setupLinkHandling();
    initNotificationFallback();
}
