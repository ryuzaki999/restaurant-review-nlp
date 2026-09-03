import { defineConfig } from 'vitest/config';
import os from 'node:os';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    // Use a shared temp FILE (not ':memory:') so the app and the test always
    // read the same SQLite database, even if Vitest resolves the CJS `db`
    // module through two different module instances.
    env: { DB_PATH: path.join(os.tmpdir(), 'restaurant-review-nlp-test.db') },
    testTimeout: 10_000,
  },
});
