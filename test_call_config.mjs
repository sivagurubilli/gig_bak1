console.log('=== Testing Updated Call Check-Feasibility API ===\n');

async function testCallConfigAPI() {
  try {
    // First, get authentication token for mobile user
    const mobileLogin = await fetch('http://localhost:5000/api/v1/app/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        phoneNumber: '+918639063855',
        otp: '1234' // Using bypass number
      })
    });
    
    const mobileData = await mobileLogin.json();
    
    if (mobileData.success) {
      const mobileToken = mobileData.token;
      console.log('✅ Mobile user authenticated');
      
      // Get a receiver user ID (we need another user to test call feasibility)
      const adminLogin = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
      });
      
      const adminData = await adminLogin.json();
      const adminToken = adminData.token;
      
      const usersResponse = await fetch('http://localhost:5000/api/users', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const users = await usersResponse.json();
      
      // Find a different user to be the receiver
      const receiverUser = users.find(u => u.username !== '+918639063855' && u.gender === 'female');
      
      if (receiverUser) {
        console.log(`Found receiver: ${receiverUser.username} (${receiverUser.gender})`);
        
        // Test the updated check-feasibility API
        const checkResponse = await fetch('http://localhost:5000/api/v1/app/call/check-feasibility', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mobileToken}`
          },
          body: JSON.stringify({
            receiverUserId: receiverUser.id,
            callType: 'video'
          })
        });
        
        const checkData = await checkResponse.json();
        
        console.log('\n📋 Updated API Response:');
        console.log(JSON.stringify(checkData, null, 2));
        
        if (checkData.success && checkData.data) {
          console.log('\n✅ COMMISSION FIELDS ADDED:');
          console.log(`- Admin Commission: ${checkData.data.adminCommissionPercent}%`);
          console.log(`- Gstar Commission: ${checkData.data.gstarAdminCommission}%`);
          console.log(`- Gicon Commission: ${checkData.data.giconAdminCommission}%`);
          
          console.log('\n🎯 RESPONSE INCLUDES:');
          console.log('✓ canMakeCall:', checkData.data.canMakeCall);
          console.log('✓ callerBalance:', checkData.data.callerBalance);
          console.log('✓ coinsPerMinute:', checkData.data.coinsPerMinute);
          console.log('✓ maxDurationMinutes:', checkData.data.maxDurationMinutes);
          console.log('✓ callType:', checkData.data.callType);
          console.log('✓ receiverName:', checkData.data.receiverName);
          console.log('✓ receiverGender:', checkData.data.receiverGender);
          console.log('✓ adminCommissionPercent:', checkData.data.adminCommissionPercent);
          console.log('✓ gstarAdminCommission:', checkData.data.gstarAdminCommission);
          console.log('✓ giconAdminCommission:', checkData.data.giconAdminCommission);
        } else {
          console.log('❌ API call failed:', checkData);
        }
        
      } else {
        console.log('❌ No suitable receiver user found');
      }
      
    } else {
      console.log('❌ Mobile authentication failed:', mobileData);
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testCallConfigAPI();
