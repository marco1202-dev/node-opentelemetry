#!/bin/bash

BASE_URL=${1:-http://localhost:3000}

echo "Testing OpenTelemetry POC endpoints..."
echo "Base URL: $BASE_URL"
echo ""

echo "1. Health Check..."
curl -s "$BASE_URL/health" | jq .
echo -e "\n"

echo "2. Get Users..."
curl -s "$BASE_URL/api/users" | jq '.success, .count'
echo -e "\n"

echo "3. Process Data..."
curl -s -X POST "$BASE_URL/api/process" \
  -H "Content-Type: application/json" \
  -d '{"data": ["item1", "item2", "item3"]}' | jq .
echo -e "\n"

echo "4. Metrics Demo..."
curl -s "$BASE_URL/api/metrics-demo" | jq .
echo -e "\n"

echo "5. Send Logs to Lambda..."
curl -s -X POST "$BASE_URL/api/logs-to-lambda" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test log from script",
    "level": "info",
    "metadata": {
      "testId": "script-test-123",
      "source": "test-script"
    }
  }' | jq .
echo -e "\n"

echo "All tests completed!"
