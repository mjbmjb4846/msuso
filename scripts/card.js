/* ============================================
   MSU Science Olympiad - Card & Badge Components
   ============================================
   
   Custom HTML Components for easy card creation with badges.
   
   ARCHITECTURE:
   - MsuBadge uses Shadow DOM for style encapsulation
   - Styles are embedded within each badge component
   - Automatically adapts to light/dark theme changes
   - No dependency on global.css badge styles (self-contained)
   
   - MsuCard uses Light DOM to leverage global styles
   - Generates standard HTML that works with existing CSS
   - Contains nested msu-badge components
   
   Usage Examples:
   
   1. Simple Badge:
      <msu-badge>Test</msu-badge>
      <msu-badge variant="purple">Build</msu-badge>
      <msu-badge variant="orange">Lab</msu-badge>
      <msu-badge color="#ff0000">Custom</msu-badge>
      <msu-badge color="rgb(255, 0, 0)">Custom RGB</msu-badge>
   
   2. Event Card:
      <msu-card 
          title="Astronomy"
          description="Explore stellar evolution, galaxies, and deep space objects."
          badges='["Test", "Space"]'
          color-badges='[{"text":"Build","color":"purple"}]'>
      </msu-card>
      
      Or with custom colors:
      <msu-card 
          title="Chemistry Lab"
          description="Conduct experiments and analyze chemical reactions."
          badges='["Chemistry", "Lab"]'
          color-badges='[{"text":"Advanced","color":"#6d28d9"}]'>
      </msu-card>
   
   ============================================ */

/**
 * MsuBadge - Custom Badge Component (with Shadow DOM)
 * 
 * Uses Shadow DOM to encapsulate styles, making badges fully self-contained.
 * Styles are rendered inline based on variant/color and current theme.
 * Content is projected via slot for proper text rendering.
 * 
 * Attributes:
 * - variant: 'purple' | 'orange' | '' (default green)
 * - color: Custom color (hex, rgb, rgba, etc.) - overrides variant
 * 
 * Examples:
 * <msu-badge>Default</msu-badge>
 * <msu-badge variant="purple">Purple</msu-badge>
 * <msu-badge color="#ff6b6b">Custom Red</msu-badge>
 */
class MsuBadge extends HTMLElement {
    constructor() {
        super();
        // Attach shadow DOM for style encapsulation
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    static get observedAttributes() {
        return ['variant', 'color'];
    }

    attributeChangedCallback() {
        this.render();
    }

    render() {
        const variant = this.getAttribute('variant');
        const customColor = this.getAttribute('color');
        
        // Get theme
        const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
        
        // Build styles
        const styles = this.getBadgeStyles(variant, customColor, isDarkTheme);
        
        // Render shadow DOM with slot for content
        this.shadowRoot.innerHTML = `
            <style>
                ${styles}
            </style>
            <span class="badge"><slot></slot></span>
        `;
    }

    /**
     * Get badge styles based on variant and theme
     */
    getBadgeStyles(variant, customColor, isDarkTheme) {
        // Get CSS variables from document
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);
        
        // Base badge styles
        let styles = `
            .badge {
                display: inline-block;
                padding: 0.25rem 0.75rem;
                font-size: 0.875rem;
                font-weight: 500;
                border-radius: 9999px;
                margin-right: 0.5rem;
                margin-bottom: 0.5rem;
                transition: all 200ms ease-in-out;
            }
        `;
        
        // Apply variant or custom color styles
        if (customColor) {
            const colorStyles = this.getCustomColorStyles(customColor, isDarkTheme);
            styles += `
                .badge {
                    ${colorStyles}
                }
            `;
        } else if (variant === 'purple') {
            if (isDarkTheme) {
                styles += `
                    .badge {
                        background: linear-gradient(90deg, rgba(109,40,217,0.28), rgba(159,122,234,0.28));
                        color: #ffffff;
                        border: 1px solid rgba(159,122,234,0.08);
                    }
                `;
            } else {
                styles += `
                    .badge {
                        background-color: #f3e8ff;
                        color: #6d28d9;
                        border: 1px solid rgba(109,40,217,0.28);
                    }
                `;
            }
        } else if (variant === 'orange') {
            if (isDarkTheme) {
                styles += `
                    .badge {
                        background: linear-gradient(90deg, rgba(180,83,9,0.28), rgba(245,158,11,0.28));
                        color: #ffffff;
                        border: 1px solid rgba(245,158,11,0.08);
                    }
                `;
            } else {
                styles += `
                    .badge {
                        background-color: #fff7ed;
                        color: #b45309;
                        border: 1px solid rgba(180,83,9,0.28);
                    }
                `;
            }
        } else {
            // Default green badge
            if (isDarkTheme) {
                styles += `
                    .badge {
                        background-color: #1a2622;
                        color: #4ade80;
                        border: none;
                    }
                `;
            } else {
                styles += `
                    .badge {
                        background-color: #dcfce7;
                        color: #1a9659;
                        border: none;
                    }
                `;
            }
        }
        
        return styles;
    }

