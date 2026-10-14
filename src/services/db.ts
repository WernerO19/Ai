import { KanbanTask, TerminalLogEntry, UserNote, SwarmMetricPoint, SwarmConfig, AIProvider } from '../types/swarm';

const DB_NAME = 'shemdots_swarm_db';
const DB_VERSION = 1;

interface DBSchema {
  tasks: KanbanTask;
  logs: TerminalLogEntry;
  notes: UserNote;
  telemetry: SwarmMetricPoint;
  config: { key: string; value: any };
}

class SwarmDatabase {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        console.warn('IndexedDB is not supported in this environment');
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
          taskStore.createIndex('status', 'status', { unique: false });
          taskStore.createIndex('assignedDotId', 'assignedDotId', { unique: false });
        }

        if (!db.objectStoreNames.contains('logs')) {
          const logStore = db.createObjectStore('logs', { keyPath: 'id' });
          logStore.createIndex('dotId', 'dotId', { unique: false });
          logStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('notes')) {
          const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
          noteStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('telemetry')) {
          const telemStore = db.createObjectStore('telemetry', { keyPath: 'timestamp' });
        }

        if (!db.objectStoreNames.contains('config')) {
          db.createObjectStore('config', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(request.error);
      };
    });
  }

  // Generic helper for transaction
  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.dbPromise;
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  // --- Tasks API ---
  async getAllTasks(): Promise<KanbanTask[]> {
    try {
      const store = await this.getStore('tasks');
      return new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  async saveTask(task: KanbanTask): Promise<void> {
    try {
      const store = await this.getStore('tasks', 'readwrite');
      store.put(task);
    } catch (e) {
      console.error('Failed to save task:', e);
    }
  }

  async deleteTask(id: string): Promise<void> {
    try {
      const store = await this.getStore('tasks', 'readwrite');
      store.delete(id);
    } catch (e) {
      console.error('Failed to delete task:', e);
    }
  }

  // --- Terminal Logs API ---
  async getAllLogs(limit = 150): Promise<TerminalLogEntry[]> {
    try {
      const store = await this.getStore('logs');
      return new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => {
          const logs = (req.result || []) as TerminalLogEntry[];
          logs.sort((a, b) => b.timestamp - a.timestamp);
          resolve(logs.slice(0, limit));
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  async addLog(log: TerminalLogEntry): Promise<void> {
    try {
      const store = await this.getStore('logs', 'readwrite');
      store.put(log);
    } catch (e) {
      console.error('Failed to save log:', e);
    }
  }

  async clearLogs(): Promise<void> {
    try {
      const store = await this.getStore('logs', 'readwrite');
      store.clear();
    } catch (e) {
      console.error('Failed to clear logs:', e);
    }
  }

  // --- Notes API ---
  async getAllNotes(): Promise<UserNote[]> {
    try {
      const store = await this.getStore('notes');
      return new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => {
          const notes = (req.result || []) as UserNote[];
          notes.sort((a, b) => b.updatedAt - a.updatedAt);
          resolve(notes);
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  async saveNote(note: UserNote): Promise<void> {
    try {
      const store = await this.getStore('notes', 'readwrite');
      store.put(note);
    } catch (e) {
      console.error('Failed to save note:', e);
    }
  }

  async deleteNote(id: string): Promise<void> {
    try {
      const store = await this.getStore('notes', 'readwrite');
      store.delete(id);
    } catch (e) {
      console.error('Failed to delete note:', e);
    }
  }

  // --- Telemetry Points API ---
  async getTelemetry(limit = 25): Promise<SwarmMetricPoint[]> {
    try {
      const store = await this.getStore('telemetry');
      return new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => {
          const points = (req.result || []) as SwarmMetricPoint[];
          points.sort((a, b) => a.timestamp - b.timestamp);
          resolve(points.slice(-limit));
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  async addTelemetryPoint(point: SwarmMetricPoint): Promise<void> {
    try {
      const store = await this.getStore('telemetry', 'readwrite');
      store.put(point);
    } catch (e) {
      console.error('Failed to save telemetry point:', e);
    }
  }

  // --- Config / Vault API ---
  async getConfig(key: string): Promise<any> {
    try {
      const store = await this.getStore('config');
      return new Promise((resolve) => {
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ? req.result.value : null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  async saveConfig(key: string, value: any): Promise<void> {
    try {
      const store = await this.getStore('config', 'readwrite');
      store.put({ key, value });
    } catch (e) {
      console.error('Failed to save config:', e);
    }
  }

  // --- Custom Terminal Commands API ---
  async getCustomCommands(): Promise<any[]> {
    const list = await this.getConfig('custom_terminal_commands');
    return Array.isArray(list) ? list : [];
  }

  async saveCustomCommands(commands: any[]): Promise<void> {
    await this.saveConfig('custom_terminal_commands', commands);
  }

  // --- Database Stats Inspector ---
  async getInspectorStats(): Promise<{
    taskCount: number;
    logCount: number;
    noteCount: number;
    telemetryCount: number;
    storageEstimatedKb: number;
  }> {
    const tasks = await this.getAllTasks();
    const logs = await this.getAllLogs(1000);
    const notes = await this.getAllNotes();
    const telemetry = await this.getTelemetry(1000);

    let storageEstimatedKb = 0;
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        storageEstimatedKb = Math.round((estimate.usage || 0) / 1024);
      } catch {
        storageEstimatedKb = 42;
      }
    } else {
      storageEstimatedKb = Math.round((JSON.stringify({ tasks, logs, notes, telemetry }).length) / 1024);
    }

    return {
      taskCount: tasks.length,
      logCount: logs.length,
      noteCount: notes.length,
      telemetryCount: telemetry.length,
      storageEstimatedKb,
    };
  }

  // --- Export and Import ---
  async exportFullDatabase(): Promise<string> {
    const tasks = await this.getAllTasks();
    const logs = await this.getAllLogs(1000);
    const notes = await this.getAllNotes();
    const telemetry = await this.getTelemetry(1000);
    const config = await this.getConfig('swarm_settings');

    const payload = {
      exportDate: new Date().toISOString(),
      version: 1,
      tasks,
      logs,
      notes,
      telemetry,
      config,
    };

    return JSON.stringify(payload, null, 2);
  }

  async importFullDatabase(jsonString: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.tasks)) {
        for (const t of data.tasks) await this.saveTask(t);
      }
      if (Array.isArray(data.logs)) {
        for (const l of data.logs) await this.addLog(l);
      }
      if (Array.isArray(data.notes)) {
        for (const n of data.notes) await this.saveNote(n);
      }
      if (data.config) {
        await this.saveConfig('swarm_settings', data.config);
      }
      return true;
    } catch (err) {
      console.error('Import failed:', err);
      return false;
    }
  }

  async resetDatabase(): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(['tasks', 'logs', 'notes', 'telemetry'], 'readwrite');
    tx.objectStore('tasks').clear();
    tx.objectStore('logs').clear();
    tx.objectStore('notes').clear();
    tx.objectStore('telemetry').clear();
  }
}

export const dbService = new SwarmDatabase();
