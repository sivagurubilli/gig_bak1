# Gigglebuz Complete API Documentation

## Overview
This document provides a comprehensive list of all available APIs for the Gigglebuz platform, including mobile app endpoints, admin panel endpoints, and integration APIs.

## Base URL
- **Development**: `http://localhost:5000`
- **Production**: `https://your-domain.com`

---

## 🔐 Authentication APIs

### Mobile App Authentication

#### 1. Request OTP
```
POST /api/v1/app/auth/request-otp
Content-Type: application/json

Body:
{
  "phoneNumber": "+918520025559"
}

Response:
{
  "success": true,
  "message": "OTP sent successfully",
  "sessionId": "session_123456789",
  "expiresIn": 600
}
```

#### 2. Verify OTP
```
POST /api/v1/app/auth/verify-otp
Content-Type: application/json

Body:
{
  "phoneNumber": "+918520025559",
  "otp": "123456",
  "sessionId": "session_123456789"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "username": "+918520025559",
    "name": "User Name",
    "wallet": {
      "coinBalance": 1000,
      "totalEarned": "50.00",
      "totalSpent": "25.00"
    }
  }
}
```

### Admin Authentication

#### 3. Admin Login
```
POST /api/auth/login
Content-Type: application/json

Body:
{
  "username": "admin",
  "password": "admin123"
}

Response:
{
  "success": true,
  "token": "admin_jwt_token",
  "admin": {
    "id": "admin_id",
    "username": "admin"
  }
}
```

---

## 📞 Call Management APIs

### Call Operations

#### 4. Start Call
```
POST /api/v1/app/call/start
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

Body:
{
  "receiverUserId": "user_id_here",
  "callType": "video" // or "audio" or "message"
}

Success Response:
{
  "success": true,
  "data": {
    "callId": "call_1756666648250_fehjdu9dw",
    "callSession": {
      "id": "session_id",
      "callId": "call_1756666648250_fehjdu9dw",
      "callType": "video",
      "coinsPerMinute": 30,
      "startTime": "2025-08-31T18:57:28.250Z",
      "status": "initiated"
    }
  }
}

Receiver Unavailable Response:
{
  "success": false,
  "reason": "receiver_unavailable",
  "message": "Call not initiated: Receiver is offline",
  "missedCall": {
    "id": "missed_call_id",
    "callId": "call_id",
    "callType": "video",
    "missedReason": "offline",
    "initiatedAt": "2025-08-31T18:57:28.250Z",
    "notificationSent": true
  }
}
```

#### 5. End Call
```
POST /api/v1/app/call/{callId}/end
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

Body:
{
  "duration": 120 // seconds
}

Response:
{
  "success": true,
  "data": {
    "callId": "call_id",
    "duration": 120,
    "coinsDeducted": 60,
    "walletBalance": 940
  }
}
```

#### 6. No Answer (Timeout)
```
GET /api/v1/app/call/{callId}/no-answer
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "success": true,
  "message": "Call marked as no answer",
  "missedCall": {
    "id": "missed_call_id",
    "callId": "call_id",
    "missedReason": "no_answer",
    "notificationSent": true
  }
}
```

#### 7. Update Call Status
```
PATCH /api/v1/app/call/{callId}/update-status
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

Body:
{
  "status": "connected", // or "ended", "failed", "missed"
  "duration": 120 // optional, for ended calls
}

Response:
{
  "success": true,
  "message": "Call status updated successfully",
  "callSession": {
    "callId": "call_id",
    "status": "connected",
    "duration": 120
  }
}
```

#### 8. Send Missed Call Status
```
POST /api/v1/app/call/send-missed-status
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

Body:
{
  "callId": "call_id",
  "receiverUserId": "user_id",
  "customMessage": "You missed a call from John",
  "waitTime": 30 // optional
}

Response:
{
  "success": true,
  "message": "Missed call notification sent successfully",
  "missedCall": {
    "id": "missed_call_id",
    "notificationSent": true
  }
}
```

### Call Configuration

