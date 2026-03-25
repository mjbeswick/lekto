# Reader spec

## Supported formats
- EPUB
- MD
- FB2 / `.fb2.zip`
- Plain text

## Features
- Ebook reading with pagination and bookmarking
- Speed reading mode with adjustable WPM and chunk size
- Text-to-speech mode with adjustable rate and pitch
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