# Lekto

A mobile-first ebook reader and speed reader (RSVP) app built with Capacitor, React, and TypeScript. Supports EPUB and Markdown/plain-text files with a focus on a clean reading experience and research-backed speed-reading techniques.

---

## Features

### 📚 Library
- Import EPUB, Markdown (`.md`), and plain-text (`.txt`) files from device storage
- Persistent library with cover art extracted from EPUB metadata
- Reading progress tracked per book
- Last-opened sorting

### 📖 Ebook Reader
- **Scroll mode** — continuous scrolling with progress auto-save
- **Paginated mode** — tap left/right edges or swipe to turn pages
  - **Two-page spread** — automatically activates when the window is ≥ 720 px wide (portrait tablet, landscape phone, desktop), with a subtle spine divider
- **EPUB** — rendered via epub.js with table of contents navigation
- **Markdown / plain text** — rendered with GFM support (tables, task lists, etc.)
- Highlights and notes panel
- Tap the centre zone in paginated mode to jump straight to speed reader from that position

### ⚡ Speed Reader (RSVP)
Research-backed Rapid Serial Visual Presentation mode:

| Feature | Detail |
|---|---|
| **ORP highlighting** | Optimal Recognition Point letter highlighted in orange on every displayed word |
| **Alignment ticks** | Top/bottom tick marks guiding the eye to the center line (single-word mode) |
| **Punctuation pauses** | Clause-end pause ×1.5 · Sentence-end pause ×2.5 |
| **Word-length scaling** | Longer words shown for proportionally more time (toggleable) |
| **Letter-count chunking** | Slider (1–25 chars) groups multiple words per flash to match natural eye fixation width |
| **Clean background** | Pure white (#ffffff) light mode, #1a1814 dark mode |
| **Context row** | Previous / next word shown dimly in single-word mode |

**Controls**
- `Space` — play / pause
- `← →` — jump back / forward one sentence
- `↑ ↓` — adjust WPM ±25
- Scroll wheel — fine-tune WPM
- Drag the play button up/down — change WPM continuously
- Tap the WPM display — open preset picker (Very Slow 100 → Expert 1200)

**WPM Presets**

| WPM | Level |
|---|---|
| 100 | Very Slow |
| 150 | Slow |
| 200 | Comfortable |
| 300 | Normal |
| 400 | Brisk |
| 500 | Fast |
| 700 | Speed Reader |
| 900 | Very Fast |
| 1200 | Expert |

### 🔁 Mode Sync
Switching between ebook and speed reader remembers your position:
- Page fraction is tracked continuously by both readers via a shared position store
- Speed reader resumes from the same approximate word when switching modes
- Returning to paginated mode lands on the correct page

### ⚙️ Settings
Accessible from the reader toolbar (gear icon, navigates back with back button):
- **Theme** — Light, Dark, Sepia
- **Font family** — Serif / Sans-serif
- **Font size** — slider
- **Line height** — slider
- **Default WPM** — slider
- **Word-length scaling** — toggle
- **Letters per flash** — slider (RSVP chunk size)

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | [Capacitor 8](https://capacitorjs.com/) + [React 19](https://react.dev/) |
| Language | TypeScript |
| Build | [Vite](https://vitejs.dev/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| Routing | React Router v7 |
| State | [Zustand](https://zustand-demo.pmnd.rs/) (persisted via localStorage) |
| EPUB rendering | [epub.js](https://github.com/futurepress/epub.js) |
| EPUB parsing | [JSZip](https://stuk.github.io/jszip/) (text extraction for RSVP) |
| Markdown | [react-markdown](https://github.com/remarkjs/react-markdown) + remark-gfm |
| Icons | [Font Awesome](https://fontawesome.com/) (free solid + regular) |
| DB | SQLite via `@capacitor-community/sqlite` (books, highlights, progress) |
| File access | `@capawesome/capacitor-file-picker` + `@capacitor/filesystem` |

---

## Project Structure

```
src/
├── components/
│   ├── Reader/
│   │   ├── AnnotationsPanel.tsx   # Highlights & notes sidebar
│   │   ├── EpubReader.tsx         # epub.js wrapper
│   │   ├── HighlightMenu.tsx      # Text-selection highlight popup
│   │   ├── MarkdownReader.tsx     # Scroll-mode MD/TXT reader
│   │   ├── PaginatedReader.tsx    # Page-turn reader (single + spread)
│   │   ├── ReaderToolbar.tsx      # Top bar: back, title, mode toggle, settings
│   │   └── TocDrawer.tsx          # EPUB table of contents
│   └── SpeedReader/
│       ├── PlayDragButton.tsx     # Play/pause + drag-to-adjust-WPM
│       ├── RsvpChunk.tsx          # Word chunk with ORP highlighting & ticks
│       ├── RsvpWord.tsx           # Single-word ORP rendering primitive
│       └── SpeedReaderView.tsx    # Full RSVP UI
├── db/
│   ├── books.ts                   # Book CRUD
│   ├── database.ts                # SQLite init & migrations
│   ├── highlights.ts              # Highlight CRUD
│   └── progress.ts                # Reading progress CRUD
├── hooks/
│   ├── useHighlights.ts           # Highlights state hook
│   ├── useReaderMode.ts           # ebook | speed mode + scroll | pages layout
│   └── useRsvp.ts                 # RSVP engine (tokenizer, timer, controls)
├── pages/
│   ├── FileBrowserPage.tsx        # Native file picker / import
│   ├── LibraryPage.tsx            # Book grid
│   ├── ReaderPage.tsx             # Orchestrates reader + speed reader + toolbar
│   └── SettingsPage.tsx           # App settings
├── store/
│   ├── appStore.ts                # Persisted settings (theme, font, WPM, …)
│   └── libraryStore.ts            # In-memory library cache
├── utils/
│   ├── epubParser.ts              # EPUB text extraction (JSZip, attribute-order-safe)
│   ├── fileStore.ts               # Capacitor Filesystem helpers
│   ├── markdownMeta.ts            # Front-matter parsing
│   ├── positionSync.ts            # Module-level read-position fraction (mode sync)
│   └── textTokenizer.ts           # Tokenizer: ORP index, sentence/clause detection
└── types/
    └── index.ts                   # Shared TypeScript types (Book, etc.)
```

---

## Development

```bash
# Install dependencies
npm install

# Regenerate platform icons
npm run generate:icons

# Start dev server (browser)
npm run dev

# Build
npm run build

# iOS (requires Xcode)
npx cap sync ios && npx cap open ios

# Android (requires Android Studio)
npx cap sync android && npx cap open android
```

The build icon assets for web, Android, iOS, and desktop are generated from
scripts/generate-app-icons.mjs.

---

## Reading Science Notes

The RSVP implementation draws on the following research findings:

- **ORP (Optimal Recognition Point)**: The eye fixates slightly left of centre on a word. Aligning this point to a fixed screen position reduces saccade distance. Implemented at ~30% of the word's alphabetic characters.
- **Punctuation pauses**: Studies show comprehension improves when clause boundaries (`,`, `;`, `:`) get a ×1.5 display duration and sentence boundaries (`.`, `!`, `?`) get ×2.5.
- **Chunking**: Presenting 2–4 short words together at ~10–13 characters per flash better matches the natural perceptual span of ~13 characters. Controlled by the "Letters per flash" slider.
- **Word-length scaling**: Longer words require more cognitive processing time. Scaling display duration with word length (×0.6–×2.0) maintains comprehension at higher WPM.
- **Background**: Research suggests warm backgrounds reduce glare, though many users prefer the high contrast of pure white. Lekto uses `#ffffff` (light) / `#1a1814` (dark).

