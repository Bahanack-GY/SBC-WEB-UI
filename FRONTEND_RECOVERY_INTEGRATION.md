# 🚀 Frontend Recovery Integration Guide

## Overview

This guide explains how to integrate the **Transaction Recovery System** into your frontend application. The system automatically recovers lost transactions when users register or login, providing a seamless user experience.

## 🎯 Key Features

- **Automatic transaction recovery** during user registration ✅ **IMPLEMENTED**
- **Login recovery detection** for non-existent accounts with recoverable transactions ✅ **IMPLEMENTED**  
- **Real-time notifications** about pending and completed recoveries ✅ **IMPLEMENTED**
- **Payment-first restoration** ensuring subscriptions activate before withdrawals ✅ **IMPLEMENTED**
- **Support for email AND phone number** authentication ✅ **IMPLEMENTED**
- **Country code preservation** from original transactions ✅ **IMPLEMENTED**

## 🚀 Automatic Recovery Processing

**The system now automatically processes recovery after successful registration!**

When a user registers:
1. User registration completes successfully
2. Backend automatically checks for recoverable transactions (async, non-blocking)
3. If found, transactions are restored immediately:
   - **Payments first** (subscriptions activated)
   - **Payouts second** (withdrawals processed)
4. User balance updated in real-time
5. No user action required!

---

## 📋 API Endpoints Overview

### Base URL: `{PAYMENT_SERVICE_URL}/api` (typically `http://localhost:3003/api`)

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/recovery/check-login` | POST | Check for recoverable transactions during failed login | No |
| `/recovery/check-registration` | POST | Check for pending recoveries during registration | No |
| `/recovery/notification` | POST | Get recovery completion notification | No |

---

## 🔧 Implementation Guide

### 1. **Login Flow Integration**

#### ✅ Enhanced Login Support (IMPLEMENTED)

The backend now supports **both email AND phone number** login. The login endpoint `/api/users/login` has been updated to accept:

```typescript
// Login Request Body (either email OR phoneNumber required)
{
  email?: string;           // Optional: user@example.com
  phoneNumber?: string;     // Optional: 237670123456 (with country code)
  password: string;         // Required
}
```

**Backend Changes Made:**
- ✅ User controller updated to accept both email and phoneNumber
- ✅ User service updated to find users by email or phone number
- ✅ Phone number normalization for login (handles international formats)
- ✅ Automatic recovery processing after successful registration

Update your login form to handle both:

```tsx
// Enhanced Login Component
interface LoginForm {
  identifier: string; // Can be email OR phone number
  password: string;
}

const LoginComponent = () => {
  const [loginData, setLoginData] = useState<LoginForm>({
    identifier: '',
    password: ''
  });
  
  const [recoveryInfo, setRecoveryInfo] = useState(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Attempt login with email OR phone
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Try both email and phone formats
          email: isEmail(loginData.identifier) ? loginData.identifier : undefined,
          phoneNumber: isPhoneNumber(loginData.identifier) ? loginData.identifier : undefined,
          password: loginData.password
        })
      });

      if (loginResponse.ok) {
        // Login successful
        handleSuccessfulLogin(await loginResponse.json());
      } else if (loginResponse.status === 401 || loginResponse.status === 404) {
        // Login failed - check for recoverable transactions
        await checkRecoverableTransactions(loginData.identifier);
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const checkRecoverableTransactions = async (identifier: string) => {
    try {
      const recoveryResponse = await fetch('/api/recovery/check-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: isEmail(identifier) ? identifier : undefined,
          phoneNumber: isPhoneNumber(identifier) ? identifier : undefined
        })
      });

      if (recoveryResponse.ok) {
        const recoveryData = await recoveryResponse.json();
        setRecoveryInfo(recoveryData.data);
        showRecoveryModal(recoveryData.data);
      }
    } catch (error) {
      console.error('Recovery check error:', error);
    }
  };

  return (
    <div className="login-form">
      <form onSubmit={handleLogin}>
        <div className="input-group">
          <label>Email or Phone Number</label>
          <input
            type="text"
            placeholder="Enter your email or phone number"
            value={loginData.identifier}
            onChange={(e) => setLoginData({...loginData, identifier: e.target.value})}
            required
          />
          <small className="helper-text">
            You can use either your email (user@example.com) or phone number (237670123456)
          </small>
        </div>
        
        <div className="input-group">
          <label>Password</label>
          <input
            type="password"
            value={loginData.password}
            onChange={(e) => setLoginData({...loginData, password: e.target.value})}
            required
          />
        </div>
        
        <button type="submit">Login</button>
      </form>

      {/* Recovery Modal */}
      {recoveryInfo && (
        <RecoveryModal 
          recoveryInfo={recoveryInfo}
          onClose={() => setRecoveryInfo(null)}
        />
      )}
    </div>
  );
};

