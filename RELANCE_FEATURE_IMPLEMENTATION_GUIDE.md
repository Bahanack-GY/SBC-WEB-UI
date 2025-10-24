# Relance Feature - Complete Frontend Implementation Guide

**Date**: 2025-10-23
**Feature**: WhatsApp-Based Automated Campaign Follow-up System
**Developer**: Claude Code
**Purpose**: Guide for backend developers to understand the complete Relance feature implementation

---

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [User Flow & Subscription](#user-flow--subscription)
3. [WhatsApp Connection](#whatsapp-connection)
4. [Campaign Management](#campaign-management)
5. [Default Campaign](#default-campaign)
6. [Filtered Campaigns](#filtered-campaigns)
7. [API Endpoints Reference](#api-endpoints-reference)
8. [Data Structures](#data-structures)
9. [Error Handling](#error-handling)
10. [Testing Scenarios](#testing-scenarios)

---

## Feature Overview

### What is Relance?

**Relance** is an automated WhatsApp messaging system that helps SBC members follow up with their unpaid referrals over a 7-day period. Members can:

- Connect their WhatsApp account via QR code
- Run a **default campaign** that auto-enrolls all new unpaid referrals
- Create **filtered campaigns** targeting specific user segments
- Monitor campaign performance with detailed statistics
- Control campaign behavior (pause, resume, simultaneous execution)

### Subscription Model

- **Price**: 1,000 XAF / 2 mois (2 months)
- **Access Control**: Requires both:
  - Admin role (`user.role === 'admin'`)
  - Active Relance subscription (`hasSubscription` via `GET /api/subscriptions/check/RELANCE`)
- **Subscription Type**: `RELANCE` (uppercase)

### Access Points

Users can access Relance from:
1. **Home page** - "Relance" button with WhatsApp icon
2. **Profile page** - "Relance WhatsApp" menu item
3. **AdsPack page** - "Accéder à Relance" button in Winner Pack card

All entry points check subscription status before allowing access.

---

## User Flow & Subscription

### Initial Access Flow

```
┌─────────────────────────────────────────────────────┐
│ User clicks "Relance" button                        │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│ Frontend: Check subscription status                 │
│ API: GET /api/subscriptions/check/RELANCE           │
└─────────────────┬───────────────────────────────────┘
                  │
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
┌──────────────┐   ┌──────────────────┐
│ Has Sub      │   │ No Sub           │
│ + Admin      │   │ or Not Admin     │
└──────┬───────┘   └────────┬─────────┘
       │                    │
       ▼                    ▼
┌──────────────┐   ┌──────────────────┐
│ Navigate to  │   │ Show Modal:      │
│ /relance     │   │ "Relance actif   │
│              │   │  seulement pour  │
│              │   │  les abonnés"    │
└──────────────┘   └──────────────────┘
```

### Subscription Check Implementation

**Location**: `src/pages/Home.tsx:180-193`, `src/pages/Profile.tsx:290-301`, `src/pages/AdsPack.tsx:125-137`

```typescript
// Check subscription on component mount
useEffect(() => {
  const checkRelanceSubscription = async () => {
    try {
      const response = await sbcApiService.checkSubscription('RELANCE');
      const hasSub = response?.body?.data?.hasSubscription || false;
      setHasRelanceSubscription(hasSub);
    } catch (error) {
      console.error('Error checking Relance subscription:', error);
      setHasRelanceSubscription(false);
    }
  };

  if (user) {
    checkRelanceSubscription();
  }
}, [user]);

// Button click handler
const handleRelanceClick = () => {
  if (hasRelanceSubscription && user?.role === 'admin') {
    navigate('/relance');
  } else {
    setShowRelanceModal(true);
  }
};
```

**Expected API Response**:
```json
{
  "statusCode": 200,
  "body": {
    "data": {
      "hasSubscription": true,
      "subscription": {
        "_id": "sub123",
        "type": "RELANCE",
        "status": "active",
        "startDate": "2025-10-01T00:00:00Z",
        "endDate": "2025-12-01T00:00:00Z"
      }
    }
  }
}
```

### Subscription Modal

Shows when user without subscription tries to access:

```
┌─────────────────────────────────────────────┐
│ 🎯 Relance - Suivi WhatsApp Automatique    │
├─────────────────────────────────────────────┤
│                                             │
│ Fonctionnalités exclusives :               │
│ ✅ Suivi automatique des filleuls          │
│ ✅ Messages WhatsApp personnalisés         │
│ ✅ Campagnes ciblées                       │
│ ✅ Statistiques détaillées                 │
│                                             │
│ Prix : 1 000 XAF/2 mois                    │
│                                             │
│ [Souscrire maintenant]  [Fermer]           │
└─────────────────────────────────────────────┘
```

**Implementation**: `src/pages/Home.tsx:440-488`, similar in Profile.tsx and AdsPack.tsx

---

## WhatsApp Connection

### QR Code Connection Flow

```
┌──────────────────────────────────────────┐
│ User clicks "Connecter WhatsApp"         │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ POST /api/relance/connect                │
│ Backend generates QR code                │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ Frontend displays QR code modal          │
│ Starts polling GET /api/relance/status   │
│ Every 3 seconds for 60 seconds           │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ User scans QR with WhatsApp mobile       │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ Backend detects connection               │
│ whatsappStatus changes to "connected"    │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ Frontend detects status change           │
│ Stops polling, closes modal              │
│ Shows success message                    │
└──────────────────────────────────────────┘
```

### Implementation Details

**Location**: `src/pages/RelancePage.tsx:202-242`

```typescript
// Connect button handler
const handleConnect = async () => {
  try {
    const response = await sbcApiService.relanceConnect();
    if (response.isSuccessByStatusCode && response.body?.data?.qr) {
      setQrCode(response.body.data.qr);
      setShowQrModal(true);
      startQrPolling();
    }
  } catch (err: any) {
    showMessage('Erreur de connexion', err.message, 'error');
  }
};

// QR polling logic
const startQrPolling = () => {
  setQrPollingActive(true);

  // Poll every 3 seconds
  qrPollingInterval.current = setInterval(async () => {
    const response = await sbcApiService.relanceGetStatus();
    if (response.isSuccessByStatusCode && response.body?.data) {
      const newStatus = response.body.data as RelanceStatus;
      setStatus(newStatus);

      // Stop polling when connected
      if (newStatus.whatsappStatus === 'connected') {
        stopQrPolling();
        setShowQrModal(false);
        setQrCode(null);
      }
    }
  }, 3000);

  // Timeout after 60 seconds
  qrPollingTimeout.current = setTimeout(() => {
    stopQrPolling();
  }, 60000);
};

const stopQrPolling = () => {
  if (qrPollingInterval.current) {
    clearInterval(qrPollingInterval.current);
    qrPollingInterval.current = null;
  }
  if (qrPollingTimeout.current) {
    clearTimeout(qrPollingTimeout.current);
    qrPollingTimeout.current = null;
  }
  setQrPollingActive(false);
};
```

### WhatsApp Status States

| Status | Description | UI Display |
|--------|-------------|------------|
| `disconnected` | No WhatsApp connection | Red badge "Déconnecté" + Connect button |
| `connected` | Active WhatsApp session | Green badge "Connecté" + Disconnect button |
| `expired` | Session expired (needs re-scan) | Orange badge "Expiré" + Reconnect button |

**Status Display**: `src/pages/RelancePage.tsx:453-473`

### Disconnect Flow

```typescript
const handleDisconnect = async () => {
  try {
    // force: false = preserve session for auto-reconnect
    // force: true = completely delete session (requires new QR)
    await sbcApiService.relanceDisconnect(false);
    await fetchStatus();
    showMessage('Déconnecté', 'WhatsApp déconnecté avec succès', 'success');
  } catch (err: any) {
    showMessage('Erreur', 'Échec de la déconnexion', 'error');
  }
};
```

---

## Campaign Management

### Campaign Types

#### 1. Default Campaign (Campagne par défaut)
- **Type**: `'default'`
- **Auto-enrollment**: All new unpaid referrals automatically enrolled 1 hour after registration
- **Always exists**: One per user (created automatically)
- **Auto-pause behavior**: Pauses when filtered campaigns are active (unless `allowSimultaneousCampaigns = true`)

#### 2. Filtered Campaigns (Campagnes ciblées)
- **Type**: `'filtered'`
- **Manual creation**: User defines target filters
- **Multiple allowed**: User can create many filtered campaigns
- **Sequential execution**: Can be queued to run after another campaign ends

### Campaign Status Lifecycle

```
draft → scheduled → active → completed
  │         │         │          │
  │         │         └─→ paused │
  │         └──────────→ cancelled
  └────────────────────→ cancelled
```

**Status Definitions**:
- `draft` - Created but not started
- `scheduled` - Waiting for start date or previous campaign to end
- `active` - Currently sending messages
- `paused` - Temporarily stopped (can resume)
- `completed` - All targets finished 7-day cycle
- `cancelled` - User manually cancelled

### Campaign Statistics

Each campaign tracks:
- `targetsEnrolled` - Total referrals enrolled
- `messagesSent` - Total messages sent
- `messagesDelivered` - Successfully delivered messages
- `messagesFailed` - Failed deliveries
- `targetsCompleted` - Finished 7-day cycle
- `targetsExited` - Left before completion (paid, manual exit, etc.)

---

## Default Campaign

### Auto-Enrollment Logic

**Backend Expected Behavior**:
1. When a new user registers via referral → Backend tracks them
2. After 1 hour, if still unpaid → Automatically add to default campaign
3. Set target status to `'active'`, `currentDay` to `1`
4. Schedule first message for immediate/next batch send

### Day-by-Day Progression

The frontend displays a 7-day progression chart showing what percentage of enrolled targets have reached each day.

**Location**: `src/pages/RelancePage.tsx:624-662`

**Algorithm**:
```typescript
// Fetch all targets for default campaign
GET /api/relance/campaigns/{defaultCampaignId}/targets

// For each target, count how many reached each day
targets.forEach(target => {
  for (day = 1; day <= target.currentDay; day++) {
    dayStats[day].total++
  }
});

// Calculate percentage for each day
for (day = 1; day <= 7; day++) {
  percentage = (dayStats[day].total / totalTargets) * 100
}
```

**Example Visual**:
```
Jour 1 ████████████████████ 100%  (150/150 targets)
Jour 2 ███████████████░░░░░ 85%   (127/150 targets)
Jour 3 ████████████░░░░░░░░ 70%   (105/150 targets)
Jour 4 ██████████░░░░░░░░░░ 60%   (90/150 targets)
Jour 5 ████████░░░░░░░░░░░░ 50%   (75/150 targets)
Jour 6 ██████░░░░░░░░░░░░░░ 40%   (60/150 targets)
Jour 7 ████░░░░░░░░░░░░░░░░ 30%   (45/150 targets)
```

This shows natural attrition as targets complete, exit, or pay.

### Campaign Controls

**Location**: `src/pages/RelancePage.tsx:664-678`

#### Pause/Resume Button

```typescript
// Toggle pause state
PATCH /api/relance/config
Body: { "defaultCampaignPaused": !currentState }

// UI reflects current state
if (defaultCampaignPaused) {
  // Show green "Réactiver la campagne" button with play icon
} else {
  // Show orange "Mettre en pause" button with pause icon
}
```

**Backend Requirements**:
- When paused: Stop enrolling new targets, stop sending messages
- When resumed: Resume enrollment and message sending
- Persist pause state across server restarts

#### Simultaneous Campaigns Toggle

```typescript
// Toggle simultaneous mode
PATCH /api/relance/config
Body: { "allowSimultaneousCampaigns": !currentState }

// Backend auto-adjusts default campaign based on new value
if (allowSimultaneousCampaigns === false && hasActiveFilteredCampaigns) {
  // Backend should automatically set defaultCampaignPaused = true
} else if (allowSimultaneousCampaigns === true) {
  // Backend can resume default campaign even with active filtered campaigns
}
```

**Visual States**:
- **ON** (green toggle): Default + filtered campaigns run together
- **OFF** (gray toggle): Default pauses when filtered campaigns are active

---

## Filtered Campaigns

### Campaign Creation Wizard

**Location**: `src/pages/RelancePage.tsx:805-1155`

The wizard is a 3-step process:

```
┌─────────────────────────────────────────┐
│ Étape 1: Nom et Filtres                 │
├─────────────────────────────────────────┤
│ 1. Campaign name                        │
│ 2. Country selection (button pills)     │
│ 3. Registration date range (month)      │
│ 4. Subscription status dropdown         │
│ 5. Additional filters (checkboxes)      │
│                                         │
│ [Aperçu des Résultats →]               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Étape 2: Aperçu des Résultats           │
├─────────────────────────────────────────┤
│ Total Cibles: 1,234 utilisateurs        │
│                                         │
│ Échantillon (5 utilisateurs):           │
│ • John Doe - Cameroun - 25 ans         │
│ • Jane Smith - France - 30 ans         │
│ • ...                                   │
│                                         │
│ [← Retour] [Créer la Campagne →]      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Étape 3: Confirmation                   │
├─────────────────────────────────────────┤
│ ✅ Campagne créée avec succès!         │
│                                         │
│ Nom: "Campagne France Octobre"          │
│ Cibles: 1,234 utilisateurs              │
│ Statut: Active                          │
│                                         │
│ [Fermer]                                │
└─────────────────────────────────────────┘
```

### Filter Structure

**Location**: `src/types/relance.ts:120-133`

```typescript
export interface CampaignFilter {
  // Primary filters
  countries?: string[];              // Array of ISO country codes
  registrationDateFrom?: string;     // ISO date string (e.g., "2025-10-01")
  registrationDateTo?: string;       // ISO date string (e.g., "2025-10-31")
  subscriptionStatus?: 'subscribed' | 'non-subscribed' | 'all';

  // Additional filters (optional)
  hasUnpaidReferrals?: boolean;      // Only users with unpaid referrals
  excludeCurrentTargets?: boolean;   // Don't re-target users already in campaigns
}
```

**Frontend Sends**:
```json
{
  "name": "Campagne Cameroun Octobre",
  "targetFilter": {
    "countries": ["CM", "FR", "SN"],
    "registrationDateFrom": "2025-10-01",
    "registrationDateTo": "2025-10-31",
    "subscriptionStatus": "non-subscribed",
    "hasUnpaidReferrals": true,
    "excludeCurrentTargets": true
  },
  "maxMessagesPerDay": 100,
  "scheduledStartDate": null,
  "runAfterCampaignId": null
}
```

### Filter Preview

**Step 1 → Step 2 Transition**:

```typescript
// User clicks "Aperçu des Résultats"
POST /api/relance/campaigns/preview
Body: { targetFilter: {...} }

// Backend responds with preview
Response: {
  totalCount: 1234,
  sampleUsers: [
    {
      name: "John Doe",
      email: "john@example.com",
      country: "CM",
      gender: "M",
      profession: "Entrepreneur",
      age: 25,
      createdAt: "2025-10-15T10:00:00Z"
    },
    // ... 4 more samples
  ],
  message: "1234 utilisateurs correspondent aux critères"
}
```

**UI Display**: `src/pages/RelancePage.tsx:1031-1090`

Shows:
- Total count in large green badge
- List of 5 sample users with details
- Button to proceed with campaign creation

### Campaign Creation

**Step 2 → Step 3 Transition**:

```typescript
// User clicks "Créer la Campagne"
POST /api/relance/campaigns
Body: {
  name: "Campagne Cameroun Octobre",
  targetFilter: { countries: ["CM"], ... },
  maxMessagesPerDay: 100,
  scheduledStartDate: null,
  runAfterCampaignId: null
}

// Backend responds
Response: {
  campaign: {
    _id: "camp123",
    name: "Campagne Cameroun Octobre",
    type: "filtered",
    status: "active",
    targetsEnrolled: 1234,
    estimatedTargetCount: 1234,
    actualTargetCount: 1234,
    createdAt: "2025-10-23T12:00:00Z"
  }
}
```

**Backend Requirements**:
1. Validate filter criteria
2. Query users matching all filter conditions
3. Create campaign record
4. Enroll matching users as targets (status: 'active', currentDay: 1)
5. If `allowSimultaneousCampaigns = false`, pause default campaign
6. Return created campaign with actual target count

---

## Filter UI Components

### Country Selection (Button Pills)

**Location**: `src/pages/RelancePage.tsx:846-880`

```tsx
<div className="flex flex-wrap gap-2">
  {countryOptions.map((country) => {
    const isSelected = filters.countries?.includes(country.code);
    return (
      <button
        onClick={() => toggleCountry(country.code)}
        className={isSelected ? 'bg-green-700 text-white' : 'bg-white text-gray-700'}
      >
        {country.label}
      </button>
    );
  })}
</div>
```

**Countries Available**: `src/utils/countriesData.ts`
- Cameroun (CM)
- France (FR)
- Sénégal (SN)
- Côte d'Ivoire (CI)
- Gabon (GA)
- Congo-Brazzaville (CG)
- Togo (TG)
- Bénin (BJ)
- Mali (ML)
- Burkina Faso (BF)
- Niger (NE)
- Tchad (TD)
- Guinée (GN)
- RD Congo (CD)
- Madagascar (MG)

### Registration Date Range (Month Picker)

**Location**: `src/pages/RelancePage.tsx:883-931`

```tsx
<div className="grid grid-cols-2 gap-3">
  <div>
    <label>De</label>
    <input
      type="month"
      value={filters.registrationDateFrom?.substring(0, 7) || ''}
      onChange={(e) => {
        const monthStr = e.target.value; // "2025-10"
        const isoDate = `${monthStr}-01`; // "2025-10-01"
        setFilters({ ...filters, registrationDateFrom: isoDate });
      }}
    />
  </div>
  <div>
    <label>À</label>
    <input type="month" ... />
  </div>
</div>
```

**Format**: Month picker returns "YYYY-MM", frontend converts to "YYYY-MM-01" for start, "YYYY-MM-31" for end.

### Subscription Status Dropdown

**Location**: `src/pages/RelancePage.tsx:934-958`

```tsx
<select
  value={filters.subscriptionStatus || 'all'}
  onChange={(e) => setFilters({
    ...filters,
    subscriptionStatus: e.target.value as 'subscribed' | 'non-subscribed' | 'all'
  })}
>
  <option value="all">Tous</option>
  <option value="subscribed">Abonnés uniquement</option>
  <option value="non-subscribed">Non-abonnés uniquement</option>
</select>
```

**Backend Interpretation**:
- `'all'` - No filter on subscription
- `'subscribed'` - Users with active SBC subscription
- `'non-subscribed'` - Users without active subscription

### Additional Filters (Checkboxes)

**Location**: `src/pages/RelancePage.tsx:961-1008`

```tsx
<div className="space-y-3">
  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={filters.hasUnpaidReferrals || false}
      onChange={(e) => setFilters({
        ...filters,
        hasUnpaidReferrals: e.target.checked
      })}
    />
    <span>Uniquement utilisateurs avec filleuls non payés</span>
  </label>

  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={filters.excludeCurrentTargets !== false}
      onChange={(e) => setFilters({
        ...filters,
        excludeCurrentTargets: e.target.checked
      })}
    />
    <span>Exclure les utilisateurs déjà ciblés</span>
  </label>
</div>
```

**Default Values**:
- `hasUnpaidReferrals`: `false` (unchecked)
- `excludeCurrentTargets`: `true` (checked by default)

---

## Campaign Display & Actions

### Filtered Campaign Cards

**Location**: `src/pages/RelancePage.tsx:695-802`

```
┌─────────────────────────────────────────────┐
│ 📊 Campagne Cameroun Octobre           [▼]  │
├─────────────────────────────────────────────┤
│ ▶️ Active • Démarrée le 23 oct. 2025       │
│                                             │
│ ┌──────────────┬──────────────┐            │
│ │ Cibles: 1234 │ Messages: 456│            │
│ └──────────────┴──────────────┘            │
│ ┌──────────────┬──────────────┐            │
│ │ Livraison 95%│ Terminés: 89 │            │
│ └──────────────┴──────────────┘            │
│                                             │
│ Progression globale:                        │
│ ██████████░░░░░░░░░░ 50%                   │
│                                             │
│ [Expand for details ▼]                     │
└─────────────────────────────────────────────┘
```

### Expanded Campaign Details

When user clicks expand icon, shows:

```
┌─────────────────────────────────────────────┐
│ Filtres appliqués:                          │
│ • Pays: Cameroun, France                    │
│ • Période: Oct 2025                         │
│ • Statut: Non-abonnés uniquement           │
│ • Avec filleuls non payés                  │
│                                             │
│ Actions:                                    │
│ [⏸️ Mettre en pause]  [❌ Annuler]        │
└─────────────────────────────────────────────┘
```

### Campaign Actions

**Pause Campaign**:
```typescript
POST /api/relance/campaigns/{campaignId}/pause
// Backend: Set campaign.status = 'paused', stop sending messages
```

**Resume Campaign**:
```typescript
POST /api/relance/campaigns/{campaignId}/resume
// Backend: Set campaign.status = 'active', resume sending
```

**Cancel Campaign**:
```typescript
POST /api/relance/campaigns/{campaignId}/cancel
Body: { reason: "Campagne non efficace" }
// Backend: Set campaign.status = 'cancelled', exit all targets
```

**Implementation**: `src/pages/RelancePage.tsx:318-406`

---

## API Endpoints Reference

### Complete Endpoint List

| Method | Endpoint | Frontend Method | Purpose |
|--------|----------|-----------------|---------|
| **Connection** ||||
| POST | `/api/relance/connect` | `relanceConnect()` | Generate QR code |
| GET | `/api/relance/status` | `relanceGetStatus()` | Get connection & config status |
| DELETE | `/api/relance/disconnect` | `relanceDisconnect(force?)` | Logout WhatsApp |
| **Campaigns** ||||
| GET | `/api/relance/campaigns` | `relanceGetCampaigns(filters?)` | List all campaigns |
| GET | `/api/relance/campaigns/:id` | `relanceGetCampaign(id)` | Get single campaign |
| GET | `/api/relance/campaigns/:id/targets` | `relanceGetCampaignTargets(id, params?)` | Get enrolled referrals |
| POST | `/api/relance/campaigns/preview` | `relancePreviewFilters(filter)` | Preview filter results |
| POST | `/api/relance/campaigns` | `relanceCreateCampaign(data)` | Create new campaign |
| POST | `/api/relance/campaigns/:id/start` | `relanceStartCampaign(id)` | Start campaign |
| POST | `/api/relance/campaigns/:id/pause` | `relancePauseCampaign(id)` | Pause campaign |
| POST | `/api/relance/campaigns/:id/resume` | `relanceResumeCampaign(id)` | Resume campaign |
| POST | `/api/relance/campaigns/:id/cancel` | `relanceCancelCampaign(id, reason)` | Cancel campaign |
| **Configuration** ||||
| PATCH | `/api/relance/config` | `relanceUpdateConfig(config)` | Update settings |
| **Targets** ||||
| GET | `/api/relance/targets` | `relanceGetTargets()` | Get user's active referrals |

### Detailed Endpoint Specifications

#### POST /api/relance/connect

**Request**:
```json
{}  // Empty body
```

**Response**:
```json
{
  "statusCode": 200,
  "body": {
    "data": {
      "qr": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
      "message": "Scannez ce QR code avec WhatsApp"
    }
  }
}
```

**Backend Requirements**:
- Generate WhatsApp Web session
- Create QR code as base64 data URL
- Start session monitoring
- Update `whatsappStatus` to `'connected'` when scanned

---

#### GET /api/relance/status

**Request**: No parameters

**Response**:
```json
{
  "statusCode": 200,
  "body": {
    "data": {
      "whatsappStatus": "connected",
      "enabled": true,
      "enrollmentPaused": false,
      "sendingPaused": false,
      "defaultCampaignPaused": false,
      "allowSimultaneousCampaigns": false,
      "messagesSentToday": 45,
      "maxMessagesPerDay": 100,
      "maxTargetsPerCampaign": 1000,
      "lastQrScanDate": "2025-10-23T08:00:00Z",
      "lastConnectionCheck": "2025-10-23T12:00:00Z",
      "connectionFailureCount": 0,
      "lastConnectionFailure": null
    }
  }
}
```

**Usage**: Called on page load, after config changes, and during QR polling

---

#### GET /api/relance/campaigns

**Request Parameters**:
```
?type=default     // Filter by campaign type
?type=filtered
?status=active    // Filter by status
```

**Response**:
```json
{
  "statusCode": 200,
  "body": {
    "data": {
      "campaigns": [
        {
          "_id": "camp123",
          "userId": "user456",
          "name": "Campagne par défaut",
          "type": "default",
          "status": "active",
          "targetsEnrolled": 150,
          "messagesSent": 450,
          "messagesDelivered": 428,
          "messagesFailed": 22,
          "targetsCompleted": 30,
          "targetsExited": 15,
          "maxMessagesPerDay": 100,
          "actualStartDate": "2025-10-01T00:00:00Z",
          "createdAt": "2025-10-01T00:00:00Z",
          "updatedAt": "2025-10-23T12:00:00Z"
        }
      ],
      "total": 1,
      "page": 1,
      "totalPages": 1
    }
  }
}
```

**Frontend Handling**:
```typescript
// Handles both response structures
const campaigns = response.body.data.campaigns || response.body.data;
```

---

#### GET /api/relance/campaigns/:id/targets

**Request Parameters**:
```
?page=1
?limit=100
```

**Response**:
```json
{
  "statusCode": 200,
  "body": {
    "data": {
      "targets": [
        {
          "_id": "target123",
          "referralUserId": "user789",
          "referrerUserId": "user456",
          "campaignId": "camp123",
          "currentDay": 3,
          "status": "active",
          "enteredLoopAt": "2025-10-20T10:00:00Z",
          "nextMessageDue": "2025-10-23T10:00:00Z",
          "messageDeliveries": [
            {
              "day": 1,
              "sentAt": "2025-10-20T10:05:00Z",
              "status": "delivered"
            },
            {
              "day": 2,
              "sentAt": "2025-10-21T10:05:00Z",
              "status": "delivered"
            },
            {
              "day": 3,
              "sentAt": "2025-10-22T10:05:00Z",
              "status": "failed",
              "errorMessage": "Phone number not registered on WhatsApp"
            }
          ],
          "exitReason": null,
          "exitedAt": null,
          "completedAt": null,
          "createdAt": "2025-10-20T10:00:00Z",
          "updatedAt": "2025-10-22T10:05:00Z"
        }
      ],
      "total": 150,
      "page": 1,
      "totalPages": 2
    }
  }
}
```

**Critical Fields for Day Progression**:
- `currentDay` - MUST be 1-7
- `status` - MUST be 'active', 'completed', 'paused', or 'exited'

---

#### POST /api/relance/campaigns/preview

**Request**:
```json
{
  "targetFilter": {
    "countries": ["CM", "FR"],
    "registrationDateFrom": "2025-10-01",
    "registrationDateTo": "2025-10-31",
    "subscriptionStatus": "non-subscribed",
    "hasUnpaidReferrals": true,
    "excludeCurrentTargets": true
  }
}
```

**Response**:
```json
{
  "statusCode": 200,
  "body": {
    "data": {
      "totalCount": 1234,
      "sampleUsers": [
        {
          "name": "John Doe",
          "email": "john@example.com",
          "country": "CM",
          "gender": "M",
          "profession": "Entrepreneur",
          "age": 25,
          "createdAt": "2025-10-15T10:00:00Z"
        },
        {
          "name": "Jane Smith",
          "email": "jane@example.com",
          "country": "FR",
          "gender": "F",
          "profession": "Teacher",
          "age": 30,
          "createdAt": "2025-10-12T14:30:00Z"
        }
        // ... 3 more samples (5 total)
      ],
      "message": "1234 utilisateurs correspondent aux critères"
    }
  }
}
```

**Backend Requirements**:
- Apply ALL filter conditions with AND logic
- Return accurate total count
- Return exactly 5 random sample users
- Don't create campaign yet (preview only)

---

#### POST /api/relance/campaigns

**Request**:
```json
{
  "name": "Campagne Cameroun Octobre",
  "targetFilter": {
    "countries": ["CM"],
    "registrationDateFrom": "2025-10-01",
    "registrationDateTo": "2025-10-31",
    "subscriptionStatus": "non-subscribed",
    "excludeCurrentTargets": true
  },
  "maxMessagesPerDay": 100,
  "scheduledStartDate": null,
  "runAfterCampaignId": null
}
```

**Response**:
```json
{
  "statusCode": 201,
  "body": {
    "data": {
      "campaign": {
        "_id": "camp456",
        "userId": "user123",
        "name": "Campagne Cameroun Octobre",
        "type": "filtered",
        "status": "active",
        "targetFilter": {
          "countries": ["CM"],
          "registrationDateFrom": "2025-10-01",
          "registrationDateTo": "2025-10-31",
          "subscriptionStatus": "non-subscribed",
          "excludeCurrentTargets": true
        },
        "estimatedTargetCount": 1234,
        "actualTargetCount": 1234,
        "targetsEnrolled": 1234,
        "messagesSent": 0,
        "messagesDelivered": 0,
        "messagesFailed": 0,
        "targetsCompleted": 0,
        "targetsExited": 0,
        "maxMessagesPerDay": 100,
        "scheduledStartDate": null,
        "actualStartDate": "2025-10-23T12:00:00Z",
        "runAfterCampaignId": null,
        "createdAt": "2025-10-23T12:00:00Z",
        "updatedAt": "2025-10-23T12:00:00Z"
      }
    }
  }
}
```

**Backend Requirements**:
1. Validate user has Relance subscription
2. Query users matching filter criteria
3. Create campaign record
4. Create RelanceTarget records for each matching user
5. Set targets: `status='active'`, `currentDay=1`
6. If `allowSimultaneousCampaigns=false`, set `defaultCampaignPaused=true`
7. Schedule message sending job

---

#### PATCH /api/relance/config

**Request Examples**:

```json
// Pause default campaign
{
  "defaultCampaignPaused": true
}

// Toggle simultaneous campaigns
{
  "allowSimultaneousCampaigns": true
}

// Update rate limits
{
  "maxMessagesPerDay": 200,
  "maxTargetsPerCampaign": 2000
}
```

**Response**:
```json
{
  "statusCode": 200,
  "body": {
    "data": {
      "config": {
        "defaultCampaignPaused": true,
        "allowSimultaneousCampaigns": false,
        "maxMessagesPerDay": 100,
        "maxTargetsPerCampaign": 1000
      }
    }
  }
}
```

**Backend Logic**:

When `allowSimultaneousCampaigns` changes:
```javascript
if (allowSimultaneousCampaigns === false && hasActiveFilteredCampaigns()) {
  // Auto-pause default campaign
  config.defaultCampaignPaused = true;
} else if (allowSimultaneousCampaigns === true && config.defaultCampaignPaused) {
  // Can optionally auto-resume default campaign
  config.defaultCampaignPaused = false;
}
```

---

## Data Structures

### RelanceConfig (User Settings)

**Collection**: `relanceconfigs`

```typescript
{
  _id: ObjectId,
  userId: ObjectId,                    // Reference to User
  enabled: boolean,                    // Master switch
  enrollmentPaused: boolean,           // Pause new enrollments only
  sendingPaused: boolean,              // Pause sending only
  defaultCampaignPaused: boolean,      // Pause default campaign
  allowSimultaneousCampaigns: boolean, // Allow default + filtered together
  whatsappAuthData: string,            // Encrypted session data
  whatsappStatus: 'connected' | 'disconnected' | 'expired',
  lastQrScanDate: Date,
  lastConnectionCheck: Date,
  connectionFailureCount: number,      // 0-3, delete session after 3
  lastConnectionFailure: Date | null,
  messagesSentToday: number,           // Rate limiting counter
  maxMessagesPerDay: number,           // Default: 100
  maxTargetsPerCampaign: number,       // Default: 1000
  lastResetDate: Date,                 // For daily counter reset
  createdAt: Date,
  updatedAt: Date
}
```

### Campaign

**Collection**: `relancecampaigns`

```typescript
{
  _id: ObjectId,
  userId: ObjectId,                    // Campaign owner
  name: string,
  type: 'default' | 'filtered',
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled',
  targetFilter: {
    countries: string[],               // ISO codes
    registrationDateFrom: Date,
    registrationDateTo: Date,
    subscriptionStatus: 'subscribed' | 'non-subscribed' | 'all',
    hasUnpaidReferrals: boolean,
    excludeCurrentTargets: boolean
  },
  estimatedTargetCount: number,        // From preview
  actualTargetCount: number,           // After enrollment
  targetsEnrolled: number,             // Counter
  messagesSent: number,                // Counter
  messagesDelivered: number,           // Counter
  messagesFailed: number,              // Counter
  targetsCompleted: number,            // Counter
  targetsExited: number,               // Counter
  maxMessagesPerDay: number,
  scheduledStartDate: Date | null,
  actualStartDate: Date | null,
  actualEndDate: Date | null,
  estimatedEndDate: Date | null,
  runAfterCampaignId: ObjectId | null, // For sequential campaigns
  createdAt: Date,
  updatedAt: Date
}
```

### RelanceTarget (Referral in Campaign)

**Collection**: `relancetargets`

```typescript
{
  _id: ObjectId,
  referralUserId: ObjectId,            // The unpaid referral
  referrerUserId: ObjectId,            // The SBC member who referred them
  campaignId: ObjectId,                // Campaign they're enrolled in
  currentDay: number,                  // 1-7 (CRITICAL for progression)
  status: 'active' | 'completed' | 'paused' | 'exited',
  enteredLoopAt: Date,
  nextMessageDue: Date,
  messageDeliveries: [
    {
      day: number,                     // 1-7
      sentAt: Date,
      status: 'delivered' | 'failed',
      errorMessage: string | null
    }
  ],
  exitReason: 'paid' | 'completed_7days' | 'manual' | 'referrer_inactive' | 'campaign_cancelled' | null,
  exitedAt: Date | null,
  completedAt: Date | null,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes Needed**:
```javascript
{ campaignId: 1, status: 1 }           // Fast campaign target queries
{ referrerUserId: 1, status: 1 }       // Fast user target queries
{ nextMessageDue: 1, status: 1 }       // Message scheduling
{ referralUserId: 1 }                  // Check if already targeted
```

---

## Error Handling

### API Error Response Format

```json
{
  "statusCode": 400,
  "body": {
    "error": {
      "message": "Invalid filter criteria",
      "code": "INVALID_FILTER",
      "details": {
        "field": "registrationDateFrom",
        "issue": "Date must be in ISO format"
      }
    }
  }
}
```

### Frontend Error Handling

**Location**: `src/pages/RelancePage.tsx:58-74`

```typescript
const showMessage = (title: string, message: string, type: 'success' | 'error' | 'info') => {
  setMessageModal({ show: true, title, message, type });
};

// Usage in try-catch blocks
try {
  const response = await sbcApiService.relanceCreateCampaign(data);
  if (response.isSuccessByStatusCode) {
    showMessage('Succès', 'Campagne créée avec succès', 'success');
  }
} catch (err: any) {
  showMessage('Erreur', err.message || 'Échec de la création', 'error');
}
```

### Common Error Scenarios

| Error | Frontend Handling |
|-------|-------------------|
| No subscription | Show subscription modal, prevent access |
| WhatsApp disconnected | Show red status badge, disable campaign actions |
| Invalid filter | Show error message, stay on Step 1 |
| No targets match filter | Show warning "Aucun utilisateur ne correspond" |
| Rate limit exceeded | Show error "Limite de messages atteinte pour aujourd'hui" |
| Session expired | Show "Session expirée, veuillez reconnecter WhatsApp" |

---

## Testing Scenarios

### Scenario 1: New User Onboarding

```
1. User subscribes to Relance (1000 XAF)
   ✓ checkSubscription returns hasSubscription: true

2. User navigates to /relance
   ✓ Page loads without subscription modal
   ✓ Shows WhatsApp connection section

3. User clicks "Connecter WhatsApp"
   ✓ POST /api/relance/connect
   ✓ QR code modal appears
   ✓ Polling starts (GET /api/relance/status every 3s)

4. User scans QR with WhatsApp
   ✓ Backend detects connection
   ✓ whatsappStatus changes to 'connected'
   ✓ Frontend detects change, closes modal

5. Default campaign auto-created
   ✓ GET /api/relance/campaigns?type=default
   ✓ Returns default campaign with 0 targets
   ✓ UI shows default campaign card

6. User has 2 referrals who registered today
   ✓ After 1 hour, backend enrolls them in default campaign
   ✓ Frontend refresh shows 2 targets enrolled
   ✓ Day 1 progression shows 100%
```

### Scenario 2: Creating Filtered Campaign

```
1. User clicks "Nouvelle Campagne"
   ✓ Wizard modal opens (Step 1)

2. User fills filters:
   - Name: "Octobre Cameroun"
   - Countries: CM, FR
   - Date: Oct 2025
   - Status: Non-abonnés
   ✓ All fields update in state

3. User clicks "Aperçu des Résultats"
   ✓ POST /api/relance/campaigns/preview
   ✓ Backend returns totalCount: 1234, samples: [...]
   ✓ UI shows Step 2 with results

4. User clicks "Créer la Campagne"
   ✓ POST /api/relance/campaigns
   ✓ Backend creates campaign, enrolls 1234 targets
   ✓ If allowSimultaneousCampaigns=false, default campaign paused
   ✓ UI shows Step 3 confirmation
   ✓ Campaign appears in filtered campaigns list
```

### Scenario 3: Pause/Resume Default Campaign

```
1. Default campaign is active
   ✓ Status: defaultCampaignPaused = false
   ✓ Button shows "Mettre en pause" (orange)

2. User clicks pause button
   ✓ PATCH /api/relance/config { defaultCampaignPaused: true }
   ✓ Backend stops enrollment and sending
   ✓ GET /api/relance/status
   ✓ UI updates: button shows "Réactiver la campagne" (green)

3. User clicks resume button
   ✓ PATCH /api/relance/config { defaultCampaignPaused: false }
   ✓ Backend resumes enrollment and sending
   ✓ GET /api/relance/status
   ✓ UI updates: button shows "Mettre en pause" (orange)
```

### Scenario 4: Simultaneous Campaigns Toggle

```
Initial state:
- allowSimultaneousCampaigns = false
- Default campaign active
- No filtered campaigns

1. User creates filtered campaign
   ✓ POST /api/relance/campaigns
   ✓ Backend auto-sets defaultCampaignPaused = true
   ✓ GET /api/relance/status
   ✓ UI shows warning "Campagne automatiquement mise en pause..."

2. User enables simultaneous toggle
   ✓ PATCH /api/relance/config { allowSimultaneousCampaigns: true }
   ✓ Backend auto-resumes default campaign
   ✓ GET /api/relance/status
   ✓ defaultCampaignPaused = false
   ✓ Warning disappears, both campaigns run together

3. User disables simultaneous toggle
   ✓ PATCH /api/relance/config { allowSimultaneousCampaigns: false }
   ✓ Backend auto-pauses default campaign (filtered campaign still active)
   ✓ GET /api/relance/status
   ✓ defaultCampaignPaused = true
   ✓ Warning reappears
```

### Scenario 5: Day-by-Day Progression

```
Day 1: 100 targets enrolled
- All 100 have currentDay = 1
- Frontend shows: Day 1: 100%

Day 2: Messages sent to all 100
- 95 delivered (currentDay → 2)
- 5 failed (currentDay stays 1, retry scheduled)
- Frontend shows: Day 1: 100%, Day 2: 95%

Day 3: Retry failures, send to Day 2 targets
- 3 failed targets now delivered (currentDay → 3)
- 90 Day 2 targets delivered (currentDay → 3)
- 2 targets paid, exited
- Frontend shows: Day 1: 100%, Day 2: 98%, Day 3: 93%

Day 7: Final day
- 60 targets reached Day 7
- 30 completed (currentDay = 7, status = 'completed')
- 10 exited (paid during campaign)
- Frontend shows full progression curve
```

---

## Performance Considerations

### Rate Limiting

**Frontend Respects**:
- `maxMessagesPerDay` displayed in UI
- `messagesSentToday` counter shown
- Warning when approaching limit

**Backend Must Enforce**:
- Daily message limit per user
- Reset counter at midnight (user's timezone)
- Queue messages if limit reached
- Return 429 error if exceeded

### Pagination

**Current Implementation**:
- Campaigns list: Fetches all (no pagination)
- Targets list: Supports pagination (page, limit params) but frontend fetches all

**Recommendations**:
- Add pagination to campaign targets (100 per page)
- Add infinite scroll or "Load more" button
- Cache day stats calculation in backend

### Polling Strategy

**QR Code Polling**:
- Interval: 3 seconds
- Timeout: 60 seconds
- Stops when connected or timeout

**Recommendation**:
- Add optional WebSocket for real-time status updates
- Reduce polling frequency after 30 seconds (3s → 5s)

---

## Security Considerations

### Authentication

- All endpoints require JWT authentication
- Token stored in localStorage: `window.localStorage.getItem('token')`
- Automatic header injection via ApiService

### Authorization

- User can only access their own campaigns
- User can only modify their own config
- Backend must verify `userId` matches authenticated user

### WhatsApp Session Security

- Session data encrypted in database
- Never sent to frontend
- Automatic cleanup after 3 connection failures
- Force disconnect option available

### Rate Limiting

- Prevent abuse with message limits
- Track failed delivery attempts
- Block users with excessive failures

---

## Future Enhancements

### Planned Features (Not Yet Implemented)

1. **Message Customization**
   - Allow users to edit message templates
   - Support variables: {name}, {day}, {referrerName}

2. **Scheduling**
   - Schedule campaign start date
   - Queue campaigns to run after another

3. **Analytics Dashboard**
   - Conversion rate tracking
   - Response rate monitoring
   - ROI calculations

4. **A/B Testing**
   - Test different message variations
   - Automatic optimization

5. **Multi-language**
   - Support French and English messages
   - Auto-detect user language preference

---

## Appendix: File Locations

### Key Frontend Files

| File | Purpose |
|------|---------|
| `src/pages/RelancePage.tsx` | Main Relance page (1200+ lines) |
| `src/services/SBCApiService.ts` | API methods (lines 1331-1466) |
| `src/types/relance.ts` | TypeScript type definitions |
| `src/contexts/RelanceContext.tsx` | Relance state context (if exists) |
| `src/utils/countriesData.ts` | Country options for filters |
| `src/pages/Home.tsx` | Relance access button (lines 180-193, 440-488) |
| `src/pages/Profile.tsx` | Relance menu item (lines 290-301) |
| `src/pages/AdsPack.tsx` | Relance in Winner Pack (lines 125-137) |
| `src/pages/Abonnement.tsx` | Relance subscription card |

### Component Breakdown (RelancePage.tsx)

| Lines | Component |
|-------|-----------|
| 1-100 | State declarations, hooks, subscription check |
| 102-200 | API fetch functions (status, campaigns, targets, day stats) |
| 202-242 | WhatsApp connection handlers |
| 244-406 | Campaign action handlers (pause, resume, cancel) |
| 408-503 | Main page layout (header, status badge, refresh button) |
| 505-733 | Default campaign card with controls |
| 695-802 | Filtered campaigns list |
| 805-1155 | Campaign creation wizard (3 steps) |
| 1157-1212 | QR code modal |
| 1214-1260 | Message modal (success/error/info) |

---

## Contact & Questions

**Frontend Implementation**: Claude Code
**Date**: October 23, 2025
**Version**: 1.0.0

For questions or clarifications, refer to:
- `DEFAULT_CAMPAIGN_MONITORING_GUIDE.md` - Default campaign specs
- `RELANCE_MONITORING_IMPLEMENTATION.md` - Monitoring feature details
- This document - Complete feature overview

**Backend Team**: Please ensure all endpoints match the specifications in this document. Test thoroughly with the scenarios provided.

---

**End of Documentation**
