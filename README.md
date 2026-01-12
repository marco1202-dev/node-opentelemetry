# OpenTelemetry POC with Observe Integration

This is a Proof of Concept project demonstrating OpenTelemetry integration with Observe Inc. for collecting metrics, traces, and logs from a Node.js application, processing logs through AWS Lambda, and exporting all telemetry data to Observe.

## Features

- **OpenTelemetry Instrumentation**: Automatic and manual instrumentation for metrics, traces, and logs
- **AWS Lambda Integration**: Logs are sent to AWS Lambda for processing before export
- **Observe Export**: All telemetry signals exported to Observe Inc.
- **Docker Support**: Containerized application ready for deployment
- **AWS Fargate Ready**: ECS task definition included for Fargate deployment

## Architecture

```
Node.js App (Fargate) → OpenTelemetry SDK → Metrics/Traces/Logs
                                    ↓
                            Logs → AWS Lambda → Observe
                            Metrics/Traces → Observe (direct)
```

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- AWS CLI (for Lambda and Fargate deployment)
- AWS Account with appropriate permissions
- Observe Inc. account and credentials

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file:

```env
OBSERVE_ENDPOINT=https://collect.observeinc.com/v1/otlp
OBSERVE_TOKEN=your-observe-token-here
SERVICE_NAME=opentelemetry-poc
SERVICE_VERSION=1.0.0
LAMBDA_LOG_URL=https://your-lambda-url.amazonaws.com
```

### 3. Run Locally with Docker Compose

```bash
docker-compose up --build
```

The application will be available at `http://localhost:3000`

### 4. Test Endpoints

- **Health Check**: `GET http://localhost:3000/health`
- **Get Users**: `GET http://localhost:3000/api/users`
- **Process Data**: `POST http://localhost:3000/api/process` (with JSON body)
- **Metrics Demo**: `GET http://localhost:3000/api/metrics-demo`
- **Send Logs to Lambda**: `POST http://localhost:3000/api/logs-to-lambda`

Example request to send logs to Lambda:

```bash
curl -X POST http://localhost:3000/api/logs-to-lambda \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test log message",
    "level": "info",
    "metadata": {
      "userId": "123",
      "action": "test"
    }
  }'
```

## AWS Lambda Deployment

### 1. Create Lambda Function

```bash
aws lambda create-function \
  --function-name log-processor \
  --runtime nodejs20.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role \
  --handler index.handler \
  --zip-file fileb://lambda-deployment.zip \
  --timeout 30 \
  --memory-size 256
```

### 2. Deploy Using Script

```bash
cd lambda
chmod +x deploy.sh
./deploy.sh log-processor us-east-1
```

### 3. Configure Lambda Environment Variables

Set the following environment variables in Lambda:
- `OBSERVE_ENDPOINT`: Your Observe endpoint URL
- `OBSERVE_TOKEN`: Your Observe authentication token

## AWS Fargate Deployment

### 1. Build and Push Docker Image

```bash
# Build image
docker build -t opentelemetry-poc .

# Tag for ECR
docker tag opentelemetry-poc:latest YOUR_ECR_REPO_URI:latest

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ECR_REPO_URI
docker push YOUR_ECR_REPO_URI:latest
```

### 2. Update Task Definition

Edit `ecs-task-definition.json`:
- Replace `YOUR_ACCOUNT_ID` with your AWS account ID
- Replace `YOUR_ECR_REPO_URI` with your ECR repository URI
- Update region as needed
- Configure secrets in AWS Secrets Manager

### 3. Register and Run Task

```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json

# Run task
aws ecs run-task \
  --cluster your-cluster-name \
  --task-definition opentelemetry-poc-task \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

## Telemetry Signals

### Metrics

- `http_requests_total`: Counter for HTTP requests
- `http_request_duration_ms`: Histogram for request duration
- `http_active_connections`: UpDownCounter for active connections
- `lambda_logs_processed_total`: Counter for processed logs in Lambda
- `lambda_log_processing_duration_ms`: Histogram for log processing time

### Traces

- Automatic HTTP instrumentation
- Custom spans for business logic
- Distributed tracing across services

### Logs

- Structured logging with OpenTelemetry
- Log correlation with traces
- Export to Observe via Lambda

## Project Structure

```
.
├── src/
│   ├── index.js          # Main application
│   └── telemetry.js      # OpenTelemetry initialization
├── lambda/
│   └── log-processor/
│       ├── index.js      # Lambda handler
│       └── package.json  # Lambda dependencies
├── Dockerfile            # Container definition
├── docker-compose.yml    # Local development setup
├── ecs-task-definition.json  # Fargate task definition
└── README.md
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OBSERVE_ENDPOINT` | Observe OTLP endpoint | `https://collect.observeinc.com/v1/otlp` |
| `OBSERVE_TOKEN` | Observe authentication token | - |
| `SERVICE_NAME` | Service name for telemetry | `opentelemetry-poc` |
| `SERVICE_VERSION` | Service version | `1.0.0` |
| `LAMBDA_LOG_URL` | Lambda function URL for logs | - |
| `PORT` | Application port | `3000` |
| `NODE_ENV` | Node environment | `development` |

## Monitoring

Once deployed, you can monitor:

1. **Metrics** in Observe dashboard
2. **Traces** showing request flows
3. **Logs** with correlation to traces
4. **Lambda metrics** for log processing

## Troubleshooting

### Logs not appearing in Observe

1. Verify `OBSERVE_TOKEN` is set correctly
2. Check `OBSERVE_ENDPOINT` is accessible
3. Review Lambda function logs in CloudWatch
4. Check application logs for export errors

### Lambda connection issues

1. Verify Lambda function URL is correct
2. Check Lambda function permissions
3. Review network configuration (VPC, security groups)
4. Test Lambda function directly

### Docker build issues

1. Ensure Node.js 20+ is available
2. Check Docker daemon is running
3. Review Dockerfile for syntax errors
4. Clear Docker cache if needed: `docker system prune -a`

## License

MIT
