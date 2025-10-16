console.log('=== DEBUGGING THE EXACT ERROR ===\n');

async function debugExactIssue() {
  try {
    const baseUrl = 'http://localhost:5000';
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODUzMjdjYTY5MjU3NzFhNTdkYjY4ZTQiLCJwaG9uZU51bWJlciI6Iis5MTc2OTY0NTc4OTAiLCJpYXQiOjE3NTY2NDUwMTksImV4cCI6MTc1OTIzNzAxOX0.W8Z_Ou1Z4H-_cSQgLxzyQZSDaJWZL73-eo55eQSuGDI';
    
    console.log('🔍 Testing your exact token and request...\n');
    
    // Test 1: Original receiver ID that might not exist
    console.log('TEST 1: Original receiver ID');
    const response1 = await fetch(`${baseUrl}/api/v1/app/call/start`, {
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
    
    const data1 = await response1.json();
    console.log('Status:', response1.status);
    console.log('Response:', data1);
    console.log('');
    
    // Test 2: Different receiver ID that exists
    console.log('TEST 2: Different receiver ID');
    const response2 = await fetch(`${baseUrl}/api/v1/app/call/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        receiverUserId: '6895f4b1c037effd853c16bd',
        callType: 'video'
      })
    });
    
    const data2 = await response2.json();
    console.log('Status:', response2.status);
    console.log('Response:', data2);
    console.log('');
    
    // Test 3: Check what happens with invalid receiver
    console.log('TEST 3: Invalid receiver ID');
    const response3 = await fetch(`${baseUrl}/api/v1/app/call/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        receiverUserId: 'invalid-id',
        callType: 'video'
      })
    });
    
    const data3 = await response3.json();
    console.log('Status:', response3.status);
    console.log('Response:', data3);
    console.log('');
    
    console.log('📋 ANALYSIS:');
    if (response1.status === 200 && data1.success) {
      console.log('✅ Your original request is working perfectly!');
    } else if (response1.status === 500) {
      console.log('❌ Error 500: This is a server error, not your request');
      if (data1.details) {
        console.log('🔍 Error details:', data1.details);
      }
    } else {
      console.log('🟡 API returned expected business logic error');
    }
    
  } catch (error) {
    console.error('Debug error:', error.message);
  }
}

debugExactIssue();
