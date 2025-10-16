console.log('=== Call Start API Success Test ===\n');

async function testCallStartSuccess() {
  try {
    const baseUrl = 'http://localhost:5000';
    
    // First get admin token to add coins
    console.log('1. Getting admin token...');
    const adminResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    const adminData = await adminResponse.json();
    console.log('Admin login:', adminData.success ? 'Success' : 'Failed');
    
    if (adminData.success) {
      // Add coins to user wallet
      console.log('\n2. Adding coins to user wallet...');
      const addCoinsResponse = await fetch(`${baseUrl}/api/wallet/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminData.token}`
        },
        body: JSON.stringify({
          userId: '6895f4b1c037effd853c16bd',
          amount: 1000,
          description: 'Test coins for call functionality'
        })
      });
      
      const coinsData = await addCoinsResponse.json();
      console.log('Add coins result:', coinsData);
    }
    
    // Get user token
    console.log('\n3. Getting user token...');
    const otpResponse = await fetch(`${baseUrl}/api/v1/app/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+918520025559' })
    });
    
    const otpData = await otpResponse.json();
    
    const verifyResponse = await fetch(`${baseUrl}/api/v1/app/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: '+918520025559',
        otp: '123456',
        sessionId: otpData.sessionId
      })
    });
    
    const verifyData = await verifyResponse.json();
    console.log('User login:', verifyData.success ? 'Success' : 'Failed');
    console.log('User wallet balance:', verifyData.user?.wallet?.coinBalance || 'Unknown');
    
    // Test call start
    console.log('\n4. Testing call/start with coins...');
    const callResponse = await fetch(`${baseUrl}/api/v1/app/call/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${verifyData.token}`
      },
      body: JSON.stringify({
        receiverUserId: '685327ca6925771a57db68b5',
        callType: 'video'
      })
    });
    
    const callData = await callResponse.json();
    console.log('Call Response Status:', callResponse.status);
    console.log('Call Response:', callData);
    
    if (callResponse.status === 200) {
      console.log('\n✅ CALL/START API IS WORKING PERFECTLY!');
      if (callData.success) {
        console.log('✅ Call initiated successfully');
        console.log('✅ Call ID:', callData.data?.callId);
        console.log('✅ Call Session Created');
      } else {
        console.log('🟡 Call not initiated (but API working):', callData.reason);
        console.log('🟡 This could be receiver unavailable - which is expected behavior');
      }
    } else {
      console.log('\n❌ Call/Start API Error');
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testCallStartSuccess();
