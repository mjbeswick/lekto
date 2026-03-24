import type { BookFormat } from '../types'

type FileIconName = 'blank' | 'docx' | 'epub' | 'fb2' | 'md' | 'pdf' | 'txt'

interface Props {
  format?: BookFormat
  fileName?: string
  className?: string
  title?: string
}

function resolveIconName(format?: BookFormat, fileName?: string): FileIconName {
  if (format) return format
  if (!fileName) return 'blank'

  const lower = fileName.toLowerCase()

  if (lower.endsWith('.fb2.zip') || lower.endsWith('.fb2')) return 'fb2'
  if (lower.endsWith('.docx')) return 'docx'
  if (lower.endsWith('.epub')) return 'epub'
  if (lower.endsWith('.pdf')) return 'pdf'
  if (lower.endsWith('.txt')) return 'txt'
  if (lower.endsWith('.md')) return 'md'

  return 'blank'
}

export default function FileTypeIcon({ format, fileName, className = '', title }: Props) {
  const iconName = resolveIconName(format, fileName)
  const label = title ?? `${(format ?? iconName).toUpperCase()} file`

  return <span aria-hidden="true" title={label} className={`lekto-file-icon fiv-cla fiv-icon-${iconName} ${className}`.trim()} />
}