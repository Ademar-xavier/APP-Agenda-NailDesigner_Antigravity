import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppDataProvider } from './context/AppDataContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './pages/Login'
import { DashboardPage } from './pages/Dashboard'
import { AgendaPage } from './pages/Agenda/AgendaPage'
import { ClientesPage } from './pages/Clientes/ClientesPage'
import { ClienteDetalhePage } from './pages/Clientes/ClienteDetalhePage'
import { ServicosPage } from './pages/Servicos/ServicosPage'
import { ConfirmacoesPage } from './pages/Confirmacoes/ConfirmacoesPage'
import { FinanceiroPage } from './pages/Financeiro/FinanceiroPage'
import { ConfiguracoesPage } from './pages/Configuracoes/ConfiguracoesPage'
import { AgendamentoPublicoPage } from './pages/Public/AgendamentoPublicoPage'
import type { ReactNode } from 'react'

function RotaProtegida({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  if (!usuario) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RotasInternas() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/agendar" element={<AgendamentoPublicoPage />} />
      <Route
        element={
          <RotaProtegida>
            <AppShell />
          </RotaProtegida>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/clientes" element={<ClientesPage />} />
        <Route path="/clientes/:id" element={<ClienteDetalhePage />} />
        <Route path="/servicos" element={<ServicosPage />} />
        <Route path="/confirmacoes" element={<ConfirmacoesPage />} />
        <Route path="/financeiro" element={<FinanceiroPage />} />
        <Route path="/configuracoes" element={<ConfiguracoesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AppDataProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <RotasInternas />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </AppDataProvider>
  )
}

export default App
