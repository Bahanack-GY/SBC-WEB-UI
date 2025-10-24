# Translation Implementation Guide

This guide explains how to translate all pages in the app using the i18n system that has been set up.

## Quick Start

### 1. Import useTranslation in your component

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  // Now you can use t() to access translations
}
```

### 2. Replace hardcoded strings with translation keys

**Before:**
```jsx
<h1>Bienvenue</h1>
<button>Se connecter</button>
```

**After:**
```jsx
<h1>{t('pages.home.welcome')}</h1>
<button>{t('common.login')}</button>
```

## Translation Key Hierarchy

The translation keys are organized by category:

### Common Keys (used across all pages)
- `common.loading`
- `common.error`
- `common.success`
- `common.confirm`
- `common.cancel`
- `common.save`
- `common.delete`
- `common.edit`
- `common.password`
- `common.email`
- `common.phoneNumber`
- `common.profile`
- `common.logout`

### Page-Specific Keys
- `pages.connexion.*` - Login page
- `pages.signup.*` - Sign up page
- `pages.home.*` - Home page
- `pages.profile.*` - Profile page
- `pages.wallet.*` - Wallet page
- `pages.marketplace.*` - Marketplace page

### Message Keys (for alerts/notifications)
- `messages.success`
- `messages.error`
- `messages.failedToLoad`
- `messages.networkError`

## Pages to Translate

### Priority 1 (Critical Pages)
1. **Connexion.tsx** ✅ DONE
2. **Signup.tsx** - Authentication
3. **Home.tsx** - Dashboard
4. **Profile.tsx** - User profile

### Priority 2 (Important Features)
5. **Wallet.tsx** - Finance section
6. **Marketplace.tsx** - Products/Services
7. **Abonnement.tsx** - Subscriptions
8. **MesFilleuls.tsx** - Referral management

### Priority 3 (Additional Pages)
9. **ForgotPassword.tsx**
10. **ChangePassword.tsx**
11. **ChangeEmail.tsx**
12. **ChangePhoneNumber.tsx**
13. **ResetPassword.tsx**
14. **MesProduits.tsx**
15. **AjouterProduit.tsx**
16. **ModifierProduit.tsx**
17. **SingleProductPage.tsx**
18. **OTP.tsx**
19. **VerifyOtp.tsx**
20. **VerifyEmailOtp.tsx**
21. **WithdrawalOtpVerification.tsx**
22. **TransactionConfirmation.tsx**
23. **SplashScreen.tsx**
24. **Contacts.tsx**
25. **PartnerSpace.tsx**
26. **AdsPack.tsx**
27. **ModifierLeProfil.tsx**
28. **RelancePage.tsx**

## Step-by-Step Translation Process

### For each page:

1. **Add import at the top:**
   ```typescript
   import { useTranslation } from 'react-i18next';
   ```

2. **Add hook in component:**
   ```typescript
   const { t } = useTranslation();
   ```

3. **Find all hardcoded strings** (especially):
   - Button labels
   - Form labels
   - Error messages
   - Page titles
   - Placeholder text
   - Section headers

4. **Replace with t() calls:**
   ```javascript
   // For common strings
   t('common.loading')
   t('common.delete')

   // For page-specific strings
   t('pages.home.welcome')
   t('pages.wallet.balance')
   ```

5. **Add missing keys to translation files** if needed:
   ```json
   {
     "pages": {
       "yourPage": {
         "newKey": "French text",
         "anotherKey": "More French"
       }
     }
   }
   ```

## Translation Files Location

- **French**: `src/i18n/locales/fr.json`
- **English**: `src/i18n/locales/en.json`

## Available Translation Keys

### Common UI Elements
```
common.loading
common.error
common.success
common.confirm
common.cancel
common.close
common.save
common.delete
common.edit
common.back
common.refresh
common.yes
common.no
common.ok
common.submit
common.logout
common.login
common.signup
common.password
common.email
common.phoneNumber
common.name
common.profile
common.home
common.pleaseWait
common.tryAgain
```

### Connection/Authentication
```
pages.connexion.title
pages.connexion.emailOrPhone
pages.connexion.forgotPassword
pages.connexion.connectButton
pages.connexion.noAccount
pages.connexion.invalidEmailOrPhone
pages.connexion.passwordMinLength
pages.connexion.loginFailed
pages.connexion.checkCredentials
```

### Home Page
```
pages.home.welcome
pages.home.balance
pages.home.earnings
pages.home.referrals
pages.home.mySubscription
pages.home.noSubscription
pages.home.marketplace
pages.home.wallet
pages.home.profile
pages.home.formations
```

### Profile Page
```
pages.profile.myProfile
pages.profile.editProfile
pages.profile.changeEmail
pages.profile.changePhone
pages.profile.changePassword
pages.profile.myReferrals
pages.profile.referralCode
pages.profile.referralLink
pages.profile.logout
pages.profile.logoutConfirm
```

### Wallet Page
```
pages.wallet.myWallet
pages.wallet.balance
pages.wallet.totalEarnings
pages.wallet.recentTransactions
pages.wallet.withdraw
pages.wallet.transactionHistory
```

### Messages
```
messages.success
messages.error
messages.failedToLoad
messages.networkError
messages.failedToSave
messages.failedToDelete
```

## Language Switcher

The language switcher is already implemented in:
- **RelancePage**: Header with 🇫🇷 FR / 🇬🇧 EN toggle
- **Component**: `src/components/common/LanguageSwitcher.tsx`

To add it to other pages:
```tsx
import LanguageSwitcher from '../components/common/LanguageSwitcher';

