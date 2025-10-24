# Relance Feature - Correct Architecture Guide

**Date**: 2025-10-23
**Purpose**: Backend implementation guide with CORRECT architecture understanding

---

## 🎯 Core Concept

**Relance = WhatsApp follow-up system for unpaid referrals (7-day messaging cycle)**

### TWO SEPARATE SYSTEMS:

1. **Default Relance** (Auto-inscription) - Background automatic system
2. **Filtered Campaigns** - User-created manual campaigns

⚠️ **CRITICAL**: Default relance is **NOT a campaign**! It's a completely separate background system.

---

## 📊 Database Architecture

### 1. RelanceConfig (1 per user)

```javascript
{
  _id: ObjectId,
  userId: ObjectId,              // SBC member
  enabled: boolean,              // Master switch
  whatsappStatus: 'connected' | 'disconnected' | 'expired',
  whatsappAuthData: String,      // Encrypted WhatsApp session

  // Control settings
  enrollmentPaused: boolean,        // Pause ALL enrollments (default + filtered)
  sendingPaused: boolean,           // Pause ALL message sending
  defaultCampaignPaused: boolean,   // Pause ONLY default relance enrollments
  allowSimultaneousCampaigns: boolean, // Can default + filtered run together?

  // Limits
  maxMessagesPerDay: 100,
  maxTargetsPerCampaign: 1000,

  // Rate limiting
  messagesSentToday: 0,
  lastResetDate: Date,              // For daily counter reset

  // Connection tracking
  lastQrScanDate: Date,
  lastConnectionCheck: Date,
  connectionFailureCount: 0,        // 0-3, delete session after 3
  lastConnectionFailure: Date | null
}
```

### 2. Campaign (ONLY for filtered campaigns)

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  name: "Cameroon January Campaign",
  type: "filtered",                // ALWAYS "filtered" - no "default" type!
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled',

  // Filters applied
  targetFilter: {
    countries: ["CM", "FR"],
    registrationDateFrom: "2025-01-01",
    registrationDateTo: "2025-01-31",
    subscriptionStatus: "non-subscribed",
    hasUnpaidReferrals: true,
    excludeCurrentTargets: true
  },

  // Stats
  estimatedTargetCount: 1234,
  actualTargetCount: 1234,
  targetsEnrolled: 1234,
  messagesSent: 456,
  messagesDelivered: 448,
  messagesFailed: 8,
  targetsCompleted: 89,
  targetsExited: 12,

  // Settings
  maxMessagesPerDay: 100,
  scheduledStartDate: null,
  actualStartDate: "2025-01-01T00:00:00Z",
  actualEndDate: null,
  runAfterCampaignId: null
}
```

⚠️ **NO Campaign document for default relance!**

### 3. RelanceTarget (Each enrolled referral)

```javascript
// DEFAULT RELANCE TARGET
{
  _id: ObjectId,
  referralUserId: ObjectId,      // The unpaid referral
  referrerUserId: ObjectId,      // The SBC member
  campaignId: null,              // ← NULL for default relance!
  currentDay: 3,                 // 1-7
  status: 'active',              // active | completed | paused | exited
  enteredLoopAt: "2025-01-20T10:00:00Z",
  nextMessageDue: "2025-01-23T11:00:00Z",
  messageDeliveries: [
    { day: 1, sentAt: "...", status: "delivered" },
    { day: 2, sentAt: "...", status: "delivered" },
    { day: 3, sentAt: "...", status: "delivered" }
  ],
  exitReason: null,
  completedAt: null
}

// FILTERED CAMPAIGN TARGET
{
  _id: ObjectId,
  referralUserId: ObjectId,
  referrerUserId: ObjectId,
  campaignId: ObjectId("campaign123"), // ← HAS campaign ID!
  currentDay: 2,
  status: 'active',
  // ... rest same as above
}
```

**Key Difference**: `campaignId` is `null` for default, `ObjectId` for filtered!

---

## 🔄 Background Jobs

### Job 1: Enrollment Job (Runs every hour)

```javascript
FOR EACH user WITH active RelanceConfig:

  // A. DEFAULT RELANCE ENROLLMENT
  IF config.enrollmentPaused === false
     AND config.defaultCampaignPaused === false:

    // Find unpaid referrals registered 1+ hours ago
    unpaidReferrals = findReferrals({
      referrerId: user._id,
      isPaid: false,
      createdAt: { $lte: Date.now() - 1hour },
      notAlreadyEnrolled: true
    })

    FOR EACH referral:
      CREATE RelanceTarget {
        referralUserId: referral._id,
        referrerUserId: user._id,
        campaignId: null,        // ← NULL!
        currentDay: 1,
        status: 'active',
        nextMessageDue: Date.now() + 1hour
      }

  // B. FILTERED CAMPAIGN ENROLLMENT
  activeCampaigns = Campaign.find({
    userId: user._id,
    status: 'active',
    type: 'filtered'
  })

  FOR EACH campaign:
    matchingReferrals = findReferrals(campaign.targetFilter)

    FOR EACH referral:
      CREATE RelanceTarget {
        referralUserId: referral._id,
        referrerUserId: user._id,
        campaignId: campaign._id,    // ← Campaign ID!
        currentDay: 1,
        status: 'active'
      }

      UPDATE campaign.targetsEnrolled++
