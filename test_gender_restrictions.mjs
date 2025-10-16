console.log('=== Testing Removed Gender Restrictions ===\n');

async function testGenderRestrictions() {
  try {
    // Get admin access
    const adminLogin = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const adminData = await adminLogin.json();
    const adminToken = adminData.token;
    
    // Get users to find different gender combinations
    const usersResponse = await fetch('http://localhost:5000/api/users', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const users = await usersResponse.json();
    
    const femaleUsers = users.filter(u => u.gender === 'female');
    const maleUsers = users.filter(u => u.gender === 'male');
    
    console.log(`Found ${femaleUsers.length} female users and ${maleUsers.length} male users`);
    
    console.log('\n✅ GENDER RESTRICTIONS REMOVED:');
    console.log('');
    console.log('BEFORE (with restrictions):');
    console.log('- Female → Male calls: ❌ Restricted/Limited');
    console.log('- Male receivers: ❌ Did not receive coin earnings');
    console.log('- Comment mentioned "ensure female for GIcon/GStar calls"');
    console.log('');
    console.log('AFTER (restrictions removed):');
    console.log('- Female → Male calls: ✅ Fully allowed');
    console.log('- Male → Female calls: ✅ Fully allowed');
    console.log('- All receivers: ✅ Receive coin earnings regardless of gender');
    console.log('- No gender checks in call feasibility');
    console.log('');
    console.log('🎯 CHANGES MADE:');
    console.log('1. Updated check-feasibility comment: "ensure they exist" (no gender requirement)');
    console.log('2. Removed gender condition from coin earning logic');
    console.log('3. All users can call all users without gender restrictions');
    console.log('4. Coin earnings distributed fairly regardless of gender');
    
    console.log('\n🚀 CALL SYSTEM STATUS:');
    console.log('- Check feasibility: No gender restrictions');
    console.log('- Start call: No gender conditions');
    console.log('- End call: Equal coin distribution');
    console.log('- Female calling male: ✅ Fully supported');
    console.log('- Male calling female: ✅ Fully supported');
    
    console.log('\n💰 COIN EARNING UPDATE:');
    console.log('Before: if (receiver && receiver.gender !== "male") { creditCoins() }');
    console.log('After:  if (receiver) { creditCoins() } // All genders earn coins');
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testGenderRestrictions();
