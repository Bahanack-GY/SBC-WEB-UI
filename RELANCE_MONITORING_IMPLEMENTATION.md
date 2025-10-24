# Relance Monitoring Implementation - Frontend Documentation

**Date**: 2025-10-23
**Developer**: Claude Code
**Feature**: Default Campaign Monitoring & Control

## Overview

This document describes how the frontend has implemented the Default Campaign Monitoring features as specified in `DEFAULT_CAMPAIGN_MONITORING_GUIDE.md`. This guide is for the backend team to understand what API endpoints are being called, what data is expected, and how the frontend processes the responses.

---

## API Endpoints Used

### 1. Get Campaign Targets
**Endpoint**: `GET /api/relance/campaigns/:campaignId/targets`
**Method**: `relanceGetCampaignTargets(campaignId, params?)`
**Location**: `src/services/SBCApiService.ts:1426-1433`

```typescript
async relanceGetCampaignTargets(campaignId: string, params?: {
  page?: number;
  limit?: number;
}): Promise<ApiResponse> {
  return await this.get(`/relance/campaigns/${campaignId}/targets`, {
    queryParameters: params
  });
}
```

**Expected Response Structure**:
```json
{
  "statusCode": 200,
  "body": {
    "data": {
      "targets": [
        {
          "_id": "target123",
          "referralUserId": "user456",
          "campaignId": "campaign789",
          "currentDay": 3,
          "status": "active",
          "enteredLoopAt": "2025-10-20T10:00:00Z",
          "messageDeliveries": [...],
          ...
        }
      ],
      "total": 150,
      "page": 1,
      "totalPages": 1
    }
  }
}
```

**Frontend Usage**:
- Called in `fetchDefaultCampaignDayStats()` to get all enrolled referrals
- Uses the `targets` array to calculate day-by-day progression statistics
- Falls back gracefully if `data.targets` or just `data` is returned

---

### 2. Get Single Campaign
**Endpoint**: `GET /api/relance/campaigns/:campaignId`
**Method**: `relanceGetCampaign(campaignId)`
**Location**: `src/services/SBCApiService.ts:1419-1421`

```typescript
async relanceGetCampaign(campaignId: string): Promise<ApiResponse> {
  return await this.get(`/relance/campaigns/${campaignId}`);
}
```

**Note**: This is an alias for `relanceGetCampaignDetails()` for consistency with the guide.

---

### 3. Update Relance Configuration
**Endpoint**: `PATCH /api/relance/config`
**Method**: `relanceUpdateConfig(config)`
**Location**: `src/services/SBCApiService.ts:1449-1456`

```typescript
async relanceUpdateConfig(config: {
  allowSimultaneousCampaigns?: boolean;
  maxMessagesPerDay?: number;
  maxTargetsPerCampaign?: number;
  defaultCampaignPaused?: boolean;
}): Promise<ApiResponse> {
  return await this.patch('/relance/config', { body: config });
}
```

**Frontend Sends**:
```json
// Pause/Resume default campaign
{
  "defaultCampaignPaused": true  // or false
}

// Toggle simultaneous campaigns
{
  "allowSimultaneousCampaigns": true  // or false
}
```

**Expected Response**:
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

---

### 4. Get Relance Status
**Endpoint**: `GET /api/relance/status`
**Method**: `relanceGetStatus()`
**Location**: Already implemented

**Frontend Expects**:
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

**Critical Fields Used by Frontend**:
- `defaultCampaignPaused` - Controls pause/resume button state
- `allowSimultaneousCampaigns` - Controls toggle switch state

---

## Frontend Implementation Details

### Day-by-Day Progression Calculation

**Location**: `src/pages/RelancePage.tsx:154-200`

**Algorithm**:
```typescript
const fetchDefaultCampaignDayStats = async (campaignId: string) => {
  // 1. Fetch all targets for the campaign
  const response = await sbcApiService.relanceGetCampaignTargets(campaignId);
  const targets = response.body.data.targets || response.body.data;

  // 2. Initialize day statistics (days 1-7)
  const dayStats = {};
  for (let i = 1; i <= 7; i++) {
    dayStats[i] = { total: 0, active: 0 };
  }

  // 3. Count targets for each day
  targets.forEach((target) => {
    const currentDay = target.currentDay || 1;
    const status = target.status;

    // Count this target for all days up to their current day
    for (let day = 1; day <= Math.min(currentDay, 7); day++) {
      dayStats[day].total += 1;
      if (status === 'active' && day === currentDay) {
        dayStats[day].active += 1;
      }
    }
  });

  // 4. Calculate percentages
  const statsArray = [];
  for (let day = 1; day <= 7; day++) {
    const percentage = dayStats[day].total > 0
      ? (dayStats[day].total / targets.length) * 100
      : 0;
    statsArray.push({ day, percentage });
  }

  setDefaultCampaignDayStats(statsArray);
};
```

