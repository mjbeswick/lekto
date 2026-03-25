# Lekto CLI/TUI Spec

A terminal-based reader application built with TypeScript, Bun, and OpenTUI. Supports reading EPUB, DOCX, FB2, Markdown, and plain text files with full formatting preservation, advanced reading modes, and interactive terminal UI.

## Tech Stack
- **Runtime**: Bun (v1.0+)
- **Language**: TypeScript
- **TUI Framework**: OpenTUI (for interactive terminal components)
- **Input**: File system, stdin piping, stdin interactive mode

## Supported Input Methods

### 1. File Input
```bash
lekto read path/to/book.epub
lekto read path/to/document.docx
```

### 2. Pipe Input
```bash
cat story.txt | lekto read
curl https://example.com/content.txt | lekto read
```

### 3. Interactive Selection
```bash
lekto read  # Opens interactive file browser in TUI
```

## Content Formats
- EPUB (extracted and normalized)
- DOCX (via mammoth)
- FB2 (custom converter)
- Markdown
- Plain text
- stdin stream

All formats are normalized to HTML before rendering, maintaining consistency with the web reader.

## CLI Commands

### Main command
```bash
lekto read [file] [options]
```

### Options
- `--mode <mode>` — Reading mode: `page` | `scroll` | `speed` | `rsvp` (default: `page`)
- `--wpm <number>` — Words per minute for speed/RSVP modes (default: 250)
- `--chunk <number>` — Chunk size for speed reader (default: 1)
- `--theme <theme>` — Color theme: `light` | `dark` (default: `dark`)
- `--line-width <chars>` — Constrain line width (optional, default: auto)
- `--position <position>` — Resume from saved position
- `--no-save` — Don't save reading progress

## TUI Layout

### Page Reader View
```
Chapter Title                                    Page 1/42

[Rendered content with text wrapping and
 formatting preserved from source format]


─ Progress: 2% | Bookmarks: 2 | position: page:1
[n]ext [p]rev [b]ookmark [m]ode [q]uit [?]help
```

### Speed Reader View
```
                    WPM: 250  Chunk: 1
                    ─────────────────


                      reading
                      word


        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 45%

[space] pause | [→][←] skip | [+][-] wpm | [q] quit
```

### RSVP Focus View
```
                  Context: off | WPM: 250

                word before [FOCUS] after


        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 45%

[space] pause | [c] context | [→][←] word | [q] quit
```

### Mode Selector
```
Select reading mode:

  ▶ Page Reader   read with natural pagination
    Speed Reader  fast chunked reading
    RSVP          focus point reading
    Scroll        continuous scrolling

[↑][↓] navigate | [Enter] select
```

## Interactive Controls

### Global
- `q` — Quit application
- `m` — Show mode selection menu
- `b` — Bookmark current position
- `:` — Enter command mode (`:page 42`, `:search text`, `:theme`)
- `?` — Show help overlay

### Page/Scroll Reader
- `n` / `↓` — Next page
- `p` / `↑` — Previous page
- `j` / `k` — Fine scroll down/up (scroll mode)
- `/` — Search in content
- `g` — Go to page number
- `w` — Toggle line width constraint
- `+` / `-` — Adjust text line spacing

### Speed Reader
- `spacebar` — Pause/resume
- `→` / `←` — Skip forward/backward by chunk
- `Shift+→` / `Shift+←` — Skip sentence
- `+` / `-` — Increase/decrease WPM
- `[` / `]` — Adjust chunk size

### RSVP Mode
- `spacebar` — Pause/resume
- `→` / `←` — Next/previous word
- `Shift+→` / `Shift+←` — Skip sentence
- `c` — Toggle context mode (show surrounding words)
- `+` / `-` — Adjust WPM

## State Management

### Position Tracking
Positions stored as:
- `page:<n>` for paginated view
- `scroll:<offset>` for scroll view
- `word:<index>` for speed/RSVP modes

### Persistence
- Save reading progress to `~/.lekto/history.json`
- Store bookmarks per file (by hash)
- Restore position on file re-open

### Bookmarks
```json
{
  "file_hash": {
    "bookmarks": [
      { "position": "page:42", "note": "Important paragraph", "timestamp": "2026-03-25T..." }
    ],
    "lastPosition": "page:42",
    "lastRead": "2026-03-25T..."
  }
}
```

## Content Pipeline

### Input Normalization
1. Read file or stdin stream
2. Detect format (magic bytes or extension)
3. Convert to HTML using format-specific converter
4. Extract plain text for search and speed reading
5. Parse structure (chapters, sections) from headings

### Rendering
1. Measure terminal width/height
2. Split content at appropriate boundaries (page, section, or word)
3. Apply theme colors via OpenTUI
4. Render to terminal with responsive layout

## Architecture

### Modules
- `cli.ts` — Command parsing, entry point
- `input.ts` — File, stdin, and interactive file selection
- `readers/` — Format converters (epub, docx, fb2, md)
- `normalizer.ts` — HTML normalization and text extraction
- `pagination.ts` — Content splitting logic
- `ui/` — OpenTUI components (page view, speed reader, RSVP, search)
- `store.ts` — Position and bookmark persistence
- `types.ts` — Shared type definitions

### Data Flow
```
Input (file/stdin)
  ↓
Format Detection
  ↓
Content Converter (format → HTML)
  ↓
Text Extractor (HTML → plain text)
  ↓
Content Split (pages/chunks/words)
  ↓
OpenTUI Renderer
  ↓
Terminal Output
```

## Development

### Install dependencies
```bash
cd cli && bun install
```

### Run in development
```bash
bun run src/cli.ts read sample.epub
```

### Build for distribution
```bash
bun build ./src/cli.ts --target bun --outfile lekto-cli
```

### Test
```bash
bun test
```

### Type checking
```bash
bun run tsc --noEmit
```

## Distribution

The CLI is distributed as a standalone Bun binary, available on:
- npm registry (`npm install -g lekto-cli`)
- GitHub releases
- Package managers (brew, apt, etc.)

One-liner to try without install:
```bash
bunx lekto-cli read book.epub
```

## Performance Considerations

- Lazy-load content chapters to minimize startup time
- Stream large files instead of loading into memory
- Render only visible content (terminal viewport)
- Debounce terminal resize and search handlers
- Cache converted content locally

## Accessibility

- Support keyboard-only navigation
- ANSI color support for light/dark themes
- Full Unicode support
- Clear visual feedback for all interactions

## Future Enhancements

- Vim keybindings option
- Session management (multiple books open)
- Export annotations/bookmarks to text
- Integration with external editors for notes
