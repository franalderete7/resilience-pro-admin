type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  details?: any
  timestamp: string
}

class Logger {
  private static formatMessage(level: LogLevel, message: string, details?: any): LogEntry {
    return {
      level,
      message,
      details,
      timestamp: new Date().toISOString(),
    }
  }

  static info(message: string, details?: any) {
    const entry = this.formatMessage('info', message, details)
    console.log(`[INFO] ${entry.message}`, details || '')
    // Here we could add external logging service
  }

  static warn(message: string, details?: any) {
    const entry = this.formatMessage('warn', message, details)
    console.warn(`[WARN] ${entry.message}`, details || '')
  }

  static error(message: string, details?: any) {
    const entry = this.formatMessage('error', message, details)
    console.error(`[ERROR] ${entry.message}`, details || '')
  }

  static debug(message: string, details?: any) {
    if (process.env.NODE_ENV === 'development') {
      const entry = this.formatMessage('debug', message, details)
      console.debug(`[DEBUG] ${entry.message}`, details || '')
    }
  }
}

export const logger = Logger

