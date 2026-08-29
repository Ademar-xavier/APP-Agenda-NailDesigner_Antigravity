import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  const reduzMovimento = useReducedMotion()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const maxWidth = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg'

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal-overlay"
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="absolute inset-0 bg-graphite-900/40 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            initial={
              reduzMovimento
                ? { opacity: 0 }
                : { opacity: 0, y: 32, scale: 0.96, filter: 'blur(4px)' }
            }
            animate={
              reduzMovimento
                ? { opacity: 1 }
                : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
            }
            exit={
              reduzMovimento
                ? { opacity: 0 }
                : { opacity: 0, y: 16, scale: 0.98, filter: 'blur(2px)' }
            }
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={`relative flex max-h-[92vh] w-full ${maxWidth} flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl`}
          >
            <div className="flex items-center justify-between border-b border-graphite-100 px-5 py-4">
              <h3 className="text-base font-semibold text-graphite-900">{title}</h3>
              <motion.button
                onClick={onClose}
                whileHover={reduzMovimento ? undefined : { rotate: 90, scale: 1.1 }}
                whileTap={reduzMovimento ? undefined : { scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-graphite-400 hover:bg-graphite-50 hover:text-graphite-600"
              >
                <X size={18} />
              </motion.button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && (
              <div className="flex items-center justify-end gap-2 border-t border-graphite-100 px-5 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
