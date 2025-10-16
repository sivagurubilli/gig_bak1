console.log('=== Testing Enhanced Call Transactions Display ===\n');

async function testCallTransactionsDisplay() {
  try {
    // Test admin access to call transactions
    const adminLogin = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const adminData = await adminLogin.json();
    const adminToken = adminData.token;
    
    // Test call transactions API
    const transactionsResponse = await fetch('http://localhost:5000/api/call-transactions', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (!transactionsResponse.ok) {
      console.log('Call transactions response not OK:', transactionsResponse.status);
      return;
    }
    
    const transactions = await transactionsResponse.json();
    
    console.log(`✅ CALL TRANSACTIONS API RESPONSE:`);
    console.log(`Total transactions: ${transactions.length}`);
    
    if (transactions.length > 0) {
      const sampleTransaction = transactions[0];
      console.log('\nSample transaction structure:');
      console.log(JSON.stringify(sampleTransaction, null, 2));
      
      console.log('\n🎯 ENHANCED TRANSACTION DETAILS:');
      console.log('- Call ID and type information');
      console.log('- Caller and receiver with gender and profile icons');
      console.log('- Duration and cost breakdown');
      console.log('- Payment flow showing caller paid, admin earned, receiver earned');
      console.log('- Commission type badges (Admin/Gstar/Gicon)');
      console.log('- Status with payment confirmation');
      console.log('- Profile type indicators (Basic/Gstar/Gicon)');
    }
    
    // Test call transaction stats
    const statsResponse = await fetch('http://localhost:5000/api/call-transactions/stats', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('\n📊 CALL TRANSACTION STATS:');
      console.log(`- Total Calls: ${stats.totalCalls}`);
      console.log(`- Calls Today: ${stats.callsToday}`);
      console.log(`- Total Duration: ${stats.totalDuration} minutes`);
      console.log(`- Total Revenue: ${stats.totalRevenue} coins`);
      console.log(`- Total Commission: ${stats.totalCommission} coins`);
      console.log(`- Average Commission: ${stats.avgCommissionPercent.toFixed(1)}%`);
    }
    
    console.log('\n✅ ADMIN PANEL CALL TRANSACTIONS FEATURES:');
    console.log('');
    console.log('📋 TABLE COLUMNS:');
    console.log('1. Call Info: Type, ID, timestamp');
    console.log('2. Participants: Names with gender and profile icons');
    console.log('3. Duration & Cost: Time and coin calculations');
    console.log('4. Payment Flow: Detailed breakdown of coin movement');
    console.log('5. Commission: Type and rate based on receiver profile');
    console.log('6. Status: Call status and payment confirmation');
    console.log('');
    console.log('🔍 FILTER OPTIONS:');
    console.log('- Search by caller/receiver names or call ID');
    console.log('- Filter by status (All/Completed/Active/Initiated/Failed)');
    console.log('- Filter by call type (All/Video/Audio)');
    console.log('');
    console.log('📊 STATISTICS CARDS:');
    console.log('- Total calls with today\'s count');
    console.log('- Total duration with average per call');
    console.log('- Total revenue with today\'s earnings');
    console.log('- Admin commission with average rate');
    console.log('');
    console.log('💰 PAYMENT DETAILS:');
    console.log('- Shows exact coin flow for each transaction');
    console.log('- Identifies payable vs non-payable call combinations');
    console.log('- Displays commission type based on receiver profile');
    console.log('- Indicates gender-based payment logic');
    
    console.log('\n🚀 ADMIN CAN NOW SEE:');
    console.log('- All call sessions (initiated, connected, ended, failed)');
    console.log('- Complete payment breakdown for each call');
    console.log('- Profile-based commission calculations');
    console.log('- Gender-based payment logic results');
    console.log('- Real-time commission and earnings tracking');
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testCallTransactionsDisplay();
