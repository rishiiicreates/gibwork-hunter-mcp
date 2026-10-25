export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isMcpMode: boolean = false;

  setMcpMode(enabled: boolean) {
    this.isMcpMode = enabled;
  }

  debug(message: string, ...args: unknown[]) {
    if (process.env.DEBUG || process.env.VERBOSE) {
      this.write('debug', message, args);
    }
  }

  info(message: string, ...args: unknown[]) {
    this.write('info', message, args);
  }

  warn(message: string, ...args: unknown[]) {
    this.write('warn', message, args);
  }

  error(message: string, ...args: unknown[]) {
    this.write('error', message, args);
  }

  private write(level: LogLevel, message: string, args: unknown[]) {
    const formatted = `[gibwork-hunter][${level.toUpperCase()}] ${message}`;
    // Always write to stderr to prevent corrupting stdout JSON-RPC stream in MCP mode
    if (this.isMcpMode || level === 'error' || level === 'warn') {
      if (args.length > 0) {
        console.error(formatted, ...args);
      } else {
        console.error(formatted);
      }
    } else {
      if (args.length > 0) {
        console.log(formatted, ...args);
      } else {
        console.log(formatted);
      }
    }
  }
}

export const logger = new Logger();
