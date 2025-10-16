# Gigglebuz Admin Panel & Mobile API

## Overview

Gigglebuz is a mobile application platform with a MERN stack admin panel for managing user interactions, virtual economy, and content moderation. It supports a gift-based social platform with features like coin packages, virtual gifts, leaderboards, and real-time chat. The admin panel provides comprehensive oversight and management for all platform operations, including profile picture approvals, call transaction tracking, and dynamic configuration of the virtual economy. The project aims to provide a robust, scalable, and secure platform for social interaction and content monetization.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Component-based UI using functional components and hooks.
- **Tailwind CSS + shadcn/ui**: Utility-first styling with a pre-built component library.
- **Wouter**: Lightweight routing.
- **React Query (TanStack Query)**: Server state management with caching.
- **React Hook Form + Zod**: Type-safe form handling and validation.

### Backend Architecture
- **Express.js with TypeScript**: RESTful API server.
- **MongoDB with Mongoose**: Document-based database.
- **JWT Authentication**: Stateless authentication for admin and mobile app users.
- **Firebase Admin SDK**: Real-time synchronization and push notifications.
- **Swagger/OpenAPI**: Auto-generated API documentation.

### Authentication & Security
- **Admin Panel**: Username/password authentication with JWT.
- **Mobile App**: Phone number OTP verification via 2Factor API with a bypass for testing.
- **Role-based Access Control**: Permission levels for admin operations.
- **Rate Limiting**: Protection on sensitive endpoints.

### Data Storage Solutions
- **MongoDB Atlas**: Primary database for user profiles, transactions, gifts, and admin data.
- **Firebase Firestore**: Real-time user status synchronization and live updates.
- **In-memory Caching**: For frequently accessed data.
- **File Upload System**: Multer-based storage for profile pictures and gift images.

### API Architecture
- **Admin API**: CRUD operations for user management, financial operations, content moderation, call configuration.
- **Mobile API**: User-facing endpoints for authentication, wallet, gifts, leaderboards.
- **Dual Route System**: Separate route handlers for admin (`/api/*`) and mobile (`/api/v1/app/*`).
- **Call Management System**: Three-endpoint API for call feasibility, session management, and payment processing with gender-based logic and real-time wallet operations.
- **Call Configuration**: Admin-configurable pricing and multiple commission settings (Admin, Gstar, Gicon) with real-time Firebase sync.
- **Gift System**: Supports gift sending (male to female) with automatic commission calculations and wallet transactions.
- **Profile Picture Approval**: Workflow requiring admin review before profile updates, with Firebase sync.
- **Missed Call Management**: Comprehensive tracking, notifications, and integration with call start endpoint for unavailability detection.
- **Push Notification System**: FCM for call events, wallet transactions, and other real-time alerts.
- **Admin-Configurable Coin Conversion**: Dynamic coin-to-rupee ratio for withdrawals, controlled via the admin panel.

## External Dependencies

### Third-party Services
- **2Factor API**: SMS OTP delivery.
- **Firebase Cloud Messaging (FCM)**: Push notifications.
- **MongoDB Atlas**: Cloud-hosted MongoDB.

### Database & Storage
- **MongoDB**: Primary data store.
- **Firebase Firestore**: Real-time data synchronization.

### Authentication & Communication
- **JSON Web Tokens (JWT)**: Session management.
- **bcryptjs**: Password hashing.
- **Firebase Admin SDK**: Server-side Firebase operations.