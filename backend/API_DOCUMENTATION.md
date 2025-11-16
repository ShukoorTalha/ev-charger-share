# EvChargerShare API Documentation

This document provides comprehensive documentation for the EvChargerShare backend API endpoints.

## Base URL

All API endpoints are relative to the base URL:

- Development: `http://localhost:5000/api`
- Production: `https://api.evchargershare.com/api` (example)

## Authentication

Most endpoints require authentication using JSON Web Tokens (JWT).

### Authentication Header

```
Authorization: Bearer <token>
```

### Obtaining a Token

To obtain a token, use the login endpoint:

```
POST /api/auth/login
```

## Common Response Format

All API responses follow a standard format:

```json
{
  "success": true|false,
  "data": { ... },  // For successful responses
  "error": { ... }  // For error responses
}
```

## Error Handling

Error responses include:

```json
{
  "success": false,
  "error": {
    "statusCode": 400,
    "message": "Error message"
  }
}
```

## API Endpoints

### Authentication

#### Register User

```
POST /api/auth/register
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "role": "user" // Optional, defaults to "user"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "60d21b4667d0d8992e610c85",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "role": "user",
      "isEmailVerified": false,
      "createdAt": "2023-07-16T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Login

```
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "60d21b4667d0d8992e610c85",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "role": "user",
      "isEmailVerified": true,
      "createdAt": "2023-07-16T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Forgot Password

```
POST /api/auth/forgot-password
```

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password reset email sent"
  }
}
```

#### Reset Password

```
POST /api/auth/reset-password/:token
```

**Request Body:**
```json
{
  "password": "newSecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password reset successful"
  }
}
```

#### Verify Email

```
GET /api/auth/verify-email/:token
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Email verified successfully"
  }
}
```

#### Resend Verification Email

```
POST /api/auth/resend-verification
```

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Verification email sent"
  }
}
```

### User Management

#### Get Current User Profile

```
GET /api/users/me
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "60d21b4667d0d8992e610c85",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "role": "user",
      "isEmailVerified": true,
      "createdAt": "2023-07-16T12:00:00.000Z",
      "profile": {
        "phoneNumber": "1234567890",
        "address": "123 Main St",
        "city": "San Francisco",
        "state": "CA",
        "zipCode": "94105",
        "country": "USA"
      }
    }
  }
}
```

#### Update Current User Profile

```
PUT /api/users/me
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "profile": {
    "phoneNumber": "9876543210",
    "address": "456 Market St",
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94105",
    "country": "USA"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "60d21b4667d0d8992e610c85",
      "firstName": "John",
      "lastName": "Smith",
      "email": "john@example.com",
      "role": "user",
      "isEmailVerified": true,
      "createdAt": "2023-07-16T12:00:00.000Z",
      "profile": {
        "phoneNumber": "9876543210",
        "address": "456 Market St",
        "city": "San Francisco",
        "state": "CA",
        "zipCode": "94105",
        "country": "USA"
      }
    }
  }
}
```

#### Change Password

```
PUT /api/users/password
```

**Request Body:**
```json
{
  "currentPassword": "securePassword123",
  "newPassword": "evenMoreSecurePassword456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password updated successfully"
  }
}
```

#### Get User by ID

```
GET /api/users/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "60d21b4667d0d8992e610c85",
      "firstName": "John",
      "lastName": "Smith",
      "email": "john@example.com",
      "role": "user",
      "isEmailVerified": true,
      "createdAt": "2023-07-16T12:00:00.000Z"
    }
  }
}
```

### Charger Management

#### Create Charger

```
POST /api/chargers
```

