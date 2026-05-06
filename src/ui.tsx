import React from 'react'

export function Button({
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
}) {
  return <button {...props} className={`btn btn-${variant} ${props.className ?? ''}`.trim()} />
}

export function TextInput({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input {...props} className={`input ${props.className ?? ''}`.trim()} />
    </label>
  )
}

export function TextArea({
  label,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <textarea {...props} className={`input textarea ${props.className ?? ''}`.trim()} />
    </label>
  )
}

export function Select({
  label,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select {...props} className={`input ${props.className ?? ''}`.trim()} />
    </label>
  )
}

export function Card({
  title,
  actions,
  children,
}: {
  title?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="card">
      {(title || actions) && (
        <header className="card-h">
          <div className="card-title">{title}</div>
          <div className="card-actions">{actions}</div>
        </header>
      )}
      <div className="card-b">{children}</div>
    </section>
  )
}

export function JsonView({ value }: { value: unknown }) {
  return <pre className="json">{JSON.stringify(value, null, 2)}</pre>
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return <code className="code">{children}</code>
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null
  const message =
    typeof error === 'string'
      ? error
      : typeof (error as any)?.message === 'string'
        ? (error as any).message
        : JSON.stringify(error)
  return <div className="alert alert-error">{message}</div>
}

export function SuccessBox({ children }: { children: React.ReactNode }) {
  return <div className="alert alert-success">{children}</div>
}

export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="spinner">
      <span className="spinner-dot" />
      <span className="muted">{label}</span>
    </div>
  )
}

