# Lekto

A comprehensive reading platform for modern document formats. Experience your books across desktop, mobile, and terminal with intelligent position restoration, bookmarks, and seamless synchronization.

![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-active-brightgreen)

## Project Overview

Lekto is a multi-platform reading application suite consisting of:

- **CLI** - Terminal-based reader for power users and automation
- **Desktop** - Full-featured native desktop application (Electron/Tauri)
- **Mobile** - Native iOS and Android applications (Capacitor)
- **Web** - Responsive web interface for browser-based reading

## Quick Start

### Terminal Reader (CLI)

The fastest way to start reading:

```bash
cd cli
bun install
bun run build
./lekto-cli read path/to/book.epub
```

For detailed CLI documentation, see [CLI README](./cli/README.md).

### Web Application

```bash
bun install
bun run dev
```

Then open `http://localhost:5173` in your browser.

### Desktop Application

```bash
cd desktop
npm install
npm run dev
```

### Mobile Applications

```bash
# iOS
cd ios
npm install
npm run build

# Android
cd android
npm install
npm run build
```

## Features

### 📚 Supported Formats
- **EPUB** - Full support for electronic publications
- **DOCX** - Microsoft Word documents
- **FB2** - FictionBook format
- **Markdown** - With syntax highlighting
- **Plain Text** - Simple text files
- **HTML** - Web content

### 🎯 Reading Modes
- **Page Mode** - Traditional page-by-page reading with two-page spreads on wide terminals
- **Scroll Mode** - Continuous scrolling experience
- **Speed Reading** - RSVP-style rapid serial visual presentation with adjustable WPM
- **Mode Switching** - Switch between modes mid-reading without losing your place

### ✨ Smart Features
- **Position Restoration** - Automatically resumes from your last reading position
- **Bookmarks** - Mark important passages and create custom notes
- **Table of Contents** - Hierarchical chapter navigation
- **Image Support** - View embedded images in documents
- **Text-to-Speech** - Read along with audio narration (macOS/Linux)
- **Search** - Full-text search across your document
- **Themes** - Light and dark terminal themes
- **Responsive Layout** - Adapts to your terminal size

### 📊 Book Management
- **Reading Progress** - Track percentage read and last read time for all books
- **Book List** - View all previously read books with progress metadata
- **History Persistence** - Reading history stored locally or synced to cloud
- **Library Import** - Easily import books from your local library

### 🔄 Synchronization (Coming Soon)
- Cross-platform reading progress syncing
- Cloud backup of reading history
- Bookmark synchronization across devices
- Reading statistics and analytics

## Installation

### Requirements
- Node.js 18+
- Bun (for CLI)
- Git

### Clone Repository
```bash
git clone https://github.com/mjbeswick/lekto.git
cd lekto
```

### Install Dependencies
```bash
bun install
```

### Build All Platforms
```bash
# CLI
cd cli && bun run build

# Web/Desktop
npm run build

# Mobile
cd ios && npm run build
cd android && npm run build
```

## Usage

### Terminal
```bash
# Interactive file selection
lekto

# Open specific file
lekto read book.epub

# View reading list
lekto list

# Speed reading mode
lekto read book.epub --mode speed --wpm 300
```

See [CLI Documentation](./cli/README.md) for complete command reference.

### Web/Desktop
1. Launch the application
2. Import books from your library
3. Start reading with smart position restoration
4. Use bookmarks and search for navigation
5. Sync across devices (when available)

### Mobile
- Browse and import books
- Read with optimized mobile interface
- Sync reading progress to cloud
- Use offline reading mode

## Development

### Setup Development Environment
```bash
# Install dependencies
bun install

# Type checking
bun run typecheck

# Development server
bun run dev
```

### CLI Development
```bash
cd cli
bun run dev path/to/book.epub
```

### Testing
```bash
bun test
```

### Code Quality
```bash
npm run lint
npm run typecheck
```

## Project Structure

```
lekto/
├── cli/                 # Terminal-based reader
├── desktop/             # Desktop application
├── mobile/
│   ├── android/        # Android app (Capacitor)
│   └── ios/            # iOS app (Capacitor)
├── src/                # Shared components and utilities
└── public/             # Static assets
```

## Technology Stack

### CLI
- **Runtime**: Bun
- **Language**: TypeScript
- **Key Libraries**: commander, marked, jszip, mammoth

### Web/Desktop
- **Framework**: React + TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS
- **State**: Effector
- **Desktop**: Electron / Tauri

### Mobile
- **Framework**: Capacitor
- **Base**: React
- **Native**: iOS (Swift), Android (Kotlin)

## Configuration

### Reading History Storage
- **CLI**: `~/.lekto/history.json`
- **Web**: Browser LocalStorage
- **Mobile**: Device local storage
- **Sync**: Cloud storage (coming soon)

### Preferences
- Theme selection
- Reading mode preferences
- Font and layout settings
- Accessibility options

## Contributing

We welcome contributions across all platforms! Areas for contribution:

### High Priority
- Additional book format support (mobi, AZW, PDF)
- Cloud synchronization backend
- Mobile app polish
- Performance optimizations

### Code Standards
- TypeScript for all new code
- Comprehensive type definitions
- Clear component documentation
- Unit tests for new features

### Getting Started
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Roadmap

### v0.2.0
- [ ] Cloud sync backend
- [ ] PDF support
- [ ] Advanced search (regex, filters)
- [ ] Reading statistics dashboard

### v0.3.0
- [ ] Audio integration
- [ ] Social features (share highlights)
- [ ] Advanced annotations
- [ ] Custom highlighting colors

### v1.0.0
- [ ] Full feature parity across platforms
- [ ] Comprehensive testing suite
- [ ] Performance optimization
- [ ] Production deployment

## License

MIT License - See LICENSE file for details

## Support

- 📖 [Documentation](./docs)
- 🐛 [Report Issues](https://github.com/mjbeswick/lekto/issues)
- 💬 [Discussions](https://github.com/mjbeswick/lekto/discussions)
- 📧 [Contact](mailto:contact@lekto.dev)

## Acknowledgments

Built with passion for reading and open-source communities.

**Technologies:**
- [Bun](https://bun.sh/) - Fast JavaScript runtime
- [Vite](https://vitejs.dev/) - Next generation build tool
- [React](https://react.dev/) - UI library
- [Capacitor](https://capacitorjs.com/) - Cross-platform mobile framework

---

**Read everywhere. Remember everywhere. Lekto everywhere.** 📚
