import { ILoggerService } from '@alchemisten/3d-studio-viewer-core';
import { injectable } from 'inversify';
import { ILogger, LoggerOptions } from '@schablone/logging';

@injectable()
export class AlternativeLoggerService implements ILoggerService {
  public init(options?: LoggerOptions, logger?: ILogger): void {
    // eslint-disable-next-line no-console
    console.log(
      "[CUSTOM LOGGER] This is a custom logger service. It does nothing but log to the console, so we won't be needing these: ",
      options,
      logger
    );
  }

  public debug(message: string) {
    // eslint-disable-next-line no-console
    console.log(`[CUSTOM LOGGER] ${message}`);
  }
  public error(message: string) {
    // eslint-disable-next-line no-console
    console.error(`[CUSTOM LOGGER] ${message}`);
  }
  public fatal(message: string) {
    // eslint-disable-next-line no-console
    console.error(`[CUSTOM LOGGER] ${message}`);
  }
  public info(message: string) {
    // eslint-disable-next-line no-console
    console.info(`[CUSTOM LOGGER] ${message}`);
  }
  public trace(message: string) {
    // eslint-disable-next-line no-console
    console.trace(`[CUSTOM LOGGER] ${message}`);
  }
  public warn(message: string) {
    // eslint-disable-next-line no-console
    console.warn(`[CUSTOM LOGGER] ${message}`);
  }

  public withOptions(options: LoggerOptions): ILogger {
    // eslint-disable-next-line no-console
    console.log('Those are some nice options. Would be a shame if nobody used them.', options);
    return this;
  }
}
