const { execSync } = require('node:child_process');

const run = (cmd) => execSync(cmd, { stdio: 'ignore' });

try {
  run('git rev-parse --git-dir');
} catch {
  process.exit(0);
}

try {
  run('git config core.hooksPath .githooks');
} catch {
  // Non-fatal; hooks can still be enabled manually.
  process.exit(0);
}
