import { type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  LayoutDashboard,
  Users,
  Sparkles,
  BellRing,
  Wallet,
  Settings,
  LogOut,
  Menu,
} from 'lucide-react'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { useAppData } from '../../context/AppDataContext'
import { initials } from '../../lib/format'
import { Reveal } from '../motion/Reveal'

const NAV_ITEMS = [
  { to: '/', label: 'Início', icon: LayoutDashboard, end: true },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/confirmacoes', label: 'Confirmações', icon: BellRing },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet },
  { to: '/servicos', label: 'Serviços', icon: Sparkles },
  { to: '/configuracoes', label: 'Config.', icon: Settings },
]

const NAV_MOBILE = NAV_ITEMS.slice(0, 5)

export function AppShell() {
  const { db } = useAppData()
  const { usuario, sair } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuAberto, setMenuAberto] = useState(false)

  return (
    <div className="min-h-dvh bg-cream lg:flex">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-graphite-200/70 bg-white lg:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <motion.div
            whileHover={{ rotate: -6, scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-plum-600 text-sm font-bold text-white"
          >
            {initials(db.configuracao.nomeProfissionalPrincipal)}
          </motion.div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-graphite-900">
              {db.configuracao.nomeSalao}
            </p>
            <p className="text-xs text-graphite-400">Painel de gestão</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'text-plum-600' : 'text-graphite-500 hover:text-graphite-700'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active-pill"
                      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                      className="absolute inset-0 z-0 rounded-xl bg-plum-50"
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-3 transition-transform duration-200 group-hover:translate-x-0.5">
                    <item.icon size={18} />
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-graphite-100 p-3">
          <button
            onClick={() => {
              sair()
              navigate('/login')
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-graphite-500 hover:bg-graphite-50"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col lg:min-h-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-graphite-200/70 bg-cream/90 px-4 py-3 backdrop-blur-sm lg:px-8">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full text-graphite-500 hover:bg-white lg:hidden"
            onClick={() => setMenuAberto(true)}
          >
            <Menu size={20} />
          </button>
          <div className="lg:hidden">
            <p className="text-sm font-semibold text-graphite-900">{db.configuracao.nomeSalao}</p>
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-nude-200 text-xs font-bold text-plum-700">
              {usuario ? initials(usuario.nome) : '--'}
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-graphite-800">{usuario?.nome}</p>
              <p className="text-xs text-graphite-400 capitalize">{usuario?.perfil}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden px-4 pb-24 pt-4 lg:px-8 lg:pb-8 lg:pt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Bottom nav mobile */}
      <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t border-graphite-200/70 bg-white lg:hidden">
        {NAV_MOBILE.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className="relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium active:scale-90 transition-transform"
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                    className="absolute inset-x-2 top-1 h-8 rounded-xl bg-plum-50"
                  />
                )}
                <span className={`relative z-10 flex flex-col items-center gap-0.5 ${isActive ? 'text-plum-600' : 'text-graphite-400'}`}>
                  <item.icon size={20} />
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Menu lateral mobile (mais opções) */}
      {menuAberto && (
        <MobileMenu
          onClose={() => setMenuAberto(false)}
          onSair={() => {
            sair()
            navigate('/login')
          }}
        />
      )}
    </div>
  )
}

function MobileMenu({ onClose, onSair }: { onClose: () => void; onSair: () => void }) {
  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div className="absolute inset-0 bg-graphite-900/40" onClick={onClose} />
      <div className="absolute left-0 top-0 h-full w-72 bg-white p-4 shadow-2xl">
        <p className="mb-4 px-2 text-xs font-semibold uppercase tracking-wide text-graphite-400">
          Menu
        </p>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                  isActive ? 'bg-plum-50 text-plum-600' : 'text-graphite-600 hover:bg-graphite-50'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
          <button
            onClick={onSair}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-graphite-500 hover:bg-graphite-50"
          >
            <LogOut size={18} />
            Sair
          </button>
        </nav>
      </div>
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <Reveal direcao="down" className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-graphite-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-graphite-400">{subtitle}</p>}
      </div>
      {action}
    </Reveal>
  )
}
