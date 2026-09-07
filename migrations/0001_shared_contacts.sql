CREATE TABLE IF NOT EXISTS contact_directory (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  entries TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(entries)),
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS contact_versions (
  revision INTEGER PRIMARY KEY,
  entries TEXT NOT NULL CHECK (json_valid(entries)),
  saved_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO contact_directory (id, entries, revision, updated_at) VALUES (1, '[]', 0, unixepoch() * 1000);
CREATE TRIGGER IF NOT EXISTS backup_contacts_before_update
BEFORE UPDATE ON contact_directory
BEGIN
  INSERT OR IGNORE INTO contact_versions (revision, entries, saved_at) VALUES (OLD.revision, OLD.entries, unixepoch() * 1000);
  DELETE FROM contact_versions WHERE saved_at < (unixepoch() - 7776000) * 1000;
END;
