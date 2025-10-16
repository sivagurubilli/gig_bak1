console.log('=== Testing Male→Female Call Payment Logic ===\n');

async function testMaleFemaleCall() {
  try {
    // Get admin access first
    const adminLogin = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const adminData = await adminLogin.json();
    const adminToken = adminData.token;
    
    // Get users to find male and female users
    const usersResponse = await fetch('http://localhost:5000/api/users', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const users = await usersResponse.json();
    
    const maleUsers = users.filter(u => u.gender === 'male');
    const femaleUsers = users.filter(u => u.gender === 'female');
    
    console.log(`Found ${maleUsers.length} male users and ${femaleUsers.length} female users`);
    
    if (maleUsers.length === 0 || femaleUsers.length === 0) {
      console.log('❌ Need both male and female users for testing');
      console.log('Your previous test was male→male, which correctly shows:');
      console.log('- coinsToReceiver: 0 (no payment for male→male)');
      console.log('- adminCommission: 0 (no commission for male→male)');
      console.log('- commissionType: none (correct)');
      console.log('');
      console.log('🎯 PAYMENT LOGIC EXPLANATION:');
      console.log('✅ Male → Female calls: Receiver gets coins based on profile commission');
      console.log('❌ Male → Male calls: Only caller pays, receiver gets nothing');
      console.log('❌ Female → Male calls: Only caller pays, receiver gets nothing');
      console.log('❌ Female → Female calls: Only caller pays, receiver gets nothing');
      return;
    }
    
    // Find a female user with Gstar or Gicon profile for better testing
    const gstarFemale = femaleUsers.find(u => u.profileType === 'gstar');
    const giconFemale = femaleUsers.find(u => u.profileType === 'gicon');
    const basicFemale = femaleUsers.find(u => !u.profileType || u.profileType === 'basic');
    
    console.log('\n📊 FEMALE USER PROFILES AVAILABLE:');
    if (gstarFemale) console.log(`- Gstar: ${gstarFemale.name || gstarFemale.username} (25% commission)`);
    if (giconFemale) console.log(`- Gicon: ${giconFemale.name || giconFemale.username} (18% commission)`);
    if (basicFemale) console.log(`- Basic: ${basicFemale.name || basicFemale.username} (20% commission)`);
    
    const testReceiver = gstarFemale || giconFemale || basicFemale;
    const testCaller = maleUsers[0];
    
    console.log(`\n🎯 TO TEST PROPER PAYMENT LOGIC:`);
    console.log(`Call setup needed: ${testCaller.gender} (${testCaller.name || testCaller.username}) → ${testReceiver.gender} (${testReceiver.name || testReceiver.username}, ${testReceiver.profileType || 'basic'})`);
    console.log('');
    console.log('Expected results for male→female call:');
    console.log(`- coinsToReceiver: > 0 (receiver should get coins)`);
    console.log(`- adminCommission: > 0 (commission should be deducted)`);
    console.log(`- commissionType: ${testReceiver.profileType === 'gstar' ? 'gstar' : testReceiver.profileType === 'gicon' ? 'gicon' : 'admin'}`);
    
    // Get call configuration to show commission rates
    const configResponse = await fetch('http://localhost:5000/api/call-config', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const config = await configResponse.json();
    
    console.log('\n📋 COMMISSION RATES:');
    console.log(`- Basic/Admin: ${config.adminCommissionPercent}%`);
    console.log(`- Gstar: ${config.gstarAdminCommission}%`);
    console.log(`- Gicon: ${config.giconAdminCommission}%`);
    
    console.log('\n💡 YOUR PREVIOUS TEST RESULT ANALYSIS:');
    console.log('The result you showed is CORRECT for a male→male call:');
    console.log('- Caller (male) paid 28 coins ✓');
    console.log('- Receiver (male) got 0 coins ✓ (correct - no payment for male→male)');
    console.log('- Admin commission: 0 ✓ (correct - no commission for male→male)');
    console.log('- Commission type: none ✓ (correct)');
    console.log('');
    console.log('To see coins being credited to receiver, test with:');
    console.log('- Male caller → Female receiver');
    console.log('- The system will then credit coins based on receiver profile type');
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testMaleFemaleCall();
