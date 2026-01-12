const http = require('http');
const handler = require('./index').handler;

const PORT = process.env.PORT || 9000;

const server = http.createServer(async (req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', service: 'lambda-mock' }));
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';
  
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      const event = JSON.parse(body);
      console.log('[Lambda Mock] Received log:', JSON.stringify(event, null, 2));
      
      const context = {
        requestId: `mock-${Date.now()}`,
        functionName: 'log-processor-mock',
        functionVersion: '$LATEST',
        invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:log-processor-mock',
        memoryLimitInMB: '256',
        awsRequestId: `mock-${Date.now()}`,
      };

      console.log('[Lambda Mock] Processing log with context:', context.requestId);
      const result = await handler(event, context);
      console.log('[Lambda Mock] Processing complete:', result.statusCode || 200);
      
      res.writeHead(result.statusCode || 200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(result.body || JSON.stringify(result));
    } catch (error) {
      console.error('[Lambda Mock] Error processing log:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Lambda mock server listening on port ${PORT}`);
});
