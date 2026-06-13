import { Observable } from 'rxjs';
import { retry, timer } from 'rxjs';

export interface RetryOptions {
  context?: string;
  maxRetries?: number;
  delayMs?: number;
}

/**
 * Aplica retry com backoff simples a uma chamada HTTP.
 * Equivalente ao `withRetry(fn, { context })` do projeto original.
 */
export function withRetry<T>(source: Observable<T>, options: RetryOptions = {}): Observable<T> {
  const { maxRetries = 2, delayMs = 500 } = options;

  return source.pipe(
    retry({
      count: maxRetries,
      delay: (_error, retryCount) => timer(delayMs * retryCount),
    }),
  );
}