// Utility functions
const isEmail = (str: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
};

const isPhoneNumber = (str: string): boolean => {
  return /^\+?[\d\s-()]+$/.test(str) && str.replace(/\D/g, '').length >= 8;
};
```

#### Recovery Detection Modal

```tsx
interface RecoveryModalProps {
  recoveryInfo: {
    totalTransactions: number;
    totalAmount: number;
    message: string;
    suggestedIdentifiers: {
      email?: string;
      phoneNumber?: string;
      countryCode: string;
    };
  };
  onClose: () => void;
}

const RecoveryModal: React.FC<RecoveryModalProps> = ({ recoveryInfo, onClose }) => {
  const handleRegisterRedirect = () => {
    // Redirect to registration with pre-filled data
    window.location.href = `/register?email=${recoveryInfo.suggestedIdentifiers.email}&phone=${recoveryInfo.suggestedIdentifiers.phoneNumber}&country=${recoveryInfo.suggestedIdentifiers.countryCode}`;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content recovery-modal">
        <div className="modal-header">
          <h2>🎉 Account Recovery Available!</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="recovery-info">
            <p className="main-message">{recoveryInfo.message}</p>
            
            <div className="recovery-stats">
              <div className="stat-item">
                <span className="stat-label">Transactions:</span>
                <span className="stat-value">{recoveryInfo.totalTransactions}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Amount:</span>
                <span className="stat-value">{recoveryInfo.totalAmount} XAF</span>
              </div>
            </div>
            
            <div className="suggested-credentials">
              <h4>Use these credentials to recover:</h4>
              {recoveryInfo.suggestedIdentifiers.email && (
                <p>📧 Email: <strong>{recoveryInfo.suggestedIdentifiers.email}</strong></p>
              )}
              {recoveryInfo.suggestedIdentifiers.phoneNumber && (
                <p>📱 Phone: <strong>{recoveryInfo.suggestedIdentifiers.phoneNumber}</strong></p>
              )}
              <p>🌍 Country: <strong>{recoveryInfo.suggestedIdentifiers.countryCode}</strong></p>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Maybe Later
          </button>
          <button className="btn-primary" onClick={handleRegisterRedirect}>
            Register & Recover
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

### 2. **Registration Flow Integration**

#### Enhanced Registration Form

```tsx
interface RegistrationForm {
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  countryCode: string;
  // ... other fields
}

const RegistrationComponent = () => {
  const [formData, setFormData] = useState<RegistrationForm>({
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    countryCode: 'CM'
  });
  
  const [pendingRecovery, setPendingRecovery] = useState(null);
  const [showRecoveryPreview, setShowRecoveryPreview] = useState(false);

  // Pre-fill from URL parameters (from recovery redirect)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    const phone = urlParams.get('phone');
    const country = urlParams.get('country');
    
    if (email || phone || country) {
      setFormData(prev => ({
        ...prev,
        email: email || prev.email,
        phoneNumber: phone || prev.phoneNumber,
        countryCode: country || prev.countryCode
      }));
    }
  }, []);

  // Check for pending recoveries when email/phone changes
  useEffect(() => {
    const checkPendingRecoveries = async () => {
      if (formData.email || formData.phoneNumber) {
        try {
          const response = await fetch('/api/recovery/check-registration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: formData.email || undefined,
              phoneNumber: formData.phoneNumber || undefined
            })
          });

          const data = await response.json();
          if (data.success && data.data.hasPendingRecoveries) {
            setPendingRecovery(data.data);
            setShowRecoveryPreview(true);
          } else {
            setPendingRecovery(null);
            setShowRecoveryPreview(false);
          }
        } catch (error) {
          console.error('Recovery check error:', error);
        }
      }
    };

    const debounceTimer = setTimeout(checkPendingRecoveries, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData.email, formData.phoneNumber]);

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Register user
      const registrationResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (registrationResponse.ok) {
        const userData = await registrationResponse.json();
        
        // Check for completed recovery after registration
        setTimeout(async () => {
          await checkRecoveryCompletion(formData.email, formData.phoneNumber);
        }, 2000); // Wait 2 seconds for recovery to complete
        
        handleSuccessfulRegistration(userData);
      }
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  const checkRecoveryCompletion = async (email: string, phoneNumber: string) => {
    try {
      const response = await fetch('/api/recovery/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phoneNumber })
      });

      if (response.ok) {
        const recoveryData = await response.json();
        showRecoveryCompletedNotification(recoveryData.data);
      }
    } catch (error) {
      console.error('Recovery notification error:', error);
    }
  };

  return (
    <div className="registration-form">
      {/* Recovery Preview Banner */}
      {showRecoveryPreview && pendingRecovery && (
        <div className="recovery-preview-banner">
          <div className="banner-icon">🎉</div>
          <div className="banner-content">
            <h3>{pendingRecovery.notification.title}</h3>
            <p>{pendingRecovery.notification.message}</p>
            <ul className="recovery-details">
              {pendingRecovery.notification.details.map((detail: string, index: number) => (
                <li key={index}>{detail}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <form onSubmit={handleRegistration}>
        <div className="form-row">
          <div className="input-group">
            <label>Email Address *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>
          
          <div className="input-group">
            <label>Phone Number *</label>
            <input
              type="tel"
              placeholder="237670123456"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
              required
            />
            <small className="helper-text">
              Include country code (e.g., 237 for Cameroon)
            </small>
          </div>
        </div>

        <div className="input-group">
          <label>Country</label>
          <select 
            value={formData.countryCode}
            onChange={(e) => setFormData({...formData, countryCode: e.target.value})}
          >
            <option value="CM">🇨🇲 Cameroon</option>
            <option value="TG">🇹🇬 Togo</option>
            <option value="GH">🇬🇭 Ghana</option>
            <option value="CI">🇨🇮 Côte d'Ivoire</option>
            <option value="BF">🇧🇫 Burkina Faso</option>
            <option value="SN">🇸🇳 Senegal</option>
          </select>
        </div>

        <div className="form-row">
          <div className="input-group">
            <label>Password *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>
          
          <div className="input-group">
            <label>Confirm Password *</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              required
            />
          </div>
        </div>

        <button type="submit" className="btn-primary">
          {showRecoveryPreview ? 'Register & Recover Transactions' : 'Register Account'}
        </button>
      </form>
    </div>
  );
};
```

---

### 3. **Recovery Completion Notification**

```tsx
interface RecoveryCompletedNotificationProps {
  recoveryData: {
    recoveryDetails: {
      totalTransactions: number;
      paymentTransactions: number;
      payoutTransactions: number;
      totalAmount: number;
      restoredAt: string;
    };
    notification: {
      title: string;
      message: string;
      details: string[];
      actions: Array<{
        type: string;
        label: string;
        target: string;
      }>;
    };
  };
  onClose: () => void;
}

const RecoveryCompletedNotification: React.FC<RecoveryCompletedNotificationProps> = ({ recoveryData, onClose }) => {
  const handleNavigation = (target: string) => {
    onClose();
    window.location.href = target;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content recovery-completed-modal">
        <div className="modal-header success">
          <div className="success-icon">✅</div>
          <h2>{recoveryData.notification.title}</h2>
        </div>
        
        <div className="modal-body">
          <p className="main-message">{recoveryData.notification.message}</p>
          
          <div className="recovery-summary">
            <div className="summary-stats">
              <div className="stat-card">
                <span className="stat-number">{recoveryData.recoveryDetails.totalTransactions}</span>
                <span className="stat-label">Total Transactions</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{recoveryData.recoveryDetails.totalAmount}</span>
                <span className="stat-label">XAF Recovered</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{recoveryData.recoveryDetails.paymentTransactions}</span>
                <span className="stat-label">Subscriptions</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{recoveryData.recoveryDetails.payoutTransactions}</span>
                <span className="stat-label">Withdrawals</span>
              </div>
            </div>
            
            <div className="recovery-details">
              <h4>What was recovered:</h4>
              <ul>
                {recoveryData.notification.details.map((detail, index) => (
                  <li key={index}>{detail}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Got It!
          </button>
          <div className="action-buttons">
            {recoveryData.notification.actions.map((action, index) => (
              <button 
                key={index}
                className="btn-primary"
                onClick={() => handleNavigation(action.target)}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Global notification function
const showRecoveryCompletedNotification = (recoveryData: any) => {
  // Use your preferred notification library (e.g., react-toastify, react-hot-toast)
  // Or create a modal/popup component
  const notificationRoot = document.createElement('div');
  document.body.appendChild(notificationRoot);
  
  ReactDOM.render(
    <RecoveryCompletedNotification 
      recoveryData={recoveryData}
      onClose={() => {
        document.body.removeChild(notificationRoot);
      }}
    />,
    notificationRoot
  );
};
```

---

## 🎨 CSS Styling Guide

```css
/* Recovery Modal Styles */
.recovery-modal {
  max-width: 500px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
}

.recovery-info {
  text-align: center;
  padding: 20px;
}

.main-message {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 20px;
}

.recovery-stats {
  display: flex;
  justify-content: space-around;
  margin: 20px 0;
  padding: 15px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 12px;
  opacity: 0.8;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  margin-top: 5px;
}

.suggested-credentials {
  text-align: left;
  background: rgba(255, 255, 255, 0.1);
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
}

/* Recovery Preview Banner */
.recovery-preview-banner {
  display: flex;
  align-items: flex-start;
  background: linear-gradient(45deg, #4CAF50, #45a049);
  color: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.banner-icon {
  font-size: 32px;
  margin-right: 15px;
  flex-shrink: 0;
}

.banner-content h3 {
  margin: 0 0 10px 0;
  font-size: 20px;
}

.banner-content p {
  margin: 0 0 15px 0;
  opacity: 0.95;
}

.recovery-details {
  list-style: none;
  padding: 0;
  margin: 0;
}

.recovery-details li {
  padding: 5px 0;
  padding-left: 20px;
  position: relative;
}

.recovery-details li::before {
  content: "✓";
  position: absolute;
  left: 0;
  color: #fff;
  font-weight: bold;
}

/* Recovery Completed Modal */
.recovery-completed-modal {
  max-width: 600px;
}

.modal-header.success {
  background: linear-gradient(45deg, #4CAF50, #45a049);
  color: white;
  text-align: center;
  padding: 30px;
  border-radius: 12px 12px 0 0;
}

.success-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.recovery-summary {
  padding: 20px;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px solid #e9ecef;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #4CAF50;
}

.stat-label {
  font-size: 12px;
  color: #6c757d;
  margin-top: 5px;
  text-align: center;
}

/* Form Enhancements */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.helper-text {
  font-size: 12px;
  color: #6c757d;
  margin-top: 5px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .recovery-stats {
    flex-direction: column;
    gap: 10px;
  }
  
  .summary-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .banner-icon {
    font-size: 24px;
    margin-right: 10px;
  }
}
```

---

## ⚠️ Important Implementation Notes

### 1. **Phone Number Validation**
```typescript
// Ensure proper phone number format validation
const normalizePhoneNumber = (phone: string): string => {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Add country prefix if missing
  const countryPrefixes = {
    'CM': '237',
    'TG': '228', 
    'GH': '233',
    'BF': '226',
    'CI': '225',
    'SN': '221'
  };
  
  // Use the selected country or detect from phone number
  return digits.length >= 8 ? digits : phone;
};
```

### 2. **Error Handling**
```typescript
// Wrap all recovery API calls in try-catch
const safeApiCall = async (url: string, data: any) => {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok && response.status !== 404) {
      throw new Error(`API call failed: ${response.status}`);
    }
    
    return response.status === 404 ? null : await response.json();
  } catch (error) {
    console.error('Recovery API error:', error);
    return null; // Graceful fallback
  }
};
```

### 3. **Testing Checklist**

- [ ] Login with email shows recovery modal when account doesn't exist
- [ ] Login with phone number shows recovery modal when account doesn't exist  
- [ ] Registration pre-fills data from recovery redirect URL
- [ ] Registration shows recovery preview when email/phone has pending recoveries
- [ ] Post-registration notification appears when recoveries are completed
- [ ] All modals are properly styled and responsive
- [ ] Phone number validation works for all supported countries
- [ ] Error states are handled gracefully

---

## 🚀 Deployment Checklist

1. **Update Login Backend** (if needed - to be checked)
   - Ensure login endpoint accepts both email and phoneNumber
   - Update authentication logic to handle phone numbers

2. **Frontend Integration**
   - Update login form to accept email OR phone
   - Add recovery check API calls
   - Implement recovery modals and notifications
   - Update registration form with recovery preview

3. **Styling**
   - Add CSS for recovery modals and banners
   - Ensure responsive design
   - Test on mobile devices

4. **Testing**
   - Test recovery flow end-to-end
   - Test with different phone number formats
   - Test with different country codes
   - Verify all notifications display correctly

---

## 📞 Support

If you encounter any issues during implementation:

1. Check browser console for API errors
2. Verify API endpoints are accessible
3. Ensure payment service is running on correct port
4. Check network requests in browser dev tools
5. Verify recovery data exists in database for testing

The recovery system is designed to be **graceful** - if any API calls fail, the normal login/registration flow should continue without breaking the user experience.