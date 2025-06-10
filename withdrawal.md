## Withdrawal Endpoints Documentation

This document describes the API endpoints for user and admin withdrawals within the Payment Service. It covers the request/response formats, authentication, and key business logic like daily limits and verification steps.

### Core Withdrawal Concepts

*   **Net Amount:** The amount the user/recipient desires to receive, *before* fees are applied.
*   **Gross Amount:** The total amount debited from the user's account (Net Amount + Fee).
*   **Fee:** A 1.5% fee is calculated on the Net Amount for all withdrawals/payouts.
*   **Daily Limit (User-initiated):** Users can initiate a maximum of **3** withdrawals (including pending and completed) per 24-hour UTC day. This limit resets at 00:00 UTC daily.
*   **Soft Lock (User-initiated):** A user cannot initiate a *new* withdrawal if they have an existing withdrawal transaction in `PENDING_OTP_VERIFICATION`, `PENDING`, or `PROCESSING` status. Instead, they will be prompted to complete or cancel the existing one, and the OTP for the existing one will be re-sent if it's in `PENDING_OTP_VERIFICATION`.
*   **Asynchronous Payout:** After a withdrawal is successfully verified (for users) or initiated (for admins), the actual money transfer via CinetPay is an asynchronous background process. The status updates are received via webhooks.
*   **Balance Debit:** The user's internal balance is debited *only after* the external payment provider (CinetPay) confirms the successful completion of the payout via webhook.

---

### 1. User-initiated Withdrawal Endpoints

These endpoints are for authenticated users to request and manage their own withdrawals.

#### 1.1. Initiate Withdrawal (User)

Initiates a new withdrawal request, checks for existing pending withdrawals, applies daily limits, and sends an OTP for verification. The user's balance is **not** debited at this stage.

*   **Endpoint:** `/api/transactions/withdrawal/initiate`
*   **Method:** `POST`
*   **Authentication:** Required (User role)
*   **Request Body:**
    ```json
    {
        "amount": 1000,     // Required: The NET amount (number) the user wants to receive (e.g., 1000 FCFA)
    }
    ```
*   **Response (Success - New Request):**
    ```json
    {
        "success": true,
        "message": "Withdrawal initiation successful. Please check your registered contact for an OTP.",
        "transactionId": "string",  // Internal transaction ID
        "amount": 1015,             // Gross amount (Net Amount + Fee) debited from user's balance if successful
        "fee": 15,                  // Calculated fee (1.5% of Net Amount)
        "total": 1000,              // Net amount requested by user
        "status": "pending_otp_verification", // Current status of the transaction
        "expiresAt": "ISO Date String" // OTP expiry timestamp
    }
    ```
*   **Response (Success - Existing Active Withdrawal - Soft Lock):**
    If a user has an existing withdrawal in `pending_otp_verification`, `pending`, or `processing` status, a new OTP will be re-sent (if applicable), and details of the existing transaction will be returned.
    ```json
    {
        "success": true,
        "message": "You have an ongoing withdrawal request (ID: [transactionId]) that is currently [status]. Please complete or cancel it before initiating a new one. An OTP has been re-sent to your registered contact for this existing request.",
        "transactionId": "string",
        "amount": 1015,
        "fee": 15,
        "total": 1000,
        "status": "pending_otp_verification", // Or "pending", "processing"
        "expiresAt": "ISO Date String"
    }
    ```
*   **Response (Error - Daily Limit Exceeded):**
    ```json
    {
        "success": false,
        "message": "You have reached your daily limit of 3 withdrawals. Please try again tomorrow."
    }
    ```
*   **Response (Error - Insufficient Balance):**
    ```json
    {
        "success": false,
        "message": "Insufficient balance"
    }
    ```
*   **Response (Error - Missing MoMo Details):**
    ```json
    {
        "success": false,
        "message": "Your account does not have registered Mobile Money details for withdrawals. Please update your profile."
    }
    ```
*   **Response (Error - Invalid Input / Server Error):**
    ```json
    {
        "success": false,
        "message": "Amount and currency are required" // Or other error message
    }
    ```

#### 1.2. Verify Withdrawal (User)

Verifies the OTP sent during the initiation phase. If successful, the withdrawal transaction status is updated to `PENDING` (awaiting external payout), and the asynchronous payout process is triggered. The user's balance is **not** debited at this stage; it occurs only upon successful webhook confirmation from CinetPay.

*   **Endpoint:** `/api/transactions/withdrawal/verify`
*   **Method:** `POST`
*   **Authentication:** Required (User role)
*   **Request Body:**
    ```json
    {
        "transactionId": "string",  // Required: The internal transaction ID received from initiateWithdrawal
        "verificationCode": "string" // Required: The OTP received by the user
    }
    ```
*   **Response (Success):**
    ```json
    {
        "success": true,
        "transaction": {
            "transactionId": "string",
            "amount": 1015,             // Gross amount
            "fee": 15,
            "total": 1000,              // Net amount
            "status": "processing",     // Status is now processing (external payout initiated)
            "message": "Withdrawal verified. Your payout is now being processed."
        }
    }
    ```
*   **Response (Error - Invalid/Expired OTP):**
    ```json
    {
        "success": false,
        "message": "Invalid verification code." // Or "Verification code expired. Please re-initiate withdrawal."
    }
    ```
*   **Response (Error - Invalid Status):**
    ```json
    {
        "success": false,
        "message": "Withdrawal transaction is not awaiting OTP verification. Current status: [status]."
    }
    ```

#### 1.3. Cancel Withdrawal (User)

Allows a user to cancel a pending withdrawal request. This is only possible if the transaction is in `PENDING_OTP_VERIFICATION` status. Once verified and balance is debited (which happens only upon external success webhook), cancellation is not possible through this endpoint.

*   **Endpoint:** `/api/transactions/withdrawal/:transactionId/cancel`
*   **Method:** `DELETE`
*   **Authentication:** Required (User role)
*   **URL Parameters:**
    *   `transactionId`: The ID of the transaction to cancel.
*   **Response (Success):**
    ```json
    {
        "success": true,
        "message": "Withdrawal request [transactionId] cancelled successfully."
    }
    ```
*   **Response (Error - Not Found / Access Denied):**
    ```json
    {
        "success": false,
        "message": "Withdrawal transaction not found." // Or "Access denied: You can only cancel your own withdrawals."
    }
    ```
*   **Response (Error - Invalid Status for Cancellation):**
    ```json
    {
        "success": false,
        "message": "Withdrawal cannot be cancelled. It is currently in "[status]" status."
    }
    ```

---