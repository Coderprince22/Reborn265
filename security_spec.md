# Security Specification - RYOMS

## Data Invariants
1. **User Identity Invariant**: A user's document ID must match their authentication UID.
2. **Account Creation Invariant**: All new self-registered accounts must start with `Pending` status and `Volunteer` role.
3. **Privilege Escalation Guard**: A user cannot approve themselves or change their own role. Only `Admin` or `Super Admin` can change roles/status.
4. **Relational Access**: Data (Projects, Members, etc.) can only be read by users with `Active` status.
5. **System Immutability**: `createdAt` fields must not change after document creation.

## The Dirty Dozen Payloads

1. **Self-Activation Attack**: A `Pending` user attempts to update their own status to `Active`.
2. **Role Escalation Attack**: A `Volunteer` attempts to update their role to `Super Admin`.
3. **ID Poisoning**: Attempting to create a user document with a 2MB string as the ID.
4. **Email Spoofing (Implicit)**: Attempting to update another user's email without proper authorization.
5. **PII Blanket Read**: A `Pending` user attempts to list all users and their details.
6. **Orphaned Member**: Creating a member record with missing required fields (e.g., no gender).
7. **Unauthorized Deletion**: A `Volunteer` attempts to delete a member from the registry.
8. **Shadow Field Injection**: Adding a `isAdmin: true` field to a member document (shadow field).
9. **Timestamp Manipulation**: Manually setting a future `createdAt` date instead of using server timestamps.
10. **Resource Exhaustion**: Sending a 1MB string into the `fullName` field of a member.
11. **Cross-User Write**: User A attempts to update User B's profile.
12. **Unauthenticated Read**: Attempting to fetch the youth registry without being signed in.

## Test Strategy
Testing will be performed using the Firestore Emulator and the `@firebase/rules-unit-testing` framework. All "Dirty Dozen" payloads must be rejected with `PERMISSION_DENIED`.
