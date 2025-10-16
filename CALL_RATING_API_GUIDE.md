# Call Rating API Guide

## Overview
Comprehensive call rating system that allows users to rate their call experience after every call ends. Includes detailed feedback, tags, and statistics tracking.

## API Endpoints

### 1. Submit Call Rating
**Endpoint:** `POST /api/v1/app/call/rating/submit`
**Authentication:** Bearer token required

**Purpose:** Submit a detailed rating after a call ends

**Request Body:**
```json
{
  "callId": "call_1756669399537_ifq1y39bk",
  "ratedUserId": "6858e993009f812d3916054a",
  "overallRating": 5,
  "callQuality": 4,
  "userExperience": 5,
  "communication": 5,
  "feedback": "Excellent call quality and great conversation!",
  "tags": ["great_conversation", "friendly", "would_recommend"],
  "isAnonymous": false,
  "reportIssue": false,
  "issueType": "technical",
  "issueDescription": "Brief audio delay at start"
}
```

**Required Fields:**
- `callId`: ID of the call being rated
- `ratedUserId`: ID of the other user in the call
- `overallRating`: Overall rating (1-5 stars)

**Optional Fields:**
- `callQuality`: Audio/video quality rating (1-5)
- `userExperience`: User interaction rating (1-5)
- `communication`: Communication effectiveness (1-5)
- `feedback`: Written feedback (max 500 characters)
- `tags`: Descriptive tags from predefined list
- `isAnonymous`: Keep rating anonymous (default: false)
- `reportIssue`: Report a problem (default: false)
- `issueType`: Type of issue (technical, behavior, content, other)
- `issueDescription`: Issue description (max 200 characters)

**Available Tags:**
- `great_conversation`
- `good_connection`
- `poor_audio`
- `poor_video`
- `friendly`
- `professional`
- `helpful`
- `rude`
- `inappropriate`
- `technical_issues`
- `would_recommend`
- `entertaining`

**Response:**
```json
{
  "success": true,
  "message": "Rating submitted successfully",
  "rating": {
    "id": "rating_id_here",
    "callId": "call_1756669399537_ifq1y39bk",
    "overallRating": 5,
    "feedback": "Excellent call quality and great conversation!",
    "tags": ["great_conversation", "friendly", "would_recommend"],
    "isAnonymous": false,
    "createdAt": "2025-08-31T20:15:00.000Z"
  }
}
```

### 2. Get Call Rating
**Endpoint:** `GET /api/v1/app/call/rating/{callId}`
**Authentication:** Bearer token required

**Purpose:** Retrieve your rating for a specific call

**Response:**
```json
{
  "success": true,
  "rating": {
    "id": "rating_id",
    "callId": "call_1756669399537_ifq1y39bk",
    "overallRating": 5,
    "callQuality": 4,
    "userExperience": 5,
    "communication": 5,
    "feedback": "Great conversation!",
    "tags": ["friendly", "great_conversation"],
    "createdAt": "2025-08-31T20:15:00.000Z"
  }
}
```

### 3. Get User Ratings
**Endpoint:** `GET /api/v1/app/profile/ratings?page=1&limit=20`
**Authentication:** Bearer token required

**Purpose:** Get all ratings received by the current user

**Response:**
```json
{
  "success": true,
  "data": {
    "ratings": [
      {
        "id": "rating_id",
        "callId": "call_id",
        "overallRating": 5,
        "feedback": "Great user!",
        "tags": ["friendly", "professional"],
        "raterUserId": {
          "name": "John Doe",
          "avatar": "/uploads/profiles/avatar.jpg"
        },
        "createdAt": "2025-08-31T20:15:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "totalPages": 2,
      "hasMore": true
    },
    "stats": {
      "totalRatings": 25,
      "averageRating": 4.2,
      "ratingDistribution": {
        "1": 0,
        "2": 1,
        "3": 4,
        "4": 10,
        "5": 10
      }
    }
  }
}
```

### 4. Get Rating Statistics
**Endpoint:** `GET /api/v1/app/profile/rating-stats`
**Authentication:** Bearer token required

