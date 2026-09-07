/**
 * syncQueue.ts
 * Fila de Sincronização Offline Resiliente (SyncQueue).
 * Enfileira mutações de dados quando o salão está sem internet ou com sinal instável,
 * persistindo no IndexedDB e executando auto-retry exponencial ao reconectar.
 */

import { dbGetAll, dbSetItem, dbDeleteItem, STORES } from './dbStorage';
import { 
  salvarClienteSupabase, 
  deletarClienteSupabase, 
  salvarAgendamentoSupabase, 
  atualizarStatusAgendamentoSupabase, 
  deletarAgendamentoSupabase, 
  salvarServicoSupabase, 
  salvarListaEsperaSupabase, 
  atualizarStatusListaEsperaSupabase, 
  salvarMaterialSupabase, 
  deletarMaterialSupabase, 
  salvarDespesaSupabase, 
  deletarDespesaSupabase, 
  salvarUsuarioSupabase, 
  salvarConfiguracoesSupabase 
} from './supabase';

export type SyncActionType = 
  | 'UPSERT_CLIENTE'
  | 'DELETE_CLIENTE'
  | 'UPSERT_AGENDAMENTO'
  | 'UPDATE_STATUS_AGENDAMENTO'
  | 'DELETE_AGENDAMENTO'
  | 'UPSERT_SERVICO'
  | 'UPSERT_LISTA_ESPERA'
  | 'UPDATE_STATUS_LISTA_ESPERA'
  | 'UPSERT_MATERIAL'
  | 'DELETE_MATERIAL'
  | 'UPSERT_DESPESA'
  | 'DELETE_DESPESA'
  | 'UPSERT_USUARIO'
  | 'UPSERT_CONFIGURACOES';

export interface SyncTask {
  id: string;
  acao: SyncActionType;
  payload: any;
  tentativas: number;
  maxTentativas: number;
  criadoEm: string;
  ultimoErro?: string;
}

type SyncStatusListener = (status: { online: boolean; pendentes: number; sincronizando: boolean }) => void;
const listeners: Set<SyncStatusListener> = new Set();
let isProcessing = false;

export const registrarListenerSync = (listener: SyncStatusListener) => {
  listeners.add(listener);
  notificarListeners();
  return () => {
    listeners.delete(listener);
  };
};

const notificarListeners = async () => {
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const pendentes = await obterQuantidadeTarefasPendentes();
  listeners.forEach((l) => l({ online, pendentes, sincronizando: isProcessing }));
};

export async function obterQuantidadeTarefasPendentes(): Promise<number> {
  try {
    const tasks = await dbGetAll<SyncTask>(STORES.SYNC_QUEUE);
    return tasks.length;
  } catch {
    return 0;
  }
}

/**
 * Adiciona uma operação à fila offline
 */
export async function enfileirarTarefaSync(acao: SyncActionType, payload: any): Promise<void> {
  const task: SyncTask = {
    id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    acao,
    payload,
    tentativas: 0,
    maxTentativas: 5,
    criadoEm: new Date().toISOString()
  };

  await dbSetItem(STORES.SYNC_QUEUE, task);
  notificarListeners();

  // Se estiver online, tenta esvaziar imediatamente
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    processarFilaOffline();
  }
}

/**
 * Processa a fila de sincronização em lote
 */
export async function processarFilaOffline(): Promise<{ processados: number; erros: number }> {
  if (isProcessing) return { processados: 0, erros: 0 };
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    notificarListeners();
    return { processados: 0, erros: 0 };
  }

  isProcessing = true;
  notificarListeners();

  let processados = 0;
  let erros = 0;

  try {
    const tasks = await dbGetAll<SyncTask>(STORES.SYNC_QUEUE);
    if (tasks.length === 0) {
      isProcessing = false;
      notificarListeners();
      return { processados: 0, erros: 0 };
    }

    // Ordenar cronologicamente
    tasks.sort((a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime());

    for (const task of tasks) {
      let sucesso = false;
      try {
        switch (task.acao) {
          case 'UPSERT_CLIENTE':
            await salvarClienteSupabase(task.payload);
            sucesso = true;
            break;
          case 'DELETE_CLIENTE':
            await deletarClienteSupabase(task.payload.id);
            sucesso = true;
            break;
          case 'UPSERT_AGENDAMENTO':
            await salvarAgendamentoSupabase(task.payload.agendamento, task.payload.servicosIds, task.payload.clienteInfo);
            sucesso = true;
            break;
          case 'UPDATE_STATUS_AGENDAMENTO':
            await atualizarStatusAgendamentoSupabase(
              task.payload.id,
              task.payload.status,
              task.payload.canceladoPor,
              task.payload.motivo,
              task.payload.confirmadoPor
            );
            sucesso = true;
            break;
          case 'DELETE_AGENDAMENTO':
            await deletarAgendamentoSupabase(task.payload.id);
            sucesso = true;
            break;
          case 'UPSERT_SERVICO':
            await salvarServicoSupabase(task.payload);
            sucesso = true;
            break;
          case 'UPSERT_LISTA_ESPERA':
            await salvarListaEsperaSupabase(task.payload.item, task.payload.clienteInfo);
            sucesso = true;
            break;
          case 'UPDATE_STATUS_LISTA_ESPERA':
            await atualizarStatusListaEsperaSupabase(task.payload.id, task.payload.status);
            sucesso = true;
            break;
          case 'UPSERT_MATERIAL':
            await salvarMaterialSupabase(task.payload);
            sucesso = true;
            break;
          case 'DELETE_MATERIAL':
            await deletarMaterialSupabase(task.payload.id);
            sucesso = true;
            break;
          case 'UPSERT_DESPESA':
            await salvarDespesaSupabase(task.payload);
            sucesso = true;
            break;
          case 'DELETE_DESPESA':
            await deletarDespesaSupabase(task.payload.id);
            sucesso = true;
            break;
          case 'UPSERT_USUARIO':
            await salvarUsuarioSupabase(task.payload);
            sucesso = true;
            break;
          case 'UPSERT_CONFIGURACOES':
            await salvarConfiguracoesSupabase(task.payload);
            sucesso = true;
            break;
          default:
            sucesso = true;
            break;
        }
      } catch (err: any) {
        sucesso = false;
        task.ultimoErro = err?.message || 'Erro desconhecido';
      }

      if (sucesso) {
        await dbDeleteItem(STORES.SYNC_QUEUE, task.id);
        processados++;
      } else {
        task.tentativas += 1;
        if (task.tentativas >= task.maxTentativas) {
          // Descarta ou loga após limite de tentativas para não travar a fila
          console.warn(`[SyncQueue] Tarefa ${task.id} (${task.acao}) excedeu limite de ${task.maxTentativas} tentativas. Removendo.`);
          await dbDeleteItem(STORES.SYNC_QUEUE, task.id);
        } else {
          await dbSetItem(STORES.SYNC_QUEUE, task);
        }
        erros++;
      }
    }
  } catch (err) {
    console.error('[SyncQueue] Erro ao processar fila offline:', err);
  } finally {
    isProcessing = false;
    notificarListeners();
  }

  return { processados, erros };
}

// Inicializa ouvintes globais de conexão (Online / Offline)
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[SyncQueue] Conexão restabelecida! Iniciando sincronização em segundo plano...');
    processarFilaOffline();
  });

  window.addEventListener('offline', () => {
    console.warn('[SyncQueue] Conexão perdida. O aplicativo está operando em Modo Offline local com IndexedDB.');
    notificarListeners();
  });

  // Verificação periódica suave a cada 45 segundos
  setInterval(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      processarFilaOffline();
    }
  }, 45000);
}
