import fs from 'fs';
import path from 'path';

console.log(' Running pre-commit custom checks...');

// 1. Check for TODO/FIXME comments
function checkTODOs() {
  const files = getJsFiles('./src');
  let todoCount = 0;

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(/TODO|FIXME/g);
    if (matches) {
      todoCount += matches.length;
      console.warn(`⚠️ TODO/FIXME found in ${file}`);
    }
  });

  if (todoCount > 0) {
    console.error(
      `❌ Found ${todoCount} TODO/FIXME comments! Please address before committing.`
    );
    process.exit(1);
  }
}

// 2. Check for console.log statements (discourage usage)
function checkConsoleLogs() {
  const files = getJsFiles('./src');
  let logCount = 0;

  files.forEach(file => {
    // Skip the logger file itself
    if (file.includes('logger.js')) {
      return;
    }

    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(/console\.log/g);
    if (matches) {
      logCount += matches.length;
      console.warn(`⚠️ console.log found in ${file}`);
    }
  });

  if (logCount > 0) {
    console.error(
      `❌ Found ${logCount} console.log statements! Please remove or replace with logger.`
    );
    process.exit(1);
  }
}

// 3. Check file naming (allow dot notation for Node.js)
function checkFileNaming() {
  const files = getJsFiles('./src');
  const invalidFiles = [];

  files.forEach(file => {
    const fileName = path.basename(file, '.js');
    // Allow snake_case, camelCase, and dot notation (common in Node.js)
    if (
      !/^[a-z][a-z0-9]*(_[a-z0-9]+)*$|^[a-z][a-zA-Z0-9]*$|^[a-z][a-z0-9]*\.[a-z][a-z0-9]*$/.test(
        fileName
      )
    ) {
      invalidFiles.push(file);
    }
  });

  if (invalidFiles.length > 0) {
    console.error(
      '❌ Invalid file naming found! Files should use snake_case, camelCase, or dot notation:'
    );
    invalidFiles.forEach(file => console.error(`   ${file}`));
    process.exit(1);
  }
}

// In scripts/pre-commit.js, replace the hardcoded strings check with:
function checkHardcodedStrings() {
  const apiFiles = getJsFiles('./src').filter(file => {
    const isController = file.includes(
      `${path.sep}api${path.sep}controllers${path.sep}`
    );
    const isRoute = file.includes(`${path.sep}api${path.sep}routes${path.sep}`);
    const inConstants = file.includes(
      `${path.sep}core${path.sep}constants${path.sep}`
    );
    const isLogger = file.endsWith(`${path.sep}logger.js`);
    const isTest = file.includes(`${path.sep}tests${path.sep}`);
    return (isController || isRoute) && !inConstants && !isLogger && !isTest;
  });

  let total = 0;

  apiFiles.forEach(file => {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    let perFile = 0;

    lines.forEach(line => {
      // Ignore import/require lines
      if (/\brequire\(|\bimport\b/.test(line)) return;

      const matches = line.match(/(['"])(?:\\.|(?!\1).)*\1/g);
      if (!matches) return;

      matches.forEach(str => {
        const s = str.slice(1, -1).trim();

        // Skip common safe literals
        if (s === 'use strict') return;
        if (/^\/[A-Za-z0-9/_:-]*$/.test(s)) return; // route-like paths
        if (s.length < 5) return;

        perFile += 1;
      });
    });

    if (perFile > 0) {
      total += perFile;
      console.warn(`⚠️ Potential hardcoded strings in ${file}`);
    }
  });

  if (total > 0) {
    console.error(
      `❌ Found ${total} potential hardcoded strings! Consider using constants.`
    );
    process.exit(1);
  }
}

// 5. Check Node.js architecture compliance
function checkArchitecture() {
  const srcDir = './src';
  const requiredDirs = ['api', 'core', 'config', 'middleware', 'utils'];
  const missingDirs = [];

  requiredDirs.forEach(dir => {
    if (!fs.existsSync(path.join(srcDir, dir))) {
      missingDirs.push(dir);
    }
  });

  if (missingDirs.length > 0) {
    console.error(
      `❌ Missing required architecture directories: ${missingDirs.join(', ')}`
    );
    process.exit(1);
  }
}

// Helper to recursively get JS files
function getJsFiles(dir, collectedFiles = []) {
  if (!fs.existsSync(dir)) return collectedFiles;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getJsFiles(fullPath, collectedFiles);
    } else if (file.endsWith('.js')) {
      collectedFiles.push(fullPath);
    }
  }
  return collectedFiles;
}

try {
  checkTODOs();
  checkConsoleLogs();
  checkFileNaming();
  checkHardcodedStrings();
  checkArchitecture();
  console.log('✅ Custom pre-commit checks passed!');
} catch (e) {
  console.error(e);
  process.exit(1);
}
