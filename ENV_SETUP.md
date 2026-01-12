# Environment Variables Setup Guide

## How to Get Each Environment Variable

### 1. OBSERVE_TOKEN (Required - You need to get this from Observe Inc.)

**What it is:** An authentication token (like a password) that allows your application to send data to Observe Inc.

**How to get it:**

1. **Sign up for Observe Inc. account:**
   - Go to https://www.observeinc.com/
   - Click "Sign Up" or "Get Started"
   - Create an account (you may need to contact them for a trial/demo account)

2. **Log into Observe Dashboard:**
   - After creating an account, log into the Observe web interface

3. **Find API Token/Ingest Token:**
   - Look for settings like:
     - "API Keys" or "Tokens" section
     - "Ingestion Settings"
     - "Data Collection" settings
     - "OpenTelemetry Configuration"
   - The token might be called:
     - "Ingest Token"
     - "API Token"
     - "OTLP Token"
     - "Bearer Token"

4. **Copy the token:**
   - It will look like a long string of characters, for example:
     ```
     obs-abc123xyz789def456ghi012jkl345mno678pqr901stu234vwx567
     ```

**If you don't have an Observe account yet:**
- You can still run the application locally (it will just show errors when trying to export)
- Contact Observe Inc. sales/support to get a trial account
- For demo purposes, you can use a placeholder token (but data won't actually be sent)

---

### 2. SERVICE_NAME (You choose this - it's just a label)

**What it is:** A friendly name you give to your application to identify it in Observe dashboard.

**How to get it:** You don't "get" it - you just **choose any name you want!**

**Examples:**
- `opentelemetry-poc` (default - already set)
- `my-demo-app`
- `user-service`
- `payment-api`
- `test-service`

**In your .env file, just use:**
```env
SERVICE_NAME=opentelemetry-poc
```

Or change it to whatever you prefer:
```env
SERVICE_NAME=my-awesome-app
```

**Why it matters:** This name appears in the Observe dashboard so you can identify which service sent the data.

---

## Complete .env File Example

Create a file named `.env` in the root directory with:

```env
# Observe Configuration (get token from Observe dashboard)
OBSERVE_ENDPOINT=https://collect.observeinc.com/v1/otlp
OBSERVE_TOKEN=obs-your-actual-token-from-observe-dashboard-here

# Service Configuration (you choose these names)
SERVICE_NAME=opentelemetry-poc
SERVICE_VERSION=1.0.0

# Lambda Configuration
# For local testing: http://lambda-mock:9000 (mock service in Docker)
# For production: https://your-lambda-url.lambda-url.us-east-1.on.aws
LAMBDA_LOG_URL=http://lambda-mock:9000

# Application Configuration
PORT=3000
NODE_ENV=development
```

---

### 3. LAMBDA_LOG_URL (Depends on where you're running)

**What it is:** The URL where your application sends logs to be processed by AWS Lambda.

**Two scenarios:**

#### Scenario A: Local Development (Testing on your computer)

**Use the mock Lambda service:**
```env
LAMBDA_LOG_URL=http://lambda-mock:9000
```

This uses a mock Lambda service that runs in Docker Compose. **You don't need to do anything** - it's already set up!

**How it works:**
- When you run `docker-compose up`, it starts a mock Lambda service
- Your app sends logs to `http://lambda-mock:9000`
- The mock processes them just like a real Lambda would

#### Scenario B: Production (Running on AWS)

**You need to create/get the real AWS Lambda Function URL:**

**Step 1: Deploy your Lambda function**
```bash
cd lambda
./deploy.sh log-processor us-east-1
```

**Step 2: Create a Function URL**
```bash
aws lambda create-function-url-config \
  --function-name log-processor \
  --auth-type NONE \
  --cors '{"AllowOrigins": ["*"]}'
```

**Step 3: Get the Function URL**
```bash
aws lambda get-function-url-config \
  --function-name log-processor
```

**The output will look like:**
```json
{
  "FunctionUrl": "https://abc123xyz.lambda-url.us-east-1.on.aws",
  "FunctionArn": "arn:aws:lambda:us-east-1:123456789:function:log-processor",
  ...
}
```

**Step 4: Use the FunctionUrl in your .env:**
```env
LAMBDA_LOG_URL=https://abc123xyz.lambda-url.us-east-1.on.aws
```

**Or get it from AWS Console:**
1. Go to AWS Lambda Console
2. Click on your `log-processor` function
3. Go to "Configuration" → "Function URL"
4. Copy the URL shown there

---

## Quick Setup Steps

1. **Create `.env` file:**
   ```bash
   # In the project root directory
   touch .env
   # Or create it manually in your editor
   ```

2. **Add the values:**
   - Copy the template above
   - Replace `OBSERVE_TOKEN` with your actual token from Observe
   - Keep `SERVICE_NAME=opentelemetry-poc` (or change it if you want)
   - **For local testing:** Keep `LAMBDA_LOG_URL=http://lambda-mock:9000` (this is the mock service)
   - **For production:** Replace with your actual AWS Lambda Function URL

3. **Save the file**

4. **Test it:**
   ```bash
   docker-compose up --build
   ```

---

## Troubleshooting

### "I don't have an Observe account"
- Contact Observe Inc. for a trial/demo account
- Or use a placeholder token to test locally (data won't be exported)

### "Where do I find the token in Observe?"
- Check the Observe documentation
- Look in Settings → API Keys
- Check OpenTelemetry/OTLP configuration section
- Contact Observe support if you can't find it

### "Can I test without Observe?"
- Yes! The app will run, but you'll see export errors
- You can still test all the endpoints and see logs locally
- The Lambda mock will work fine for local testing

### "Do I need AWS Lambda for local testing?"
- **No!** Use `LAMBDA_LOG_URL=http://lambda-mock:9000` for local testing
- The mock Lambda service runs automatically with `docker-compose up`
- Only create a real Lambda function when deploying to AWS

---

## Important Notes

- **Never commit `.env` file to Git** (it's already in `.gitignore`)
- **Keep your token secret** - don't share it publicly
- **SERVICE_NAME is just a label** - use whatever makes sense for your project
- **For production**, store tokens in AWS Secrets Manager or similar secure storage