**Request Body:**
```json
{
  "name": "Home Tesla Charger",
  "description": "Level 2 Tesla charger in garage",
  "chargerType": "Level 2",
  "plugType": "Tesla",
  "power": 7.7,
  "voltage": 240,
  "amperage": 32,
  "pricePerKwh": 0.25,
  "pricePerHour": 5.00,
  "minimumChargingTime": 1,
  "maximumChargingTime": 8,
  "location": {
    "address": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94105",
    "country": "USA",
    "coordinates": {
      "latitude": 37.7749,
      "longitude": -122.4194
    }
  },
  "availability": {
    "monday": [{ "start": "08:00", "end": "20:00" }],
    "tuesday": [{ "start": "08:00", "end": "20:00" }],
    "wednesday": [{ "start": "08:00", "end": "20:00" }],
    "thursday": [{ "start": "08:00", "end": "20:00" }],
    "friday": [{ "start": "08:00", "end": "20:00" }],
    "saturday": [{ "start": "10:00", "end": "18:00" }],
    "sunday": [{ "start": "10:00", "end": "18:00" }]
  },
  "photos": ["base64encodedimage1", "base64encodedimage2"],
  "amenities": ["Restroom", "WiFi", "Parking"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "charger": {
      "_id": "60d21b4667d0d8992e610c86",
      "owner": "60d21b4667d0d8992e610c85",
      "name": "Home Tesla Charger",
      "description": "Level 2 Tesla charger in garage",
      "chargerType": "Level 2",
      "plugType": "Tesla",
      "power": 7.7,
      "voltage": 240,
      "amperage": 32,
      "pricePerKwh": 0.25,
      "pricePerHour": 5.00,
      "minimumChargingTime": 1,
      "maximumChargingTime": 8,
      "location": {
        "address": "123 Main St",
        "city": "San Francisco",
        "state": "CA",
        "zipCode": "94105",
        "country": "USA",
        "coordinates": {
          "latitude": 37.7749,
          "longitude": -122.4194
        }
      },
      "availability": {
        "monday": [{ "start": "08:00", "end": "20:00" }],
        "tuesday": [{ "start": "08:00", "end": "20:00" }],
        "wednesday": [{ "start": "08:00", "end": "20:00" }],
        "thursday": [{ "start": "08:00", "end": "20:00" }],
        "friday": [{ "start": "08:00", "end": "20:00" }],
        "saturday": [{ "start": "10:00", "end": "18:00" }],
        "sunday": [{ "start": "10:00", "end": "18:00" }]
      },
      "photos": ["url1", "url2"],
      "amenities": ["Restroom", "WiFi", "Parking"],
      "status": "pending",
      "createdAt": "2023-07-16T12:00:00.000Z",
      "updatedAt": "2023-07-16T12:00:00.000Z"
    }
  }
}
```

For more endpoints and detailed documentation, please refer to the full API documentation in the project repository.

## Settings API

### Get Public Settings

```
GET /api/settings/public
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment": {
      "platformFeePercentage": 10,
      "stripeFeePercentage": 2.9,
      "stripeFeeFixed": 0.30
    },
    "booking": {
      "minBookingDuration": 30,
      "maxBookingDuration": 480,
      "cancellationPolicy": "Cancellations made more than 24 hours in advance receive a full refund."
    },
    "user": {
      "verificationRequired": true
    }
  }
}
```

### Get Public Settings by Category

```
GET /api/settings/public/:category
```

**Response:**
```json
{
  "success": true,
  "data": {
    "platformFeePercentage": 10,
    "stripeFeePercentage": 2.9,
    "stripeFeeFixed": 0.30
  }
}
```

## Notification API

### Get User Notifications

```
GET /api/notifications?page=1&limit=10&read=false
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "60d21b4667d0d8992e610c87",
        "user": "60d21b4667d0d8992e610c85",
        "title": "Booking Confirmed",
        "message": "Your booking #12345 has been confirmed",
        "type": "booking",
        "read": false,
        "entityId": "60d21b4667d0d8992e610c88",
        "createdAt": "2023-07-16T12:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 10,
      "pages": 1
    }
  }
}
```

### Mark Notification as Read

```
PUT /api/notifications/:id/read
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notification": {
      "_id": "60d21b4667d0d8992e610c87",
      "user": "60d21b4667d0d8992e610c85",
      "title": "Booking Confirmed",
      "message": "Your booking #12345 has been confirmed",
      "type": "booking",
      "read": true,
      "entityId": "60d21b4667d0d8992e610c88",
      "createdAt": "2023-07-16T12:00:00.000Z",
      "updatedAt": "2023-07-16T13:00:00.000Z"
    }
  }
}
```

### Mark All Notifications as Read

```
PUT /api/notifications/read-all
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "All notifications marked as read",
    "count": 5
  }
}
```

### Delete Notification

```
DELETE /api/notifications/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Notification deleted successfully"
  }
}
```

### Delete All Read Notifications

```
DELETE /api/notifications/read
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "All read notifications deleted",
    "count": 3
  }
}
```
