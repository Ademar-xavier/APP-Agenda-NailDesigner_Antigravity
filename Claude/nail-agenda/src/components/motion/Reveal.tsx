import { motion, useReducedMotion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'

type Direcao = 'up' | 'down' | 'left' | 'right' | 'none'

const distancia = 28

function montarVariants(direcao: Direcao, blur: boolean): Variants {
  const offset =
    direcao === 'up'
      ? { y: distancia }
      : direcao === 'down'
        ? { y: -distancia }
        : direcao === 'left'
          ? { x: distancia }
          : direcao === 'right'
            ? { x: -distancia }
            : {}
  return {
    hidden: {
      opacity: 0,
      ...offset,
      ...(blur ? { filter: 'blur(10px)', scale: 1.03 } : {}),
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      ...(blur ? { filter: 'blur(0px)', scale: 1 } : {}),
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    },
  }
}

/**
 * Revela o conteúdo com uma transição cinematográfica (fade + leve blur/escala)
 * assim que ele entra na viewport. Respeita prefers-reduced-motion.
 */
export function Reveal({
  children,
  direcao = 'up',
  atraso = 0,
  blur = false,
  once = true,
  className,
}: {
  children: ReactNode
  direcao?: Direcao
  atraso?: number
  blur?: boolean
  once?: boolean
  className?: string
}) {
  const reduzMovimento = useReducedMotion()

  if (reduzMovimento) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: 0.3, margin: '-40px' }}
      variants={montarVariants(direcao, blur)}
      transition={{ delay: atraso }}
    >
      {children}
    </motion.div>
  )
}

/** Container que aplica stagger (atraso progressivo) entre filhos <RevealItem>. */
export function RevealGroup({
  children,
  stagger = 0.12,
  className,
  once = true,
}: {
  children: ReactNode
  stagger?: number
  className?: string
  once?: boolean
}) {
  const reduzMovimento = useReducedMotion()
  if (reduzMovimento) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: 0.25, margin: '-40px' }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
    >
      {children}
    </motion.div>
  )
}

export function RevealItem({
  children,
  direcao = 'up',
  blur = false,
  className,
}: {
  children: ReactNode
  direcao?: Direcao
  blur?: boolean
  className?: string
}) {
  const reduzMovimento = useReducedMotion()
  if (reduzMovimento) return <div className={className}>{children}</div>

  return (
    <motion.div className={className} variants={montarVariants(direcao, blur)}>
      {children}
    </motion.div>
  )
}
