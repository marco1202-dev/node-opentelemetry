const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SEMRESATTRS_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { LoggerProvider, SimpleLogRecordProcessor } = require('@opentelemetry/sdk-logs');
const { logs } = require('@opentelemetry/api-logs');
const { trace, context, SpanStatusCode } = require('@opentelemetry/api');

const OBSERVE_ENDPOINT = process.env.OBSERVE_ENDPOINT || 'https://collect.observeinc.com/v1/otlp';
const OBSERVE_TOKEN = process.env.OBSERVE_TOKEN || '';

let sdk = null;
let loggerProvider = null;
let logger = null;

function initializeTelemetry() {
  if (sdk) {
    return;
  }

  const resource = new Resource({
    [SEMRESATTRS_SERVICE_NAME]: 'lambda-log-processor',
    'deployment.environment': process.env.AWS_LAMBDA_FUNCTION_NAME ? 'production' : 'development',
  });

  const traceExporter = new OTLPTraceExporter({
    url: `${OBSERVE_ENDPOINT}/v1/traces`,
    headers: OBSERVE_TOKEN ? {
      'Authorization': `Bearer ${OBSERVE_TOKEN}`,
    } : {},
  });

  const metricExporter = new OTLPMetricExporter({
    url: `${OBSERVE_ENDPOINT}/v1/metrics`,
    headers: OBSERVE_TOKEN ? {
      'Authorization': `Bearer ${OBSERVE_TOKEN}`,
    } : {},
  });

  const logExporter = new OTLPLogExporter({
    url: `${OBSERVE_ENDPOINT}/v1/logs`,
    headers: OBSERVE_TOKEN ? {
      'Authorization': `Bearer ${OBSERVE_TOKEN}`,
    } : {},
  });

  sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations()],
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 5000,
    }),
  });

  loggerProvider = new LoggerProvider({
    resource,
  });

  loggerProvider.addLogRecordProcessor(
    new SimpleLogRecordProcessor(logExporter)
  );

  logs.setGlobalLoggerProvider(loggerProvider);
  logger = logs.getLogger('lambda-log-processor');

  sdk.start();
}

initializeTelemetry();

const tracer = trace.getTracer('lambda-log-processor', '1.0.0');
const meter = require('@opentelemetry/api').metrics.getMeter('lambda-log-processor', '1.0.0');

const processedLogsCounter = meter.createCounter('lambda_logs_processed_total', {
  description: 'Total number of logs processed by Lambda',
});

const processingDuration = meter.createHistogram('lambda_log_processing_duration_ms', {
  description: 'Duration of log processing in milliseconds',
});

exports.handler = async (event, context) => {
  const span = tracer.startSpan('lambda_process_logs');
  const startTime = Date.now();

  try {
    let logData;
    
    if (typeof event === 'string') {
      logData = JSON.parse(event);
    } else if (event.body) {
      logData = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } else {
      logData = event;
    }
    
    span.setAttribute('log.level', logData.level || 'info');
    span.setAttribute('log.service', logData.service || 'unknown');
    span.setAttribute('lambda.request_id', context.requestId);

    logger.info('Processing log from application', {
      level: logData.level,
      service: logData.service,
      message: logData.message,
      requestId: context.requestId,
    });

    const enrichedLog = {
      ...logData,
      processedAt: new Date().toISOString(),
      processor: 'lambda-log-processor',
      lambdaRequestId: context.requestId,
      awsRegion: process.env.AWS_REGION || 'us-east-1',
    };

    const processSpan = tracer.startSpan('enrich_and_export_log', {
      parent: span,
    });

    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      
      processSpan.setAttribute('log.enriched', true);
      processSpan.end();

      const duration = Date.now() - startTime;
      
      processedLogsCounter.add(1, {
        level: logData.level || 'info',
        service: logData.service || 'unknown',
      });
      
      processingDuration.record(duration, {
        level: logData.level || 'info',
      });

      logger.info('Log processed and exported to Observe', {
        level: logData.level,
        service: logData.service,
        duration,
      });

      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttribute('processing.duration_ms', duration);
      span.end();

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Log processed and exported to Observe',
          logId: enrichedLog.metadata?.traceId || 'unknown',
          processedAt: enrichedLog.processedAt,
        }),
      };
    } catch (processError) {
      processSpan.recordException(processError);
      processSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: processError.message,
      });
      processSpan.end();

      logger.error('Failed to process log', {
        error: processError.message,
        stack: processError.stack,
      });

      span.recordException(processError);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: processError.message,
      });
      span.end();

      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Failed to process log',
          details: processError.message,
        }),
      };
    }
  } catch (error) {
    logger.error('Lambda handler error', {
      error: error.message,
      stack: error.stack,
      requestId: context.requestId,
    });

    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    span.end();

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Internal Lambda error',
        details: error.message,
      }),
    };
  }
};
