// Test script to simulate Cashfree webhook and payment flow
import axios from 'axios';

const baseURL = 'http://localhost:5000';

async function testPaymentWebhookFlow() {
  console.log('🚀 Testing Complete Payment Webhook Flow\n');

  try {
    // Step 1: Login as admin to get token
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // Step 2: Get available coin packages
    console.log('2️⃣ Getting available coin packages...');
    const packagesResponse = await axios.get(`${baseURL}/api/v1/app/coin-packages`);
    const packages = packagesResponse.data.packages;
    const testPackage = packages.find(p => p.name === 'Test Package') || packages[0];
    console.log(`✅ Found ${packages.length} packages. Using: ${testPackage.name} (${testPackage.coinAmount} coins for ₹${testPackage.price})\n`);

    // Step 3: Check current wallet balance
    console.log('3️⃣ Checking current wallet state...');
    const walletResponse = await axios.get(`${baseURL}/api/wallet/transactions`);
    const transactions = walletResponse.data;
    console.log(`✅ Found ${transactions.length} existing transactions\n`);

    // Step 4: Create payment order (simulating mobile user)
    console.log('4️⃣ Creating payment order...');
    const orderData = {
      packageId: testPackage.id,
      customerPhone: '+917696457890',
      customerEmail: 'test@gigglebuz.com',
      returnUrl: 'https://gigglebuz.com/payment-success'
    };

    // Note: This would normally require mobile user authentication
    // For testing, we'll simulate the order creation process
    console.log('📝 Order data:', JSON.stringify(orderData, null, 2));
    console.log('⚠️  Note: This requires mobile user authentication in production\n');

    // Step 5: Simulate successful payment webhook
    console.log('5️⃣ Simulating Cashfree payment success webhook...');
    const webhookData = {
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      data: {
        order: {
          order_id: `CF_ORDER_${Date.now()}_TEST`,
          payment_id: `PAY_${Date.now()}_TEST`,
          payment_status: 'PAID'
        }
      }
    };

    console.log('📝 Webhook payload:', JSON.stringify(webhookData, null, 2));

    // First, let's create a pending transaction manually to test webhook
    const pendingTransaction = {
      userId: 1, // Test user ID
      amount: testPackage.coinAmount,
      type: 'credit',
      description: `Pending: Purchase of ${testPackage.name}`,
      status: 'pending',
      transactionId: webhookData.data.order.order_id
    };

    console.log('📝 Creating pending transaction for webhook test...');
    
    // Step 6: Send webhook to test automatic coin crediting
    console.log('6️⃣ Sending webhook to server...');
    const webhookResponse = await axios.post(`${baseURL}/api/v1/app/payment/webhook`, webhookData);
    console.log('✅ Webhook response:', webhookResponse.data);

    console.log('\n🎉 Payment webhook flow test completed!');
    console.log('\n📊 Summary:');
    console.log(`- Package: ${testPackage.name}`);
    console.log(`- Coins to be credited: ${testPackage.coinAmount}`);
    console.log(`- Price: ₹${testPackage.price}`);
    console.log(`- Order ID: ${webhookData.data.order.order_id}`);
    console.log(`- Payment ID: ${webhookData.data.order.payment_id}`);

  } catch (error) {
    console.error('❌ Error during test:', error.response?.data || error.message);
  }
}

// Run the test
testPaymentWebhookFlow();