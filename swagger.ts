import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Gigglebuz Admin & Mobile API',
    version: '2.0.0',
    description: 'Complete API documentation for Gigglebuz admin panel and mobile app endpoints including enhanced call status management, missed call handling, and commission-based gift system',
    contact: {
      name: 'Gigglebuz Team',
      email: 'support@gigglebuz.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Development server',
    },
    {
      url: 'https://giggles.anxion.co.in',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      AdminAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Admin JWT token for admin panel access',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          username: { type: 'string', example: '+919876543210' },
          name: { type: 'string', example: 'John Doe' },
          email: { type: 'string', example: 'john@example.com' },
          gender: { type: 'string', enum: ['male', 'female'], example: 'male' },
          avatar: { type: 'string', nullable: true, example: '/uploads/profiles/profile-123.jpg' },
          profileType: { type: 'string', enum: ['basic', 'gicon', 'gstar', 'both'], example: 'basic' },
          badgeLevel: { type: 'integer', minimum: 1, maximum: 10, example: 1 },
          language: { type: 'string', example: 'en' },
          dob: { type: 'string', format: 'date', nullable: true, example: '1990-05-15' },
          interests: { type: 'array', items: { type: 'string' }, example: ['technology', 'gaming'] },
          aboutMe: { type: 'string', nullable: true, example: 'Tech enthusiast and gamer' },
          isOnline: { type: 'boolean', example: true },
          isBlocked: { type: 'boolean', example: false },
          lastActive: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Wallet: {
        type: 'object',
        properties: {
          userId: { type: 'integer', example: 1 },
          coinBalance: { type: 'integer', example: 1000 },
          totalEarned: { type: 'string', example: '5000.00' },
          totalSpent: { type: 'string', example: '2000.00' },
        },
      },
      OTPRequest: {
        type: 'object',
        required: ['phoneNumber'],
        properties: {
          phoneNumber: {
            type: 'string',
            pattern: '^\\+[1-9]\\d{1,14}$',
            example: '+919876543210',
            description: 'Phone number with country code',
          },
        },
      },
      OTPVerification: {
        type: 'object',
        required: ['phoneNumber', 'otp', 'sessionId'],
        properties: {
          phoneNumber: { type: 'string', example: '+919876543210' },
          otp: { type: 'string', minLength: 6, maxLength: 6, example: '123456' },
          sessionId: { type: 'string', example: 'session-id-from-request-otp' },
        },
      },
      CompleteProfile: {
        type: 'object',
        required: ['name', 'email', 'gender'],
        properties: {
          name: { type: 'string', example: 'John Doe' },
          email: { type: 'string', format: 'email', example: 'john@example.com' },
          gender: { type: 'string', enum: ['male', 'female'], example: 'male' },
          language: { type: 'string', example: 'en' },
          dob: { type: 'string', format: 'date', example: '1990-05-15' },
          interests: { type: 'array', items: { type: 'string' }, example: ['technology', 'gaming'] },
          aboutMe: { type: 'string', example: 'Tech enthusiast and gamer' },
        },
      },
      UpdateProfile: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'John Doe' },
          email: { type: 'string', format: 'email', example: 'john@example.com' },
          gender: { type: 'string', enum: ['male', 'female'], example: 'male' },
          language: { type: 'string', example: 'en' },
          dob: { type: 'string', format: 'date', example: '1990-05-15' },
          interests: { type: 'array', items: { type: 'string' }, example: ['technology', 'gaming'] },
          aboutMe: { type: 'string', example: 'Tech enthusiast and gamer' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Error message' },
        },
      },
      Success: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
        },
      },
      CallFeasibilityRequest: {
        type: 'object',
        required: ['receiverUserId', 'callType'],
        properties: {
          receiverUserId: { type: 'string', example: '68ab7bf9f8e37d562c7938ab' },
          callType: { type: 'string', enum: ['video', 'audio'], example: 'video' },
        },
      },
      CallFeasibilityResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              canMakeCall: { type: 'boolean', example: true },
              callerBalance: { type: 'integer', example: 1000 },
              coinsPerMinute: { type: 'integer', example: 109 },
              maxDurationMinutes: { type: 'integer', example: 9 },
              callType: { type: 'string', example: 'Video Call' },
              receiverName: { type: 'string', example: 'Jane Doe' },
              receiverGender: { type: 'string', example: 'female' },
              adminCommissionPercent: { type: 'integer', example: 20 },
            },
          },
        },
      },
      SendMissedCallRequest: {
        type: 'object',
        required: ['receiverUserId', 'callType', 'missedReason'],
        properties: {
          receiverUserId: { type: 'string', example: '64f1b2c3d4e5f6g7h8i9j0k1', description: 'ID of the user who missed the call' },
          callType: { type: 'string', enum: ['video', 'audio', 'message'], example: 'video', description: 'Type of call that was missed' },
          missedReason: { type: 'string', enum: ['no_answer', 'declined', 'busy', 'offline', 'timeout'], example: 'no_answer', description: 'Reason why the call was missed' },
          waitTime: { type: 'number', example: 30, description: 'How long caller waited (in seconds)' },
          customMessage: { type: 'string', example: 'Tried calling you about the meeting', description: 'Optional custom message' },
        },
      },
      SendMissedCallResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Missed call notification sent successfully' },
          missedCall: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '64f1b2c3d4e5f6g7h8i9j0k1' },
              callId: { type: 'string', example: 'missed_1756664456789_xyz123' },
              callType: { type: 'string', example: 'video' },
              missedReason: { type: 'string', example: 'no_answer' },
              initiatedAt: { type: 'string', format: 'date-time' },
              notificationSent: { type: 'boolean', example: true },
            },
          },
          callTransaction: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '64f1b2c3d4e5f6g7h8i9j0k2' },
              callId: { type: 'string', example: 'missed_1756664456789_xyz123' },
              status: { type: 'string', example: 'failed' },
              duration: { type: 'number', example: 0 },
              totalCoins: { type: 'number', example: 0 },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      UpdateCallStatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['connected', 'ended', 'failed', 'missed'], example: 'connected', description: 'New status for the call' },
          missedReason: { type: 'string', enum: ['no_answer', 'declined', 'busy', 'offline', 'timeout'], example: 'no_answer', description: 'Required if status is missed or failed' },
          endReason: { type: 'string', example: 'caller_ended', description: 'Reason for call ending (if status is ended)' },
          metadata: { 
            type: 'object', 
            example: { "ringCount": 5, "waitTime": 30 },
            description: 'Additional metadata about the call' 
          },
        },
      },
      UpdateCallStatusResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Call status updated successfully' },
          callSession: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '64f1b2c3d4e5f6g7h8i9j0k1' },
              callId: { type: 'string', example: 'call_1756664123456_abc123' },
              status: { type: 'string', example: 'connected' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          missedCall: {
            type: 'object',
            description: 'Included if status was changed to missed',
            properties: {
              id: { type: 'string', example: '64f1b2c3d4e5f6g7h8i9j0k1' },
              callId: { type: 'string', example: 'call_1756664123456_abc123' },
              missedReason: { type: 'string', example: 'no_answer' },
              notificationSent: { type: 'boolean', example: true },
            },
          },
        },
      },
      NoAnswerRequest: {
        type: 'object',
        properties: {},
        description: 'No request body required - this is now a GET endpoint',
      },
      NoAnswerResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'No-answer missed call recorded' },
          missedCall: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '64f1b2c3d4e5f6g7h8i9j0k1' },
              callId: { type: 'string', example: 'call_1756664123456_abc123' },
              callType: { type: 'string', example: 'video' },
              missedReason: { type: 'string', example: 'no_answer' },
              initiatedAt: { type: 'string', format: 'date-time' },
              notificationSent: { type: 'boolean', example: true },
            },
          },
        },
      },
      GiftSendRequest: {
        type: 'object',
        required: ['receiverId', 'giftId', 'quantity'],
        properties: {
          receiverId: { type: 'string', example: '64f1b2c3d4e5f6g7h8i9j0k1', description: 'Female user ID (only females can receive gifts)' },
          giftId: { type: 'string', example: '64f1b2c3d4e5f6g7h8i9j0k2', description: 'MongoDB ObjectId of the gift' },
          quantity: { type: 'number', example: 2, minimum: 1, description: 'Number of gifts to send' },
          message: { type: 'string', example: 'Happy Birthday! 🎁', description: 'Optional message with the gift' },
        },
      },
      GiftSendResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Gift sent successfully' },
          transaction: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '64f1b2c3d4e5f6g7h8i9j0k1' },
              giftName: { type: 'string', example: 'Rose Bouquet' },
              giftImage: { type: 'string', example: 'https://example.com/rose.jpg' },
              quantity: { type: 'number', example: 2 },
              totalCost: { type: 'number', example: 200 },
              receiverEarning: { type: 'number', example: 150 },
              adminCommission: { type: 'number', example: 50 },
              commissionType: { type: 'string', example: 'gstar' },
              commissionRate: { type: 'string', example: '25%' },
              receiver: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: '456' },
                  name: { type: 'string', example: 'Sarah Johnson' },
                  avatar: { type: 'string', example: 'https://example.com/sarah.jpg' },
                },
              },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      CallSessionRequest: {
        type: 'object',
        required: ['receiverUserId', 'callType'],
        properties: {
          receiverUserId: { type: 'string', example: '68ab7bf9f8e37d562c7938ab' },
          callType: { type: 'string', enum: ['video', 'audio'], example: 'video' },
        },
      },
      CallSessionResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              sessionId: { type: 'string', example: 'call-session-uuid-123' },
              callType: { type: 'string', example: 'video' },
              startTime: { type: 'string', format: 'date-time' },
              coinsPerMinute: { type: 'integer', example: 109 },
              receiverName: { type: 'string', example: 'Jane Doe' },
            },
          },
        },
      },
      EndCallRequest: {
        type: 'object',
        required: ['sessionId'],
        properties: {
          sessionId: { type: 'string', example: 'call-session-uuid-123' },
        },
      },
      CallRatingRequest: {
        type: 'object',
        required: ['callId', 'ratedUserId', 'overallRating'],
        properties: {
          callId: { type: 'string', example: 'call_1756664123456_abc123' },
          ratedUserId: { type: 'string', example: '64f1b2c3d4e5f6g7h8i9j0k1' },
          overallRating: { type: 'number', minimum: 1, maximum: 5, example: 4 },
          callQuality: { type: 'number', minimum: 1, maximum: 5, example: 4 },
          userExperience: { type: 'number', minimum: 1, maximum: 5, example: 5 },
          communication: { type: 'number', minimum: 1, maximum: 5, example: 4 },
          feedback: { type: 'string', maxLength: 500, example: 'Great conversation, very friendly and helpful!' },
          tags: { 
            type: 'array', 
            items: { 
              type: 'string',
              enum: ['great_conversation', 'good_connection', 'poor_audio', 'poor_video', 'friendly', 'professional', 'helpful', 'rude', 'inappropriate', 'technical_issues', 'would_recommend', 'entertaining']
            },
            example: ['great_conversation', 'friendly', 'would_recommend']
          },
          isAnonymous: { type: 'boolean', default: false, example: false },
          reportIssue: { type: 'boolean', default: false, example: false },
          issueType: { type: 'string', enum: ['technical', 'behavior', 'content', 'other'], example: 'technical' },
          issueDescription: { type: 'string', maxLength: 200, example: 'Audio was cutting out frequently' },
        },
      },
      CallRatingResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Rating submitted successfully' },
          rating: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '64f1b2c3d4e5f6g7h8i9j0k1' },
              callId: { type: 'string', example: 'call_1756664123456_abc123' },
              overallRating: { type: 'number', example: 4 },
              callQuality: { type: 'number', example: 4 },
              userExperience: { type: 'number', example: 5 },
              communication: { type: 'number', example: 4 },
              feedback: { type: 'string', example: 'Great conversation!' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      RatingStatsResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          stats: {
            type: 'object',
            properties: {
              averageRating: { type: 'number', example: 4.2 },
              totalRatings: { type: 'number', example: 150 },
              averageCallQuality: { type: 'number', example: 4.1 },
              averageUserExperience: { type: 'number', example: 4.3 },
              averageCommunication: { type: 'number', example: 4.4 },
              ratingDistribution: {
                type: 'object',
                properties: {
                  '1': { type: 'number', example: 2 },
                  '2': { type: 'number', example: 5 },
                  '3': { type: 'number', example: 18 },
                  '4': { type: 'number', example: 65 },
                  '5': { type: 'number', example: 60 },
                },
              },
            },
          },
        },
      },
      UserProfileWithRating: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '64f1b2c3d4e5f6g7h8i9j0k1' },
          username: { type: 'string', example: '+919876543210' },
          name: { type: 'string', example: 'John Doe' },
          email: { type: 'string', example: 'john@example.com' },
          gender: { type: 'string', enum: ['male', 'female'], example: 'male' },
          avatar: { type: 'string', nullable: true, example: '/uploads/profiles/profile-123.jpg' },
          profileType: { type: 'string', enum: ['basic', 'gicon', 'gstar', 'both'], example: 'gstar' },
          badgeLevel: { type: 'integer', minimum: 1, maximum: 10, example: 3 },
          language: { type: 'string', example: 'en' },
          dob: { type: 'string', format: 'date', nullable: true, example: '1990-05-15' },
          interests: { type: 'array', items: { type: 'string' }, example: ['technology', 'gaming'] },
          aboutMe: { type: 'string', nullable: true, example: 'Tech enthusiast and gamer' },
          isOnline: { type: 'boolean', example: true },
          isBlocked: { type: 'boolean', example: false },
          lastActive: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          averageRating: { type: 'number', example: 4.2 },
          totalRatings: { type: 'number', example: 150 },
          ratingStats: {
            type: 'object',
            properties: {
              callQuality: { type: 'number', example: 4.1 },
              userExperience: { type: 'number', example: 4.3 },
              communication: { type: 'number', example: 4.4 },
              distribution: {
                type: 'object',
                properties: {
                  '1': { type: 'number', example: 2 },
                  '2': { type: 'number', example: 5 },
                  '3': { type: 'number', example: 18 },
                  '4': { type: 'number', example: 65 },
                  '5': { type: 'number', example: 60 },
                },
              },
            },
          },
          wallet: {
            type: 'object',
            properties: {
              coinBalance: { type: 'integer', example: 1500 },
              totalEarned: { type: 'string', example: '2500.00' },
              totalSpent: { type: 'string', example: '1200.00' },
            },
          },
        },
      },
      BlockUserRequest: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: {
            type: 'string',
            description: 'ID of the user to block',
            example: '68b2a35eb31115d3e464ab12',
          },
          reason: {
            type: 'string',
            description: 'Optional reason for blocking the user',
            enum: ['inappropriate_behavior', 'harassment', 'spam', 'fake_profile', 'other'],
            example: 'inappropriate_behavior',
          },
        },
      },
      BlockUserResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'User blocked successfully' },
          blockedUserId: { type: 'string', example: '68b2a35eb31115d3e464ab12' },
          blockedAt: { type: 'string', format: 'date-time', example: '2025-09-03T04:44:44.218Z' },
        },
      },
      UnblockUserRequest: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: {
            type: 'string',
            description: 'ID of the user to unblock',
            example: '68b2a35eb31115d3e464ab12',
          },
        },
      },
      UnblockUserResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'User unblocked successfully' },
          unblockedUserId: { type: 'string', example: '68b2a35eb31115d3e464ab12' },
          unblockedAt: { type: 'string', format: 'date-time', example: '2025-09-03T04:44:58.101Z' },
        },
      },
      BlockedUser: {
        type: 'object',
        properties: {
          userId: { type: 'string', example: '68b2a35eb31115d3e464ab12' },
          name: { type: 'string', example: 'John Doe' },
          username: { type: 'string', example: '+919876543210' },
          avatar: { 
            type: 'string', 
            nullable: true, 
            example: '/uploads/profiles/profile-123.jpg' 
          },
          blockedAt: { 
            type: 'string', 
            format: 'date-time', 
            example: '2025-09-03T04:44:43.977Z' 
          },
          reason: { 
            type: 'string', 
            nullable: true, 
            example: 'inappropriate_behavior' 
          },
        },
      },
      BlockedUsersResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/BlockedUser' },
          },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 20 },
              total: { type: 'integer', example: 5 },
              hasMore: { type: 'boolean', example: false },
            },
          },
        },
      },
    },
  },
  tags: [
    {
      name: 'Mobile Auth',
      description: 'Mobile app authentication endpoints',
    },
    {
      name: 'Mobile Profile',
      description: 'Mobile app user profile management',
    },
    {
      name: 'Admin Auth',
      description: 'Admin panel authentication',
    },
    {
      name: 'Admin Users',
      description: 'Admin panel user management',
    },
    {
      name: 'Admin Wallet',
      description: 'Admin panel wallet management',
    },
    {
      name: 'Mobile Calls',
      description: 'Mobile app call management endpoints including transactions, history, and active sessions',
    },
    {
      name: 'Mobile Gifts',
      description: 'Mobile app gift sending and receiving',
    },
    {
      name: 'Mobile Ratings',
      description: 'Mobile app call rating and user rating statistics',
    },
  ],
};

const options = {
  definition: swaggerDefinition,
  apis: ['./server/mobileRoutes.ts', './server/routes.ts'], // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  // Swagger page
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Gigglebuz API Documentation',
  }));

  // JSON endpoint for the swagger specs
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log('Swagger documentation available at /api-docs');
};