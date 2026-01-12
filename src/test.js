import axios from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function runTests() {
  console.log('Running POC tests...\n');

  try {
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✓ Health check passed:', healthResponse.data);
    console.log('');

    console.log('2. Testing users endpoint...');
    const usersResponse = await axios.get(`${BASE_URL}/api/users`);
    console.log('✓ Users endpoint passed:', {
      success: usersResponse.data.success,
      count: usersResponse.data.count,
    });
    console.log('');

    console.log('3. Testing process endpoint...');
    const processResponse = await axios.post(`${BASE_URL}/api/process`, {
      data: ['item1', 'item2', 'item3'],
    });
    console.log('✓ Process endpoint passed:', processResponse.data);
    console.log('');

    console.log('4. Testing metrics demo...');
    const metricsResponse = await axios.get(`${BASE_URL}/api/metrics-demo`);
    console.log('✓ Metrics demo passed:', metricsResponse.data);
    console.log('');

    console.log('5. Testing logs to Lambda...');
    const lambdaResponse = await axios.post(`${BASE_URL}/api/logs-to-lambda`, {
      message: 'Test log from POC',
      level: 'info',
      metadata: {
        testId: '123',
        source: 'poc-test',
      },
    });
    console.log('✓ Logs to Lambda passed:', lambdaResponse.data);
    console.log('');

    console.log('All tests passed! ✓');
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

runTests();
