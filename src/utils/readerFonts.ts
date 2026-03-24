export interface ReaderFontOption {
  label: string
  value: string
  fontFamily: string
  previewFamily: string
}

export const READER_FONTS: ReaderFontOption[] = [
  {
    label: 'Serif',
    value: 'serif',
    fontFamily: 'Georgia, "Times New Roman", serif',
    previewFamily: 'Georgia, "Times New Roman", serif',
  },
  {
    label: 'Sans-serif',
    value: 'sans',
    fontFamily: 'Inter, system-ui, sans-serif',
    previewFamily: 'Inter, system-ui, sans-serif',
  },
  {
    label: 'Atkinson',
    value: 'atkinson',
    fontFamily: '"Atkinson Hyperlegible", system-ui, sans-serif',
    previewFamily: '"Atkinson Hyperlegible", system-ui, sans-serif',
  },
  {
    label: 'Merriweather',
    value: 'merriweather',
    fontFamily: 'Merriweather, Georgia, serif',
    previewFamily: 'Merriweather, Georgia, serif',
  },
  {
    label: 'Lexend',
    value: 'lexend',
    fontFamily: 'Lexend, system-ui, sans-serif',
    previewFamily: 'Lexend, system-ui, sans-serif',
  },
]

export function getReaderFontStack(fontFamily: string): string {
  return READER_FONTS.find((font) => font.value === fontFamily)?.fontFamily
    ?? 'Georgia, "Times New Roman", serif'
}