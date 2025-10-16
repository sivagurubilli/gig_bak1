# OTP Bypass Implementation for Testing

## Overview
Implemented a comprehensive OTP bypass system for the phone number `8520025559` to facilitate mobile app testing without requiring actual SMS verification.

## Features Implemented

### 1. Phone Number Format Support
The bypass system automatically handles multiple phone number formats:
- `8520025559` (basic format)
- `918520025559` (with country code)  
- `+918520025559` (international format)

### 2. Bypass Logic

#### Request OTP Endpoint (`/api/v1/app/auth/request-otp`)
- Checks for bypass numbers **before** schema validation
- Normalizes different phone formats to standard `+918520025559`
- Creates mock session with bypass identifier
- Returns success response without calling 2Factor API
- Includes `"bypass": true` flag for testing identification

#### Verify OTP Endpoint (`/api/v1/app/auth/verify-otp`)
- Accepts **any 6-digit OTP** for bypass numbers
- Skips actual OTP verification with 2Factor API
- Normalizes phone number format for session lookup
- Proceeds with normal user authentication flow

### 3. Configuration
```javascript
const BYPASS_PHONE_NUMBERS = ['+918520025559', '8520025559', '918520025559'];
```

## Usage Examples

### Request OTP (any format works)
```bash
curl -X POST http://localhost:5000/api/v1/app/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "8520025559"}'
```

Response:
```json
{
  "success": true,
  "message": "OTP sent successfully (bypass mode)",
  "sessionKey": "+918520025559_1755774346462_bypass",
  "sessionId": "bypass_1755774346462",
  "expiresIn": 600,
  "bypass": true
}
```

### Verify OTP (any OTP accepted)
```bash
curl -X POST http://localhost:5000/api/v1/app/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "8520025559", "otp": "123456", "sessionId": "bypass_1755774346462"}'
```

Response: Normal login success with JWT token and user data.

## Security Considerations
- Bypass is hardcoded to specific number only
- Only works in development environment
- Clear logging indicates when bypass mode is active
- Mock sessions have same expiration as regular OTP sessions (10 minutes)

## Testing Verified
✅ Format `8520025559` - Working  
✅ Format `918520025559` - Working  
✅ Format `+918520025559` - Working  
✅ Any OTP accepted for verification  
✅ Full authentication flow completes successfully  
✅ JWT token generation works  
✅ User data returned correctly  

## Documentation Updated
- `replit.md` updated with bypass information
- System architecture documentation reflects new bypass functionality

The OTP bypass system is now fully functional and ready for mobile app testing!