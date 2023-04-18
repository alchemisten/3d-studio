import { injectable } from 'inversify';
import { ILogger, Logger, LoggerOptions, LogOptions } from '@schablone/logging';
import { ILoggerService } from '../../types';

@injectable()
export class LoggerService implements ILoggerService {
  private logger: ILogger;

  public constructor() {
    this.logger = new Logger({
      // TODO: Set environment via config
      environment: 'local',
    });
  }

  public debug(message: string, options?: LogOptions): void {
    this.logger.debug(message, options);
  }

  public error(message: string, options?: LogOptions): void {
    this.logger.error(message, options);
  }

  public fatal(message: string, options?: LogOptions): void {
    this.logger.fatal(message, options);
  }

  public info(message: string, options?: LogOptions): void {
    this.logger.info(message, options);
  }

  public trace(message: string, options?: LogOptions): void {
    this.logger.trace(message, options);
  }

  public warn(message: string, options?: LogOptions): void {
    this.logger.warn(message, options);
  }

  public withOptions(options: LoggerOptions): ILogger {
    return this.logger.withOptions(options);
  }
}
