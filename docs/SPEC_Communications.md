# Capo Communications Specification

**Version 1.0.0 • Created December 2025**

## Overview

This document provides a centralized inventory of all emails, push notifications, and in-app messages sent by the Capo platform. Use this as the single source of truth for editing communication copy.

---

## Email Provider

**Provider:** Resend  
**From Address:** `noreply@caposport.com` (or `{club_name} <noreply@caposport.com>`)  
**Implementation:** API calls via `@/lib/email.ts` (to be created)

---

## 1. Onboarding Emails (Currently Implemented)

### 1.1 Join Request Approved

**Trigger:** Admin approves player join request  
**Recipient:** Player who requested to join  
**Template ID:** `join_request_approved`

```
Subject: ✅ Welcome to {club_name}!

Hi {player_name},

Great news! Your request to join {club_name} has been approved.

You can now:
- View upcoming matches
- See your stats and performance
- RSVP to matches (when enabled)

[Open Capo App]

See you on the pitch!
{club_name}
```

### 1.2 Admin Invitation

**Trigger:** Superadmin invites new admin to platform  
**Recipient:** Invited admin email  
**Template ID:** `admin_invitation`

```
Subject: You're invited to manage {club_name} on Capo

Hi,

You've been invited to become an admin for {club_name} on Capo.

Capo helps you organize weekly football matches with:
- Automatic team balancing
- Player stats tracking
- RSVP management (coming soon)

[Accept Invitation]

This link expires in 7 days.

Capo Team
```

---

## 2. RSVP Emails (To Be Implemented)

### 2.1 Match Invitation (Tier Open)

**Trigger:** Tier window opens OR "All at once" booking enabled  
**Recipient:** All players in that tier (or all if "All at once")  
**Template ID:** `rsvp_tier_open`

```
Subject: ⚽ {club_name} - Match on {date_friendly}

Hi {player_name},

You're invited to play on {date_friendly} at {time}.

{spots_remaining} spots remaining. Tap to confirm:

[I'm In]  [Can't Make It]

See you there!
{club_name}

---
Manage notifications: {settings_link}
```

### 2.2 Teams Announced

**Trigger:** Admin clicks "Save Teams" (sets teams_saved_at)  
**Recipient:** All confirmed (IN) players  
**Template ID:** `rsvp_teams_saved`

```
Subject: 📋 Teams are set for {date_friendly}

Hi {player_name},

Teams for {date_friendly} are ready!

You're on Team {team_name}.

[View Teams]

See you there!
{club_name}

---
Manage notifications: {settings_link}
```

### 2.3 Waitlist Offer

**Trigger:** Spot opens and player is in top-3 of waitlist  
**Recipient:** Top 3 waitlist players (simultaneously)  
**Template ID:** `rsvp_waitlist_offer`

```
Subject: 🎯 Spot opened for {date_friendly}!

Hi {player_name},

Someone dropped out! A spot just opened for {date_friendly}.

You have {time_remaining} to claim it (first to claim wins).

[Claim Spot Now]

If you miss this one, you're still #{waitlist_position} on the waitlist.

{club_name}

---
Manage notifications: {settings_link}
```

### 2.4 Last Call

**Trigger:** T-12h or T-3h before match, still short on players  
**Recipient:** Players who haven't responded + OUT with `out_flexible=true`  
**Template ID:** `rsvp_last_call`

```
Subject: ⚡ We're {n} short for {date_friendly}

Hi {player_name},

We're {n} players short for {date_friendly}. Can you make it?

[I'm In]  [Can't Make It]

Kick-off: {time}

{club_name}

---
Manage notifications: {settings_link}
```

### 2.5 Match Cancelled

**Trigger:** Admin cancels match (or match deleted with players)  
**Recipient:** All confirmed + waitlist players  
**Template ID:** `rsvp_cancellation`

```
Subject: 🛑 Match on {date_friendly} cancelled

Hi {player_name},

Unfortunately, the match on {date_friendly} has been cancelled.

{cancellation_reason}

We'll be in touch about the next game.

{club_name}

---
Manage notifications: {settings_link}
```

---

## 3. Push Notifications (To Be Implemented)

**Provider:** FCM (Firebase Cloud Messaging) for delivery to iOS (APNs) and Android  
**Implementation:** Via Capacitor Push Notifications plugin

