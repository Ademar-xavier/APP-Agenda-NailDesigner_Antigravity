import { format, formatDistanceToNow, isSameDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(iso: string, pattern = "dd 'de' MMM"): string {
  return format(parseISO(iso), pattern, { locale: ptBR })
}

export function formatDateFull(iso: string): string {
  return format(parseISO(iso), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
}

export function formatTime(iso: string): string {
  return format(parseISO(iso), 'HH:mm')
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm")
}

export function formatRelative(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { locale: ptBR, addSuffix: true })
}

export function isToday(iso: string): boolean {
  return isSameDay(parseISO(iso), new Date())
}

export function formatDuration(minutos: number): string {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m}min`
}

/** Aplica máscara de telefone brasileiro conforme o usuário digita: (11) 91234-5678 */
export function maskPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/** Gera um código curto de reserva, ex: NB-4F82 */
export function gerarCodigoReserva(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return `NB-${code}`
}

export function initials(nome: string): string {
  const parts = nome.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
