# CSS File Structure - CheckBot Dashboard

## Overview
The CheckBot dashboard uses a modular CSS architecture where each page has its own dedicated stylesheet, making it easier to maintain and customize specific page styling.

---

## CSS Files Organization

### Core Styles
- **`style.css`** - Global styles, CSS variables, utility classes, and base component styles
  - CSS variables for colors, spacing, shadows
  - Common utility classes (flexbox, spacing, text utilities)
  - Base button, card, input, and label styling

- **`sidebar.css`** - Sidebar navigation styling
  - Sidebar layout and positioning
  - Navigation link styling with hover/active states
  - Sidebar responsive behavior
  - Icon and text alignment

### Page-Specific Styles
- **`config.css`** - Configuration page (button customization & preview)
  - Form layout for configuration settings
  - Color input styling
  - Live preview section styling
  - Button preview with dynamic colors

- **`settings.css`** - Server settings page
  - Settings section grid layout
  - Toggle switch styling
  - Textarea and select input styling
  - Settings footer with save button

- **`create-giveaway.css`** - Create giveaway form page
  - Form group and row layout
  - Input and select field styling
  - Channel selector dropdown styling
  - Action buttons layout

- **`logs.css`** - Giveaway logs/history page
  - Table styling with headers and rows
  - Status badge styling
  - Empty state styling
  - Responsive table design

- **`dashboard.css`** - Server selection dashboard (main list)
  - Server card grid layout
  - Server icon and info styling
  - Action buttons styling
  - Responsive grid behavior
  - Empty state for no servers

- **`index.css`** - Landing/home page
  - Hero section styling
  - Feature cards layout
  - Discord login button styling
  - Authentication section layout

---

## Linking CSS in Views

Each EJS view file should link to three stylesheets in this order:

```html
<link rel="stylesheet" href="/css/style.css">              <!-- Global styles -->
<link rel="stylesheet" href="/css/sidebar.css">           <!-- Sidebar (if applicable) -->
<link rel="stylesheet" href="/css/[page-name].css">       <!-- Page-specific styles -->
```

### Example (config.ejs):
```html
<link rel="stylesheet" href="/css/style.css">
<link rel="stylesheet" href="/css/sidebar.css">
<link rel="stylesheet" href="/css/config.css">
```

---

## CSS Class Naming Convention

### Prefixes by Purpose
- `.main-content` - Main content wrapper (outside sidebar)
- `.config-*` - Configuration page components
- `.settings-*` - Settings page components
- `.form-*` - Form elements
- `.server-*` - Server card components
- `.logs-*` - Logs table components
- `.landing-*` - Landing page components
- `.btn` - Button styles
- `.card` - Card component

---

## Responsive Design

All CSS files include media queries for responsive design:
- **Desktop** - Default styling
- **Tablet (≤1024px)** - Adjusted layouts
- **Mobile (≤768px)** - Stacked layouts, reduced spacing
- **Small screens (≤480px)** - Single column layouts

---

## Customization Guide

To edit styling for a specific page:

1. **Find the right CSS file** - Use the page-specific file (config.css, settings.css, etc.)
2. **Keep it organized** - Related styles should be grouped together
3. **Use CSS variables** - Reference color variables from style.css (e.g., `hsl(var(--primary))`)
4. **Test responsiveness** - Ensure changes work on mobile, tablet, and desktop

### Common Customizations

**Change primary button color:**
Edit in `style.css` → `--primary` CSS variable

**Change form layout:**
Edit in respective page CSS → `.form-group` or `.settings-section`

**Update sidebar appearance:**
Edit in `sidebar.css` → `.sidebar` or `.sidebar-link`

**Adjust card appearance:**
Edit in `style.css` → `.card` class

---

## File Usage Summary

| File | Purpose | Used In |
|------|---------|---------|
| style.css | Global styles & variables | All pages |
| sidebar.css | Navigation sidebar | config, settings, create, logs |
| config.css | Giveaway configuration | config.ejs |
| settings.css | Server settings | settings.ejs |
| create-giveaway.css | New giveaway form | create-giveaway.ejs |
| logs.css | Giveaway history table | logs.ejs |
| dashboard.css | Server selection | dashboard.ejs |
| index.css | Landing page | index.ejs |

---

## Tips for Maintenance

✅ **Keep CSS modular** - One file per page makes updates easier
✅ **Use CSS variables** - Makes theme changes simple
✅ **Comment your code** - Add comments for complex styles
✅ **Test all breakpoints** - Ensure mobile responsiveness
✅ **Avoid inline styles** - Use external CSS files whenever possible
✅ **Group related styles** - Keep forms, buttons, and layouts together
