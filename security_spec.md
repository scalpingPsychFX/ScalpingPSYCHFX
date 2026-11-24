# SCALPING PSYCHE FX — Firestore Security Specification

## 1. Data Invariants
1. **Strict Admin-Only Writes**: Only verified admins—either the claimed primary admin (`/portal_config/primary_admin`, unless revoked), the bootstrapped backup admin (`solotravelvip@gmail.com`, unless revoked), an active email listed in `/admin_emails/{email}` (`status == 'active'`), or a legacy `/admins/{uid}` entry—with `email_verified == true` may create, update, or delete portal content, manage Paid Strategies, or manage `/admin_emails` and `/portal_config/admin_roster`.
2. **Last-Admin Protection**: Removing/revoking an admin from `/admin_emails/{email}` atomically checks `portal_config/admin_roster.activeCount >= 2` and `getAfter(...).activeCount == old - 1 >= 1`. Removing the last remaining admin is rejected with `PERMISSION_DENIED`.
3. **Read-Only Members & PII Isolation**: Verified signed-in members (`request.auth != null && request.auth.token.email_verified == true`) may read (`get`, `list`) documents where `resource.data.visibility == 'members'`, and may only read their own `payment_requests`, `strategy_unlocks`, or own `admin_emails/{myEmail}` document. Members can never list `/admin_emails` or mutate any content.
4. **Unauthenticated Denial**: Unauthenticated users (`request.auth == null`) cannot read or write any collection.
5. **Immutable Ownership & Creation Time**: `authorUid`, `addedByUid`, and `createdAt` are immutable after document creation. `createdAt == request.time` on create; `updatedAt == request.time` on create and update.
6. **Strict Key & Size Boundaries**: Shadow/extra fields are rejected via `hasAll` + `hasOnly` on create and `affectedKeys().hasOnly(...)` on update. All strings enforce min/max length bounds and regex checks on IDs, emails, and dates.
7. **Privilege Escalation Prevention**: Client writes to `/admins/{adminId}` are unconditionally denied (`allow write: if false`), and non-admin members cannot write `/admin_emails/{emailId}` or `/portal_config/admin_roster`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Member Creates Gold Analysis**: Verified non-admin member attempts `create` on `/gold_analyses/post-1` with valid schema -> DENIED (not admin).
2. **Member Updates Gold Analysis**: Verified non-admin member attempts `update` on `/gold_analyses/post-1` -> DENIED (not admin).
3. **Member Deletes Meeting**: Verified non-admin member attempts `delete` on `/meetings/meet-1` -> DENIED (not admin).
4. **Unauthenticated List Query**: `request.auth == null` attempts `list` on `/gold_analyses` where `visibility == 'members'` -> DENIED (not signed in).
5. **Unverified Email Admin Spoof**: User with `email == 'solotravelvip@gmail.com'` and `email_verified == false` attempts `create` on `/announcements/ann-1` -> DENIED (`email_verified == true` required).
6. **Shadow Field Injection on Create**: Admin attempts `create` on `/gold_analyses/post-2` with extra field `isFeatured: true` -> DENIED (`hasOnly` rejects unknown key).
7. **Shadow Field Injection on Update**: Admin attempts `update` on `/strategy_updates/upd-1` adding `secretFlag: true` -> DENIED (`affectedKeys().hasOnly` rejects unknown key).
8. **Immutable Field Tampering**: Admin attempts `update` on `/announcements/ann-1` changing `createdAt` or `authorUid` -> DENIED (immutable check fails).
9. **Client Timestamp Forgery**: Admin attempts `create` on `/meetings/meet-2` with backdated `createdAt` != `request.time` -> DENIED (temporal integrity check fails).
10. **Path ID Poisoning**: Admin attempts `create` on `/gold_analyses/bad$id!@#` -> DENIED (`isValidId` regex rejects invalid characters).
11. **Oversized String Exhaustion**: Admin attempts `create` on `/portal_notes/note-1` with 20,000-char `content` (> 10,000 limit) -> DENIED (size limit check fails).
12. **Self-Promotion to Admin**: Member attempts `create` on `/admins/{theirUid}` with `{ role: 'admin' }` -> DENIED (`allow write: if false`).
