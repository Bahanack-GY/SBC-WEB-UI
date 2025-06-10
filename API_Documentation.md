# SBC Microservices API Documentation

This document outlines the API endpoints provided by the various microservices within the Sniper Business Center (SBC) project.

## General Conventions

*   **Base Path:** All client-facing API routes are proxied through an API gateway. The base path for all service APIs is `/api`.
*   **Authentication:**
    *   Routes requiring user authentication use a Bearer token (JWT) in the `Authorization` header.
*   **Response Format:**
    *   **Success:** Consistent format: `{ success: true, data: {...} }` or `{ success: true, message: '...', data: {...} }`.
    *   **Error:** Consistent format: `{ success: false, message: '...', errors: [...] }` or `{ success: false, error: '...' }`. Appropriate HTTP status codes (4xx, 500) are used.
*   **Rate Limiting:** Various rate limiters are applied to specific endpoints to prevent abuse.
*   **Input Validation:** Request bodies and parameters are validated at the controller level.

## API Gateway Routing

The API Gateway routes incoming requests to the appropriate microservice based on the path prefix.
| Path Prefix             | Target Service        | Notes                                         |
| :---------------------- | :-------------------- | :-------------------------------------------- |
| `/api/users`            | `user-service`        | User registration, login, profile, etc.       |
| `/api/subscriptions`    | `user-service`        | Subscription management                       |
| `/api/contacts`         | `user-service`        | Contact searching and exporting             |
| `/api/payments`         | `payment-service`     | Payment intents and processing              |
| `/api/transactions`     | `payment-service`     | User transaction history and initiation     |
| `/api/products`         | `product-service`     | Product creation, search, ratings           |
| `/api/flash-sales`      | `product-service`     | Flash sale creation and management          |
| `/api/settings`         | `settings-service`    | Site settings and file uploads              |
| `/api/events`           | `settings-service`    | Event management                            |
| `/api/tombola`          | `tombola-service`     | Tombola viewing and ticket purchase         |
| `/api/advertising`      | `advertising-service` | Ad packs and ad creation                    |
| `/api/notifications`    | `notification-service`| User notifications                          |

## Endpoints by Service

---

### 1. User Service (`user-service`)

Handles user identity, profiles, authentication, subscriptions, referrals, and contacts.

**Base Path (Conceptual):** `/api` (Routed via Gateway)

**Route Files:**

*   `user.routes.ts`
*   `admin.routes.ts`
*   `subscription.routes.ts`
*   `contact.routes.ts`
*   `daily-withdrawal.routes.ts`

**Endpoints:**

| Method | Path                                      | Description                                         | Auth       | Middleware/Limiter          |
| :----- | :---------------------------------------- | :-------------------------------------------------- | :--------- | :-------------------------- |
| POST   | `/users/register`                         | Register a new user                                 | Public     | `mediumLimiter`             |
| POST   | `/users/login`                            | Log in a user                                       | Public     | `strictLimiter`             |
| POST   | `/users/verify-otp`                       | Verify OTP for registration/login                   | Public     | `strictLimiter`             |
| GET    | `/users/get-affiliation`                  | Get user info by referral code                      | Public     |                             |
| GET    | `/users/avatar/:fileId`                   | Get user avatar image (proxied)                     | Public     |                             |
| GET    | `/users/me`                               | Get current user's profile                          | User       | `generalLimiter`            |
| POST   | `/users/logout`                           | Log out the current user                            | User       | `generalLimiter`            |
| GET    | `/users/affiliator`                       | Get the user who referred the current user          | User       | `generalLimiter`            |
| PUT    | `/users/me`                               | Update current user's profile                       | User       | `generalLimiter`            |
| PUT    | `/users/me/avatar`                        | Upload/Update current user's avatar               | User       | `uploadLimiter`, `uploadAvatar` |
| GET    | `/users/get-refered-users`                | Get users referred by the current user              | User       | `generalLimiter`            |
| GET    | `/users/get-referals`                     | Get referral statistics for the current user        | User       | `generalLimiter`            |
| GET    | `/users/get-products`                     | Get products listed by the current user             | User       | `generalLimiter`            |
| GET    | `/users/get-product`                      | Get a specific product listed by the current user   | User       | `generalLimiter`            |

| GET    | `/subscriptions/plans`                    | Get available subscription plans                    | Public     |                             |
| POST   | `/subscriptions/purchase`                 | Initiate subscription purchase                      | User       | `generalLimiter`            |
| POST   | `/subscriptions/upgrade`                  | Initiate subscription upgrade                       | User       | `generalLimiter`            |

