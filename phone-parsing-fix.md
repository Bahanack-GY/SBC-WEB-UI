# Phone Number Parsing Fix - Registration Redirect

## 🐛 Issue Identified
When users clicked "S'inscrire pour récupérer" in the login recovery modal, the phone number appeared in full format (e.g., `+237675090755`) in the WhatsApp field instead of:
- Selecting `🇨🇲 +237` in the country dropdown
- Showing only `675090755` in the phone field

## 🔧 Root Cause
The phone number parsing logic in `Signup.tsx` had issues:
1. **Format normalization**: Didn't handle various phone formats consistently
2. **Country code matching**: Logic wasn't robust enough for different input formats
3. **Missing edge cases**: Didn't account for phones without "+" prefix

## ✅ Fix Implemented

### **Enhanced Phone Number Parsing Logic**
**File**: `src/pages/Signup.tsx:257-282`

#### **1. URL Parameter Parsing (from Recovery Modal)**
```javascript
if (phoneFromUrl) {
  // Normalize phone number by removing spaces, hyphens, and ensuring it starts with +
  let normalizedPhone = phoneFromUrl.replace(/[\s\-()]/g, '');
  if (!normalizedPhone.startsWith('+')) {
    normalizedPhone = '+' + normalizedPhone;
  }
  
  // Find matching country code
  const matchedCode = countryCodes.find(c => normalizedPhone.startsWith(c.code));
  if (matchedCode) {
    setSelectedCode(matchedCode);  // Set dropdown
    const phoneWithoutCode = normalizedPhone.replace(matchedCode.code, '');
    dataToSet.whatsapp = phoneWithoutCode;  // Remove country code from field
  }
}
```

#### **2. Saved Data Parsing (localStorage)**
**File**: `src/pages/Signup.tsx:288-310`
```javascript
if (dataToSet.whatsapp && !phoneFromUrl) {
  // Same normalization logic for saved phone numbers
  let normalizedSavedPhone = dataToSet.whatsapp.replace(/[\s\-()]/g, '');
  if (!normalizedSavedPhone.startsWith('+')) {
    normalizedSavedPhone = '+' + normalizedSavedPhone;
  }
  
  // Match and split country code
  const matchedCode = countryCodes.find(c => normalizedSavedPhone.startsWith(c.code));
  if (matchedCode) {
    setSelectedCode(matchedCode);
    setData(prev => ({ 
      ...prev, 
      whatsapp: normalizedSavedPhone.replace(matchedCode.code, '') 
    }));
  }
}
```

### **3. Added Debug Logging**
Console logs to track phone parsing process:
- Original phone from URL
- Normalized phone format  
- Matched country code
- Final phone without code

## 🎯 Expected Behavior Now

### **Before Fix:**
```
WhatsApp Field: +237675090755
Country Dropdown: 🇨🇲 +237 (default)
```

### **After Fix:**
```
WhatsApp Field: 675090755
Country Dropdown: 🇨🇲 +237 (auto-selected)
```

## 🧪 Test Cases Handled

1. **+237675090755** → Dropdown: `🇨🇲 +237`, Field: `675090755`
2. **237675090755** → Dropdown: `🇨🇲 +237`, Field: `675090755`  
3. **+237 675 090 755** → Dropdown: `🇨🇲 +237`, Field: `675090755`
4. **237-675-090-755** → Dropdown: `🇨🇲 +237`, Field: `675090755`

## 🔄 Recovery Flow

1. User enters phone in login page
2. Login fails, recovery modal shows
3. User clicks "S'inscrire pour récupérer"
4. Redirected to: `/signup?phone=+237675090755&password=...`
5. **NEW**: Registration form auto-parses phone:
   - Sets country dropdown to `🇨🇲 +237`
   - Shows `675090755` in WhatsApp field
6. User completes registration normally

The phone number parsing now works seamlessly for the recovery flow!