### 3.1 RSVP Push Notifications

| Event | Title | Body | Action |
|-------|-------|------|--------|
| Tier Open | "⚽ Match on {date}" | "Booking now open. Tap to respond." | Deep link to match |
| Waitlist Offer | "🎯 Spot available!" | "Someone dropped out. {time} to claim." | Deep link to match |
| Last Call | "⚡ Need {n} more" | "Match on {date}. Can you play?" | Deep link to match |
| Teams Saved | "📋 Teams posted" | "You're on {team}. View teams." | Deep link to match |
| Offer Claimed | "✅ You're in!" | "Spot confirmed for {date}." | Deep link to match |
| Offer Expired | "⏰ Offer expired" | "Spot was claimed. Still #{pos} on waitlist." | Deep link to match |

### 3.2 Other Push Notifications (Future)

| Event | Title | Body |
|-------|-------|------|
| Join Approved | "✅ You're in!" | "Welcome to {club}. View your profile." |
| Match Reminder | "⚽ Tomorrow" | "Match at {time}. You're on {team}." |
| Stats Updated | "📊 New stats" | "Your latest performance is in." |

---

## 4. In-App Messages

These appear within the app UI, not as external notifications.

### 4.1 Toast Messages

| Event | Type | Message |
|-------|------|---------|
| RSVP Submitted | Success | "You're in for {date}!" |
| RSVP Submitted | Success | "Marked as out for {date}" |
| Waitlist Joined | Info | "Added to waitlist as #{position}" |
| Offer Claimed | Success | "Spot claimed! You're in." |
| Offer Expired | Warning | "This offer has expired" |
| Profile Saved | Success | "Changes saved" |
| Error | Error | "{error_message}" |

### 4.2 Empty States

| Screen | Message |
|--------|---------|
| Upcoming (no matches) | "No upcoming matches scheduled." |
| Waitlist (empty) | "Waitlist is empty" |
| Activity Feed (empty) | "No activity yet" |

---

## 5. Notification Preferences

**Location:** Player Settings → Notifications tab

| Preference | Default | Controls |
|------------|---------|----------|
| Match Invitations | ON | Tier open emails/push |
| Last-Call Alerts | ON | Last call reminders |
| Team Announcements | ON | Teams saved notification |
| Waitlist Offers | ON | Waitlist offer notifications |

**Mute Logic:**
- Setting any preference to OFF adds player to `muted` for that category
- Transactional emails (cancellation, teams saved if confirmed) always sent
- Push and promotional emails respect preferences

---

## 6. Template Variables Reference

**Common Variables (all templates):**

| Variable | Description | Example |
|----------|-------------|---------|
| `{player_name}` | Player's display name | "Ian" |
| `{club_name}` | Tenant club name | "Berko TNF" |
| `{date_friendly}` | Formatted date | "Sunday 8th December" |
| `{time}` | Match time | "10:30am" |
| `{match_link}` | Deep link to match | "capo://match/123" |
| `{settings_link}` | Link to notification settings | "capo://settings/notifications" |

**RSVP-Specific Variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| `{spots_remaining}` | Available spots | "4" |
| `{booked}/{capacity}` | Booking status | "16/20" |
| `{waitlist_position}` | Queue position | "3" |
| `{time_remaining}` | Offer countdown | "2 hours" |
| `{team_name}` | Assigned team | "Orange" |
| `{n}` | Players needed | "2" |
| `{cancellation_reason}` | Optional reason | "Not enough players" |

---

## 7. Implementation Status

| Category | Status | Notes |
|----------|--------|-------|
| Onboarding Emails | ✅ Implemented | Via Resend |
| RSVP Emails | ⏳ Planned | Phase 2 |
| Push Notifications | ⏳ Planned | Requires FCM setup |
| In-App Toasts | ✅ Implemented | Via existing toast system |
| Notification Preferences | ⏳ Planned | UI exists, backend TBD |

---

## 8. Adding New Communications

When adding a new email or notification:

1. **Add to this spec** under appropriate section
2. **Create template** in email provider (Resend)
3. **Add template ID** to `src/lib/email.ts`
4. **Add trigger** in appropriate API route or background job
5. **Add preference** to notification settings if user-controllable
6. **Test** in development with real email

---

**Document Status:** 📝 Living Document  
**Last Updated:** December 2025  
**Version:** 1.0.0