| GET    | `/subscriptions`                          | Get current user's subscription history             | User       | `generalLimiter`            |
| GET    | `/subscriptions/active`                   | Get current user's active subscriptions           | User       | `generalLimiter`            |
| GET    | `/subscriptions/expired`                  | Get current user's expired subscriptions          | User       | `generalLimiter`            |
| GET    | `/subscriptions/check/:type`              | Check if user has active subscription of type       | User       | `generalLimiter`            |
| GET    | `/contacts/search`                        | Search contacts based on criteria                   | User       | `generalLimiter`            |
| GET    | `/contacts/export`                        | Export filtered contacts as CSV                     | User       | `generalLimiter`            |


---

### 2. Payment Service (`payment-service`)

Handles payment processing, transaction logging, and related webhooks.

**Base Path (Conceptual):** `/api` (Routed via Gateway)

**Route Files:**

*   `payment.routes.ts`
*   `transaction.routes.ts`
*   `internal.routes.ts`

**Endpoints:**

| Method | Path                                     | Description                                               | Auth       | Middleware/Limiter |
| :----- | :--------------------------------------- | :-------------------------------------------------------- | :--------- | :----------------- |
| GET    | `/payments/page/:sessionId`              | Render custom payment page for a session                  | Public     |                    |
| POST   | `/payments/intents`                      | Create a payment intent (returns session URL)             | Public     | `validatePaymentIntent` |
| POST   | `/payments/intents/:sessionId/submit`    | Submit payment details and initiate provider payment      | Public     | `validatePaymentDetails` |
| GET    | `/payments/intents/:sessionId/status`    | Check payment status for a session                        | Public     |                    |

| GET    | `/transactions/history`                  | Get current user's transaction history                    | User       |                    |
| GET    | `/transactions/stats`                    | Get current user's transaction statistics                 | User       |                    |
| GET    | `/transactions/:transactionId`           | Get details of a specific transaction                     | User       |                    |
| POST   | `/transactions/deposit/initiate`         | Initiate a deposit                                        | User       |                    |

| POST   | `/transactions/withdrawal/initiate`      | Initiate a withdrawal                                     | User       |                    |
| POST   | `/transactions/withdrawal/verify`        | Verify a withdrawal (e.g., OTP)                         | User       |                    |
| POST   | `/transactions/payment`                  | Process a generic payment                                   | User       |                    |


---

### 3. Product Service (`product-service`)

Manages products, categories, ratings, and flash sales.

**Base Path (Conceptual):** `/api` (Routed via Gateway)

**Route Files:**

*   `product.routes.ts`
*   `flashsale.routes.ts`

**Endpoints:**

| Method | Path                                        | Description                                           | Auth    | Middleware/Limiter |
| :----- | :------------------------------------------ | :---------------------------------------------------- | :------ | :----------------- |
| GET    | `/products/search`                          | Search for products                                   | Public  |                    |
| GET    | `/products/:productId`                      | Get details of a specific product                     | Public  |                    |
| GET    | `/products/:productId/ratings`              | Get ratings for a specific product                  | Public  |                    |
| GET    | `/products/user`                            | Get products listed by the current user             | User    |                    |
| GET    | `/products/user/ratings`                    | Get ratings given by the current user               | User    |                    |
| POST   | `/products`                                 | Create a new product                                  | User    |                    |
| PUT    | `/products/:productId`                      | Update a product owned by the current user          | User    |                    |
| DELETE | `/products/:productId`                      | Soft delete a product owned by the current user     | User    |                    |
| POST   | `/products/:productId/ratings`              | Add/Update rating for a product                     | User    |                    |
| DELETE | `/products/ratings/:ratingId`               | Delete a rating given by the current user           | User    |                    |
| POST   | `/products/ratings/:ratingId/helpful`       | Mark a rating as helpful                            | User    |                    |

| GET    | `/flash-sales`                              | Get active flash sales                                | Public  |                    |
| POST   | `/flash-sales/:flashSaleId/track-view`      | Track a view on a flash sale                          | Public  |                    |
| POST   | `/flash-sales/:flashSaleId/track-whatsapp-click` | Track a WhatsApp click on a flash sale             | Public  |                    |
| POST   | `/flash-sales`                              | Create a new flash sale                               | User    |                    |
| GET    | `/flash-sales/my`                           | Get flash sales created by the current user         | User    |                    |
| PUT    | `/flash-sales/:flashSaleId`                 | Update a flash sale owned by the current user       | User    |                    |
| DELETE | `/flash-sales/:flashSaleId`                 | Cancel a flash sale owned by the current user       | User    |                    |