```

### Job 2: Sender Job (Runs every 5 minutes)

```javascript
targets = RelanceTarget.find({
  status: 'active',
  nextMessageDue: { $lte: Date.now() }
})

FOR EACH target:
  // Get referrer config
  config = RelanceConfig.findOne({ userId: target.referrerUserId })

  // Check if sending is allowed
  IF config.sendingPaused: SKIP
  IF config.messagesSentToday >= config.maxMessagesPerDay: SKIP
  IF config.whatsappStatus !== 'connected': SKIP

  // Send message
  message = getMessage(target.currentDay, referral.language)
  result = sendWhatsAppMessage(config.whatsappClient, referral.phone, message)

  // Update target
  target.messageDeliveries.push({
    day: target.currentDay,
    sentAt: Date.now(),
    status: result.success ? 'delivered' : 'failed',
    errorMessage: result.error
  })

  IF result.success:
    target.currentDay++
    target.nextMessageDue = Date.now() + 24hours
    config.messagesSentToday++

    // Update stats
    IF target.campaignId === null:
      // Update global default stats (see GET /default/stats)
    ELSE:
      // Update campaign stats
      campaign = Campaign.findById(target.campaignId)
      campaign.messagesSent++
      campaign.messagesDelivered++

  IF target.currentDay > 7:
    target.status = 'completed'
    target.completedAt = Date.now()

    IF target.campaignId:
      campaign.targetsCompleted++
```

---

## 🚀 API Endpoints Implementation

### GET /api/relance/status

**Purpose**: Get connection status and config

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

**Frontend Uses**: Polled during QR scan, fetched after config changes

---

### GET /api/relance/campaigns/default/stats

**Purpose**: Get default relance statistics (NOT a campaign!)

**Query**:
```sql
-- Count all targets with campaignId: null for this user
defaultTargets = RelanceTarget.find({
  referrerUserId: userId,
  campaignId: null
})

targetsEnrolled = defaultTargets.count()
messagesSent = sum(defaultTargets.messageDeliveries.length)
messagesDelivered = count(defaultTargets.messageDeliveries WHERE status='delivered')
messagesFailed = count(defaultTargets.messageDeliveries WHERE status='failed')
targetsCompleted = count(defaultTargets WHERE status='completed')
targetsExited = count(defaultTargets WHERE status='exited')