#### 9. Check Call Feasibility
```
GET /api/v1/app/call/check-feasibility
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "success": true,
  "data": {
    "videoCalls": {
      "enabled": true,
      "coinsPerMinute": 30
    },
    "audioCalls": {
      "enabled": true,
      "coinsPerMinute": 5
    },
    "adminCommissionPercent": 20,
    "gstarAdminCommission": 25,
    "giconAdminCommission": 18
  }
}
```

---

## 🎁 Gift System APIs

#### 10. Send Gift
```
POST /api/v1/app/gift/send
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

Body:
{
  "receiverUserId": "user_id",
  "giftId": "gift_id",
  "quantity": 1
}

Response:
{
  "success": true,
  "data": {
    "transactionId": "transaction_id",
    "coinsDeducted": 100,
    "receiverEarning": 80,
    "commission": 20,
    "walletBalance": 900
  }
}
```

#### 11. Get Gift List
```
GET /api/v1/app/gifts
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "success": true,
  "data": [
    {
      "id": "gift_id",
      "name": "Rose",
      "image": "/uploads/gifts/rose.png",
      "coins": 50,
      "category": "flowers"
    }
  ]
}
```

#### 12. Gift Transaction History
```
GET /api/v1/app/gift/transactions?page=1&limit=20
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "transaction_id",
        "giftName": "Rose",
        "receiverName": "John",
        "coins": 50,
        "type": "sent", // or "received"
        "createdAt": "2025-08-31T18:57:28.250Z"
      }
    ],
    "pagination": {
      "page": 1,
      "totalPages": 5,
      "total": 100
    }
  }
}
```

---

## 💰 Wallet APIs

#### 13. Get Wallet Balance
```
GET /api/v1/app/wallet/balance
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "success": true,
  "data": {
    "coinBalance": 1000,
    "totalEarned": "150.00",
    "totalSpent": "50.00"
  }
}
```

#### 14. Wallet Transaction History
```
GET /api/v1/app/wallet/transactions?page=1&limit=20
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "transaction_id",
        "type": "call_payment",
        "amount": -30,
        "description": "Video call to John",
        "createdAt": "2025-08-31T18:57:28.250Z"
      }
    ],
    "pagination": {
      "page": 1,
      "totalPages": 5,
      "total": 100
    }
  }
}
```

#### 15. Coin Withdrawal
```
POST /api/v1/app/wallet/withdraw
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

Body:
{
  "coins": 1000,
  "accountType": "bank", // or "upi"
  "accountDetails": {
    "accountNumber": "1234567890",
    "ifscCode": "BANK0001234",
    "accountHolderName": "John Doe"
  }
}

Response:
{
  "success": true,
  "data": {
    "withdrawalId": "withdrawal_id",
    "coins": 1000,
    "rupeeAmount": "50.00",
    "conversionRate": 20,
    "status": "pending"
  }
}
```

---

## 📱 User Profile APIs

#### 16. Get User Profile
```
GET /api/v1/app/profile
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "success": true,
  "data": {
    "id": "user_id",
    "username": "+918520025559",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "/uploads/profiles/avatar.jpg",
    "gender": "male",
    "profileType": "gstar",
    "badgeLevel": 2,
    "language": "English",
    "interests": ["music", "movies"],
    "aboutMe": "Hello there!"
  }
}
```

#### 17. Update User Profile
```
PUT /api/v1/app/profile
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

Body:
{
  "name": "John Updated",
  "aboutMe": "Updated bio",
  "interests": ["music", "gaming"]
}

Response:
{
  "success": true,
  "data": {
    "id": "user_id",
    "name": "John Updated",
    "aboutMe": "Updated bio"
  }
}
```

---

## 🔔 Notification APIs

#### 18. Register FCM Token
```
POST /api/v1/app/fcm/register
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

Body:
{
  "fcmToken": "firebase_token_here"
}

Response:
{
  "success": true,
  "message": "FCM token registered successfully"
}
```

