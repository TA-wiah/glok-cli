import chalk from 'chalk';

export const logger = {
  info(message: string): void {
    console.log(chalk.cyan('ℹ'), message);
  },

  success(message: string): void {
    console.log(chalk.green('✔'), message);
  },

  warn(message: string): void {
    console.warn(chalk.yellow('⚠'), message);
  },

  error(message: string): void {
    console.error(chalk.red('✖'), message);
  },

  step(step: string, message: string): void {
    console.log(chalk.bold.blue(`[${step}]`), message);
  },

  header(title: string): void {
    console.log('');
    console.log(chalk.bold.magenta('━'.repeat(50)));
    console.log(chalk.bold.magenta(`  ${title}`));
    console.log(chalk.bold.magenta('━'.repeat(50)));
    console.log('');
  },

  blank(): void {
    console.log('');
  },
};