config = RelanceConfig.findOne({ userId })
isPaused = config.defaultCampaignPaused
isActive = !config.enrollmentPaused && config.whatsappStatus === 'connected'
```

**Response**:
```json
{
  "statusCode": 200,
  "body": {
    "data": {
      "targetsEnrolled": 150,
      "messagesSent": 450,
      "messagesDelivered": 428,
      "messagesFailed": 22,
      "targetsCompleted": 30,
      "targetsExited": 15,
      "isPaused": false,
      "isActive": true
    }
  }
}
```

**Frontend Uses**: Displays in default relance card stats

---

### GET /api/relance/campaigns/default/targets

**Purpose**: Get targets enrolled in default relance

**Parameters**:
- `page` (default: 1)
- `limit` (default: 100)

**Query**:
```sql
targets = RelanceTarget.find({
  referrerUserId: userId,
  campaignId: null     -- Only default targets!
})
.sort({ createdAt: -1 })
.skip((page - 1) * limit)
.limit(limit)
.populate('referralUserId', 'name email phoneNumber')
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
          "referralUserId": {
            "_id": "user789",
            "name": "John Doe",
            "email": "john@example.com",
            "phoneNumber": "+237600000000"
          },
          "referrerUserId": "user456",
          "campaignId": null,
          "currentDay": 3,
          "status": "active",
          "enteredLoopAt": "2025-10-20T10:00:00Z",
          "nextMessageDue": "2025-10-23T10:00:00Z",
          "messageDeliveries": [
            { "day": 1, "sentAt": "2025-10-20T10:05:00Z", "status": "delivered" },
            { "day": 2, "sentAt": "2025-10-21T10:05:00Z", "status": "delivered" },
            { "day": 3, "sentAt": "2025-10-22T10:05:00Z", "status": "delivered" }
          ]
        }
      ],
      "total": 150,
      "page": 1,
      "totalPages": 2
    }
  }
}
```

**Frontend Uses**: Calculate day-by-day progression chart

---

### GET /api/relance/campaigns

**Purpose**: Get filtered campaigns ONLY (no default!)

**Parameters**:
- `status` (optional): Filter by campaign status

**Query**:
```sql
campaigns = Campaign.find({
  userId,
  type: 'filtered'   -- Only filtered campaigns!
})
.sort({ createdAt: -1 })
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
          "name": "Cameroon January Campaign",
          "type": "filtered",
          "status": "active",
          "targetFilter": {
            "countries": ["CM"],
            "registrationDateFrom": "2025-01-01",
            "registrationDateTo": "2025-01-31",
            "subscriptionStatus": "non-subscribed"
          },
          "targetsEnrolled": 1234,
          "messagesSent": 456,
          "messagesDelivered": 448,
          "messagesFailed": 8,
          "targetsCompleted": 89,
          "targetsExited": 12,
          "maxMessagesPerDay": 100,
          "createdAt": "2025-01-01T00:00:00Z"
        }
      ],
      "total": 5,
      "page": 1,
      "totalPages": 1
    }
  }
}
```

**Frontend Uses**: Display list of user's filtered campaigns

---

### GET /api/relance/campaigns/:campaignId/targets

**Purpose**: Get targets for specific filtered campaign

**Parameters**:
- `page`, `limit` (pagination)

**Query**:
```sql
campaign = Campaign.findOne({ _id: campaignId, userId })
IF NOT campaign: RETURN 404

targets = RelanceTarget.find({
  campaignId: campaignId
})
.populate('referralUserId')
```

**Response**: Same structure as default targets but with `campaignId` populated

**Frontend Uses**: Display campaign target details

---

### POST /api/relance/campaigns/preview

**Purpose**: Preview how many users match filter criteria

**Request**:
```json
{
  "targetFilter": {
    "countries": ["CM", "FR"],
    "registrationDateFrom": "2025-01-01",
    "registrationDateTo": "2025-01-31",
    "subscriptionStatus": "non-subscribed",
    "hasUnpaidReferrals": true,
    "excludeCurrentTargets": true
  }
}
```

**Query Logic**:
```javascript
const query = {
  referrerId: userId,   // User's referrals only
  isPaid: false         // Always unpaid for relance
}

// Apply filters
if (countries?.length) {
  query.country = { $in: countries }
}

if (registrationDateFrom || registrationDateTo) {
  query.createdAt = {}
  if (registrationDateFrom) query.createdAt.$gte = new Date(registrationDateFrom)
  if (registrationDateTo) query.createdAt.$lte = new Date(registrationDateTo)
}

if (subscriptionStatus === 'subscribed') {
  query.hasActiveSubscription = true
} else if (subscriptionStatus === 'non-subscribed') {
  query.hasActiveSubscription = false
}

if (hasUnpaidReferrals) {
  query.referralCount = { $gt: 0 }
}

if (excludeCurrentTargets) {
  // Exclude users already in any RelanceTarget
  const existingTargetUserIds = await RelanceTarget.find({
    referrerUserId: userId,
    status: { $in: ['active', 'paused'] }
  }).distinct('referralUserId')

  query._id = { $nin: existingTargetUserIds }
}

