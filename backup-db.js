const fs = require('fs');
const path = require('path');

const DB_FILE = 'jaiswal_fashion.db';
const BACKUP_DIR = path.join(__dirname, 'backups');

function backup() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const date = new Date();
  const timestamp =
    date.getFullYear() +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0') + '_' +
    String(date.getHours()).padStart(2, '0') +
    String(date.getMinutes()).padStart(2, '0');

  const backupFile = path.join(BACKUP_DIR, `jaiswal_fashion_${timestamp}.db`);
  const sourceFile = path.join(__dirname, DB_FILE);

  if (!fs.existsSync(sourceFile)) {
    console.log('Database file not found:', sourceFile);
    return false;
  }

  try {
    // Close DB connections first by using WAL checkpoint via better-sqlite3
    const Database = require('better-sqlite3');
    const db = new Database(sourceFile);
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.close();

    // Simple file copy for backup
    fs.copyFileSync(sourceFile, backupFile);
    const size = (fs.statSync(backupFile).size / 1024 / 1024).toFixed(1);
    console.log(`Backup created: ${backupFile} (${size} MB)`);

    // Keep only last 7 backups
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('jaiswal_fashion_') && f.endsWith('.db'))
      .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 7) {
      files.slice(7).forEach(f => {
        fs.unlinkSync(path.join(BACKUP_DIR, f.name));
        console.log('Removed old backup:', f.name);
      });
    }
    return true;
  } catch (err) {
    console.error('Backup failed:', err.message);
    return false;
  }
}

// Run once if executed directly, otherwise export for server use
if (require.main === module) {
  backup();
} else {
  module.exports = { backup };
}
