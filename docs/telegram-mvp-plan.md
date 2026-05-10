# Telegram MVP Plan (Spoiler-Free Rewatch)

## Goal
Build a Telegram-first, spoiler-safe replay companion for small private communities.

## Product Principles
- **No spoilers by default** in list/feed views.
- **Small private communities** (not one giant moderated public group).
- **Fast setup**: install bot, invite people, start voting/discussing.
- **Clear separation** between read-only feed and per-game discussion.

## Recommended Telegram Structure

### Option A (recommended): Supergroup with Topics
- Topic: `📌 Daily Feed` (read-only for members; bot-only posting/editing)
- Topic per game (discussion enabled)

### Option B: Channel + Group
- Channel: read-only daily game feed (bot posts)
- Group: discussion per game/thread

## MVP User Flows

1. **Create community space**
   - `/create_space`
   - bot returns invite code/link

2. **Join community space**
   - `/join <code>` or deep link

3. **Open daily feed**
   - `/today` shows current games (spoiler-free)
   - include vote counts + comment counts

4. **Open game detail**
   - `/game <id>`
   - still spoiler-free by default

5. **Vote and discuss**
   - vote: `up/down/fire`
   - comment: per-game context

## Automation Plan

### A) Daily ingest automation
- Import game slate from data source on schedule.
- Minimum schedule:
  - once early morning (today)
  - once later for tomorrow prefill (optional)

### B) Feed refresh automation
- Keep one feed message per day and **edit it** with fresh counters.
- Keep old daily feed messages in history (timeline/archive behavior).

### C) Suggested cron cadence (MVP)
- `06:30` local: import and publish/update today feed
- `15:00` local: refresh counters and tomorrow prefill
- lightweight refresh every 10–15 minutes during active windows

## Core Commands (MVP)
- `/start`
- `/create_space`
- `/join <code>`
- `/today`
- `/game <id>`
- `/vote <id> <up|down|fire>`
- `/comment <id> <text>`
- `/activity <id>`

## Data Model Additions for Multi-Space
- `spaces(id, name, invite_code, owner_user_id, created_at)`
- `space_members(space_id, user_id, role, joined_at)`
- add `space_id` to `votes`, `comments`, and feed-message mapping
- optional `telegram_feed_message_id` per space/day for edit-in-place

## Spoiler Policy
- Feed and default game view: no final score/result.
- Any explicit result reveal should require user intent (separate command/view).

## Rollout Scope
- Keep MVP focused on NBA first.
- Validate usage with small groups before wider sport expansion.

## Repo Language Policy
All repository artifacts (code, docs, issues, PRs, comments) should be in English.