const totalCount = await User.countDocuments(query)
const sampleUsers = await User.find(query).limit(5).select('name email country gender profession age createdAt')
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
          "createdAt": "2025-01-15T10:00:00Z"
        }
        // ... 4 more samples
      ],
      "message": "1234 utilisateurs correspondent aux critères"
    }
  }
}
```

**Frontend Uses**: Step 2 of campaign wizard - show preview before creation

---

### POST /api/relance/campaigns

**Purpose**: Create new filtered campaign and enroll targets

**Request**:
```json
{
  "name": "Cameroon January Campaign",
  "targetFilter": {
    "countries": ["CM"],
    "registrationDateFrom": "2025-01-01",
    "registrationDateTo": "2025-01-31",
    "subscriptionStatus": "non-subscribed",
    "excludeCurrentTargets": true
  },
  "maxMessagesPerDay": 100,
  "scheduledStartDate": null,
  "runAfterCampaignId": null
}
```

**Backend Logic**:
```javascript
// 1. Create campaign
const campaign = await Campaign.create({
  userId,
  name: req.body.name,
  type: 'filtered',
  status: 'active',
  targetFilter: req.body.targetFilter,
  estimatedTargetCount: 0,  // Will calculate
  actualTargetCount: 0,
  targetsEnrolled: 0,
  maxMessagesPerDay: req.body.maxMessagesPerDay || 100,
  actualStartDate: new Date()
})

// 2. Find matching users (use same query as preview)
const matchingUsers = await findMatchingUsers(userId, req.body.targetFilter)

campaign.estimatedTargetCount = matchingUsers.length
campaign.actualTargetCount = matchingUsers.length

// 3. Enroll targets
for (const user of matchingUsers) {
  await RelanceTarget.create({
    referralUserId: user._id,
    referrerUserId: userId,
    campaignId: campaign._id,     // ← Campaign ID!
    currentDay: 1,
    status: 'active',
    enteredLoopAt: new Date(),
    nextMessageDue: new Date(Date.now() + 3600000) // 1 hour
  })

  campaign.targetsEnrolled++
}

await campaign.save()

// 4. Check if should auto-pause default relance
const config = await RelanceConfig.findOne({ userId })
if (!config.allowSimultaneousCampaigns) {
  config.defaultCampaignPaused = true
  await config.save()
}
```

**Response**:
```json
{
  "statusCode": 201,
  "body": {
    "data": {
      "campaign": {
        "_id": "camp123",
        "name": "Cameroon January Campaign",
        "type": "filtered",
        "status": "active",
        "targetsEnrolled": 1234,
        "actualTargetCount": 1234,
        "createdAt": "2025-01-01T00:00:00Z"
      }
    }
  }
}
```

---

### PATCH /api/relance/config

**Purpose**: Update relance configuration

**Request Examples**:

```json
// Pause default relance
{
  "defaultCampaignPaused": true
}

// Enable simultaneous campaigns
{
  "allowSimultaneousCampaigns": true
}

// Update rate limits
{
  "maxMessagesPerDay": 200,
  "maxTargetsPerCampaign": 2000
}
```

**Backend Logic**:
```javascript
const config = await RelanceConfig.findOne({ userId })

// Update fields
if (req.body.defaultCampaignPaused !== undefined) {
  config.defaultCampaignPaused = req.body.defaultCampaignPaused
}

if (req.body.allowSimultaneousCampaigns !== undefined) {
  config.allowSimultaneousCampaigns = req.body.allowSimultaneousCampaigns

  // Auto-logic
  if (!req.body.allowSimultaneousCampaigns) {
    // Check if user has active filtered campaigns
    const hasActiveCampaigns = await Campaign.exists({
      userId,
      status: 'active',
      type: 'filtered'
    })

    if (hasActiveCampaigns) {
      config.defaultCampaignPaused = true
    }
  } else {
    // Can optionally auto-resume default
    config.defaultCampaignPaused = false
  }
}

if (req.body.maxMessagesPerDay) {
  config.maxMessagesPerDay = req.body.maxMessagesPerDay
}

if (req.body.maxTargetsPerCampaign) {
  config.maxTargetsPerCampaign = req.body.maxTargetsPerCampaign
}

await config.save()
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

---

## 🎮 Frontend Implementation

### API Methods (SBCApiService.ts)

```typescript
// Default relance endpoints
async relanceGetDefaultStats(): Promise<ApiResponse> {
  return await this.get('/relance/campaigns/default/stats');
}

async relanceGetDefaultTargets(params?: {
  page?: number;
  limit?: number;
}): Promise<ApiResponse> {
  return await this.get('/relance/campaigns/default/targets', {
    queryParameters: params
  });
}

// Filtered campaigns endpoints (no "type" parameter!)
async relanceGetCampaigns(filters?: {
  status?: string;
}): Promise<ApiResponse> {
  return await this.get('/relance/campaigns', { queryParameters: filters });
}

async relanceGetCampaignTargets(campaignId: string, params?: {
  page?: number;
  limit?: number;
}): Promise<ApiResponse> {
  return await this.get(`/relance/campaigns/${campaignId}/targets`, {
    queryParameters: params
  });
}

// Config updates
async relanceUpdateConfig(config: {
  allowSimultaneousCampaigns?: boolean;
  maxMessagesPerDay?: number;
  maxTargetsPerCampaign?: number;
  defaultCampaignPaused?: boolean;
}): Promise<ApiResponse> {
  return await this.patch('/relance/config', { body: config });
}
```