**What Backend Needs to Provide**:
- Each target MUST have `currentDay` (1-7) indicating their progress
- Each target MUST have `status` ('active', 'completed', 'paused', 'exited')
- The targets array should include ALL enrolled referrals for the campaign

**Example Calculation**:
- If 100 targets enrolled:
  - 100 reached Day 1 → 100%
  - 85 reached Day 2 → 85%
  - 70 reached Day 3 → 70%
  - 60 reached Day 4 → 60%
  - 50 reached Day 5 → 50%
  - 40 reached Day 6 → 40%
  - 30 reached Day 7 → 30%

This shows the natural attrition as targets complete, exit, or get paused.

---

### Pause/Resume Control Flow

**Location**: `src/pages/RelancePage.tsx:600-638`

**User Action Flow**:
```
1. User clicks "Mettre en pause" or "Réactiver la campagne" button
2. Frontend reads current state: status?.defaultCampaignPaused
3. Frontend sends PATCH request with opposite value
4. Backend updates config
5. Frontend calls fetchStatus() to refresh
6. UI updates button text and color
```

**Button States**:
- **Paused** (defaultCampaignPaused = true):
  - Button color: Green (bg-green-500)
  - Button text: "Réactiver la campagne"
  - Icon: Play icon (FaPlay)

- **Active** (defaultCampaignPaused = false):
  - Button color: Orange (bg-orange-500)
  - Button text: "Mettre en pause"
  - Icon: Pause icon (FaPause)

**Auto-Pause Warning**:
If `defaultCampaignPaused = true` AND `allowSimultaneousCampaigns = false`, shows:
> "ℹ️ Cette campagne est automatiquement mise en pause car vous avez des campagnes ciblées actives."

---

### Simultaneous Campaigns Toggle

**Location**: `src/pages/RelancePage.tsx:640-678`

**User Action Flow**:
```
1. User clicks toggle switch
2. Frontend reads current state: status?.allowSimultaneousCampaigns
3. Frontend sends PATCH request with opposite value
4. Backend updates config
5. Backend may automatically resume/pause default campaign based on new value
6. Frontend calls fetchStatus() to refresh
7. UI updates toggle visual state
```

**Toggle States**:
- **Enabled** (allowSimultaneousCampaigns = true):
  - Switch color: Green (bg-green-500)
  - Handle position: Right (translate-x-6)
  - Default campaign CAN run with filtered campaigns

- **Disabled** (allowSimultaneousCampaigns = false):
  - Switch color: Gray (bg-gray-300)
  - Handle position: Left (translate-x-1)
  - Default campaign AUTO-PAUSES when filtered campaigns are active

**Backend Expected Behavior**:
When `allowSimultaneousCampaigns` changes from `false` to `true`:
- If default campaign was auto-paused, backend should resume it
- User should be able to run default + filtered campaigns together

When `allowSimultaneousCampaigns` changes from `true` to `false`:
- If any filtered campaigns are active, backend should auto-pause default campaign
- Set `defaultCampaignPaused = true` automatically

---

## UI Components

### Default Campaign Card Structure

**Location**: `src/pages/RelancePage.tsx:505-733`

