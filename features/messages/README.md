# Messages

Chat on a booking, with photos. Stored and shown as plain text; links are not clickable.

- Actions: `sendMessage`, `markRead`
- Tables: `messages`; live updates through `lib/realtime.ts`
- Rate limit: 30 messages a minute.
