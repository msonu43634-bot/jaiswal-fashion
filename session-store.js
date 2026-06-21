const Database = require('better-sqlite3');
const path = require('path');
const { MemoryStore } = require('express-session');

class SQLiteStore extends MemoryStore {
  constructor({ dbPath } = {}) {
    super();
    const resolvedPath = dbPath || path.join(__dirname, 'jaiswal_fashion.db');
    this.db = new Database(resolvedPath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        expires_at DATETIME
      )
    `);
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    this._loadAllSessions();
  }

  _loadAllSessions() {
    const rows = this.db.prepare('SELECT sid, data FROM sessions').all();
    for (const row of rows) {
      try {
        const session = JSON.parse(row.data);
        this.set(row.sid, session);
      } catch (e) { }
    }
  }

  cleanup() {
    this.db.prepare("DELETE FROM sessions WHERE expires_at IS NOT NULL AND expires_at < datetime('now')").run();
  }

  get(sid, callback) {
    try {
      const row = this.db.prepare('SELECT data, expires_at FROM sessions WHERE sid = ?').get(sid);
      if (!row) return callback(null, null);
      if (row.expires_at && new Date(row.expires_at) < new Date()) {
        this.destroy(sid, () => callback(null, null));
        return;
      }
      const session = JSON.parse(row.data);
      super.set(sid, session);
      callback(null, JSON.parse(JSON.stringify(session)));
    } catch (err) {
      callback(err);
    }
  }

  set(sid, session, callback) {
    super.set(sid, session);
    try {
      const expiresAt = session.cookie && session.cookie.maxAge
        ? new Date(Date.now() + session.cookie.maxAge).toISOString()
        : null;
      this.db.prepare(
        'INSERT OR REPLACE INTO sessions (sid, data, expires_at) VALUES (?, ?, ?)'
      ).run(sid, JSON.stringify(session), expiresAt);
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }

  touch(sid, session, callback) {
    super.touch(sid, session);
    try {
      const expiresAt = session.cookie && session.cookie.maxAge
        ? new Date(Date.now() + session.cookie.maxAge).toISOString()
        : null;
      this.db.prepare(
        'UPDATE sessions SET data = ?, expires_at = ? WHERE sid = ?'
      ).run(JSON.stringify(session), expiresAt, sid);
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }

  destroy(sid, callback) {
    super.destroy(sid);
    this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
    if (callback) callback(null);
  }

  close() {
    clearInterval(this.cleanupInterval);
    this.db.close();
  }
}

module.exports = SQLiteStore;
