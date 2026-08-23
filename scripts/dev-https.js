const { spawn } = require('child_process');
const path = require('path');

process.env.TV_SSL = '1';

const vite = path.join(__dirname, '..', 'node_modules', '.bin', 'vite');
const args = ['--port=3000', '--host=0.0.0.0'];
const bin = process.platform === 'win32' ? `${vite}.cmd` : vite;

const child = spawn(bin, args, { stdio: 'inherit', env: process.env, shell: process.platform === 'win32' });
child.on('exit', (code) => process.exit(code ?? 0));