#### 19. Get Notifications
```
GET /api/v1/app/notifications?page=1&limit=20
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notification_id",
        "title": "Missed Call",
        "message": "You missed a call from John",
        "type": "call_missed",
        "isRead": false,
        "createdAt": "2025-08-31T18:57:28.250Z"
      }
    ],
    "unreadCount": 5
  }
}
```

---

## 📊 Missed Call APIs

#### 20. Get Missed Calls
```
GET /api/v1/app/missed-calls?page=1&limit=20
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "success": true,
  "data": {
    "missedCalls": [
      {
        "id": "missed_call_id",
        "callId": "call_id",
        "callerName": "John Doe",
        "callType": "video",
        "missedReason": "no_answer",
        "initiatedAt": "2025-08-31T18:57:28.250Z",
        "viewed": false
      }
    ],
    "unreadCount": 3
  }
}
```

#### 21. Mark Missed Call as Viewed
```
PATCH /api/v1/app/missed-calls/{missedCallId}/view
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "success": true,
  "message": "Missed call marked as viewed"
}
```

---

## 🛡️ User Safety APIs

#### 22. Block User
```
POST /api/v1/app/users/{userId}/block
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "success": true,
  "message": "User blocked successfully"
}
```

#### 23. Report User
```
POST /api/v1/app/users/{userId}/report
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

Body:
{
  "reason": "inappropriate_behavior",
  "description": "Details about the issue"
}

Response:
{
  "success": true,
  "message": "User reported successfully"
}
```

#### 24. Get Blocked Users
```
GET /api/v1/app/users/blocked
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "success": true,
  "data": [
    {
      "id": "user_id",
      "username": "+911234567890",
      "name": "Blocked User",
      "blockedAt": "2025-08-31T18:57:28.250Z"
    }
  ]
}
```

---

## 📈 Leaderboard APIs

#### 25. Get Leaderboard
```
GET /api/v1/app/leaderboard?type=weekly&page=1&limit=50
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "userId": "user_id",
        "username": "TopUser",
        "name": "Top User",
        "avatar": "/uploads/profiles/avatar.jpg",
        "totalEarned": "500.00",
        "callsCompleted": 25
      }
    ],
    "userRank": {
      "rank": 15,
      "totalEarned": "100.00"
    }
  }
}
```

---

## 💳 Payment APIs

#### 26. Get Coin Packages
```
GET /api/v1/app/coin-packages
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "success": true,
  "data": [
    {
      "id": "package_id",
      "name": "Starter Pack",
      "coins": 500,
      "price": "25.00",
      "currency": "INR",
      "popular": false
    }
  ]
}
```

#### 27. Create Payment Order
```
POST /api/v1/app/payment/create-order
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

Body:
{
  "packageId": "package_id"
}

Response:
{
  "success": true,
  "data": {
    "orderId": "order_id",
    "amount": "25.00",
    "currency": "INR",
    "paymentSessionId": "session_id"
  }
}
```

#### 28. Verify Payment
```
POST /api/v1/app/payment/verify
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

Body:
{
  "orderId": "order_id",
  "paymentId": "payment_id",
  "signature": "payment_signature"
}

Response:
{
  "success": true,
  "data": {
    "coinsAdded": 500,
    "newBalance": 1500,
    "transactionId": "transaction_id"
  }
}
```

---

## 🔧 Admin Panel APIs

### User Management

#### 29. Get All Users
```
GET /api/users?page=1&limit=50&search=john
Authorization: Bearer <ADMIN_TOKEN>

Response:
{
  "users": [
    {
      "id": "user_id",
      "username": "+918520025559",
      "name": "John Doe",
      "wallet": {
        "coinBalance": 1000,
        "totalEarned": "150.00"
      },
      "isBlocked": false,
      "createdAt": "2025-08-31T18:57:28.250Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "totalPages": 2
  }
}
```

#### 30. Block/Unblock User
```
PUT /api/users/{userId}/block
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

Body:
{
  "blocked": true,
  "reason": "Policy violation"
}

Response:
{
  "success": true,
  "message": "User blocked successfully"
}
```

