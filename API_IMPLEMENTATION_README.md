# SBC Web UI - API Implementation

## Recent Updates

The implementation has been updated based on the latest API documentation changes:

### Key Updates:
1. **Payment URL**: Updated to `https://sniperbuisnesscenter.com/api/payment/`
2. **Enhanced Authentication Flow**: Improved OTP verification with sessionStorage
3. **User Products Endpoint**: Changed from `/users/get-products` to `/products/user`
4. **Subscription Endpoints**: Updated to use `/subscriptions/me` for current subscription
5. **Enhanced Withdrawal System**: New payout system with `/withdrawals/user`
6. **Avatar Upload**: Added Base64 support for web applications
7. **New Endpoints**: Added support, file management, and currency conversion

### New Components:
- **CurrencyConverter**: Multi-currency conversion component
- **WithdrawalComponent**: Enhanced withdrawal with 9-country support
- **Enhanced Authentication**: sessionStorage integration for OTP flows

---

This document describes the comprehensive API implementation for the SBC (Sniper Business Center) web application.

## Overview

The API implementation provides a complete integration with the SBC microservices backend, offering all the functionality available in the Flutter mobile application. The implementation follows React/TypeScript best practices and provides a robust, type-safe interface to the backend services.

## Architecture

### Core Components

1. **ApiResponse Class** (`src/services/ApiResponse.ts`)
   - Handles consistent API response parsing
   - Provides success/error state management
   - Compatible with Flutter ApiResponse structure

2. **ApiService Class** (`src/services/ApiService.ts`)
   - Base HTTP client with GET, POST, PUT, DELETE methods
   - File upload support
   - Error handling and network retry logic

3. **SBCApiService Class** (`src/services/SBCApiService.ts`)
   - Comprehensive API methods for all endpoints
   - Extends base ApiService
   - Implements all documented API endpoints

4. **AuthContext** (`src/contexts/AuthContext.tsx`)
   - React context for authentication state
   - User management and session handling
   - Automatic token management

5. **Custom Hooks** (`src/hooks/useApi.ts`)
   - Reusable hooks for common API operations
   - Loading and error state management
   - Automatic data fetching

### API Coverage

The implementation covers all 7 microservices:

#### 1. User Service
- ✅ Authentication (login, register, OTP verification)
- ✅ Profile management
- ✅ Password reset
- ✅ Email management
- ✅ Referral system

#### 2. Payment Service
- ✅ Payment intents
- ✅ Transaction history
- ✅ Payment processing

#### 3. Product Service
- ✅ Product CRUD operations
- ✅ Product search and filtering
- ✅ Product ratings
- ✅ Flash sales management

#### 4. Settings Service
- ✅ App settings
- ✅ File uploads (logo, documents)
- ✅ Event management

#### 5. Tombola Service
- ✅ Tombola viewing
- ✅ Ticket purchasing
- ✅ Winner information

#### 6. Advertising Service
- ✅ Advertising packs
- ✅ Advertisement creation and management

#### 7. Notification Service
- ✅ User notifications
- ✅ Notification statistics

### Additional Features

#### Payout System
- ✅ Multi-country withdrawal support (9 African countries)
- ✅ Mobile money integration
- ✅ Automatic operator detection
- ✅ Real-time transaction status

#### Contact Management
- ✅ Contact search and filtering
- ✅ Contact export functionality

#### Subscription Management
- ✅ Subscription plans
- ✅ Purchase and upgrade flows
- ✅ Active/expired subscription tracking

## File Structure

```
src/
├── services/
│   ├── ApiResponse.ts          # Response handling class
│   ├── ApiService.ts           # Base HTTP client
│   └── SBCApiService.ts        # Complete API implementation
├── contexts/
│   └── AuthContext.tsx         # Authentication context
├── hooks/
│   └── useApi.ts              # Custom API hooks
├── utils/
│   └── apiHelpers.ts          # Helper functions
├── types/
│   └── api.ts                 # TypeScript type definitions
└── components/
    ├── common/
    │   └── ProtectedRoute.tsx  # Route protection
    └── ApiTestComponent.tsx    # API testing component
```

