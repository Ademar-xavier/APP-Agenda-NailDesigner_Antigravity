import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useAppData } from '../context/AppDataContext'
import { useAuth } from '../context/AuthContext'
import { Button, Card } from '../components/ui/Primitives'
import { RevealGroup, RevealItem } from '../components/motion/Reveal'
import { initials } from '../lib/format'

export function LoginPage() {
  const { db } = useAppData()
  const { entrar } = useAuth()
  const navigate = useNavigate()
  const reduzMovimento = useReducedMotion()

  function handleEntrar(usuarioId: string) {
    entrar(usuarioId)
    navigate('/')
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-b from-nude-50 via-cream to-cream px-4">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-plum-300/30 blur-3xl"
        animate={reduzMovimento ? undefined : { scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 right-1/4 h-80 w-80 rounded-full bg-terracotta-300/25 blur-3xl"
        animate={reduzMovimento ? undefined : { scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      <motion.div
        className="relative w-full max-w-sm"
        initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <motion.div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-plum-600 text-white shadow-lg shadow-plum-600/20"
            initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          >
            <Sparkles size={26} />
          </motion.div>
          <motion.h1
            className="text-xl font-semibold text-graphite-900"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.22 }}
          >
            {db.configuracao.nomeSalao}
          </motion.h1>
          <motion.p
            className="mt-1 text-sm text-graphite-400"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            Agenda Nail Designer — painel de gestão
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
        <Card className="space-y-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-graphite-400">
            Protótipo de demonstração — escolha um acesso
          </p>
          <RevealGroup stagger={0.07}>
            {db.usuarios.map((u) => (
              <RevealItem key={u.id}>
              <motion.button
                whileHover={reduzMovimento ? undefined : { scale: 1.02, y: -2 }}
                whileTap={reduzMovimento ? undefined : { scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                onClick={() => handleEntrar(u.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-graphite-200 px-4 py-3 text-left transition-colors hover:border-plum-300 hover:bg-plum-50/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-nude-200 text-sm font-bold text-plum-700">
                  {initials(u.nome)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-graphite-900">{u.nome}</p>
                  <p className="text-xs capitalize text-graphite-400">{u.perfil}</p>
                </div>
              </motion.button>
              </RevealItem>
            ))}
          </RevealGroup>
        </Card>
        </motion.div>

        <motion.p
          className="mt-6 text-center text-xs text-graphite-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          Cliente? Acesse a{' '}
          <button
            onClick={() => navigate('/agendar')}
            className="font-medium text-plum-600 underline underline-offset-2"
          >
            página pública de agendamento
          </button>
          .
        </motion.p>
      </motion.div>
    </div>
  )
}

export function Placeholder({ title }: { title: string }) {
  return (
    <Button variant="ghost" disabled>
      {title}
    </Button>
  )
}
