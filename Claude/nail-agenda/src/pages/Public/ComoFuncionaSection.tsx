import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { CalendarClock, MessageCircleHeart, Sparkles } from 'lucide-react'

const PASSOS = [
  {
    numero: '01',
    icon: Sparkles,
    titulo: 'Escolha o serviço',
    descricao: 'Selecione um ou mais serviços — as durações são somadas automaticamente.',
  },
  {
    numero: '02',
    icon: CalendarClock,
    titulo: 'Escolha o melhor horário',
    descricao: 'Veja só os horários realmente livres, na profissional e no dia que preferir.',
  },
  {
    numero: '03',
    icon: MessageCircleHeart,
    titulo: 'Confirme e pronto',
    descricao: 'Você recebe o código da reserva e a confirmação chega pelo WhatsApp.',
  },
]

const stepVariants: Variants = {
  hidden: { opacity: 0, y: 28, scale: 1.05, filter: 'blur(8px)' },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.75, delay: i * 0.18, ease: [0.16, 1, 0.3, 1] },
  }),
}

export function ComoFuncionaSection() {
  const reduzMovimento = useReducedMotion()

  return (
    <section className="relative mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <motion.div
        initial={reduzMovimento ? undefined : { opacity: 0, y: 16 }}
        whileInView={reduzMovimento ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.6 }}
        className="mb-12 text-center sm:mb-16"
      >
        <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-plum-500">
          Como funciona
        </span>
        <h2 className="text-2xl font-semibold text-graphite-900 sm:text-3xl">
          Do clique à cadeira em 3 passos
        </h2>
      </motion.div>

      <div className="relative grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
        {/* Linha conectora — "desenha" da esquerda pra direita ao entrar na tela */}
        <motion.div
          initial={reduzMovimento ? undefined : { scaleX: 0 }}
          whileInView={reduzMovimento ? undefined : { scaleX: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: 'left' }}
          className="absolute left-[16.5%] right-[16.5%] top-8 hidden h-px bg-gradient-to-r from-plum-200 via-terracotta-300 to-plum-200 sm:block"
        />

        {PASSOS.map((passo, i) => (
          <motion.div
            key={passo.numero}
            custom={i}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={stepVariants}
            whileHover={reduzMovimento ? undefined : { y: -6 }}
            className="relative flex flex-col items-center rounded-3xl border border-graphite-100 bg-white px-5 py-8 text-center shadow-sm transition-shadow hover:shadow-xl hover:shadow-plum-200/40"
          >
            <div className="relative z-10 mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-plum-50 text-plum-600">
              <passo.icon size={24} />
              <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-plum-600 text-[10px] font-bold text-white">
                {passo.numero}
              </span>
            </div>
            <h3 className="text-base font-semibold text-graphite-900">{passo.titulo}</h3>
            <p className="mt-1.5 text-sm text-graphite-500">{passo.descricao}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
