import express from 'express';
import { initializeTelemetry, shutdownTelemetry, getLogger } from './telemetry.js';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { metrics } from '@opentelemetry/api';
import axios from 'axios';

initializeTelemetry();

const app = express();
const PORT = process.env.PORT || 3000;

const logger = getLogger('app');
const tracer = trace.getTracer('opentelemetry-poc', '1.0.0');
const meter = metrics.getMeter('opentelemetry-poc', '1.0.0');

const requestCounter = meter.createCounter('http_requests_total', {
  description: 'Total number of HTTP requests',
});

const requestDuration = meter.createHistogram('http_request_duration_ms', {
  description: 'Duration of HTTP requests in milliseconds',
});

const activeConnections = meter.createUpDownCounter('http_active_connections', {
  description: 'Number of active HTTP connections',
});

app.use(express.json());

app.use((req, res, next) => {
  const startTime = Date.now();
  activeConnections.add(1);

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    requestCounter.add(1, {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode.toString(),
    });
    requestDuration.record(duration, {
      method: req.method,
      route: req.route?.path || req.path,
    });
    activeConnections.add(-1);
  });

  next();
});

app.get('/health', (req, res) => {
  logger.info('Health check requested', { path: req.path });
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/users', async (req, res) => {
  const span = tracer.startSpan('get_users');
  
  try {
    logger.info('Fetching users', { operation: 'get_users' });
    
    const contextWithSpan = trace.setSpan(context.active(), span);
    
    await context.with(contextWithSpan, async () => {
      const childSpan = tracer.startSpan('fetch_external_api', {
        attributes: {
          'http.method': 'GET',
          'http.url': 'https://jsonplaceholder.typicode.com/users',
        },
      });

      try {
        const response = await axios.get('https://jsonplaceholder.typicode.com/users');
        childSpan.setStatus({ code: SpanStatusCode.OK });
        childSpan.end();

        span.setStatus({ code: SpanStatusCode.OK });
        span.setAttribute('users.count', response.data.length);
        
        logger.info('Users fetched successfully', { 
          count: response.data.length 
        });

        res.json({
          success: true,
          count: response.data.length,
          users: response.data.slice(0, 3),
        });
      } catch (error) {
        childSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        childSpan.recordException(error);
        childSpan.end();

        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        span.recordException(error);

        logger.error('Failed to fetch users', {
          error: error.message,
          stack: error.stack,
        });

        res.status(500).json({ error: 'Failed to fetch users' });
      }
    });
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    span.recordException(error);
    
    logger.error('Unexpected error in get_users', {
      error: error.message,
    });
    
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    span.end();
  }
});

app.post('/api/process', async (req, res) => {
  const span = tracer.startSpan('process_data');
  
  try {
    const { data } = req.body;
    
    logger.info('Processing data', {
      operation: 'process_data',
      dataSize: data?.length || 0,
    });

    span.setAttribute('data.size', data?.length || 0);

    const processSpan = tracer.startSpan('data_processing');
    
    await new Promise((resolve) => {
      setTimeout(() => {
        processSpan.setAttribute('processing.time_ms', 150);
        processSpan.end();
        resolve();
      }, 150);
    });

    const result = {
      processed: true,
      timestamp: new Date().toISOString(),
      items: data?.length || 0,
    };

    span.setStatus({ code: SpanStatusCode.OK });
    span.setAttribute('result.items', result.items);
    
    logger.info('Data processed successfully', {
      items: result.items,
    });

    res.json(result);
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    span.recordException(error);
    
    logger.error('Processing failed', {
      error: error.message,
      stack: error.stack,
    });
    
    res.status(500).json({ error: 'Processing failed' });
  } finally {
    span.end();
  }
});

app.get('/api/metrics-demo', async (req, res) => {
  const span = tracer.startSpan('metrics_demo');
  
  try {
    logger.info('Generating metrics demo', { operation: 'metrics_demo' });

    const randomValue = Math.floor(Math.random() * 100);
    const demoGauge = meter.createObservableGauge('demo_random_value', {
      description: 'Random demo value',
    });

    meter.addBatchObservableCallback((observableResult) => {
      observableResult.observe(demoGauge, randomValue, {
        source: 'demo',
      });
    }, [demoGauge]);

    span.setAttribute('demo.value', randomValue);
    span.setStatus({ code: SpanStatusCode.OK });
    
    logger.info('Metrics demo generated', { value: randomValue });

    res.json({
      success: true,
      randomValue,
      message: 'Metrics generated successfully',
    });
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    span.recordException(error);
    
    logger.error('Metrics demo failed', { error: error.message });
    
    res.status(500).json({ error: 'Metrics demo failed' });
  } finally {
    span.end();
  }
});

app.post('/api/logs-to-lambda', async (req, res) => {
  const span = tracer.startSpan('send_logs_to_lambda');
  
  try {
    const { message, level = 'info', metadata = {} } = req.body;
    
    logger.info('Sending logs to Lambda', {
      operation: 'send_logs_to_lambda',
      message,
      level,
    });

    const lambdaUrl = process.env.LAMBDA_LOG_URL || 'http://localhost:9000';
    
    const logPayload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: process.env.SERVICE_NAME || 'opentelemetry-poc',
      metadata: {
        ...metadata,
        traceId: span.spanContext().traceId,
        spanId: span.spanContext().spanId,
      },
    };

    span.setAttribute('lambda.url', lambdaUrl);
    span.setAttribute('log.level', level);

    try {
      const response = await axios.post(lambdaUrl, logPayload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttribute('lambda.response.status', response.status);
      
      logger.info('Logs sent to Lambda successfully', {
        status: response.status,
      });

      res.json({
        success: true,
        message: 'Logs sent to Lambda',
        lambdaResponse: response.data,
      });
    } catch (lambdaError) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: lambdaError.message,
      });
      span.recordException(lambdaError);
      
      logger.error('Failed to send logs to Lambda', {
        error: lambdaError.message,
        url: lambdaUrl,
      });

      res.status(502).json({
        error: 'Failed to send logs to Lambda',
        details: lambdaError.message,
      });
    }
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    span.recordException(error);
    
    logger.error('Unexpected error in send_logs_to_lambda', {
      error: error.message,
    });
    
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    span.end();
  }
});

const server = app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
  });
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await shutdownTelemetry();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(async () => {
    await shutdownTelemetry();
    process.exit(0);
  });
});
