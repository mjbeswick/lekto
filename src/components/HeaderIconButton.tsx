import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  active?: boolean
}

export default function HeaderIconButton({ children, active = false, className = '', style, ...props }: Props) {
  return (
    <button
      {...props}
      className={`w-11 h-11 rounded-2xl flex items-center justify-center text-base transition-colors active:opacity-60 sm:w-10 sm:h-10 sm:rounded-xl ${className}`.trim()}
      style={active
        ? { backgroundColor: 'var(--surface-2)', color: 'var(--reader-fg)', ...style }
        : { backgroundColor: 'var(--surface)', color: 'var(--text-muted)', ...style }}
    >
      {children}
    </button>
  )
}