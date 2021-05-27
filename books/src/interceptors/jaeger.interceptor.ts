import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import {
  initTracer,
  JaegerTracer,
  TracingConfig,
  TracingOptions,
} from 'jaeger-client';
import { FORMAT_HTTP_HEADERS, Tags, Span } from 'opentracing';

const tracer = initJaegerTracer('book');

function initJaegerTracer(serviceName: string): JaegerTracer {
  const config: TracingConfig = {
    serviceName: serviceName,
    sampler: {
      param: 1,
      type: 'const',
    },
    reporter: {
      collectorEndpoint: 'http://jaeger:14268/api/traces',
      logSpans: true,
    },
  };
  const options: TracingOptions = {
    logger: {
      info: function logInfo(msg: string) {
        console.info('INFO:  ', msg);
      },
      error: function logError(msg: string) {
        console.error('ERROR: ', msg);
      },
    },
  };
  return initTracer(config, options);
}

export function createControllerSpan(
  controller: string,
  method: string,
  headers: unknown,
): Span {
  const parentSpanContext = tracer.extract(FORMAT_HTTP_HEADERS, headers);
  return tracer.startSpan('interceptor', {
    childOf: parentSpanContext,
    tags: {
      [Tags.SPAN_KIND]: Tags.SPAN_KIND_RPC_SERVER,
      [Tags.COMPONENT]: controller,
      [Tags.HTTP_METHOD]: method,
    },
  });
}

export function finishSpanWithResult(
  span: Span,
  status: number,
  errorTag?: boolean,
): void {
  span.setTag(Tags.HTTP_STATUS_CODE, status);
  if (errorTag) {
    span.setTag(Tags.ERROR, true);
  }
  span.finish();
}

@Injectable()
export class JaegerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();

    const traceSpan = createControllerSpan(
      request.url,
      request.method,
      request.headers,
    );
    return next.handle().pipe(
      catchError((err: unknown) => {
        finishSpanWithResult(traceSpan, 500, true);
        return throwError(err);
      }),
      tap(() => {
        finishSpanWithResult(traceSpan, 200);
      }),
    );
  }
}