```
┌─────────────────────────────────────────────────┐
│ 🟢 Campagne par défaut                          │
├─────────────────────────────────────────────────┤
│ Campagne par défaut (Auto-inscription)     [▼] │
│ ▶️ Active - Tous les nouveaux filleuls...      │
├─────────────────────────────────────────────────┤
│ ┌──────────────┬──────────────┐                │
│ │ Cibles: 150  │ Messages: 89 │                │
│ └──────────────┴──────────────┘                │
│ ┌──────────────┬──────────────┐                │
│ │ Livraison: 95%│ Terminés: 30│                │
│ └──────────────┴──────────────┘                │
├─────────────────────────────────────────────────┤
│ Progression par jour (7 jours)                  │
│ Jour 1 ████████████████████ 100%               │
│ Jour 2 ███████████████░░░░░ 85%                │
│ Jour 3 ████████████░░░░░░░░ 70%                │
│ Jour 4 ██████████░░░░░░░░░░ 60%                │
│ Jour 5 ████████░░░░░░░░░░░░ 50%                │
│ Jour 6 ██████░░░░░░░░░░░░░░ 40%                │
│ Jour 7 ████░░░░░░░░░░░░░░░░ 30%                │
│ Pourcentage de cibles ayant atteint chaque jour│
├─────────────────────────────────────────────────┤
│ Contrôles de campagne                           │
│ ┌─────────────────────────────────────────────┐│
│ │ ⏸️ Mettre en pause                          ││
│ └─────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────┐│
│ │ Campagnes simultanées              [○──]   ││
│ │ Autoriser la campagne par défaut...        ││
│ └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

---

## Data Refresh Strategy

### When Data is Fetched

1. **Initial Load**:
   - `fetchStatus()` - Gets config and connection status
   - `fetchCampaigns()` - Gets all campaigns (default + filtered)
   - `fetchDefaultCampaignDayStats(campaignId)` - Gets targets and calculates progression

2. **After Config Changes**:
   - Pause/Resume button click → `fetchStatus()`
   - Toggle switch click → `fetchStatus()`

3. **Manual Refresh**:
   - User clicks refresh button → `fetchStatus()` + `fetchCampaigns()`

### No Polling (Currently)

The frontend does NOT automatically poll for updates. The backend monitoring guide mentions periodic stats refresh, but this is not yet implemented in the frontend.

**Future Enhancement Opportunity**:
Consider adding a polling interval (e.g., every 30 seconds) to refresh stats automatically while user is viewing the page.

---

## Error Handling

### API Call Failures

All API calls are wrapped in try-catch blocks:

```typescript
try {
  await sbcApiService.relanceUpdateConfig({ defaultCampaignPaused: true });
  await fetchStatus();
  showMessage('Succès', 'Campagne mise en pause', 'success');
} catch (error: any) {
  showMessage('Erreur', 'Échec de la mise à jour de la configuration', 'error');
}
```

### Fallback Behavior

1. **No Targets Available**:
   - Shows mock progression data (100%, 85%, 70%, ...)
   - Displays "(Calcul en cours...)" indicator

2. **Invalid Response Structure**:
   - Handles both `data.targets` and `data` as array
   - Falls back to empty array if neither is valid

3. **Missing Campaign**:
   - Shows empty state with pause emoji
   - Message: "En attente d'activation"

---

## TypeScript Type Definitions

**Location**: `src/types/relance.ts`

### Key Interfaces Used

```typescript
// Status from GET /api/relance/status
export interface RelanceStatus {
  whatsappStatus: WhatsAppStatus;
  enabled: boolean;
  enrollmentPaused: boolean;
  sendingPaused: boolean;
  defaultCampaignPaused: boolean;           // ← Used for pause/resume
  allowSimultaneousCampaigns: boolean;      // ← Used for toggle
  messagesSentToday: number;
  maxMessagesPerDay: number;
  maxTargetsPerCampaign: number;
  lastQrScanDate?: string;
  lastConnectionCheck?: string;
  connectionFailureCount: number;
  lastConnectionFailure?: string | null;
}

// Config update request to PATCH /api/relance/config
export interface RelanceConfigUpdate {
  allowSimultaneousCampaigns?: boolean;
  maxMessagesPerDay?: number;
  maxTargetsPerCampaign?: number;
  defaultCampaignPaused?: boolean;
}

// Campaign from GET /api/relance/campaigns
export interface Campaign {
  _id: string;
  userId: string;
  name: string;
  type: CampaignType;                    // 'default' | 'filtered'
  status: CampaignStatus;
  targetsEnrolled: number;               // ← Used in stats
  messagesSent: number;                  // ← Used in stats
  messagesDelivered: number;             // ← Used in stats
  targetsCompleted: number;              // ← Used in stats
  // ... other fields
}

