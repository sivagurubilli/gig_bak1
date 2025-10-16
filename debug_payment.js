const axios = require('axios');

async function testPaymentFlow() {
  try {
    // Step 1: Login to get token
    console.log('1. Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/v1/app/auth/login-with-otp', {
      phoneNumber: '+918520025559',
      otp: '123456'
    });
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log('Login successful. Current wallet:', user.wallet);
    console.log('Token:', token.substring(0, 20) + '...');
    
    // Step 2: Test auth/me to verify token works
    console.log('\n2. Testing auth/me...');
    const authMeResponse = await axios.get('http://localhost:5000/api/v1/app/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Auth me wallet:', authMeResponse.data.user.wallet);
    
    // Step 3: Get coin packages
    console.log('\n3. Getting coin packages...');
    const packagesResponse = await axios.get('http://localhost:5000/api/v1/app/coin-packages');
    console.log('Available packages:', packagesResponse.data.packages.length);
    
    // Step 4: Check if there's a pending transaction we can verify
    console.log('\n4. Checking for pending transactions...');
    const pendingResponse = await axios.get('http://localhost:5000/api/v1/app/payment/debug/pending', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Pending transactions:', pendingResponse.data);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testPaymentFlow();
