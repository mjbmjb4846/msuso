# MSU Science Olympiad Website

A website for the Michigan State University Science Olympiad organization!

## Features

- **Custom Web Components**
- **Light/Dark Theme**
- **Responsive Design**
- **Modern Icons**
- **Green and White 💚🤍**

## File Structure

```
msuso/
├── index.html              # Landing page (under construction)
├── future.html             # Main website (events, about, features)
├── global.css              # Complete theming system (767+ lines)
├── navigation.js           # Navigation web components (navbar, footer)
├── card.js                 # Card and badge web components
└── CNAME                   # Domain configuration
```

## Components

### Navigation Components

#### `<msu-navbar>`
Creates a responsive navigation bar with mobile menu support.

```html
<msu-navbar page-links='[{"href":"#about","text":"About"}]'></msu-navbar>
```

#### `<msu-footer>`
Generates a footer with sitemap and social links.

```html
<msu-footer page-links='[{"href":"#contact","text":"Contact"}]'></msu-footer>
```

### Content Components

#### `<msu-badge>`
Creates styled badges with color variants. **Uses Shadow DOM for style encapsulation.**

```html
<!-- Default green badge -->
<msu-badge>Test</msu-badge>

<!-- Purple variant -->
<msu-badge variant="purple">Build</msu-badge>

<!-- Custom color -->
<msu-badge color="#3b82f6">Custom</msu-badge>
```

**Attributes:**
- `variant`: `'purple'` or `'orange'` for predefined colors
- `color`: Custom hex, rgb, or rgba color

**Technical Notes:**
- Self-contained with embedded styles (no global CSS dependency)
- Automatically updates when theme changes
- Works standalone or within cards

#### `<msu-card>`
Creates event or feature cards with badges.

```html
<msu-card 
    title="Astronomy"
    description="Explore stellar evolution and galaxies."
    badges='["Space", "Physics"]'
    color-badges='[{"text":"Test","color":"purple"}]'
    variant="green"
    icon="planet-outline">
</msu-card>
```

**Attributes:**
- `title` (required): Card title
- `description` (required): Card description
- `badges`: JSON array of badge texts
- `color-badges`: JSON array of `{text, color}` objects
- `variant`: `'green'` for green gradient background
- `icon`: Ionicon name for card icon

## Themes

### CSS Custom Properties

The design system uses CSS variables for easy theming:

```css
/* Primary colors */
--color-primary: var(--color-green-600);
--color-primary-hover: var(--color-green-700);

/* Backgrounds */
--color-background: var(--color-white);
--color-background-secondary: var(--color-gray-50);

/* Typography */
--font-size-base: 1rem;
--font-weight-bold: 700;
```

### Theme Toggle

The site includes a built-in theme toggle that switches between light and dark modes:

```javascript
// Theme is automatically handled by navigation.js
// Preference is saved to localStorage
```

## Setup

### Basic Page Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MSU Science Olympiad</title>
    <link rel="stylesheet" href="global.css">
    <script type="module" src="https://unpkg.com/ionicons@5.5.2/dist/ionicons/ionicons.esm.js"></script>
    <script nomodule src="https://unpkg.com/ionicons@5.5.2/dist/ionicons/ionicons.js"></script>
    <script src="navigation.js"></script>
    <script src="card.js"></script>
</head>
<body>
    <msu-navbar page-links='[{"href":"#about","text":"About"}]'></msu-navbar>
    
    <!-- Your content here -->
    
    <msu-footer page-links='[{"href":"#contact","text":"Contact"}]'></msu-footer>
</body>
</html>
```

## Quick Examples

### Event Card

```html
<msu-card 
    title="Chemistry Lab"
    description="Conduct chemical experiments and analysis."
    badges='["Chemistry"]'
    color-badges='[{"text":"Lab","color":"orange"},{"text":"Test","color":"purple"}]'>
</msu-card>
```

### Custom Colored Badge

```html
<msu-badge color="#ef4444">Important</msu-badge>
```

### Feature Card with Icon

```html
<msu-card 
    title="Resources"
    description="Study guides and materials."
    icon="book-outline"
    variant="green"
    badges='["Study", "Guide"]'>
</msu-card>
```

## Browser Support

- Chrome/Edge 67+
- Firefox 63+
- Safari 12.1+
- Opera 54+

Requires support for:
- Custom Elements (Web Components)
- CSS Custom Properties
- ES6 JavaScript

## Responsive Breakpoints

- **Mobile**: < 480px
- **Tablet**: < 768px
- **Desktop**: 768px+

Mobile menu activates below 768px.

## Color Palette

### Light Theme
- Primary Green: `#1a9659`
- Background: `#ffffff`
- Text: `#111827`

### Dark Theme
- Primary Green: `#4ade80`
- Background: `#0a0f0d`
- Text: `#f3f4f6`

### Badge Colors
- Default: Green (theme-based)
- Purple: `#6d28d9` (light) / gradient (dark)
- Orange: `#b45309` (light) / gradient (dark)
- Custom: Any hex, rgb, or rgba color

## License

Created for use by Michigan State University Science Olympiad.

## Links

- [MSU Science Olympiad](https://msuso.org)
- [UMich Science Olympiad](https://www.umichscioly.org)
- [Michigan Science Olympiad](https://miscioly.org)
- [Science Olympiad National](https://www.soinc.org/)
- [Ionicons](https://ionic.io/ionicons)
