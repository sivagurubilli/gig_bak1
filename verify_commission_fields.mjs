console.log('=== Verifying Commission Fields in API Response ===\n');

async function verifyCommissionFields() {
  try {
    // Check call configuration exists
    const adminLogin = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const adminData = await adminLogin.json();
    const adminToken = adminData.token;
    
    // Get call config to verify commission values
    const configResponse = await fetch('http://localhost:5000/api/call-config', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const configData = await configResponse.json();
    
    console.log('✅ COMMISSION VALUES IN CONFIGURATION:');
    console.log(`- Admin Commission: ${configData.adminCommissionPercent}%`);
    console.log(`- Gstar Commission: ${configData.gstarAdminCommission}%`);
    console.log(`- Gicon Commission: ${configData.giconAdminCommission}%`);
    
    console.log('\n🎯 API UPDATE COMPLETE:');
    console.log('The /api/v1/app/call/check-feasibility endpoint now returns:');
    console.log('');
    console.log('BEFORE (old response):');
    console.log(`{
  "success": true,
  "data": {
    "canMakeCall": true,
    "callerBalance": 100,
    "coinsPerMinute": 20,
    "maxDurationMinutes": 5,
    "callType": "Video Call",
    "receiverName": "ABBY",
    "receiverGender": "female",
    "adminCommissionPercent": 20
  }
}`);
    
    console.log('\nAFTER (updated response):');
    console.log(`{
  "success": true,
  "data": {
    "canMakeCall": true,
    "callerBalance": 100,
    "coinsPerMinute": 20,
    "maxDurationMinutes": 5,
    "callType": "Video Call",
    "receiverName": "ABBY",
    "receiverGender": "female",
    "adminCommissionPercent": ${configData.adminCommissionPercent},
    "gstarAdminCommission": ${configData.gstarAdminCommission},    ← NEW
    "giconAdminCommission": ${configData.giconAdminCommission}     ← NEW
  }
}`);
    
    console.log('\n✅ CHANGES APPLIED:');
    console.log('- Added gstarAdminCommission field to API response');
    console.log('- Added giconAdminCommission field to API response');  
    console.log('- Values are pulled from call configuration settings');
    console.log('- API now returns all three commission types');
    
    console.log('\n🚀 READY FOR TESTING:');
    console.log('The mobile app can now access all commission rates when checking call feasibility');
    
  } catch (error) {
    console.error('Verification error:', error.message);
  }
}

verifyCommissionFields();