// Target from GET /api/relance/campaigns/:id/targets
export interface RelanceTarget {
  _id: string;
  referralUserId: string;
  campaignId: string;
  currentDay: number;                    // ← CRITICAL: 1-7 for progression
  status: RelanceTargetStatus;           // ← CRITICAL: 'active' | 'completed' | 'paused' | 'exited'
  enteredLoopAt: string;
  messageDeliveries: MessageDelivery[];
  // ... other fields
}
```

---

## Testing Checklist for Backend

### Endpoint Validation

- [ ] `GET /api/relance/campaigns/:id/targets` returns valid targets array
- [ ] Each target has `currentDay` (number 1-7)
- [ ] Each target has `status` (string)
- [ ] `PATCH /api/relance/config` accepts `defaultCampaignPaused` boolean
- [ ] `PATCH /api/relance/config` accepts `allowSimultaneousCampaigns` boolean
- [ ] `GET /api/relance/status` includes both config fields in response

### Logic Validation

- [ ] When `allowSimultaneousCampaigns = false` and filtered campaign starts → default campaign auto-pauses
- [ ] When `allowSimultaneousCampaigns = false` and all filtered campaigns end → default campaign auto-resumes
- [ ] When `allowSimultaneousCampaigns = true` → both campaign types can run together
- [ ] Manual pause via `defaultCampaignPaused = true` works regardless of simultaneous setting
- [ ] Manual resume via `defaultCampaignPaused = false` works if no filtered campaigns (when simultaneous = false)

### Data Integrity

- [ ] Day progression shows natural attrition (100% → lower percentages)
- [ ] Targets in Day 7 should have all 7 message deliveries
- [ ] Completed targets should have `status = 'completed'`
- [ ] Paused targets should have `status = 'paused'`
- [ ] Exited targets (paid/cancelled) should have appropriate exit reason

---

## Known Limitations

1. **No Real-Time Updates**: Frontend doesn't poll for changes. User must manually refresh.
2. **No Pagination for Targets**: Currently fetches all targets without pagination (could be slow for large campaigns).
3. **Mock Data Fallback**: If targets API fails, shows mock progression (may confuse users).
4. **No Validation**: Frontend doesn't validate if pause is allowed before sending request.

---

## Future Enhancements

### Recommended by Backend Guide

1. **Auto-Refresh Stats**: Poll every 30-60 seconds while page is active
2. **Targets List Display**: Show enrolled referrals with their current day and status
3. **Real-Time Indicators**: Show when auto-pause is triggered by filtered campaigns
4. **Config Limits Display**: Show `maxMessagesPerDay` and `maxTargetsPerCampaign` in UI

### Performance Optimizations

1. **Paginated Targets**: Fetch targets in batches (100 at a time)
2. **Cached Stats**: Store day stats in backend, fetch pre-calculated percentages
3. **WebSocket Updates**: Real-time status updates instead of polling

---

## Contact & Support

**Frontend Developer**: Claude Code
**Implementation Date**: October 23, 2025
**Files Modified**:
- `src/services/SBCApiService.ts` (lines 1419-1433, 1449-1456)
- `src/pages/RelancePage.tsx` (lines 29, 154-200, 598-678, 624-662)
- `src/types/relance.ts` (existing interfaces)

**Questions?** Check the DEFAULT_CAMPAIGN_MONITORING_GUIDE.md or contact the frontend team.

---

## Example API Call Sequences

### Scenario 1: User Pauses Default Campaign

```
1. GET /api/relance/status
   Response: { defaultCampaignPaused: false, allowSimultaneousCampaigns: false }

2. User clicks "Mettre en pause"

3. PATCH /api/relance/config
   Body: { "defaultCampaignPaused": true }
   Response: { config: { defaultCampaignPaused: true, ... } }

4. GET /api/relance/status
   Response: { defaultCampaignPaused: true, allowSimultaneousCampaigns: false }

5. UI updates: Button shows "Réactiver la campagne" (green)
```

### Scenario 2: User Enables Simultaneous Campaigns

```
1. GET /api/relance/status
   Response: { defaultCampaignPaused: true, allowSimultaneousCampaigns: false }

2. User clicks toggle switch

3. PATCH /api/relance/config
   Body: { "allowSimultaneousCampaigns": true }
   Response: { config: { defaultCampaignPaused: false, allowSimultaneousCampaigns: true } }
   Note: Backend auto-resumed default campaign

4. GET /api/relance/status
   Response: { defaultCampaignPaused: false, allowSimultaneousCampaigns: true }

5. UI updates: Toggle green, button shows "Mettre en pause"
```

### Scenario 3: Page Load with Targets

```
1. GET /api/relance/status
   Response: { whatsappStatus: 'connected', defaultCampaignPaused: false, ... }

2. GET /api/relance/campaigns?type=default
   Response: { campaigns: [{ _id: 'abc123', type: 'default', targetsEnrolled: 150, ... }] }

3. GET /api/relance/campaigns?type=filtered
   Response: { campaigns: [...] }

4. GET /api/relance/campaigns/abc123/targets
   Response: {
     targets: [
       { currentDay: 1, status: 'active', ... },
       { currentDay: 3, status: 'active', ... },
       { currentDay: 7, status: 'completed', ... },
       ...
     ],
     total: 150
   }

5. Frontend calculates day percentages
6. UI renders with real data
```

---

**End of Documentation**
