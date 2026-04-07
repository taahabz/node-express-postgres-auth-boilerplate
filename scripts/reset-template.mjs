import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const APP_NAME_REGEX = /^[a-z][a-z0-9-]{1,49}$/;

const getCliNameArg = () => {
  const arg = process.argv.find((value) => value.startsWith('--name='));
  if (!arg) return undefined;
  return arg.split('=')[1];
};

const getAppName = () => {
  return process.env.npm_config_name || getCliNameArg();
};

const runCommand = (command) => {
  return execSync(command, {
    cwd: rootDir,
    stdio: 'pipe',
    encoding: 'utf8',
  }).trim();
};

const ensureTemplateStructure = async () => {
  const requiredPaths = [
    path.join(rootDir, 'package.json'),
    path.join(rootDir, '.github', 'workflows', 'backend-deploy.yml'),
    path.join(rootDir, 'reset-template.config.json'),
    path.join(rootDir, '.git'),
  ];

  for (const requiredPath of requiredPaths) {
    try {
      await fs.access(requiredPath);
    } catch {
      throw new Error(`Missing required path: ${requiredPath}`);
    }
  }
};

const ensureCleanGitTree = () => {
  const status = runCommand('git status --porcelain');
  if (status) {
    throw new Error('Working tree is not clean. Commit or discard changes before running reset.');
  }
};

const ensureNotAlreadyReset = async () => {
  const markerPath = path.join(rootDir, '.template-reset.json');
  try {
    await fs.access(markerPath);
    throw new Error('This template appears to be already reset (.template-reset.json exists).');
  } catch (error) {
    if (error instanceof Error && error.message.includes('already reset')) {
      throw error;
    }
  }
};

const applyReplacements = async (appName) => {
  const configPath = path.join(rootDir, 'reset-template.config.json');
  const configRaw = await fs.readFile(configPath, 'utf8');
  const config = JSON.parse(configRaw);

  for (const relativeFile of config.files) {
    const absoluteFile = path.join(rootDir, relativeFile);
    const original = await fs.readFile(absoluteFile, 'utf8');

    let updated = original;
    for (const replacement of config.replacements) {
      const to = replacement.to.replaceAll('{{APP_NAME}}', appName);
      updated = updated.split(replacement.from).join(to);
    }

    if (updated !== original) {
      await fs.writeFile(absoluteFile, updated, 'utf8');
    }
  }
};

const writeResetMarker = async (appName) => {
  const marker = {
    appName,
    resetAt: new Date().toISOString(),
  };

  await fs.writeFile(path.join(rootDir, '.template-reset.json'), `${JSON.stringify(marker, null, 2)}\n`, 'utf8');
};

const resetGitHistory = async () => {
  await fs.rm(path.join(rootDir, '.git'), { recursive: true, force: true });

  try {
    runCommand('git init -b main');
  } catch {
    runCommand('git init');
    runCommand('git branch -M main');
  }
};

const main = async () => {
  const appName = getAppName();

  if (!appName) {
    throw new Error('Missing app name. Usage: npm run reset --name your-app-name');
  }

  if (!APP_NAME_REGEX.test(appName)) {
    throw new Error('Invalid app name. Use lowercase letters, numbers, and hyphens only (2-50 chars, must start with a letter).');
  }

  await ensureTemplateStructure();
  await ensureNotAlreadyReset();
  ensureCleanGitTree();
  await applyReplacements(appName);
  await writeResetMarker(appName);
  await resetGitHistory();

  console.log('\n✅ Template reset complete.');
  console.log(`App name: ${appName}`);
  console.log('\nNext steps:');
  console.log('1) git add .');
  console.log('2) git commit -m "chore: initialize from template"');
  console.log('3) git remote add origin <your-new-repo-url>');
  console.log('4) git push -u origin main\n');
};

main().catch((error) => {
  console.error(`\n❌ Reset failed: ${error.message}`);
  process.exit(1);
});
