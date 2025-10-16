console.log('=== Comprehensive Issue Testing ===\n');

// Test 1: Check if mobile API endpoints are working
console.log('1. Testing mobile API endpoints...');
try {
  const response = await fetch('http://localhost:5000/api/v1/app/coin-packages');
  const text = await response.text();
  
  if (text.startsWith('<!DOCTYPE html>')) {
    console.log('❌ Mobile API returning HTML instead of JSON - routing issue');
  } else {
    const data = JSON.parse(text);
    console.log('✅ Mobile API working:', !!data.success);
  }
} catch (error) {
  console.log('❌ Mobile API test failed:', error.message);
}

// Test 2: Check call config API
console.log('\n2. Testing call config API...');
try {
  const adminLogin = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  
  if (adminLogin.ok) {
    const adminData = await adminLogin.json();
    const token = adminData.token;
    
    const configResponse = await fetch('http://localhost:5000/api/call-config', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (configResponse.ok) {
      const config = await configResponse.json();
      console.log('✅ Call config API working');
      console.log('Current config fields:', Object.keys(config));
      console.log('Has new commission fields:', 
        'gstarAdminCommission' in config && 'giconAdminCommission' in config ? '✅' : '❌');
    } else {
      console.log('❌ Call config API failed:', configResponse.status);
    }
  } else {
    console.log('❌ Admin login failed');
  }
} catch (error) {
  console.log('❌ Call config test failed:', error.message);
}

console.log('\n=== Summary ===');
console.log('Issues to fix:');
console.log('1. Mobile API routing (HTML instead of JSON)');
console.log('2. Call configuration new fields');
console.log('3. Payment verification coin crediting');
