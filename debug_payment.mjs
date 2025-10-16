console.log('=== Debugging Persistent Payment Issue ===\n');

async function debugPersistentIssue() {
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
      console.log(`Debugging for user: ${testUser.username} (ID: ${testUser.id})`);
      
      // Check all transactions
      const walletResponse = await fetch('http://localhost:5000/api/wallet/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allTransactions = await walletResponse.json();
      const userTransactions = allTransactions.filter(t => t.userId === testUser.id);
      
      console.log(`\nTotal transactions in database: ${allTransactions.length}`);
      console.log(`User transactions: ${userTransactions.length}`);
      
      if (userTransactions.length > 0) {
        console.log('\nRecent transactions:');
        userTransactions.slice(0, 5).forEach((tx, index) => {
          console.log(`${index + 1}. Amount: ${tx.amount}, Type: ${tx.type}, Status: ${tx.status}, ID: ${tx.transactionId}`);
        });
        
        // Calculate what the balance should be
        const completedCredits = userTransactions.filter(t => t.status === 'completed' && t.type === 'credit');
        const totalCredits = completedCredits.reduce((sum, tx) => sum + tx.amount, 0);
        
        console.log(`\nCompleted credit transactions: ${completedCredits.length}`);
        console.log(`Total credits: ${totalCredits}`);
        
        if (totalCredits > 0) {
          console.log('\n❌ ISSUE: Transactions exist but wallet balance is still 0');
          console.log('This suggests the updateWalletBalance method is not working correctly');
        }
      }
      
      // Check if the problem is in the wallet retrieval
      console.log('\n🔍 Testing wallet retrieval directly...');
      
      // The issue might be that the wallet balance is not being persisted properly
      // Let's check if we can identify the specific problem
      console.log('\nPossible causes:');
      console.log('1. updateWalletBalance not persisting to database');
      console.log('2. getWallet not reading the updated balance');
      console.log('3. Database connection issues');
      console.log('4. Transaction rollback issues');
    }
    
  } catch (error) {
    console.error('Debug error:', error.message);
  }
}

debugPersistentIssue();
