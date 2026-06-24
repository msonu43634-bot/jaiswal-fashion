const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'jaiswal_fashion.db');
const BACKUP_DIR = path.join(__dirname, 'backups');

function backup() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `jaiswal_fashion_${timestamp}.db`);

  const db = new Database(DB_PATH);
  db.backup(backupPath)
    .then(() => {
      console.log(`Database backup created: ${backupPath}`);
    })
    .catch((err) => {
      console.error('Backup failed:', err);
    })
    .finally(() => {
      db.close();
    });
}

module.exports = { backup };
