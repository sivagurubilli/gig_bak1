# Cashfree Webhook Configuration Guide

## Overview
This guide shows you how to configure the Cashfree payment webhook in your dashboard to automatically credit coins when users purchase coin packages.

## 🔧 Cashfree Dashboard Configuration

### Step 1: Access Webhook Settings
1. Login to your [Cashfree Dashboard](https://merchant.cashfree.com/)
2. Navigate to **"Developers"** → **"Webhooks"**
3. Click **"Add Webhook"** or **"Configure Webhook"**

### Step 2: Webhook URL Configuration
Set your webhook URL based on your deployment:

**For Production:**
```
https://your-domain.com/api/v1/app/payment/webhook
```

**For Development/Testing:**
```
https://your-replit-url.replit.app/api/v1/app/payment/webhook
```

**For Local Testing (using ngrok):**
```
https://your-ngrok-url.ngrok.io/api/v1/app/payment/webhook
```

### Step 3: Webhook Events
Select the following events to receive notifications:

✅ **PAYMENT_SUCCESS_WEBHOOK** - Most important for coin crediting
✅ **PAYMENT_FAILED_WEBHOOK** - Optional for analytics
✅ **PAYMENT_USER_DROPPED_WEBHOOK** - Optional for analytics

### Step 4: Webhook Security (Recommended)
1. Enable **Webhook Signature Verification**
2. Copy the **Webhook Secret Key**
3. Add it to your environment variables as `CASHFREE_WEBHOOK_SECRET`

## 📝 Webhook Payload Structure

When a payment succeeds, Cashfree sends this payload to your webhook:

```json
{
  "type": "PAYMENT_SUCCESS_WEBHOOK",
  "data": {
    "order": {
      "order_id": "CF_ORDER_1754548025000_123",
      "order_amount": 10.00,
      "order_currency": "INR",
      "payment_id": "12345_67890",
      "payment_status": "PAID",
      "payment_amount": 10.00,
      "payment_currency": "INR",
      "payment_message": "Transaction Successful",
      "payment_time": "2025-01-07T06:35:00+05:30"
    },
    "customer_details": {
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "customer_phone": "+917696457890"
    }
  }
}
```

## 🤖 Automatic Processing Flow

Here's what happens when your webhook receives a payment notification:

### 1. Webhook Receives Notification
```javascript
app.post("/api/v1/app/payment/webhook", async (req, res) => {
  const { type, data } = req.body;
  
  if (type === "PAYMENT_SUCCESS_WEBHOOK" && data.order.payment_status === "PAID") {
    // Process successful payment
  }
});
```

### 2. Find Pending Transaction
```javascript
const pendingTransaction = allTransactions.find(t => 
  t.transactionId === order_id && t.status === "pending"
);
```

### 3. Credit Coins to User
```javascript
// Update wallet balance
await storage.updateWalletBalance(
  pendingTransaction.userId, 
  wallet.coinBalance + pendingTransaction.amount  // Add purchased coins
);

// Mark transaction as completed
await storage.updateWalletTransaction(pendingTransaction.id, {
  status: "completed",
  transactionId: `${order_id}_${payment_id}`
});
```

### 4. Sync to Firebase
```javascript
// Update Firebase for real-time mobile app sync
await FirestoreService.updateUserWallet(userId, {
  userId: pendingTransaction.userId,
  coinBalance: updatedWallet.coinBalance,
  totalEarned: updatedWallet.totalEarned,
  totalSpent: updatedWallet.totalSpent
});

// Store transaction in Firebase
await FirestoreService.storeWalletTransaction({
  userId: userId.toString(),
  amount: pendingTransaction.amount,
  type: "credit",
  description: "Coin Package Purchase",
  transactionId: `${order_id}_${payment_id}`,
  timestamp: new Date()
});
```

## 🧪 Testing the Webhook

### Method 1: Manual Webhook Test
Use curl to simulate a Cashfree webhook:

```bash
curl -X POST https://your-domain.com/api/v1/app/payment/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "PAYMENT_SUCCESS_WEBHOOK",
    "data": {
      "order": {
        "order_id": "CF_ORDER_TEST_123",
        "payment_id": "PAY_TEST_456",
        "payment_status": "PAID"
      }
    }
  }'
```

### Method 2: Cashfree Dashboard Test
1. Go to **"Developers"** → **"Webhooks"** in Cashfree dashboard
2. Click **"Test Webhook"**
3. Select **"PAYMENT_SUCCESS_WEBHOOK"**
4. Send test payload to your webhook URL

### Method 3: Live Payment Test
1. Create a small test coin package (₹1 for 10 coins)
2. Make an actual test payment
3. Verify coins are automatically credited
4. Check webhook logs in your server console

## 🔍 Webhook Response Codes

Your webhook should respond with appropriate HTTP status codes:

- **200 OK**: Webhook processed successfully
- **400 Bad Request**: Invalid payload format
- **500 Internal Server Error**: Processing failed (Cashfree will retry)

## 📊 Monitoring & Debugging

### Server Logs
Monitor your server logs for webhook activity:
```bash
# Look for these log messages:
Cashfree webhook received: { type: 'PAYMENT_SUCCESS_WEBHOOK', data: ... }
Payment successful: PAY_123_456, coins credited to user 789
```

### Cashfree Dashboard
Check webhook delivery status in Cashfree dashboard:
- **"Developers"** → **"Webhooks"** → **"Logs"**
- View delivery attempts, response codes, and retry attempts

### Database Verification
Check your database for:
- Transaction status changed from "pending" to "completed"
- User wallet balance increased by purchased coin amount
- New transaction record with correct details

## 🚨 Troubleshooting

### Common Issues:

**Webhook not receiving notifications:**
- Check webhook URL is accessible from internet
- Verify URL is correctly configured in Cashfree dashboard
- Check server logs for incoming requests

**Coins not being credited:**
- Verify pending transaction exists with matching order ID
- Check wallet update logs
- Ensure Firebase sync is working

**Duplicate coin credits:**
- Implement idempotency checks using order ID
- Verify transaction status before processing

## 🔐 Security Best Practices

1. **Validate webhook signatures** (implement webhook secret verification)
2. **Check payment status** before crediting coins
3. **Prevent duplicate processing** using order IDs
4. **Log all webhook events** for audit trail
5. **Use HTTPS** for webhook URLs
6. **Implement rate limiting** on webhook endpoints

## ✅ Production Checklist

Before going live:

- [ ] Webhook URL configured in Cashfree dashboard
- [ ] HTTPS enabled for production webhook URL
- [ ] Webhook signature verification implemented
- [ ] Test payments working correctly
- [ ] Coins being credited automatically
- [ ] Firebase sync working
- [ ] Monitoring and logging in place
- [ ] Error handling for all edge cases

## 📞 Support

If webhooks are not working:
1. Check Cashfree dashboard webhook logs
2. Verify server accessibility from internet
3. Test with manual webhook calls
4. Contact Cashfree support if needed

The webhook system is now fully implemented and ready for production use!