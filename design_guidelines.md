# TXAI Chat Application - Design Guidelines

## Design Approach
**Hybrid Approach:** Premium chat interface inspired by ChatGPT/Claude with luxury gold aesthetic. Reference modern AI chat applications for layout and interaction patterns while implementing the specified gold gradient branding.

## Core Visual Identity

### Typography
- **Primary Font:** Inter or SF Pro Display (Google Fonts CDN)
- **Hierarchy:**
  - Brand Name "TXAI": text-2xl to text-3xl, font-bold
  - Chat Messages: text-base, font-normal
  - UI Labels: text-sm, font-medium
  - Footer/Copyright: text-xs

### Layout System
**Spacing Units:** Tailwind units of 2, 4, 6, and 8
- Component padding: p-4, p-6
- Section gaps: gap-4, gap-6
- Margins: m-2, m-4

**Grid Structure:**
- Sidebar: Fixed width 280px (w-70) on desktop, collapsible on mobile
- Main chat area: flex-1, max-w-4xl centered
- Message container: max-w-3xl for optimal readability

## Gold Gradient Color Scheme

### Light Mode
- **Primary Gradient:** Gold to amber (from-yellow-400 via-amber-500 to-yellow-600)
- **Background:** Warm cream/beige (bg-amber-50)
- **Surface:** White cards with subtle gold border (border-amber-200)
- **Text:** Dark gray for readability (text-gray-900)

### Dark Mode
- **Primary Gradient:** Rich gold to bronze (from-yellow-600 via-amber-600 to-yellow-700)
- **Background:** Deep charcoal with warm undertone (bg-gray-900)
- **Surface:** Dark cards (bg-gray-800) with gold accent borders (border-yellow-700/30)
- **Text:** Off-white (text-gray-100)

### Modern Background Pattern
Subtle geometric pattern or gradient mesh overlay on main background - use CSS gradient or SVG pattern with low opacity gold tones creating depth without distraction.

## Component Library

### Sidebar (Left Panel)
**Structure (top to bottom):**
- TXAI logo/brand (with gold gradient text effect)
- Navigation menu items
- Spacer (flex-grow)
- Social media icons section (mt-auto, mb-4)
  - Icons: X, Discord, Telegram, YouTube
  - Layout: Horizontal flex row, gap-3
  - Style: Hover state with gold highlight
- Logout button (w-full)

### Chat Interface
**Header:**
- "TXAI" title (centered or left-aligned)
- Subtitle: "Chat with TXAI and complete your daily check-in to get points."

**Message Area:**
- User messages: Right-aligned, gold gradient background
- AI responses: Left-aligned, subtle surface background
- Typing indicator: Animated dots with gold accent

**Input:**
- Full-width at bottom, sticky position
- Gold accent border on focus
- Send button with gold gradient background

### Leaderboard Section
**Layout:**
- Top metric card: "Total Users: [count]" - prominent display with gold gradient border
- User ranking list below with gold highlights for top positions

### Footer
**Copyright Notice:**
- Fixed at bottom or within main container
- Text: "© TXAI 2025" 
- Style: text-xs, opacity-70, centered
- Gold underline or subtle separator above

## Animations

### Typing Animation (Chat Responses)
Streaming text effect - characters appear sequentially with slight delay (50-100ms per character), cursor blink during typing.

### Subtle Enhancements
- Fade-in for new messages (duration-300)
- Smooth gradient transitions on hover (transition-all)
- Icon hover states with gentle scale (hover:scale-110)

## Accessibility
- Maintain 4.5:1 contrast ratio for gold text on backgrounds
- Focus indicators with gold ring (ring-2 ring-yellow-500)
- ARIA labels for all interactive elements
- Keyboard navigation throughout

## Images
**No hero images required** - this is a utility application. Focus on clean interface with gold gradient accents and geometric background patterns for visual interest.

## Key Distinctive Elements
- Premium gold gradient applied to brand elements, buttons, and accents
- Sidebar social media cluster creates community touchpoint
- Total Users counter adds gamification element
- Professional chat interface with luxury aesthetic
- Consistent gold thread throughout maintains cohesive premium feel