// In your component JSX:
<LanguageSwitcher />
```

## Testing Translations

1. Run the dev server: `npm run dev`
2. Click language switcher to toggle between French and English
3. Check console for any missing translation warnings
4. Test all user-facing text appears correctly in both languages

## Adding New Translations

If you need to add a new translation key:

1. Add to **fr.json**:
   ```json
   "pages": {
     "myPage": {
       "myKey": "Texte français"
     }
   }
   ```

2. Add to **en.json**:
   ```json
   "pages": {
     "myPage": {
       "myKey": "English text"
     }
   }
   ```

3. Use in component:
   ```tsx
   {t('pages.myPage.myKey')}
   ```

## Placeholder Text & Hints

For input placeholders and helper text that don't need translation:
```tsx
<input placeholder="exemple@email.com" />
```

For important user guidance, translate it:
```tsx
<small>{t('pages.connexion.emailHint')}</small>
```

## Common Patterns

### Conditional Text
```tsx
{loading ? t('common.loading') : t('common.done')}
```

### Dynamic Values
```tsx
{t('pages.wallet.balance', { amount: 1000 })}
// In translation file: "balance": "Solde: {{amount}}"
```

### Pluralization
```tsx
{t('pages.home.referrals_plural')}  // Multiple
{t('pages.home.referrals')}         // Singular
```

## Checklist for Each Page

- [ ] Import `useTranslation` hook
- [ ] Add `const { t } = useTranslation();`
- [ ] Translate page title
- [ ] Translate button labels
- [ ] Translate form labels
- [ ] Translate error messages
- [ ] Translate success messages
- [ ] Translate section headers
- [ ] Translate placeholder text
- [ ] Translate helper/hint text
- [ ] Test language switching
- [ ] Verify all text appears correctly in both languages

## Support for Multiple Languages

To add another language:

1. Create new translation file: `src/i18n/locales/{lang}.json`
2. Add language configuration to `src/i18n/config.ts`
3. Update `LanguageSwitcher.tsx` to include new language

## Performance Tips

- Lazy load translation files if the app has many languages
- Use namespaces to split translations by feature
- Cache translated strings when necessary

## Troubleshooting

### Translation key not showing
- Check the key exists in both fr.json and en.json
- Check for typos in the key path
- Check browser console for i18n warnings

### Language not changing
- Check localStorage for 'language' key
- Verify `LanguageSwitcher` component is rendering
- Check i18n config is initialized

### Missing translations
- Search for hardcoded strings still in components
- Check if new pages were added without translations
- Verify translation files are valid JSON

