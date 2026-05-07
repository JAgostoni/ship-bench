const db = (await import('better-sqlite3')).default;
const dbInstance = db(':memory:');
dbInstance.exec('CREATE VIRTUAL TABLE test_fts USING fts5(content)');
dbInstance.exec("INSERT INTO test_fts VALUES ('hello search me')");
const results = dbInstance.prepare("SELECT * FROM test_fts WHERE test_fts MATCH 'search'").all();
console.log('FTS5 results:', results);
dbInstance.close();