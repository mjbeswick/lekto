import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  active?: boolean
}

export default function HeaderIconButton({ children, active = false, className = '', style, ...props }: Props) {
  return (
    <button
      {...props}
      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors active:opacity-60 ${className}`.trim()}
      style={active
        ? { backgroundColor: 'var(--surface-2)', color: 'var(--reader-fg)', ...style }
        : { backgroundColor: 'var(--surface)', color: 'var(--text-muted)', ...style }}
    >
      {children}
    </button>
  )
}