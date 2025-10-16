console.log('=== Debugging Transaction Status Issue ===\n');

async function debugTransactionStatus() {
  try {
    const adminLogin = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const adminData = await adminLogin.json();
    const token = adminData.token;
    
    const usersResponse = await fetch('http://localhost:5000/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const users = await usersResponse.json();
    const testUser = users.find(u => u.username === '+918639063855');
    
    if (testUser) {
      console.log(`User ID: ${testUser.id} (Type: ${typeof testUser.id})`);
      
      // Get detailed transaction info
      const walletResponse = await fetch('http://localhost:5000/api/wallet/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const transactions = await walletResponse.json();
      const userTransactions = transactions.filter(t => t.userId === testUser.id);
      
      console.log(`\nFound ${userTransactions.length} transactions:`);
      userTransactions.forEach((tx, index) => {
        console.log(`\nTransaction ${index + 1}:`);
        console.log(`  ID: ${tx.id} (Type: ${typeof tx.id})`);
        console.log(`  User ID: ${tx.userId} (Type: ${typeof tx.userId})`);
        console.log(`  Amount: ${tx.amount} (Type: ${typeof tx.amount})`);
        console.log(`  Type: ${tx.type} (Type: ${typeof tx.type})`);
        console.log(`  Status: ${tx.status} (Type: ${typeof tx.status})`);
        console.log(`  Transaction ID: ${tx.transactionId} (Type: ${typeof tx.transactionId})`);
        console.log(`  Description: ${tx.description}`);
      });
      
      console.log('\n🔍 ISSUE ANALYSIS:');
      const completedCredits = userTransactions.filter(t => t.status === 'completed' && t.type === 'credit');
      const pendingCredits = userTransactions.filter(t => t.status === 'pending' && t.type === 'credit');
      const undefinedStatus = userTransactions.filter(t => t.status === undefined);
      
      console.log(`- Completed credit transactions: ${completedCredits.length}`);
      console.log(`- Pending credit transactions: ${pendingCredits.length}`);
      console.log(`- Transactions with undefined status: ${undefinedStatus.length}`);
      
      if (undefinedStatus.length > 0) {
        console.log('\n❌ ROOT CAUSE IDENTIFIED:');
        console.log('- Transactions are being created with undefined status');
        console.log('- This prevents them from being considered "completed"');
        console.log('- Wallet balance only updates for completed transactions');
        console.log('- Need to fix transaction creation to set proper status');
      }
    }
    
  } catch (error) {
    console.error('Debug error:', error.message);
  }
}

debugTransactionStatus();
