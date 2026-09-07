/**
 * dbStorage.ts
 * Gerenciador de Persistência Assíncrono baseado em IndexedDB nativo.
 * Elimina o limite rígido de 5MB do localStorage e suporta milhares de registros,
 * fotos em alta definição, fichas de anamnese com assinatura touch e fila offline.
 */

const DB_NAME = 'NailDesignerDB';
const DB_VERSION = 1;

export const STORES = {
  CLIENTES: 'clientes',
  AGENDAMENTOS: 'agendamentos',
  SERVICOS: 'servicos',
  PAGAMENTOS: 'pagamentos',
  LISTA_ESPERA: 'lista_espera',
  MATERIAIS: 'materiais',
  DESPESAS: 'despesas',
  USUARIOS: 'usuarios',
  PRODUTOS: 'produtos',
  ANAMNESES: 'anamneses',
  PLANOS_ASSINATURA: 'planos_assinatura',
  COMISSOES: 'comissoes',
  CONFIGURACOES: 'configuracoes',
  SYNC_QUEUE: 'sync_queue',
  KV_STORE: 'kv_store'
} as const;

export type StoreName = typeof STORES[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

export const getDB = (): Promise<IDBDatabase> => {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB não suportado neste ambiente.'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Criação das stores de entidades com id como chave primária
      const entityStores = [
        STORES.CLIENTES,
        STORES.AGENDAMENTOS,
        STORES.SERVICOS,
        STORES.PAGAMENTOS,
        STORES.LISTA_ESPERA,
        STORES.MATERIAIS,
        STORES.DESPESAS,
        STORES.USUARIOS,
        STORES.PRODUTOS,
        STORES.ANAMNESES,
        STORES.PLANOS_ASSINATURA,
        STORES.COMISSOES,
        STORES.CONFIGURACOES,
        STORES.SYNC_QUEUE
      ];

      entityStores.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      });

      // Store para chave-valor genérica
      if (!db.objectStoreNames.contains(STORES.KV_STORE)) {
        db.createObjectStore(STORES.KV_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('Erro ao abrir IndexedDB:', request.error);
      reject(request.error);
    };
  });

  return dbPromise;
};

// --- OPERAÇÕES CRUD BÁSICAS EM STORES ---

export async function dbGetAll<T = any>(storeName: StoreName): Promise<T[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`[IndexedDB] Falha ao ler ${storeName}:`, err);
    return [];
  }
}

export async function dbGetItem<T = any>(storeName: StoreName, id: string): Promise<T | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`[IndexedDB] Falha ao ler item ${id} em ${storeName}:`, err);
    return null;
  }
}

export async function dbSetItem<T = any>(storeName: StoreName, item: T): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(item);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`[IndexedDB] Falha ao gravar em ${storeName}:`, err);
  }
}

export async function dbSetAll<T = any>(storeName: StoreName, items: T[]): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear();

      for (const item of items) {
        store.put(item);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`[IndexedDB] Falha ao substituir coleção em ${storeName}:`, err);
  }
}

export async function dbDeleteItem(storeName: StoreName, id: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.delete(id);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`[IndexedDB] Falha ao deletar ${id} de ${storeName}:`, err);
  }
}

export async function dbClearStore(storeName: StoreName): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`[IndexedDB] Falha ao limpar ${storeName}:`, err);
  }
}

// --- STORE CHAVE-VALOR GENÉRICA (KV STORE) ---

export async function dbGetKV<T = any>(key: string, defaultValue: T | null = null): Promise<T | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.KV_STORE, 'readonly');
      const store = tx.objectStore(STORES.KV_STORE);
      const request = store.get(key);

      request.onsuccess = () => {
        if (request.result && request.result.value !== undefined) {
          resolve(request.result.value);
        } else {
          resolve(defaultValue);
        }
      };
      request.onerror = () => resolve(defaultValue);
    });
  } catch {
    return defaultValue;
  }
}

export async function dbSetKV(key: string, value: any): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.KV_STORE, 'readwrite');
      const store = tx.objectStore(STORES.KV_STORE);
      store.put({ key, value, atualizado_em: new Date().toISOString() });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`[IndexedDB] Falha ao gravar KV ${key}:`, err);
  }
}

// --- AUTO-MIGRAÇÃO TRANSPARENTE DE LOCALSTORAGE ➔ INDEXEDDB ---
export async function migrarLocalStorageParaIndexedDB(): Promise<void> {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const jaMigrado = await dbGetKV<boolean>('nail_migrado_indexeddb', false);
    if (jaMigrado) return;

    console.log('[IndexedDB] Iniciando migração segura do localStorage para o IndexedDB...');

    const mapeamento: { storageKey: string; storeName: StoreName }[] = [
      { storageKey: 'nail_clientes', storeName: STORES.CLIENTES },
      { storageKey: 'nail_agendamentos', storeName: STORES.AGENDAMENTOS },
      { storageKey: 'nail_servicos', storeName: STORES.SERVICOS },
      { storageKey: 'nail_pagamentos', storeName: STORES.PAGAMENTOS },
      { storageKey: 'nail_lista_espera', storeName: STORES.LISTA_ESPERA },
      { storageKey: 'nail_materiais', storeName: STORES.MATERIAIS },
      { storageKey: 'nail_despesas', storeName: STORES.DESPESAS },
      { storageKey: 'nail_equipe', storeName: STORES.USUARIOS },
      { storageKey: 'nail_produtos', storeName: STORES.PRODUTOS },
      { storageKey: 'nail_planos_assinatura', storeName: STORES.PLANOS_ASSINATURA }
    ];

    for (const item of mapeamento) {
      const raw = localStorage.getItem(item.storageKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            await dbSetAll(item.storeName, parsed);
          }
        } catch (e) {}
      }
    }

    // Migrar configurações e listas auxiliares para o KV Store
    const kvKeys = [
      'nail_config_salao',
      'nail_tecnicas',
      'nail_formatos',
      'nail_categorias_servico',
      'nail_categorias_despesa',
      'nail_itens_agendamento',
      'nail_app_seeded'
    ];

    for (const k of kvKeys) {
      const val = localStorage.getItem(k);
      if (val) {
        try {
          await dbSetKV(k, JSON.parse(val));
        } catch {
          await dbSetKV(k, val);
        }
      }
    }

    await dbSetKV('nail_migrado_indexeddb', true);
    console.log('[IndexedDB] Migração concluída com sucesso!');
  } catch (e) {
    console.warn('[IndexedDB] Aviso durante migração de localStorage:', e);
  }
}
