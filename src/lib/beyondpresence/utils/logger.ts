import { Logger, LogLevel } from '../types';

/**
 * Default console logger implementation
 */
class ConsoleLogger implements Logger {
  constructor(private logLevel: LogLevel = LogLevel.WARN) {}

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(level: string, message: string, context?: object): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [BeyondPresence] [${level}] ${message}${contextStr}`;
  }

  debug(message: string, context?: object): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage('DEBUG', message, context));
    }
  }

  info(message: string, context?: object): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('INFO', message, context));
    }
  }

  warn(message: string, context?: object): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message, context));
    }
  }

  error(message: string, error?: Error, context?: object): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorContext = error ? { ...context, error: error.message, stack: error.stack } : context;
      console.error(this.formatMessage('ERROR', message, errorContext));
    }
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
}

// Global logger instance
let globalLogger: Logger = new ConsoleLogger();

/**
 * Gets the current logger instance
 */
export function getLogger(): Logger {
  return globalLogger;
}

/**
 * Sets a custom logger implementation
 */
export function setLogger(logger: Logger): void {
  globalLogger = logger;
}

/**
 * Sets the log level for the default console logger
 */
export function setLogLevel(level: LogLevel): void {
  if (globalLogger instanceof ConsoleLogger) {
    (globalLogger as ConsoleLogger).setLogLevel(level);
  }
}

/**
 * Creates a logger with a specific context prefix
 */
export function createContextLogger(context: string): Logger {
  return {
    debug: (message: string, ctx?: object) => 
      globalLogger.debug(`[${context}] ${message}`, ctx),
    info: (message: string, ctx?: object) => 
      globalLogger.info(`[${context}] ${message}`, ctx),
    warn: (message: string, ctx?: object) => 
      globalLogger.warn(`[${context}] ${message}`, ctx),
    error: (message: string, error?: Error, ctx?: object) => 
      globalLogger.error(`[${context}] ${message}`, error, ctx)
  };
}

/**
 * Convenience functions for logging
 */
export const log = {
  debug: (message: string, context?: object) => globalLogger.debug(message, context),
  info: (message: string, context?: object) => globalLogger.info(message, context),
  warn: (message: string, context?: object) => globalLogger.warn(message, context),
  error: (message: string, error?: Error, context?: object) => globalLogger.error(message, error, context)
};