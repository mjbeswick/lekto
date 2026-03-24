import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  active?: boolean
}

export default function HeaderIconButton({ children, active = false, className = '', style, ...props }: Props) {
  return (
    <button
      {...props}
      className={`flex h-11 w-11 items-center justify-center rounded-2xl border text-base transition-all active:opacity-60 sm:h-10 sm:w-10 sm:rounded-xl ${className}`.trim()}
      style={active
        ? { backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--reader-fg)', backdropFilter: 'blur(10px)', ...style }
        : { backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-muted)', backdropFilter: 'blur(10px)', ...style }}
    >
      {children}
    </button>
  )
}