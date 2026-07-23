// Publish ./dist to the gh-pages branch (deploy-from-branch Pages).
// Usage: npm run deploy   (runs a build first via the npm script)
import { execSync } from 'node:child_process';
import { existsSync, copyFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const dist = resolve(root, 'dist');
if (!existsSync(dist)) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

const REPO = 'https://github.com/xx0019v/what-she-wanted.git';
const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' });

// SPA/deep-link fallback + disable Jekyll so files starting with _ are served.
copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'));
writeFileSync(resolve(dist, '.nojekyll'), '');

run('rm -rf .git', dist);
run('git init -b gh-pages -q', dist);
run('git config user.email "jeltzis@gmail.com"', dist);
run('git config user.name "xx0019v"', dist);
run('git add -A', dist);
run('git commit -q -m "Publish WebAR build to Pages"', dist);
run(`git push -f ${REPO} gh-pages`, dist);
run('rm -rf .git', dist);
console.log('\nDeployed → https://xx0019v.github.io/what-she-wanted/');