### RelancePage Data Fetching

```typescript
const fetchCampaigns = async () => {
  // Fetch default stats and filtered campaigns SEPARATELY
  const [defaultStatsResponse, filteredCampaignsResponse] = await Promise.all([
    sbcApiService.relanceGetDefaultStats(),      // Default stats
    sbcApiService.relanceGetCampaigns()          // Filtered campaigns only
  ]);

  // Process default stats
  if (defaultStatsResponse.isSuccessByStatusCode) {
    setDefaultStats(defaultStatsResponse.body.data);
    fetchDefaultCampaignDayStats();  // Fetch targets for chart
  }

  // Process filtered campaigns
  if (filteredCampaignsResponse.isSuccessByStatusCode) {
    const campaigns = filteredCampaignsResponse.body.data.campaigns || [];
    setCampaigns(campaigns);  // Only filtered campaigns
  }
};

const fetchDefaultCampaignDayStats = async () => {
  // Fetch default targets (campaignId: null)
  const response = await sbcApiService.relanceGetDefaultTargets();
  const targets = response.body.data.targets || [];

  // Calculate day-by-day percentages
  const dayStats = {};
  targets.forEach(target => {
    for (let day = 1; day <= target.currentDay; day++) {
      dayStats[day] = (dayStats[day] || 0) + 1;
    }
  });

  const statsArray = [];
  for (let day = 1; day <= 7; day++) {
    const percentage = (dayStats[day] || 0) / targets.length * 100;
    statsArray.push({ day, percentage });
  }

  setDefaultCampaignDayStats(statsArray);
};
```

### UI Display

```typescript
// Default relance card uses defaultStats
<div>
  <h3>Relance par défaut (Auto-inscription)</h3>
  {defaultStats ? (
    <>
      <div>Cibles inscrites: {defaultStats.targetsEnrolled}</div>
      <div>Messages envoyés: {defaultStats.messagesSent}</div>
      <div>Taux de livraison: {deliveryRate}%</div>
      <div>Terminés: {defaultStats.targetsCompleted}</div>

      {/* Day-by-day progression chart */}
      {defaultCampaignDayStats.map(({ day, percentage }) => (
        <div key={day}>
          Jour {day}: {percentage}%
        </div>
      ))}

      {/* Pause/Resume controls */}
      <button onClick={toggleDefaultPause}>
        {status.defaultCampaignPaused ? 'Réactiver' : 'Mettre en pause'}
      </button>

      {/* Simultaneous toggle */}
      <Toggle
        checked={status.allowSimultaneousCampaigns}
        onChange={toggleSimultaneous}
      />
    </>
  ) : (
    <div>Aucune cible pour le moment</div>
  )}
</div>

// Filtered campaigns list
<div>
  <h3>Campagnes filtrées</h3>
  {campaigns.map(campaign => (
    <CampaignCard key={campaign._id} campaign={campaign} />
  ))}
</div>
```

---

## 📋 Quick Reference

| Feature | Default Relance | Filtered Campaign |
|---------|----------------|-------------------|
| **Has Campaign doc?** | ❌ NO | ✅ YES |
| **campaignId in targets** | `null` | `campaign._id` |
| **Created by** | Automatic (background job) | User manually |
| **Enrollment trigger** | 1 hour after registration | Campaign creation |
| **Can filter targets?** | ❌ All unpaid referrals | ✅ Custom filters |
| **Pause control** | `defaultCampaignPaused` | `campaign.status = 'paused'` |
| **Stats endpoint** | `/campaigns/default/stats` | `/campaigns/:id` |
| **Targets endpoint** | `/campaigns/default/targets` | `/campaigns/:id/targets` |
| **Appears in GET /campaigns** | ❌ NO | ✅ YES |

---

## ⚠️ Common Mistakes to Avoid

### ❌ DON'T:
1. Create a Campaign document for default relance
2. Include default relance in GET /api/relance/campaigns
3. Use `type: 'default'` anywhere
4. Try to find "default campaign" by `type === 'default'`
5. Store default stats in Campaign collection

