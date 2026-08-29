import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

type ToastTipo = 'sucesso' | 'erro' | 'info'

interface Toast {
  id: number
  tipo: ToastTipo
  mensagem: string
}

interface ToastContextValue {
  notificar: (mensagem: string, tipo?: ToastTipo) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let seq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remover = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const notificar = useCallback(
    (mensagem: string, tipo: ToastTipo = 'sucesso') => {
      const id = ++seq
      setToasts((prev) => [...prev, { id, tipo, mensagem }])
      setTimeout(() => remover(id), 4000)
    },
    [remover],
  )

  return (
    <ToastContext.Provider value={{ notificar }}>
      {children}
      <div className="pointer-events-none fixed bottom-20 left-0 right-0 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              role="status"
              initial={{ opacity: 0, y: 24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 400, damping: 26 }}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm ${
                t.tipo === 'sucesso'
                  ? 'border-success-500/30 bg-success-50 text-success-600'
                  : t.tipo === 'erro'
                    ? 'border-danger-500/30 bg-danger-50 text-danger-600'
                    : 'border-info-500/30 bg-info-50 text-info-500'
              }`}
            >
              {t.tipo === 'sucesso' && <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
              {t.tipo === 'erro' && <XCircle size={18} className="mt-0.5 shrink-0" />}
              {t.tipo === 'info' && <Info size={18} className="mt-0.5 shrink-0" />}
              <p className="flex-1 text-sm font-medium">{t.mensagem}</p>
              <button onClick={() => remover(t.id)} className="shrink-0 opacity-60 hover:opacity-100">
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider')
  return ctx
}
