#!/bin/bash

set -e

LAMBDA_FUNCTION_NAME=${1:-log-processor}
REGION=${2:-us-east-1}
ZIP_FILE="lambda-deployment.zip"

echo "Building Lambda deployment package..."

cd log-processor
npm install --production

cd ..
zip -r "$ZIP_FILE" log-processor/ -x "*.git*" "*.md" "*.sh"

echo "Deploying Lambda function: $LAMBDA_FUNCTION_NAME"

aws lambda update-function-code \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --zip-file "fileb://$ZIP_FILE" \
  --region "$REGION"

echo "Updating environment variables..."

aws lambda update-function-configuration \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --environment "Variables={
    OBSERVE_ENDPOINT=${OBSERVE_ENDPOINT:-https://collect.observeinc.com/v1/otlp},
    OBSERVE_TOKEN=${OBSERVE_TOKEN}
  }" \
  --region "$REGION"

echo "Lambda function deployed successfully!"
