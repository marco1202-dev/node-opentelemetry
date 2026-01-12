# Quick Start Guide

## Prerequisites Check

- [ ] Node.js 20+ installed
- [ ] Docker and Docker Compose installed
- [ ] AWS CLI configured (for deployment)
- [ ] Observe Inc. account and credentials

## Local Development Setup (5 minutes)

### 1. Install Dependencies

```bash
npm install
cd lambda/log-processor && npm install && cd ../..
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```env
OBSERVE_ENDPOINT=https://collect.observeinc.com/v1/otlp
OBSERVE_TOKEN=your-token-here
SERVICE_NAME=opentelemetry-poc
LAMBDA_LOG_URL=http://lambda-mock:9000
```

### 3. Run with Docker Compose

```bash
docker-compose up --build
```

### 4. Test the Application

Open a new terminal and run:

```bash
# Health check
curl http://localhost:3000/health

# Test users endpoint
curl http://localhost:3000/api/users

# Send logs to Lambda
curl -X POST http://localhost:3000/api/logs-to-lambda \
  -H "Content-Type: application/json" \
  -d '{"message": "Test log", "level": "info"}'
```

## AWS Lambda Deployment

### 1. Package Lambda Function

```bash
cd lambda/log-processor
npm install --production
cd ..
zip -r ../lambda-deployment.zip log-processor/ -x "*.git*" "*.md" "*.sh"
```

### 2. Create Lambda Function

```bash
aws lambda create-function \
  --function-name log-processor \
  --runtime nodejs20.x \
  --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-execution-role \
  --handler index.handler \
  --zip-file fileb://lambda-deployment.zip \
  --timeout 30 \
  --memory-size 256
```

### 3. Configure Environment Variables

```bash
aws lambda update-function-configuration \
  --function-name log-processor \
  --environment "Variables={
    OBSERVE_ENDPOINT=https://collect.observeinc.com/v1/otlp,
    OBSERVE_TOKEN=your-token-here
  }"
```

### 4. Create Function URL

```bash
aws lambda create-function-url-config \
  --function-name log-processor \
  --auth-type NONE \
  --cors '{"AllowOrigins": ["*"]}'
```

## AWS Fargate Deployment

### 1. Build and Push Docker Image

```bash
# Build
docker build -t opentelemetry-poc .

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

# Tag and push
docker tag opentelemetry-poc:latest YOUR_ECR_URI:latest
docker push YOUR_ECR_URI:latest
```

### 2. Update Task Definition

Edit `ecs-task-definition.json` with your values, then:

```bash
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json
```

### 3. Run Task

```bash
aws ecs run-task \
  --cluster your-cluster \
  --task-definition opentelemetry-poc-task \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={
    subnets=[subnet-xxx],
    securityGroups=[sg-xxx],
    assignPublicIp=ENABLED
  }"
```

## Verification

1. Check application logs: `docker-compose logs app`
2. Check Lambda logs: AWS CloudWatch Logs
3. Verify in Observe dashboard:
   - Metrics should appear within 10-30 seconds
   - Traces should show request flows
   - Logs should be correlated with traces

## Troubleshooting

**Application won't start:**
- Check environment variables are set
- Verify Docker is running
- Check port 3000 is not in use

**No data in Observe:**
- Verify OBSERVE_TOKEN is correct
- Check OBSERVE_ENDPOINT is accessible
- Review application logs for export errors

**Lambda errors:**
- Check CloudWatch Logs
- Verify IAM permissions
- Ensure environment variables are set