## Usage Examples

### Authentication

```typescript
import { useAuth } from '../contexts/AuthContext';

const LoginComponent = () => {
  const { login, loading } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    try {
      await login(email, password);
      // User is now authenticated
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
};
```

### API Calls

```typescript
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';

const ProductComponent = () => {
  const [products, setProducts] = useState([]);

  const fetchProducts = async () => {
    try {
      const response = await sbcApiService.getProducts();
      const data = handleApiResponse(response);
      setProducts(data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };
};
```

### Using Custom Hooks

```typescript
import { useProducts } from '../hooks/useApi';

const MarketplaceComponent = () => {
  const { data: products, loading, error, refetch } = useProducts({
    category: 'electronics',
    search: 'laptop'
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {products?.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=https://sniperbuisnesscenter.com/api
VITE_PAYMENT_URL=https://sniperbuisnesscenter.com/payment/
```

### Development URLs

For local development, you can use:

```env
VITE_API_BASE_URL=http://127.0.0.1:3000/api
# or
VITE_API_BASE_URL=http://192.168.225.234:5000/api
```

## Error Handling

The implementation provides comprehensive error handling:

1. **Network Errors**: Automatic detection and user-friendly messages
2. **Authentication Errors**: Automatic token refresh and login redirect
3. **Validation Errors**: Server-side validation error display
4. **Rate Limiting**: Graceful handling of rate limit responses

## Security Features

1. **JWT Token Management**: Automatic token storage and refresh
2. **Protected Routes**: Authentication-required route protection
3. **Input Validation**: Client-side validation before API calls
4. **CORS Handling**: Proper cross-origin request handling

## Testing

### API Test Component

Use the included `ApiTestComponent` to test API endpoints:

```typescript
import ApiTestComponent from '../components/ApiTestComponent';

// Add to any page for testing
<ApiTestComponent />
```

### Manual Testing

1. Test authentication flow (register → OTP → login)
2. Test product operations (create, read, update, delete)
3. Test file uploads (avatar, product images)
4. Test payment flows
5. Test withdrawal system

## Performance Optimizations

1. **Request Debouncing**: Search queries are debounced to reduce API calls
2. **Caching**: Response caching for frequently accessed data
3. **Lazy Loading**: Components and data loaded on demand
4. **Error Boundaries**: Graceful error handling without app crashes

## Mobile Money Integration

The withdrawal system supports 9 African countries with automatic operator detection:

- 🇨🇲 Cameroon (MTN, Orange)
- 🇨🇮 Côte d'Ivoire (Orange, MTN, Moov, Wave)
- 🇸🇳 Senegal (Orange, Free, Wave)
- 🇹🇬 Togo (T-Money, Flooz)
- 🇧🇯 Benin (MTN, Moov)
- 🇲🇱 Mali (Orange, Moov)
- 🇧🇫 Burkina Faso (Orange, Moov)
- 🇬🇳 Guinea (Orange, MTN)
- 🇨🇩 Congo RDC (Orange, M-Pesa, Airtel)

## Next Steps

1. **Add more custom hooks** for specific use cases
2. **Implement offline support** with service workers
3. **Add real-time features** with WebSocket integration
4. **Enhance error reporting** with crash analytics
5. **Add performance monitoring** for API calls

## Support

For issues or questions about the API implementation:

1. Check the console for detailed error logs
2. Verify environment configuration
3. Test with the API test component
4. Review the API documentation for endpoint details

## Contributing

When adding new API endpoints:

1. Add the method to `SBCApiService.ts`
2. Create corresponding TypeScript types in `types/api.ts`
3. Add custom hooks if needed in `hooks/useApi.ts`
4. Update this documentation
5. Test thoroughly with the test component
