# How to Check Lambda Logs

## Quick Methods to Check Lambda Logs

### Method 1: View Lambda Container Logs (Recommended)

**In a separate terminal, run:**

```bash
# View all Lambda logs
docker compose logs lambda-mock

# Follow logs in real-time (like tail -f)
docker compose logs -f lambda-mock

# View only the last 50 lines
docker compose logs --tail=50 lambda-mock
```

**What you'll see:**
- `[Lambda Mock] Received log:` - Shows the log data received
- `[Lambda Mock] Processing log with context:` - Shows the processing start
- `[Lambda Mock] Processing complete:` - Shows successful processing
- Any errors that occur during processing

---

### Method 2: View All Container Logs

```bash
# View logs from all containers (app + lambda-mock)
docker compose logs

# Follow all logs in real-time
docker compose logs -f

# View logs from a specific time
docker compose logs --since 5m lambda-mock
```

---

### Method 3: Check Lambda Container Directly

```bash
# List running containers
docker ps

# Get the container name (look for lambda-mock)
# Then view logs directly
docker logs node-opentelemetry-lambda-mock-1

# Or follow logs
docker logs -f node-opentelemetry-lambda-mock-1
```

---

### Method 4: Execute Commands Inside Lambda Container

```bash
# Get a shell inside the Lambda container
docker compose exec lambda-mock sh

# Then you can check files, environment variables, etc.
env | grep OBSERVE
ls -la /var/task
```

---

## Expected Log Output

When you send a log, you should see something like:

```
lambda-mock-1  | [Lambda Mock] Received log: {
lambda-mock-1  |   "timestamp": "2026-01-12T19:45:00.000Z",
lambda-mock-1  |   "level": "info",
lambda-mock-1  |   "message": "Test log",
lambda-mock-1  |   "service": "opentelemetry-poc",
lambda-mock-1  |   "metadata": {
lambda-mock-1  |     "traceId": "...",
lambda-mock-1  |     "spanId": "..."
lambda-mock-1  |   }
lambda-mock-1  | }
lambda-mock-1  | [Lambda Mock] Processing log with context: mock-1234567890
lambda-mock-1  | [Lambda Mock] Processing complete: 200
```

---

## Test the Lambda Endpoint Directly

You can also test the Lambda mock directly:

```bash
# Test Lambda health endpoint
curl http://localhost:9000/health

# Test Lambda with a log
curl -X POST http://localhost:9000 \
  -H "Content-Type: application/json" \
  -d '{"message": "Direct test", "level": "info", "service": "test"}'
```

---

## Troubleshooting

### No logs appearing?

1. **Check if Lambda container is running:**
   ```bash
   docker compose ps
   ```
   Should show `lambda-mock` as "Up"

2. **Check Lambda container logs for errors:**
   ```bash
   docker compose logs lambda-mock
   ```

3. **Restart the Lambda container:**
   ```bash
   docker compose restart lambda-mock
   ```

### Lambda not receiving requests?

1. **Check network connectivity:**
   ```bash
   # From app container, test Lambda
   docker compose exec app wget -O- http://lambda-mock:9000/health
   ```

2. **Check environment variable:**
   ```bash
   docker compose exec app env | grep LAMBDA_LOG_URL
   ```
   Should show: `LAMBDA_LOG_URL=http://lambda-mock:9000`

---

## Real-Time Monitoring

To monitor both app and Lambda logs simultaneously:

```bash
# Terminal 1: Watch app logs
docker compose logs -f app

# Terminal 2: Watch Lambda logs
docker compose logs -f lambda-mock
```

Then send a request and watch both terminals to see the full flow!
