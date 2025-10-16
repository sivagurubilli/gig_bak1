import axios from 'axios';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000';
let authToken = '';
let testResults = [];

// Test result tracking
function addTestResult(module, feature, scenario, expected, actual, status, performance, notes) {
  testResults.push({
    module,
    feature,
    scenario,
    expected,
    actual,
    status,
    performance,
    notes
  });
}

// Authentication helper
async function authenticate() {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    authToken = response.data.token;
    addTestResult('Authentication', 'Admin Login', 'Login with valid credentials', 'Success with token', 'Success', 'PASS', 'Fast', 'Token received');
    return response.data;
  } catch (error) {
    addTestResult('Authentication', 'Admin Login', 'Login with valid credentials', 'Success with token', 'Failed', 'FAIL', 'N/A', error.message);
    throw error;
  }
}

// API request helper with auth
async function apiRequest(method, endpoint, data = null) {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (data) {
    config.data = data;
  }
  
  const startTime = Date.now();
  try {
    const response = await axios(config);
    const duration = Date.now() - startTime;
    return { data: response.data, status: response.status, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    return { error: error.response?.data || error.message, status: error.response?.status || 500, duration };
  }
}

// Test Dashboard
async function testDashboard() {
  console.log('Testing Dashboard...');
  
  // Test dashboard stats
  const stats = await apiRequest('GET', '/api/dashboard/stats');
  if (stats.error) {
    addTestResult('Dashboard', 'Statistics', 'Load dashboard stats', 'Statistics display', 'Error: ' + stats.error, 'FAIL', `${stats.duration}ms`, 'Failed to load stats');
  } else {
    addTestResult('Dashboard', 'Statistics', 'Load dashboard stats', 'Statistics display', 'Success', 'PASS', `${stats.duration}ms`, `Loaded: ${stats.data.totalUsers} users`);
  }
}

// Test User Management
async function testUserManagement() {
  console.log('Testing User Management...');
  
  // Test get users
  const users = await apiRequest('GET', '/api/users');
  if (users.error) {
    addTestResult('User Management', 'List Users', 'Get all users', 'User list returned', 'Error: ' + users.error, 'FAIL', `${users.duration}ms`, 'Failed to fetch users');
  } else {
    addTestResult('User Management', 'List Users', 'Get all users', 'User list returned', 'Success', 'PASS', `${users.duration}ms`, `${users.data.length} users loaded`);
    
    // Test user search if users exist
    if (users.data.length > 0) {
      const firstUser = users.data[0];
      const searchResult = await apiRequest('GET', `/api/users/search?q=${firstUser.name}`);
      if (searchResult.error) {
        addTestResult('User Management', 'Search Users', 'Search by name', 'Filtered results', 'Error: ' + searchResult.error, 'FAIL', `${searchResult.duration}ms`, 'Search failed');
      } else {
        addTestResult('User Management', 'Search Users', 'Search by name', 'Filtered results', 'Success', 'PASS', `${searchResult.duration}ms`, 'Search working');
      }
      
      // Test user block/unblock
      const blockResult = await apiRequest('PATCH', `/api/users/${firstUser.id}/block`);
      if (blockResult.error) {
        addTestResult('User Management', 'Block User', 'Block a user', 'User blocked', 'Error: ' + blockResult.error, 'FAIL', `${blockResult.duration}ms`, 'Block failed');
      } else {
        addTestResult('User Management', 'Block User', 'Block a user', 'User blocked', 'Success', 'PASS', `${blockResult.duration}ms`, 'User blocked successfully');
        
        // Test unblock
        const unblockResult = await apiRequest('PATCH', `/api/users/${firstUser.id}/unblock`);
        if (unblockResult.error) {
          addTestResult('User Management', 'Unblock User', 'Unblock a user', 'User unblocked', 'Error: ' + unblockResult.error, 'FAIL', `${unblockResult.duration}ms`, 'Unblock failed');
        } else {
          addTestResult('User Management', 'Unblock User', 'Unblock a user', 'User unblocked', 'Success', 'PASS', `${unblockResult.duration}ms`, 'User unblocked successfully');
        }
      }
    }
  }
}

// Test Wallet Management
async function testWalletManagement() {
  console.log('Testing Wallet Management...');
  
  // Test get wallets
  const wallets = await apiRequest('GET', '/api/wallets');
  if (wallets.error) {
    addTestResult('Wallet Management', 'List Wallets', 'Get all wallets', 'Wallet list returned', 'Error: ' + wallets.error, 'FAIL', `${wallets.duration}ms`, 'Failed to fetch wallets');
  } else {
    addTestResult('Wallet Management', 'List Wallets', 'Get all wallets', 'Wallet list returned', 'Success', 'PASS', `${wallets.duration}ms`, `${wallets.data.length} wallets loaded`);
  }
  
  // Test wallet transactions
  const transactions = await apiRequest('GET', '/api/wallet/transactions');
  if (transactions.error) {
    addTestResult('Wallet Management', 'Transactions', 'Get transactions', 'Transaction list', 'Error: ' + transactions.error, 'FAIL', `${transactions.duration}ms`, 'Failed to fetch transactions');
  } else {
    addTestResult('Wallet Management', 'Transactions', 'Get transactions', 'Transaction list', 'Success', 'PASS', `${transactions.duration}ms`, `${transactions.data.length} transactions loaded`);
  }
  
  // Test create wallet transaction
  const newTransaction = {
    userId: "685327ca6925771a57db68e4",
    type: "credit",
    amount: 100,
    description: "Test transaction"
  };
  
  const createTx = await apiRequest('POST', '/api/wallet/transactions', newTransaction);
  if (createTx.error) {
    addTestResult('Wallet Management', 'Create Transaction', 'Add new transaction', 'Transaction created', 'Error: ' + createTx.error, 'FAIL', `${createTx.duration}ms`, 'Transaction creation failed');
  } else {
    addTestResult('Wallet Management', 'Create Transaction', 'Add new transaction', 'Transaction created', 'Success', 'PASS', `${createTx.duration}ms`, 'Transaction created successfully');
  }
}

// Test Withdrawal Management
async function testWithdrawalManagement() {
  console.log('Testing Withdrawal Management...');
  
  // Test get withdrawals
  const withdrawals = await apiRequest('GET', '/api/withdrawals');
  if (withdrawals.error) {
    addTestResult('Withdrawal Management', 'List Withdrawals', 'Get all withdrawals', 'Withdrawal list', 'Error: ' + withdrawals.error, 'FAIL', `${withdrawals.duration}ms`, 'Failed to fetch withdrawals');
  } else {
    addTestResult('Withdrawal Management', 'List Withdrawals', 'Get all withdrawals', 'Withdrawal list', 'Success', 'PASS', `${withdrawals.duration}ms`, `${withdrawals.data.length} withdrawals loaded`);
    
    // Test withdrawal approval/rejection if withdrawals exist
    if (withdrawals.data.length > 0) {
      const firstWithdrawal = withdrawals.data[0];
      const approveResult = await apiRequest('PATCH', `/api/withdrawals/${firstWithdrawal.id}`, {
        status: 'approved',
        remarks: 'Test approval'
      });
      
      if (approveResult.error) {
        addTestResult('Withdrawal Management', 'Approve Withdrawal', 'Approve withdrawal request', 'Status updated', 'Error: ' + approveResult.error, 'FAIL', `${approveResult.duration}ms`, 'Approval failed');
      } else {
        addTestResult('Withdrawal Management', 'Approve Withdrawal', 'Approve withdrawal request', 'Status updated', 'Success', 'PASS', `${approveResult.duration}ms`, 'Withdrawal approved successfully');
      }
    }
  }
}

// Test Coin Packages
async function testCoinPackages() {
  console.log('Testing Coin Packages...');
  
  // Test get packages
  const packages = await apiRequest('GET', '/api/coin-packages');
  if (packages.error) {
    addTestResult('Coin Packages', 'List Packages', 'Get all packages', 'Package list', 'Error: ' + packages.error, 'FAIL', `${packages.duration}ms`, 'Failed to fetch packages');
  } else {
    addTestResult('Coin Packages', 'List Packages', 'Get all packages', 'Package list', 'Success', 'PASS', `${packages.duration}ms`, `${packages.data.length} packages loaded`);
  }
  
  // Test create package
  const newPackage = {
    name: "Test Package",
    coinAmount: 1000,
    price: "10.00",
    description: "Test coin package",
    isActive: true
  };
  
  const createPackage = await apiRequest('POST', '/api/coin-packages', newPackage);
  if (createPackage.error) {
    addTestResult('Coin Packages', 'Create Package', 'Add new package', 'Package created', 'Error: ' + createPackage.error, 'FAIL', `${createPackage.duration}ms`, 'Package creation failed');
  } else {
    addTestResult('Coin Packages', 'Create Package', 'Add new package', 'Package created', 'Success', 'PASS', `${createPackage.duration}ms`, 'Package created successfully');
    
    // Test update package
    const updatePackage = await apiRequest('PATCH', `/api/coin-packages/${createPackage.data.id}`, {
      name: "Updated Test Package"
    });
    
    if (updatePackage.error) {
      addTestResult('Coin Packages', 'Update Package', 'Modify package', 'Package updated', 'Error: ' + updatePackage.error, 'FAIL', `${updatePackage.duration}ms`, 'Package update failed');
    } else {
      addTestResult('Coin Packages', 'Update Package', 'Modify package', 'Package updated', 'Success', 'PASS', `${updatePackage.duration}ms`, 'Package updated successfully');
    }
    
    // Test delete package
    const deletePackage = await apiRequest('DELETE', `/api/coin-packages/${createPackage.data.id}`);
    if (deletePackage.error) {
      addTestResult('Coin Packages', 'Delete Package', 'Remove package', 'Package deleted', 'Error: ' + deletePackage.error, 'FAIL', `${deletePackage.duration}ms`, 'Package deletion failed');
    } else {
      addTestResult('Coin Packages', 'Delete Package', 'Remove package', 'Package deleted', 'Success', 'PASS', `${deletePackage.duration}ms`, 'Package deleted successfully');
    }
  }
}

// Test Gift Management
async function testGiftManagement() {
  console.log('Testing Gift Management...');
  
  // Test get gifts
  const gifts = await apiRequest('GET', '/api/gifts');
  if (gifts.error) {
    addTestResult('Gift Management', 'List Gifts', 'Get all gifts', 'Gift list', 'Error: ' + gifts.error, 'FAIL', `${gifts.duration}ms`, 'Failed to fetch gifts');
  } else {
    addTestResult('Gift Management', 'List Gifts', 'Get all gifts', 'Gift list', 'Success', 'PASS', `${gifts.duration}ms`, `${gifts.data.length} gifts loaded`);
  }
  
  // Test create gift
  const newGift = {
    name: "Test Gift",
    coinValue: 50,
    image: "https://example.com/gift.png",
    description: "Test gift item",
    isActive: true
  };
  
  const createGift = await apiRequest('POST', '/api/gifts', newGift);
  if (createGift.error) {
    addTestResult('Gift Management', 'Create Gift', 'Add new gift', 'Gift created', 'Error: ' + createGift.error, 'FAIL', `${createGift.duration}ms`, 'Gift creation failed');
  } else {
    addTestResult('Gift Management', 'Create Gift', 'Add new gift', 'Gift created', 'Success', 'PASS', `${createGift.duration}ms`, 'Gift created successfully');
  }
  
  // Test gift transactions
  const giftTransactions = await apiRequest('GET', '/api/gifts/transactions');
  if (giftTransactions.error) {
    addTestResult('Gift Management', 'Gift Transactions', 'Get gift transactions', 'Transaction list', 'Error: ' + giftTransactions.error, 'FAIL', `${giftTransactions.duration}ms`, 'Failed to fetch gift transactions');
  } else {
    addTestResult('Gift Management', 'Gift Transactions', 'Get gift transactions', 'Transaction list', 'Success', 'PASS', `${giftTransactions.duration}ms`, `${giftTransactions.data.length} gift transactions loaded`);
  }
}

// Test Notifications
async function testNotifications() {
  console.log('Testing Notifications...');
  
  // Test get notifications
  const notifications = await apiRequest('GET', '/api/notifications');
  if (notifications.error) {
    addTestResult('Notifications', 'List Notifications', 'Get all notifications', 'Notification list', 'Error: ' + notifications.error, 'FAIL', `${notifications.duration}ms`, 'Failed to fetch notifications');
  } else {
    addTestResult('Notifications', 'List Notifications', 'Get all notifications', 'Notification list', 'Success', 'PASS', `${notifications.duration}ms`, `${notifications.data.length} notifications loaded`);
  }
  
  // Test send notification
  const newNotification = {
    title: "Test Notification",
    message: "This is a test notification",
    type: "system",
    target: "all"
  };
  
  const sendNotification = await apiRequest('POST', '/api/notifications/send', newNotification);
  if (sendNotification.error) {
    addTestResult('Notifications', 'Send Notification', 'Send FCM notification', 'Notification sent', 'Error: ' + sendNotification.error, 'FAIL', `${sendNotification.duration}ms`, 'Notification sending failed');
  } else {
    addTestResult('Notifications', 'Send Notification', 'Send FCM notification', 'Notification sent', 'Success', 'PASS', `${sendNotification.duration}ms`, 'FCM notification sent successfully');
  }
}

// Test Bonus Management
async function testBonusManagement() {
  console.log('Testing Bonus Management...');
  
  // Test get bonus rules
  const bonusRules = await apiRequest('GET', '/api/bonus-rules');
  if (bonusRules.error) {
    addTestResult('Bonus Management', 'List Rules', 'Get all bonus rules', 'Rules list', 'Error: ' + bonusRules.error, 'FAIL', `${bonusRules.duration}ms`, 'Failed to fetch bonus rules');
  } else {
    addTestResult('Bonus Management', 'List Rules', 'Get all bonus rules', 'Rules list', 'Success', 'PASS', `${bonusRules.duration}ms`, `${bonusRules.data.length} bonus rules loaded`);
  }
  
  // Test create bonus rule
  const newRule = {
    name: "Test Bonus Rule",
    type: "daily_login",
    coinReward: 10,
    description: "Test bonus rule",
    isActive: true
  };
  
  const createRule = await apiRequest('POST', '/api/bonus-rules', newRule);
  if (createRule.error) {
    addTestResult('Bonus Management', 'Create Rule', 'Add new bonus rule', 'Rule created', 'Error: ' + createRule.error, 'FAIL', `${createRule.duration}ms`, 'Rule creation failed');
  } else {
    addTestResult('Bonus Management', 'Create Rule', 'Add new bonus rule', 'Rule created', 'Success', 'PASS', `${createRule.duration}ms`, 'Bonus rule created successfully');
  }
}

// Test Content Moderation
async function testContentModeration() {
  console.log('Testing Content Moderation...');
  
  // Test get reports
  const reports = await apiRequest('GET', '/api/reports');
  if (reports.error) {
    addTestResult('Content Moderation', 'List Reports', 'Get all reports', 'Reports list', 'Error: ' + reports.error, 'FAIL', `${reports.duration}ms`, 'Failed to fetch reports');
  } else {
    addTestResult('Content Moderation', 'List Reports', 'Get all reports', 'Reports list', 'Success', 'PASS', `${reports.duration}ms`, `${reports.data.length} reports loaded`);
  }
}

// Test Leaderboard
async function testLeaderboard() {
  console.log('Testing Leaderboard...');
  
  // Test get leaderboard
  const leaderboard = await apiRequest('GET', '/api/leaderboard?type=coins&period=weekly');
  if (leaderboard.error) {
    addTestResult('Leaderboard', 'Get Rankings', 'Get leaderboard data', 'Rankings displayed', 'Error: ' + leaderboard.error, 'FAIL', `${leaderboard.duration}ms`, 'Failed to fetch leaderboard');
  } else {
    addTestResult('Leaderboard', 'Get Rankings', 'Get leaderboard data', 'Rankings displayed', 'Success', 'PASS', `${leaderboard.duration}ms`, `${leaderboard.data.length} entries loaded`);
  }
}

// Test Document Management
async function testDocumentManagement() {
  console.log('Testing Document Management...');
  
  // Test get documents
  const documents = await apiRequest('GET', '/api/documents');
  if (documents.error) {
    addTestResult('Document Management', 'List Documents', 'Get all documents', 'Document list', 'Error: ' + documents.error, 'FAIL', `${documents.duration}ms`, 'Failed to fetch documents');
  } else {
    addTestResult('Document Management', 'List Documents', 'Get all documents', 'Document list', 'Success', 'PASS', `${documents.duration}ms`, `${documents.data.length} documents loaded`);
  }
  
  // Test create document
  const newDocument = {
    title: "Test Document",
    content: "This is a test document content",
    type: "policy"
  };
  
  const createDocument = await apiRequest('POST', '/api/documents', newDocument);
  if (createDocument.error) {
    addTestResult('Document Management', 'Create Document', 'Add new document', 'Document created', 'Error: ' + createDocument.error, 'FAIL', `${createDocument.duration}ms`, 'Document creation failed');
  } else {
    addTestResult('Document Management', 'Create Document', 'Add new document', 'Document created', 'Success', 'PASS', `${createDocument.duration}ms`, 'Document created successfully');
  }
}

// Test Payment Logs
async function testPaymentLogs() {
  console.log('Testing Payment Logs...');
  
  // Test get payment logs
  const paymentLogs = await apiRequest('GET', '/api/payment-logs');
  if (paymentLogs.error) {
    addTestResult('Payment Logs', 'List Logs', 'Get all payment logs', 'Payment logs', 'Error: ' + paymentLogs.error, 'FAIL', `${paymentLogs.duration}ms`, 'Failed to fetch payment logs');
  } else {
    addTestResult('Payment Logs', 'List Logs', 'Get all payment logs', 'Payment logs', 'Success', 'PASS', `${paymentLogs.duration}ms`, `${paymentLogs.data.length} payment logs loaded`);
  }
}

// Generate CSV report
function generateReport() {
  console.log('Generating comprehensive test report...');
  
  const csvHeader = 'Module,Feature,Test Scenario,Expected Result,Actual Result,Status,Performance,Notes\n';
  const csvContent = testResults.map(result => 
    `"${result.module}","${result.feature}","${result.scenario}","${result.expected}","${result.actual}","${result.status}","${result.performance}","${result.notes}"`
  ).join('\n');
  
  const fullReport = csvHeader + csvContent;
  
  fs.writeFileSync('gigglebuz_admin_testing_report.csv', fullReport);
  
  // Generate summary
  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.status === 'PASS').length;
  const failedTests = testResults.filter(r => r.status === 'FAIL').length;
  const successRate = ((passedTests / totalTests) * 100).toFixed(2);
  
  const summary = `
GIGGLEBUZ ADMIN PANEL - TESTING SUMMARY
=======================================
Total Tests: ${totalTests}
Passed: ${passedTests}
Failed: ${failedTests}
Success Rate: ${successRate}%

Failed Tests:
${testResults.filter(r => r.status === 'FAIL').map(r => `- ${r.module}: ${r.feature} - ${r.notes}`).join('\n')}
`;
  
  fs.writeFileSync('testing_summary.txt', summary);
  console.log('Test report generated: gigglebuz_admin_testing_report.csv');
  console.log('Summary generated: testing_summary.txt');
  console.log(summary);
}

// Main testing function
async function runAllTests() {
  try {
    console.log('Starting comprehensive admin panel testing...');
    
    await authenticate();
    await testDashboard();
    await testUserManagement();
    await testWalletManagement();
    await testWithdrawalManagement();
    await testCoinPackages();
    await testGiftManagement();
    await testNotifications();
    await testBonusManagement();
    await testContentModeration();
    await testLeaderboard();
    await testDocumentManagement();
    await testPaymentLogs();
    
    generateReport();
    
  } catch (error) {
    console.error('Testing failed:', error.message);
    addTestResult('System', 'Testing Framework', 'Run all tests', 'Complete test execution', 'Failed: ' + error.message, 'FAIL', 'N/A', 'Testing framework error');
    generateReport();
  }
}

// Run tests
runAllTests();