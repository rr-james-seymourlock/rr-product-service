/**
 * Production-grade structured logger using Pino
 *
 * Features:
 * - 5x faster than alternatives (Winston, Bunyan)
 * - Structured JSON logging by default
 * - Child loggers for namespacing
 * - AWS Lambda optimized (no hostname, pid)
 * - Pretty printing in development only
 * - Test-compatible (uses simple console in tests)
 *
 * @see https://github.com/pinojs/pino
 */
import pino, { type Logger as PinoLogger } from 'pino';

type LogContext = Record<string, unknown>;
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogEntry = {
  level: LogLevel;
  message: string;
  context?: LogContext;
  time: string;
};

/**
 * Base pino logger configured for AWS Lambda
 *
 * Configuration:
 * - No hostname (not useful in Lambda)
 * - No pid (not useful in serverless)
 * - ISO timestamps for consistency
 * - Pretty printing in development only
 */
const baseLogger =
  process.env.NODE_ENV === 'test'
    ? null // Don't initialize pino in test mode
    : pino({
        level: process.env.LOG_LEVEL || 'info',
        base: {
          // Don't include hostname and pid in Lambda
          // These add overhead and aren't useful in serverless
          ...(process.env.AWS_LAMBDA_FUNCTION_NAME
            ? { function: process.env.AWS_LAMBDA_FUNCTION_NAME }
            : {}),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
        formatters: {
          level: (label) => {
            return { level: label };
          },
        },
        // Use pino-pretty in development for human-readable output
        // In production, use raw JSON for performance and CloudWatch compatibility
        ...(process.env.NODE_ENV === 'development'
          ? {
              transport: {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'HH:MM:ss.l',
                  ignore: 'pid,hostname',
                },
              },
            }
          : {}),
      });

/**
 * Logger wrapper that maintains our existing API
 * while leveraging Pino's performance and features
 *
 * In test mode, uses simple console-based logging for compatibility with existing tests
 * In production/development, uses Pino for performance and features
 */
class Logger {
  private readonly pinoLogger: PinoLogger | null;
  private readonly namespace: string;

  constructor(namespace: string) {
    this.namespace = namespace;
    // Use Pino child logger for namespacing (except in tests)
    // Child loggers are extremely efficient in Pino
    this.pinoLogger = baseLogger ? baseLogger.child({ namespace }) : null;
  }

  debug(context: LogContext, message: string): void {
    if (this.pinoLogger) {
      this.pinoLogger.debug(context, message);
    } else {
      // Test mode: use simple console logging for test compatibility
      this.logToConsole('debug', message, context);
    }
  }

  info(context: LogContext, message: string): void {
    if (this.pinoLogger) {
      this.pinoLogger.info(context, message);
    } else {
      this.logToConsole('info', message, context);
    }
  }

  warn(context: LogContext, message: string): void {
    if (this.pinoLogger) {
      this.pinoLogger.warn(context, message);
    } else {
      this.logToConsole('warn', message, context);
    }
  }

  error(context: LogContext, message: string): void {
    if (this.pinoLogger) {
      this.pinoLogger.error(context, message);
    } else {
      this.logToConsole('error', message, context);
    }
  }

  /**
   * Simple console-based logging for test mode
   * Maintains backward compatibility with existing test spies
   */
  private logToConsole(level: LogLevel, message: string, context: LogContext): void {
    const entry: LogEntry = {
      level,
      message,
      context: {
        ...context,
        namespace: this.namespace,
      },
      time: new Date().toISOString(),
    };

    const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    logFn(JSON.stringify(entry));
  }
}

/**
 * Creates a logger instance with the given namespace
 *
 * Example:
 * ```ts
 * const logger = createLogger('url-parser');
 * logger.info({ url: 'https://example.com' }, 'Parsing URL');
 * ```
 */
export function createLogger(namespace: string): Logger {
  return new Logger(namespace);
}
