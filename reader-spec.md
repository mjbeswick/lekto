# Reader spec

## Supported formats
- EPUB
- MD
- FB2 / `.fb2.zip`
- DOCX
- Plain text

PDF is not supported. Only structured formats where content can be reliably extracted and normalised are in scope.

## Content pipeline

All formats are normalised to HTML at load time before being passed to the reader. This ensures consistent rendering, theming, and text extraction across all formats.

| Format | Conversion |
|--------|-----------|
| EPUB | Spine HTML extracted from zip, book CSS stripped, chapters separated by headings |
| DOCX | Converted via mammoth |
| FB2 | Custom XML-to-HTML converter |
| MD / TXT | Rendered directly in the reader via react-markdown |

Plain text is derived from the normalised HTML for use by the speed reader and TTS modes.

## Reader architecture

There are two reader components, both receiving the same content type:

- **ScrollReader** — continuous scrolling view
- **PaginatedReader** — paginated view, splits content at block boundaries

Position is tracked as `scroll:<offset>` or `page:<n>` for all formats. There are no format-specific position types.

The table of contents is derived from heading elements (`h1`–`h3`) in the normalised HTML for all formats.

## Features
- Ebook reading with pagination and bookmarking
- Speed reading mode with adjustable WPM and chunk size
- Text-to-speech mode with adjustable rate, pitch, and voice selection
- Double page when paginated and landscape
- Paginated and scroll reading modes
- Constrained line width toggle
- Theme support (light/dark/sepia)
- Accent color selection
- Font family, size, and line height customization

## Page reader view
- Displays one or two pages depending on orientation and pagination settings
- Shows page numbers and total page count
- Supports bookmarking the current page
- Shows a progress bar for the current page
- Allows switching to speed reader or TTS mode while keeping the current position
- Highlights the current word when TTS is active and boundary events are available
- Highlights the current word when switching from speed reader to page reader mode
- Allows selecting words to jump to that position and start TTS or speed reader mode, or bookmark that position
- Supports pinch-zooming with a toggle to reset zoom level and reflow text to fit the screen width

## Speed reader view
- Displays one chunk of text at a time, centered on the screen
- Focus point with RSVP (Rapid Serial Visual Presentation) technology for single word display with optimal reading position highlighting
- RSVP context mode toggle to show surrounding words for improved comprehension
- Adjustable WPM (words per minute) and chunk size controls
- Progress bar, elapsed time, and time-remaining display
- Context-word preview around the active chunk on larger screens
- Pause/resume and skip controls (forward/backward by word or sentence)
- Allows switching to page reader or TTS mode while keeping the current position
- Allows selecting words to jump to that position and start TTS or speed reader mode, or bookmark that position
- Supports pinch-zooming to change font size, with a toggle to reset zoom level to default

## TTS mode view
- Launching TTS opens a modal, similar to the RSVP mode presentation, instead of navigating away from the current reader context
- Modal includes primary playback controls: play/pause, restart from current position, skip forward/backward, and close
- Modal includes voice controls: available voice selection, speaking rate, and pitch
- Shows progress information (current position and overall progress) while speaking
- Keeps the current reading position in sync when opening from page reader or speed reader and when closing the modal
- Supports starting TTS from a selected word or phrase and using that as the initial playback anchor

## Development

Dev fixture routes (`/dev/reader`) are available in development builds to render the reader with hardcoded sample content, bypassing the import flow. These are gated behind `import.meta.env.DEV`.

Content pipeline functions (format converters, page splitter) are covered by unit tests using Vitest with fixture files.
