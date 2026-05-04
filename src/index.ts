import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { buildCommand } from './commands/build.js';
import { packageCommand } from './commands/package.js';
import { signCommand } from './commands/sign.js';
import { verifyCommand } from './commands/verify.js';
import { submitCommand } from './commands/submit.js';

const program = new Command();

program
  .name('glok')
  .description(chalk.bold('Glok CLI') + ' — Package and publish apps to the Glok Store')
  .version('1.0.0', '-v, --version', 'Output the current version');

program
  .command('init')
  .description('Initialize a new Glok app project in the current directory')
  .action(async () => {
    await initCommand();
  });

program
  .command('build')
  .description('Build the project (runs your build script or npm run build)')
  .option('-s, --script <cmd>', 'Custom build command to run')
  .action(async (opts: { script?: string }) => {
    await buildCommand({ script: opts.script });
  });

program
  .command('package')
  .description('Package your app into a .glok (desktop) or .glk (mobile/web) archive')
  .option('-o, --output <file>', 'Output file path (default: <name>-<version>.<ext>)')
  .option('--no-sign', 'Skip including signature.sig even if present')
  .action(async (opts: { output?: string; sign: boolean }) => {
    await packageCommand({ output: opts.output, noSign: !opts.sign });
  });

program
  .command('sign')
  .description('Sign your app package with an Ed25519 key pair')
  .option('-p, --package <file>', 'Path to the package file to sign')
  .option('--regenerate', 'Generate a new key pair even if one already exists')
  .action(async (opts: { package?: string; regenerate?: boolean }) => {
    await signCommand({ package: opts.package, regenerate: opts.regenerate });
  });

program
  .command('verify')
  .description('Verify a Glok package for integrity and signature')
  .argument('<package>', 'Path to the .glok or .glk package file')
  .option('--public-key <base64>', 'Base64-encoded public key to verify against (overrides ~/.glok/keys/public.key)')
  .action(async (pkg: string, opts: { publicKey?: string }) => {
    await verifyCommand({ package: pkg, publicKey: opts.publicKey });
  });

program
  .command('submit')
  .description('Generate submission metadata JSON for the Glok Store API')
  .option('-p, --package <file>', 'Path to the package file (default: auto-detected)')
  .action(async (opts: { package?: string }) => {
    await submitCommand({ package: opts.package });
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(chalk.red('✖ Fatal error:'), message);
  process.exit(1);
});
