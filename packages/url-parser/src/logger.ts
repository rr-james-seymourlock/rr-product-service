/**
 * Simple structured logger for url-parser package
 *
 * In production, this should be replaced with a proper logging service
 * like Pino, Winston, or a cloud provider's logger.
 */

type LogContext = Record<string, unknown>;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: string;
}

class Logger {
  private readonly namespace: string;

  constructor(namespace: string) {
    this.namespace = namespace;
  }

  debug(context: LogContext, message: string): void {
    this.log('debug', message, context);
  }

  info(context: LogContext, message: string): void {
    this.log('info', message, context);
  }

  warn(context: LogContext, message: string): void {
    this.log('warn', message, context);
  }

  error(context: LogContext, message: string): void {
    this.log('error', message, context);
  }

  private log(level: LogLevel, message: string, context: LogContext): void {
    const entry: LogEntry = {
      level,
      message,
      context: {
        ...context,
        namespace: this.namespace,
      },
      timestamp: new Date().toISOString(),
    };

    // In production, this would go to CloudWatch, Datadog, etc.
    // For now, use structured console output
    if (process.env['NODE_ENV'] !== 'test') {
      const logFn = level === 'error' ? console.error : console.log;
      logFn(JSON.stringify(entry));
    }
  }
}

/**
 * Creates a logger instance with the given namespace
 */
export function createLogger(namespace: string): Logger {
  return new Logger(namespace);
}

/**
 * Default logger for url-parser
 */
export const logger = createLogger('url-parser');
