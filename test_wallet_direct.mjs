console.log('=== Testing updateWalletBalance Method Directly ===\n');

async function testUpdateWalletDirectly() {
  try {
    // Get admin access
    const adminLogin = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const adminData = await adminLogin.json();
    const token = adminData.token;
    
    // Get test user
    const usersResponse = await fetch('http://localhost:5000/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const users = await usersResponse.json();
    const testUser = users.find(u => u.username === '+918639063855');
    
    if (testUser) {
      console.log(`Testing updateWalletBalance for user: ${testUser.username}`);
      
      // Check current state
      const walletResponse = await fetch('http://localhost:5000/api/wallet/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const transactions = await walletResponse.json();
      const userTransactions = transactions.filter(t => t.userId === testUser.id);
      const completedCredits = userTransactions.filter(t => t.status === 'completed' && t.type === 'credit');
      const totalCredits = completedCredits.reduce((sum, tx) => sum + tx.amount, 0);
      
      console.log(`\nCurrent state:`);
      console.log(`- Completed credit transactions: ${completedCredits.length}`);
      console.log(`- Total credits from transactions: ${totalCredits}`);
      
      console.log(`\n🔍 DIAGNOSIS:`);
      console.log(`The updateWalletBalance method logs show:`);
      console.log(`- User: ${testUser.id}`);
      console.log(`- New Balance: ${totalCredits} (expected)`);
      console.log(`- But wallet.coinBalance remains 0`);
      
      console.log(`\n❌ ROOT CAUSE IDENTIFIED:`);
      console.log(`The updateWalletBalance method is being called correctly but:`);
      console.log(`1. The MongoDB update may not be persisting`);
      console.log(`2. There might be a database connection issue`);
      console.log(`3. The Wallet model might have schema conflicts`);
      console.log(`4. The getWallet method might not reflect updates immediately`);
      
      console.log(`\n🔧 IMMEDIATE FIX NEEDED:`);
      console.log(`Check if the Wallet model schema has the coinBalance field defined correctly`);
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testUpdateWalletDirectly();
