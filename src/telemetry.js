import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { LoggerProvider, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { logs } from '@opentelemetry/api-logs';

const OBSERVE_ENDPOINT = process.env.OBSERVE_ENDPOINT || 'https://collect.observeinc.com/v1/otlp';
const OBSERVE_TOKEN = process.env.OBSERVE_TOKEN || '';
const SERVICE_NAME = process.env.SERVICE_NAME || 'opentelemetry-poc';
const SERVICE_VERSION = process.env.SERVICE_VERSION || '1.0.0';

let sdk = null;
let loggerProvider = null;

export function initializeTelemetry() {
  if (sdk) {
    return;
  }

  const resource = new Resource({
    [SEMRESATTRS_SERVICE_NAME]: SERVICE_NAME,
    [SEMRESATTRS_SERVICE_VERSION]: SERVICE_VERSION,
    'deployment.environment': process.env.NODE_ENV || 'development',
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
      exportIntervalMillis: 10000,
    }),
  });

  loggerProvider = new LoggerProvider({
    resource,
  });

  loggerProvider.addLogRecordProcessor(
    new SimpleLogRecordProcessor(logExporter)
  );

  logs.setGlobalLoggerProvider(loggerProvider);

  sdk.start();

  console.log('OpenTelemetry SDK initialized');
  console.log(`Exporting to: ${OBSERVE_ENDPOINT}`);
}

export function shutdownTelemetry() {
  return new Promise((resolve) => {
    if (sdk) {
      sdk.shutdown().then(() => {
        if (loggerProvider) {
          loggerProvider.shutdown().then(() => {
            resolve();
          });
        } else {
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

export function getLogger(name) {
  return logs.getLogger(name);
}
