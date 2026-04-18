import * as fs from 'node:fs';
import * as path from 'node:path';

// Fallback para quando não estamos usando Bun
let Database: any = null;
try {
  // @ts-ignore
  const bunSqlite = await import('bun:sqlite').catch(() => null);
  if (bunSqlite) Database = bunSqlite.Database;
} catch (e) {}

export interface AgentState {
  session: string;
  status: 'thinking' | 'acting' | 'idling';
  tokens_used: number;
}

class JsonPersistence {
  private filePath: string;
  private data: any = { sessions: {}, messages: [], experience: [] };

  constructor(filename: string) {
    this.filePath = path.resolve(process.cwd(), filename.replace('.db', '.json'));
    this.load();
  }

  private load() {
    if (fs.existsSync(this.filePath)) {
      try {
        this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      } catch (e) {
        this.data = { sessions: {}, messages: [], experience: [] };
      }
    }
  }

  private save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }

  exec(query: string) { /* No-op for compatibility */ }

  prepare(query: string) {
    const self = this;
    return {
      run(...args: any[]) {
        if (query.includes('INSERT INTO sessions')) {
          self.data.sessions[args[0]] = { tokens_used: args[1] };
        } else if (query.includes('INSERT INTO messages')) {
          self.data.messages.push({ session_id: args[0], role: args[1], content: args[2], created_at: new Date().toISOString() });
        } else if (query.includes('INSERT INTO experience_buffer')) {
          self.data.experience.push({ session_id: args[0], trajectory: args[1], created_at: new Date().toISOString() });
        }
        self.save();
      },
      all() { return []; },
      get() { return null; }
    };
  }

  close() { this.save(); }
}

export class Memory {
  private db: any = null;
  private isNative = false;

  constructor() {
    try {
      if (Database) {
        this.db = new Database('nasai_history.db');
        this.isNative = true;
      } else {
        // Fallback para persistência via JSON para evitar erro de SQLite e perda de dados
        this.db = new JsonPersistence('nasai_history.db');
        this.isNative = false;
      }
    } catch (e) {
      this.db = new JsonPersistence('nasai_history.db');
      this.isNative = false;
    }
  }

  async connect() {
    if (!this.db) return;
    try {
      if (this.isNative) {
        await this.initDB();
      }
    } catch (e) {
      console.warn("Could not initialize SQLite database:", e);
    }
  }

  private async initDB() {
    if (!this.db || !this.isNative) return;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        tokens_used INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        role TEXT,
        content TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS experience_buffer (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        trajectory TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  async saveSession(state: AgentState) {
    if (!this.db) return;
    try {
      const query = this.isNative 
        ? `INSERT INTO sessions (id, tokens_used) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET tokens_used = ?`
        : `INSERT INTO sessions (id, tokens_used) VALUES (?, ?)`;
        
      const stmt = this.db.prepare(query);
      if (this.isNative) {
        stmt.run(state.session, state.tokens_used, state.tokens_used);
      } else {
        stmt.run(state.session, state.tokens_used);
      }
    } catch (e) { /* ignore */ }
  }

  async saveMessage(sessionId: string, role: string, content: string) {
    if (!this.db) return;
    try {
      const stmt = this.db.prepare(`
        INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)
      `);
      stmt.run(sessionId, role, content);
    } catch (e) { /* ignore */ }
  }

  async saveExperience(sessionId: string, trajectory: any[]) {
    if (!this.db) return;
    try {
      if (trajectory.length > 3) {
        const stmt = this.db.prepare(`
          INSERT INTO experience_buffer (session_id, trajectory) VALUES (?, ?)
        `);
        stmt.run(sessionId, JSON.stringify(trajectory));
      }
    } catch (e) { console.error("Falha ao salvar experiência:", e); }
  }

  async disconnect() {
    if (this.db) {
      this.db.close();
    }
  }
}
