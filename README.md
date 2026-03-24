# Lekto

Lekto is a mobile-first reading app built with React, TypeScript, Capacitor, and Electrobun. It combines a standard ebook reader, an RSVP speed reader, and a text-to-speech mode in one app, with shared progress and library management across formats.

## Features

### Library
- Imports `EPUB`, `PDF`, `DOCX`, `FB2`/`.fb2.zip`, Markdown (`.md`), and plain text (`.txt`)
- Supports direct file import on web, Capacitor mobile builds, and the Electrobun desktop shell
- Extracts metadata when available, including title, author, and embedded cover art for EPUB, PDF, and FB2
- Tracks reading progress per book and sorts the library by most recently opened titles
- Offers list and grid library views
- Includes title/author search

### Collections And Directories
- Create, rename, delete, and filter by collections
- Assign books to collections or remove them from a collection
- Attach folders/directories and scan them into the library
- Refresh tracked directories to add newly discovered books and remove missing ones
- Supports recursive folder import in the native file browser flow

### Ebook Reader
- Scroll and paginated layouts for supported formats
- Two-page spread mode on wider screens
- EPUB rendering with table of contents navigation
- PDF reading with page navigation and outline-derived contents when available
- Markdown and plain text rendering with `remark-gfm` support
- DOCX and FB2 conversion into readable HTML/text flows
- Auto-saved progress across scroll, pages, PDF page position, and EPUB CFI locations
- Reader search panel for extracted plain text
- Bookmark creation, navigation, and deletion
- Contents/bookmarks/search side panel
- Reader header auto-hide option for a fullscreen-style experience

### Speed Reader
- Dedicated RSVP mode with shared position syncing from the ebook reader
- ORP-highlighted word rendering
- Sentence and punctuation-aware timing
- Optional word-length scaling
- Adjustable chunking by letters per flash
- Previous/next sentence controls, keyboard shortcuts, and wheel/drag speed controls
- Progress bar, elapsed time, and time-remaining display
- Context-word preview around the active chunk on larger screens

### Text To Speech
- Dedicated TTS mode alongside ebook and speed-reader modes
- Uses browser speech synthesis behind a platform abstraction
- Async voice discovery with voice picker support
- Play, pause, resume, stop, previous sentence, and next sentence controls
- Adjustable speech rate and pitch
- Sentence-based progress tracking with current-word updates when boundary events are available
- Shared position syncing back into the rest of the reader flow

### Settings And Reading Preferences
- Themes: `Light`, `Dark`, `AMOLED`, `Sepia`
- Accent color selection
- Reader font family, font size, line height, and paragraph spacing
- Toggle for constrained line width
- Toggle for removing reader margins
- Toggle for removing page backgrounds
- Scroll page fill behavior (`width` or `height`)
- Default RSVP WPM
- RSVP word-length scaling toggle
- RSVP context-word toggle
- RSVP chunk-size slider
- RSVP font-size slider
- TTS rate and pitch controls

### Platform Support
- Web app via Vite
- Android and iOS via Capacitor
- Desktop shell via Electrobun
- Mobile-safe layout with safe-area-aware headers and panels

## Reader Modes

Lekto has three reader modes:

- `ebook`: standard reading layout for the source document
- `speed`: RSVP presentation using extracted plain text
- `tts`: text-to-speech playback using extracted plain text

Switching between modes keeps an approximate shared reading position so you can move between visual reading, RSVP, and speech playback without starting over.

## Supported Formats

| Format | Library Import | Ebook Reading | Speed Reader | TTS |
| --- | --- | --- | --- | --- |
| EPUB | Yes | Yes | Yes, via extracted text | Yes, via extracted text |
| PDF | Yes | Yes | Yes, via extracted text | Yes, via extracted text |
| DOCX | Yes | Yes | Yes, via extracted text | Yes, via extracted text |
| FB2 / `.fb2.zip` | Yes | Yes | Yes, via extracted text | Yes, via extracted text |
| Markdown | Yes | Yes | Yes | Yes |
| Plain text | Yes | Yes | Yes | Yes |

## Tech Stack

| Layer | Library / Tool |
| --- | --- |
| Framework | React 19 |
| Native shell | Capacitor 8 |
| Desktop shell | Electrobun |
| Language | TypeScript |
| Build | Vite |
| Routing | React Router 7 |
| State | Zustand |
| Styling | Tailwind CSS 3 |
| EPUB rendering | `epub.js` |
| PDF rendering | `pdfjs-dist` |
| Markdown rendering | `react-markdown` + `remark-gfm` |
| DOCX parsing | `mammoth` |
| EPUB/ZIP parsing | `jszip` |
| Storage | `@capacitor/preferences` plus file storage helpers |
| File picking | `@capawesome/capacitor-file-picker` |

## Development

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
```

### Android

```bash
npm run android:push
```

### Desktop

```bash
cd desktop && bun install
npm run dev
npm run desktop:dev
```

Desktop production build:

```bash
npm run desktop:build
```

### Notes

- `npm run build` runs the repo `prebuild` step first, which currently calls `npm run generate:icons`.
- Desktop instructions and release workflow expectations are also documented in [AGENTS.md](/Users/michael/Projects/lekto/AGENTS.md).
