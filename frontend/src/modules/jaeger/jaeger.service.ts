import { Injectable, Scope } from '@nestjs/common';
import {
  initTracer,
  JaegerTracer,
  TracingConfig,
  TracingOptions,
} from 'jaeger-client';
import { Tags, Span, FORMAT_HTTP_HEADERS } from 'opentracing';

@Injectable({ scope: Scope.REQUEST })
export class JaegerService {
  private readonly tracer = this.initJaegerTracer('frontend');

  private initJaegerTracer(serviceName: string): JaegerTracer {
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

  createControllerSpan(
    controller: string,
    method: 'GET',
    parentSpan?: Span,
  ): Span {
    return this.tracer.startSpan(controller, {
      childOf: parentSpan,
      tags: {
        [Tags.SPAN_KIND]: Tags.SPAN_KIND_RPC_SERVER,
        [Tags.COMPONENT]: controller,
        [Tags.HTTP_METHOD]: method,
      },
    });
  }

  finishSpanWithResult(span: Span, status: number, errorTag?: boolean): void {
    span.setTag(Tags.HTTP_STATUS_CODE, status);
    if (errorTag) {
      span.setTag(Tags.ERROR, true);
    }
    span.finish();
  }

  inject(span: Span, carrier: unknown): void {
    this.tracer.inject(span, FORMAT_HTTP_HEADERS, carrier);
  }
}