### ✅ DO:
1. Track default relance via RelanceConfig only
2. Use `campaignId: null` for default targets
3. Calculate default stats by aggregating targets with `campaignId: null`
4. Provide separate endpoints for default stats and targets
5. Return ONLY filtered campaigns in GET /campaigns

---

## 🧪 Testing Scenarios

### Test 1: Default Relance Auto-Enrollment

```
1. User connects WhatsApp
   ✓ config.whatsappStatus = 'connected'

2. User has 2 unpaid referrals registered 2 hours ago
   ✓ Enrollment job runs
   ✓ Creates 2 RelanceTarget with campaignId: null
   ✓ GET /default/stats shows targetsEnrolled: 2

3. After 1 hour, sender job runs
   ✓ Sends Day 1 messages to both
   ✓ Updates currentDay to 2
   ✓ GET /default/stats shows messagesSent: 2

4. User pauses default relance
   ✓ PATCH /config { defaultCampaignPaused: true }
   ✓ GET /status shows defaultCampaignPaused: true
   ✓ New referrals NOT enrolled
   ✓ Existing 2 targets CONTINUE receiving messages
```

### Test 2: Filtered Campaign Creation

```
1. User creates filtered campaign (Cameroon only)
   ✓ POST /campaigns with filters
   ✓ Backend finds 50 matching users
   ✓ Creates Campaign doc with type: 'filtered'
   ✓ Creates 50 RelanceTarget with campaignId: campaign._id
   ✓ If allowSimultaneousCampaigns=false → defaultCampaignPaused=true

2. GET /campaigns
   ✓ Returns 1 campaign (the filtered one)
   ✓ Does NOT include default relance

3. GET /campaigns/:id/targets
   ✓ Returns 50 targets with campaignId: campaign._id

4. GET /default/targets
   ✓ Returns 2 targets with campaignId: null (from Test 1)
   ✓ Does NOT include the 50 filtered targets
```

### Test 3: Simultaneous Campaigns Toggle

```
Initial state:
- allowSimultaneousCampaigns = false
- Default relance has 5 active targets
- No filtered campaigns

1. User creates filtered campaign
   ✓ Backend auto-sets defaultCampaignPaused = true
   ✓ Existing 5 default targets continue
   ✓ New unpaid referrals NOT enrolled in default

2. User enables simultaneous toggle
   ✓ PATCH /config { allowSimultaneousCampaigns: true }
   ✓ Backend auto-sets defaultCampaignPaused = false
   ✓ New unpaid referrals NOW enrolled in default

3. User disables toggle again
   ✓ PATCH /config { allowSimultaneousCampaigns: false }
   ✓ Backend checks: filtered campaign still active?
   ✓ YES → auto-set defaultCampaignPaused = true

4. Filtered campaign completes
   ✓ campaign.status = 'completed'
   ✓ Backend checks: any other active filtered campaigns?
   ✓ NO → auto-set defaultCampaignPaused = false
   ✓ Default relance resumes enrolling
```

---

## 📊 Database Indexes Needed

```javascript
// RelanceTarget collection
db.relancetargets.createIndex({ referrerUserId: 1, campaignId: 1 });
db.relancetargets.createIndex({ referrerUserId: 1, status: 1 });
db.relancetargets.createIndex({ campaignId: 1, status: 1 });
db.relancetargets.createIndex({ nextMessageDue: 1, status: 1 });
db.relancetargets.createIndex({ referralUserId: 1 });

// Campaign collection
db.campaigns.createIndex({ userId: 1, type: 1, status: 1 });
db.campaigns.createIndex({ userId: 1, createdAt: -1 });

// RelanceConfig collection
db.relanceconfigs.createIndex({ userId: 1 }, { unique: true });
```

---

## 🎯 Summary

**Key Takeaways**:

1. Default relance = Background automatic system (NOT a campaign)
2. Filtered campaigns = User-created campaigns (stored as Campaign docs)
3. `campaignId: null` = Default relance target
4. `campaignId: ObjectId` = Filtered campaign target
5. GET /campaigns returns ONLY filtered campaigns
6. Use separate endpoints for default stats and targets
7. Auto-pause logic applies when filtered campaigns start

**Frontend correctly implements**:
- Separate fetch for default stats and filtered campaigns
- No `type` parameter in GET /campaigns
- Correct use of `/default/stats` and `/default/targets`
- UI shows "Relance par défaut" (not "Campagne par défaut")
- Proper handling of `defaultCampaignPaused` vs campaign status

---

**END OF CORRECTED ARCHITECTURE GUIDE**
