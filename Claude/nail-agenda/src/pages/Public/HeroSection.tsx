import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { CalendarCheck, ChevronDown, MessageCircle, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { Button } from '../../components/ui/Primitives'
import { RevealGroup, RevealItem } from '../../components/motion/Reveal'
import type { ConfiguracaoSalao } from '../../types'

const TRUST_ITEMS = [
  { icon: MessageCircle, label: 'Confirmação pelo WhatsApp' },
  { icon: Zap, label: 'Horários em tempo real' },
  { icon: ShieldCheck, label: 'Cancelamento fácil' },
]

export function HeroSection({ cfg, onAgendar }: { cfg: ConfiguracaoSalao; onAgendar: () => void }) {
    const containerRef = useRef<HTMLDivElement>(null)
    const reduzMovimento = useReducedMotion()

    const { scrollYProgress } = useScroll({
      target: containerRef,
      offset: ['start start', 'end start'],
    })

    // Camadas com velocidades diferentes = efeito parallax ao rolar a hero.
    const yBlobA = useTransform(scrollYProgress, [0, 1], [0, reduzMovimento ? 0 : 140])
    const yBlobB = useTransform(scrollYProgress, [0, 1], [0, reduzMovimento ? 0 : -100])
    const yBlobC = useTransform(scrollYProgress, [0, 1], [0, reduzMovimento ? 0 : 70])
    const yContent = useTransform(scrollYProgress, [0, 1], [0, reduzMovimento ? 0 : 60])
    const opacityContent = useTransform(scrollYProgress, [0, 0.8], [1, 0])
    const scaleBlobs = useTransform(scrollYProgress, [0, 1], [1, 1.25])

    return (
      <div ref={containerRef} className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-nude-50 via-cream to-cream" />

        {/* Camadas decorativas com parallax */}
        <motion.div
          style={{ y: yBlobA, scale: scaleBlobs }}
          className="pointer-events-none absolute -left-24 -top-24 -z-10 h-72 w-72 rounded-full bg-plum-200/50 blur-3xl sm:h-96 sm:w-96"
        />
        <motion.div
          style={{ y: yBlobB, scale: scaleBlobs }}
          className="pointer-events-none absolute -right-16 top-10 -z-10 h-64 w-64 rounded-full bg-terracotta-300/40 blur-3xl sm:h-80 sm:w-80"
        />
        <motion.div
          style={{ y: yBlobC }}
          className="pointer-events-none absolute bottom-0 left-1/3 -z-10 h-56 w-56 rounded-full bg-nude-300/40 blur-3xl"
        />

        <motion.div
          style={{ y: yContent, opacity: opacityContent }}
          className="mx-auto flex min-h-[86vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center sm:min-h-[92vh]"
        >
          <RevealGroup className="flex flex-col items-center">
            <RevealItem blur>
              <motion.span
                animate={reduzMovimento ? undefined : { y: [0, -4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-plum-200 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-plum-600 shadow-sm backdrop-blur-sm"
              >
                <Sparkles size={13} /> Agendamento online
              </motion.span>
            </RevealItem>

            <RevealItem blur>
              <h1 className="text-balance text-3xl font-semibold leading-tight text-graphite-900 sm:text-4xl">
                {cfg.nomeSalao}
              </h1>
            </RevealItem>

            <RevealItem>
              <p className="mt-3 max-w-sm text-balance text-sm text-graphite-500 sm:text-base">
                Escolha o serviço, veja os horários realmente disponíveis e confirme em menos de um
                minuto — sem precisar ligar ou mandar mensagem primeiro.
              </p>
            </RevealItem>

            <RevealItem className="mt-7 w-full max-w-xs">
              <motion.div
                whileHover={reduzMovimento ? undefined : { scale: 1.03, y: -2 }}
                whileTap={reduzMovimento ? undefined : { scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                <Button
                  size="lg"
                  className="w-full shadow-lg shadow-plum-600/25"
                  icon={<CalendarCheck size={18} />}
                  onClick={onAgendar}
                >
                  Agendar meu horário
                </Button>
              </motion.div>
            </RevealItem>

            <RevealItem className="mt-8 grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
              {TRUST_ITEMS.map(({ icon: Icon, label }) => (
                <motion.div
                  key={label}
                  whileHover={reduzMovimento ? undefined : { y: -3, scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-graphite-100 bg-white/70 px-3 py-2 text-xs font-medium text-graphite-500 backdrop-blur-sm"
                >
                  <Icon size={13} className="text-plum-500" />
                  {label}
                </motion.div>
              ))}
            </RevealItem>
          </RevealGroup>

          <motion.button
            onClick={onAgendar}
            aria-label="Rolar para o agendamento"
            animate={reduzMovimento ? undefined : { y: [0, 6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="mt-10 flex h-9 w-9 items-center justify-center rounded-full border border-graphite-200 text-graphite-400 hover:text-plum-600"
          >
            <ChevronDown size={16} />
          </motion.button>
        </motion.div>
      </div>
    )
}
