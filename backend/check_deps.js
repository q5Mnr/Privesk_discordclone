const fs = require('fs');
const path = require('path');

const REQUIRED_PACKAGES = {
  express: 'express',
  'socket.io': 'socket.io',
  'sql.js': 'sql.js',
  bcryptjs: 'bcryptjs',
  jsonwebtoken: 'jsonwebtoken',
  multer: 'multer',
  cors: 'cors',
  uuid: 'uuid',
};

const REQUIRED_FRONTEND = {
  react: 'react',
  'react-dom': 'react-dom',
  'react-router-dom': 'react-router-dom',
  'socket.io-client': 'socket.io-client',
  'lucide-react': 'lucide-react',
};

function checkDir(dir, label, required) {
  console.log(`\n  ${label}:`);
  const nmPath = path.join(dir, 'node_modules');
  const hasNm = fs.existsSync(nmPath);
  if (!hasNm) {
    console.log('    node_modules не найден! --> npm install');
    return false;
  }
  let ok = true;
  for (const [pkg, pip] of Object.entries(required)) {
    try {
      const pkgJson = path.join(nmPath, pkg, 'package.json');
      if (fs.existsSync(pkgJson)) {
        const data = JSON.parse(fs.readFileSync(pkgJson, 'utf8'));
        console.log(`    ${pip.padEnd(25)} ${data.version} OK`);
      } else {
        console.log(`    ${pip.padEnd(25)} НЕ НАЙДЕН  -->  npm install ${pip}`);
        ok = false;
      }
    } catch {
      console.log(`    ${pip.padEnd(25)} ОШИБКА`);
      ok = false;
    }
  }
  return ok;
}

function check() {
  console.log('=' .repeat(50));
  console.log('  ПРОВЕРКА NODE.JS ЗАВИСИМОСТЕЙ');
  console.log('=' .repeat(50));

  const nodeVer = process.version;
  const major = parseInt(nodeVer.slice(1));
  if (major >= 18) {
    console.log(`  Node.js ${nodeVer} ........... OK`);
  } else {
    console.log(`  Node.js ${nodeVer} ........... ОШИБКА (нужен >=18)`);
  }

  const baseDir = path.resolve(__dirname, '..');
  const backendDir = path.join(baseDir, 'backend');
  const frontendDir = path.join(baseDir, 'frontend');

  let ok = true;
  if (!checkDir(backendDir, 'Backend (express, socket.io, sql.js...)', REQUIRED_PACKAGES)) ok = false;
  if (!checkDir(frontendDir, 'Frontend (react, react-dom, vite...)', REQUIRED_FRONTEND)) ok = false;

  console.log('\n' + '='.repeat(50));
  if (ok) {
    console.log('  Все Node.js зависимости установлены!');
  } else {
    console.log('  Установите недостающие:');
    console.log('  cd backend && npm install');
    console.log('  cd frontend && npm install');
  }
  console.log('='.repeat(50));
  return ok;
}

if (require.main === module) {
  process.exit(check() ? 0 : 1);
}

module.exports = check;
