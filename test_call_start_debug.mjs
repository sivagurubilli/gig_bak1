console.log('=== Call Start API Debug Test ===\n');

async function testCallStartAPI() {
  try {
    const baseUrl = 'http://localhost:5000';
    
    // First get a valid token
    console.log('1. Requesting OTP...');
    const otpResponse = await fetch(`${baseUrl}/api/v1/app/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+918520025559' })
    });
    
    const otpData = await otpResponse.json();
    console.log('OTP Response:', otpData);
    
    if (!otpData.success) {
      console.log('❌ Failed to get OTP');
      return;
    }
    
    // Verify OTP
    console.log('\n2. Verifying OTP...');
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
    console.log('Verify Response:', verifyData);
    
    if (!verifyData.success) {
      console.log('❌ Failed to verify OTP');
      return;
    }
    
    const token = verifyData.token;
    console.log('Token obtained:', token.substring(0, 50) + '...');
    
    // Test call start
    console.log('\n3. Testing call/start...');
    const callResponse = await fetch(`${baseUrl}/api/v1/app/call/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
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
      console.log('\n✅ Call/Start API Working!');
      if (callData.success) {
        console.log('Call initiated successfully');
      } else {
        console.log('Call not initiated:', callData.reason);
      }
    } else {
      console.log('\n❌ Call/Start API Failed');
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testCallStartAPI();
