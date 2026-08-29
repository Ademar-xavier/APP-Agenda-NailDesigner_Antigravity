import { useId } from 'react'
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { Loader2 } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

/** Atributos nativos de botão, excluindo os que colidem com os tipos de evento do Framer Motion. */
type ButtonHTMLAttributesSemConflito = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration' | 'onDrag' | 'onDragStart' | 'onDragEnd'
>

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const variantClasses: Record<Variant, string> = {
  primary: 'bg-plum-600 text-white hover:bg-plum-700 active:bg-plum-700 shadow-sm',
  secondary: 'bg-nude-100 text-plum-700 hover:bg-nude-200',
  outline: 'border border-graphite-200 bg-white text-graphite-700 hover:bg-graphite-50',
  ghost: 'bg-transparent text-graphite-600 hover:bg-graphite-50',
  danger: 'bg-danger-500 text-white hover:bg-danger-600',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
  icon: 'h-10 w-10 justify-center',
}

interface ButtonProps extends ButtonHTMLAttributesSemConflito {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const reduzMovimento = useReducedMotion()
  const inativo = disabled || loading

  return (
    <motion.button
      whileHover={reduzMovimento || inativo ? undefined : { scale: 1.025, y: -1 }}
      whileTap={reduzMovimento || inativo ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      className={`inline-flex select-none items-center rounded-xl font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={inativo}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </motion.button>
  )
}

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  const reduzMovimento = useReducedMotion()

  if (!onClick) {
    return (
      <div className={`rounded-2xl border border-graphite-200/70 bg-white p-4 ${className}`}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      onClick={onClick}
      whileHover={reduzMovimento ? undefined : { y: -3, scale: 1.008 }}
      whileTap={reduzMovimento ? undefined : { scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
      className={`cursor-pointer rounded-2xl border border-graphite-200/70 bg-white p-4 transition-shadow hover:shadow-lg hover:shadow-plum-100/60 ${className}`}
    >
      {children}
    </motion.div>
  )
}

export function Label({ className = '', ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`mb-1.5 block text-sm font-medium text-graphite-700 ${className}`}
      {...rest}
    />
  )
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <div>
      {label && (
        <Label>
          {label}
          {required && <span className="ml-0.5 text-danger-500">*</span>}
        </Label>
      )}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-graphite-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-danger-500">{error}</p>}
    </div>
  )
}

const inputBase =
  'w-full rounded-xl border border-graphite-200 bg-white px-3.5 py-2.5 text-sm text-graphite-900 placeholder:text-graphite-400 outline-none transition-colors focus:border-plum-400 focus:ring-2 focus:ring-plum-100 disabled:bg-graphite-50 disabled:text-graphite-400'

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputBase} ${className}`} {...rest} />
}

export function Textarea({
  className = '',
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputBase} resize-none ${className}`} {...rest} />
}

export function Select({
  className = '',
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${inputBase} ${className}`} {...rest}>
      {children}
    </select>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-200 bg-white/60 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-graphite-300">{icon}</div>}
      <p className="text-sm font-semibold text-graphite-700">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-graphite-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-graphite-100 ${className}`} />
}

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-semibold text-graphite-900">{children}</h2>
      {action}
    </div>
  )
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[]
  active: string
  onChange: (id: string) => void
}) {
  const instanceId = useId()

  return (
    <div className="scrollbar-none flex gap-1 overflow-x-auto rounded-xl bg-nude-50 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
            active === tab.id ? 'text-plum-600' : 'text-graphite-500 hover:text-graphite-700'
          }`}
        >
          {active === tab.id && (
            <motion.span
              layoutId={`tab-indicator-${instanceId}`}
              transition={{ type: 'spring', stiffness: 500, damping: 34 }}
              className="absolute inset-0 z-0 rounded-lg bg-white shadow-sm"
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            {tab.label}
            {typeof tab.count === 'number' && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs ${active === tab.id ? 'bg-plum-100 text-plum-600' : 'bg-graphite-200 text-graphite-600'}`}
              >
                {tab.count}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  )
}

/** Switch (toggle) animado com a bolinha deslizando via spring. */
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: ReactNode
}) {
  const reduzMovimento = useReducedMotion()
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <motion.button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        whileTap={reduzMovimento ? undefined : { scale: 0.92 }}
        animate={{ backgroundColor: checked ? '#96395a' : '#ddd8d5' }}
        transition={{ duration: 0.2 }}
        className="relative h-5 w-9 shrink-0 rounded-full"
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 600, damping: 32 }}
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow"
          style={{ left: checked ? '18px' : '2px' }}
        />
      </motion.button>
      {label}
    </label>
  )
}