### Wallet Management

#### 31. Add Coins to User
```
POST /api/wallet/add
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

Body:
{
  "userId": "user_id",
  "amount": 500,
  "description": "Bonus coins"
}

Response:
{
  "success": true,
  "message": "Coins added successfully",
  "newBalance": 1500
}
```

#### 32. Get Wallet Transactions
```
GET /api/wallet/transactions?page=1&limit=50
Authorization: Bearer <ADMIN_TOKEN>

Response:
{
  "transactions": [
    {
      "userId": "user_id",
      "userName": "John Doe",
      "type": "recharge",
      "amount": 500,
      "description": "Coin purchase",
      "createdAt": "2025-08-31T18:57:28.250Z"
    }
  ]
}
```

### Call Management

#### 33. Get Call Transactions
```
GET /api/call-transactions?page=1&limit=50
Authorization: Bearer <ADMIN_TOKEN>

Response:
{
  "transactions": [
    {
      "callId": "call_id",
      "caller": "John Doe",
      "receiver": "Jane Doe",
      "callType": "video",
      "duration": 120,
      "coinsDeducted": 60,
      "commission": 12,
      "createdAt": "2025-08-31T18:57:28.250Z"
    }
  ]
}
```

#### 34. Update Call Configuration
```
PUT /api/call-config
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

Body:
{
  "videoCalls": {
    "enabled": true,
    "coinsPerMinute": 35
  },
  "audioCalls": {
    "enabled": true,
    "coinsPerMinute": 8
  },
  "adminCommissionPercent": 25,
  "gstarAdminCommission": 30,
  "giconAdminCommission": 20,
  "coinToRupeeRatio": 25
}

Response:
{
  "success": true,
  "message": "Call configuration updated successfully"
}
```

---

## 📋 Error Responses

All APIs follow a consistent error response format:

```json
{
  "success": false,
  "error": "Error message here",
  "details": "Detailed error information (optional)"
}
```

### Common HTTP Status Codes:
- `200`: Success
- `400`: Bad Request / Validation Error
- `401`: Unauthorized / Invalid Token
- `403`: Forbidden / Insufficient Permissions
- `404`: Not Found
- `500`: Internal Server Error

### Common Error Messages:
- `"Invalid authentication token"` - JWT token is invalid or expired
- `"Insufficient coins for this call"` - User doesn't have enough coins
- `"User not found"` - Specified user ID doesn't exist
- `"Receiver unavailable"` - Call recipient is offline or busy
- `"Invalid OTP"` - OTP verification failed
- `"Call session not found"` - Call ID doesn't exist

---

## 🔗 Integration Notes

### Authentication
- All mobile APIs require `Authorization: Bearer <JWT_TOKEN>` header
- Admin APIs require admin JWT token
- JWT tokens expire after 30 days for mobile, 4 hours for admin

### Rate Limiting
- OTP requests: 5 per hour per phone number
- Call start: 10 per minute per user
- Gift sending: 20 per minute per user

### Pagination
- Default page size: 20 items
- Maximum page size: 100 items
- Use `page` and `limit` query parameters

### File Uploads
- Profile pictures: Max 5MB, JPG/PNG only
- Gift images: Max 2MB, JPG/PNG only

---

## 🚀 Getting Started

1. **Authentication Flow:**
   ```
   Request OTP → Verify OTP → Get JWT Token → Use in API calls
   ```

2. **Call Flow:**
   ```
   Check Feasibility → Start Call → [Call Progress] → End Call/No Answer
   ```

3. **Gift Flow:**
   ```
   Get Gift List → Send Gift → Check Transaction History
   ```

4. **Wallet Flow:**
   ```
   Get Balance → View Transactions → Withdraw (if applicable)
   ```

---

## 📞 Support

For API support or integration assistance:
- **Email**: dev@gigglebuz.com
- **Documentation**: Available at `/api-docs` (Swagger UI)
- **Status Page**: Check server status and API health

---

*Last Updated: August 31, 2025*
*API Version: v1.0*