---

### 4. Settings Service (`settings-service`)

Handles global application settings and file uploads (logo, terms, videos, avatars).

**Base Path (Conceptual):** `/api` (Routed via Gateway)

**Route Files:**

*   `settings.routes.ts`
*   `event.routes.ts`

**Endpoints:**

| Method | Path                        | Description                                  | Auth    | Middleware/Limiter |
| :----- | :-------------------------- | :------------------------------------------- | :------ | :----------------- |
| GET    | `/settings/files/:fileId`   | Get uploaded file content (e.g., logo, avatar) | Public  | `cors`             |
| GET    | `/settings`                 | Get current application settings             | User    |                    |
| PUT    | `/settings`                 | Update application settings (non-file)       | User    |                    |
| POST   | `/settings/logo`            | Upload/Update company logo                   | User    | `upload.single`    |
| POST   | `/settings/terms-pdf`       | Upload/Update terms PDF                      | User    | `upload.single`    |
| POST   | `/settings/presentation-video` | Upload/Update presentation video             | User    | `upload.single`    |
| POST   | `/settings/presentation-pdf` | Upload/Update presentation PDF               | User    | `upload.single`    |
| POST   | `/settings/files/upload`    | Upload a generic file (e.g., avatar)         | User    | `upload.single`    |
| GET    | `/events`                   | List events (paginated, sorted)              | Public  |                    |
| GET    | `/events/:id`               | Get a specific event by ID                   | Public  |                    |
| POST   | `/events`                   | Create a new event                           | User    | `upload.fields`    |
| PUT    | `/events/:id`               | Update an existing event                     | User    | `upload.fields`    |
| DELETE | `/events/:id`               | Delete an event by ID                        | User    |                    |

---

### 5. Tombola Service (`tombola-service`)

Manages monthly tombolas, ticket purchases, and winner draws.

**Base Path (Conceptual):** `/api` (Routed via Gateway)

**Route Files:**

*   `tombola.routes.ts`

**Endpoints:**

| Method | Path                              | Description                                    | Auth       | Middleware/Limiter |
| :----- | :-------------------------------- | :--------------------------------------------- | :--------- | :----------------- |
| GET    | `/tombola`                        | List current/past tombolas                     | Public     |                    |
| GET    | `/tombola/current`                | Get details of the current open tombola        | Public     |                    |
| GET    | `/tombola/:monthId/winners`       | Get winners for a specific tombola month     | Public     |                    |
| POST   | `/tombola/current/buy-ticket`     | Initiate ticket purchase                       | User       |                    |
| GET    | `/tombola/tickets/me`             | Get tickets purchased by the current user    | User       |                    |



---

### 6. Advertising Service (`advertising-service`)

Handles advertising packs and ad creation/display.

**Base Path (Conceptual):** `/api` (Routed via Gateway)

**Route Files:**

*   `advertising.routes.ts`

**Endpoints:**

| Method | Path                            | Description                               | Auth    | Middleware/Limiter |
| :----- | :------------------------------ | :---------------------------------------- | :------ | :----------------- |
| GET    | `/advertising/packs`            | Get all active advertising packs          | Public  |                    |
| GET    | `/advertising/ads/display`      | Get ads for display                       | Public  |                    |

| POST   | `/advertising/ads`              | Create a new advertisement (initiates payment) | User    |                    |
| GET    | `/advertising/ads/me`           | Get advertisements created by current user| User    |                    |
| GET    | `/advertising/ads/:advertisementId` | Get details of a specific advertisement | User    |                    |
| PUT    | `/advertising/ads/:advertisementId` | Update a specific advertisement         | User    |                    |

---

### 7. Notification Service (`notification-service`)

Manages sending notifications (email, SMS, push) and user notification history.

**Base Path (Conceptual):** `/api` (Routed via Gateway)

**Route Files:**

*   `notification.routes.ts`

**Endpoints:**

| Method | Path                             | Description                                  | Auth       | Middleware/Limiter |
| :----- | :------------------------------- | :------------------------------------------- | :--------- | :----------------- |
| GET    | `/notifications/me`              | Get current user's notifications           | User       |                    |
| GET    | `/notifications/me/stats`        | Get current user's notification stats        | User       |                    |


---