**Purpose:** Get summary statistics for user's ratings

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalRatings": 25,
    "averageRating": 4.2,
    "ratingDistribution": {
      "1": 0,
      "2": 1,
      "3": 4,
      "4": 10,
      "5": 10
    },
    "averageCallQuality": 4.1,
    "averageUserExperience": 4.3,
    "averageCommunication": 4.4,
    "topTags": [
      {
        "tag": "friendly",
        "count": 15
      },
      {
        "tag": "great_conversation",
        "count": 12
      },
      {
        "tag": "would_recommend",
        "count": 8
      }
    ],
    "recentRatings": [
      {
        "rating": 5,
        "feedback": "Excellent call!",
        "createdAt": "2025-08-31T20:15:00.000Z"
      }
    ]
  }
}
```

## Mobile App Integration

### After Call End Flow
1. Call ends successfully
2. Show rating modal/screen
3. User submits rating via `POST /api/v1/app/call/rating/submit`
4. Show success message
5. Optional: Display thank you message

### Rating UI Components
- **Star Rating**: 1-5 stars for overall rating
- **Detailed Ratings**: Optional call quality, user experience, communication
- **Tag Selection**: Checkboxes/chips for predefined tags
- **Feedback**: Text area for written feedback
- **Anonymous Option**: Toggle for anonymous rating
- **Report Issue**: Option to report problems

### User Profile Integration
- **Rating Display**: Show average rating and total ratings on profile
- **Rating History**: List of received ratings with pagination
- **Statistics**: Rating distribution chart, top tags, averages

## Features

### Rating System
- **1-5 Star Scale**: Standard rating system
- **Multiple Dimensions**: Rate different aspects separately
- **Written Feedback**: Optional detailed comments
- **Tag System**: Quick descriptive feedback
- **Anonymous Option**: Privacy protection

### Statistics & Analytics
- **Average Rating**: Calculated automatically
- **Rating Distribution**: Breakdown by star rating
- **Category Averages**: Call quality, user experience, communication
- **Top Tags**: Most common feedback tags
- **Recent Feedback**: Latest ratings for quick review

### Notifications
- **Rating Received**: Notify users when they receive new ratings
- **Anonymous Support**: Protect rater identity when requested
- **Firebase Integration**: Real-time notification delivery

### Data Management
- **Update Support**: Users can modify their ratings
- **Duplicate Prevention**: One rating per user per call
- **Real-time Updates**: Average ratings updated immediately
- **Firebase Sync**: Rating data synchronized for mobile access

## Validation & Security

### Input Validation
- Rating values must be 1-5
- Required fields enforced
- Text length limits enforced
- Call participation verified

### Security Features
- **Call Verification**: Verify user was part of the call
- **Participant Validation**: Ensure rated user was the other participant
- **Rate Limiting**: Prevent spam ratings
- **Anonymous Protection**: Optional identity protection

### Error Handling
- Invalid call ID
- User not part of call
- Invalid rated user
- Duplicate ratings (updates existing)
- Network errors

## Usage Examples

### Submit Rating (JavaScript)
```javascript
const rating = await fetch('/api/v1/app/call/rating/submit', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    callId: 'call_123456789',
    ratedUserId: 'user_987654321',
    overallRating: 5,
    callQuality: 4,
    userExperience: 5,
    feedback: 'Great conversation!',
    tags: ['friendly', 'great_conversation']
  })
});

const result = await rating.json();
console.log('Rating submitted:', result.rating);
```

### Get User Rating Stats (JavaScript)
```javascript
const response = await fetch('/api/v1/app/profile/rating-stats', {
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});

const { stats } = await response.json();
console.log(`Average rating: ${stats.averageRating} (${stats.totalRatings} ratings)`);
```

## Database Schema

### CallRating Model
```javascript
{
  callId: String,           // Unique call identifier
  raterUserId: String,      // User who gave the rating
  ratedUserId: String,      // User who received the rating
  callType: String,         // video, audio, message
  overallRating: Number,    // 1-5 stars
  callQuality: Number,      // Optional 1-5 rating
  userExperience: Number,   // Optional 1-5 rating
  communication: Number,    // Optional 1-5 rating
  feedback: String,         // Optional text feedback
  tags: [String],          // Array of predefined tags
  isAnonymous: Boolean,     // Anonymous rating flag
  callDuration: Number,     // Call duration in seconds
  reportIssue: Boolean,     // Issue reported flag
  issueType: String,        // Type of issue
  issueDescription: String, // Issue description
  createdAt: Date,          // Rating creation time
  updatedAt: Date           // Last update time
}
```

## Integration Points

### Call End Integration
- Automatically trigger rating prompt after call ends
- Pre-fill call duration and type information
- Link rating to specific call session

### User Profile Integration
- Display average rating on user profiles
- Show rating history and statistics
- Update user rating in real-time

### Notification System
- Send push notifications for new ratings
- Integrate with existing notification system
- Support anonymous and named notifications

---

**Implementation Status:** ✅ Complete
**API Version:** v1.0
**Last Updated:** August 31, 2025