    /**
     * Get custom color styles
     */
    getCustomColorStyles(color, isDarkTheme) {
        if (isDarkTheme) {
            return `
                background: linear-gradient(90deg, ${this.addAlpha(color, 0.3)}, ${this.addAlpha(color, 0.2)});
                color: #ffffff;
                border: 1px solid ${this.addAlpha(color, 0.1)};
            `;
        } else {
            return `
                background-color: ${this.addAlpha(color, 0.1)};
                color: ${color};
                border: 1px solid ${this.addAlpha(color, 0.2)};
            `;
        }
    }

    /**
     * Add alpha channel to color
     */
    addAlpha(color, alpha) {
        // Convert hex to rgba
        if (color.startsWith('#')) {
            const hex = color.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        
        // Handle rgb/rgba
        if (color.startsWith('rgb')) {
            const match = color.match(/\d+/g);
            if (match && match.length >= 3) {
                return `rgba(${match[0]}, ${match[1]}, ${match[2]}, ${alpha})`;
            }
        }
        
        // Fallback: return color as-is with opacity via rgba
        return color;
    }
}

/**
 * MsuCard - Custom Card Component
 * 
 * Attributes:
 * - title: Card title (required)
 * - description: Card description text (required)
 * - badges: JSON array of badge texts (optional) - e.g., '["Test", "Space"]'
 * - color-badges: JSON array of colored badge objects (optional)
 *   Format: '[{"text":"Build","color":"purple"}]' or '[{"text":"Custom","color":"#ff0000"}]'
 * - variant: Card style variant - 'green' for green gradient card (optional)
 * - icon: Ionicon name for card icon (optional) - e.g., 'flask-outline'
 * - href: URL to link to (optional) - wraps card in anchor tag
 * 
 * Examples:
 * <msu-card 
 *     title="Astronomy"
 *     description="Explore stellar evolution and galaxies."
 *     badges='["Test", "Space"]'
 *     color-badges='[{"text":"Build","color":"purple"}]'
 *     icon="planet-outline"
 *     href="events/astronomy">
 * </msu-card>
 */
class MsuCard extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
    }

    static get observedAttributes() {
        return ['title', 'description', 'badges', 'color-badges', 'variant', 'icon', 'href'];
    }

    attributeChangedCallback() {
        this.render();
    }

    render() {
        const title = this.getAttribute('title') || 'Untitled';
        const description = this.getAttribute('description') || '';
        const badgesJson = this.getAttribute('badges') || '[]';
        const colorBadgesJson = this.getAttribute('color-badges') || '[]';
        const variant = this.getAttribute('variant');
        const icon = this.getAttribute('icon');
        const href = this.getAttribute('href');
        
        // Parse badge arrays
        let badges = [];
        let colorBadges = [];
        
        try {
            badges = JSON.parse(badgesJson);
        } catch (e) {
            console.warn('Failed to parse badges JSON:', badgesJson);
        }
        
        try {
            colorBadges = JSON.parse(colorBadgesJson);
        } catch (e) {
            console.warn('Failed to parse color-badges JSON:', colorBadgesJson);
        }
        
        // Build card HTML
        let cardClass = 'card';
        if (variant === 'green') {
            cardClass += ' card-green';
        }
        
        // Start building HTML - wrap in anchor if href provided
        let html = '';
        if (href) {
            html += `<a href="${this.escapeHtml(href)}" class="card-link" style="text-decoration: none; color: inherit; display: block;">`;
        }
        
        html += `<div class="${cardClass}">`;
        
        // Add icon if provided
        if (icon) {
            html += `<div style="font-size: 3rem; margin-bottom: var(--space-4);">
                <ion-icon name="${icon}" style="font-size:3rem;"></ion-icon>
            </div>`;
        }
        
        // Add title
        html += `<h4 class="card-title">${this.escapeHtml(title)}</h4>`;
        
        // Add description
        if (description) {
            html += `<p class="card-text">${this.escapeHtml(description)}</p>`;
        }
        
        // Add badges container
        if (colorBadges.length > 0 || badges.length > 0) {
            html += `<div class="card-badges">`;
            
            // Add colored badges first
            colorBadges.forEach(badge => {
                const text = badge.text || '';
                const color = badge.color || '';
                
                // Check if color is a variant name or custom color
                if (color === 'purple' || color === 'orange') {
                    html += `<msu-badge variant="${color}">${this.escapeHtml(text)}</msu-badge>`;
                } else if (color) {
                    html += `<msu-badge color="${color}">${this.escapeHtml(text)}</msu-badge>`;
                } else {
                    html += `<msu-badge>${this.escapeHtml(text)}</msu-badge>`;
                }
            });
            
            // Add regular badges
            badges.forEach(text => {
                html += `<msu-badge>${this.escapeHtml(text)}</msu-badge>`;
            });
            
            html += `</div>`;
        }
        
        html += `</div>`;
        
        // Close anchor tag if href provided
        if (href) {
            html += `</a>`;
        }
        
        this.innerHTML = html;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Register custom elements
if (!customElements.get('msu-badge')) {
    customElements.define('msu-badge', MsuBadge);
}

if (!customElements.get('msu-card')) {
    customElements.define('msu-card', MsuCard);
}

// Listen for theme changes to update badges
if (typeof window !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'data-theme') {
                // Re-render all badges to update for new theme
                document.querySelectorAll('msu-badge').forEach(badge => {
                    badge.render();
                });
            }
        });
    });

    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });
}
