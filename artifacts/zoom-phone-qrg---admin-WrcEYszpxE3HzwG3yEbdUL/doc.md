Zoom Phone QRG – Admin

# Tab 1

# Zoom Phone QRG – Admin

2026-11-17 · @JT Mauro

## Admin access

Sign in at **zoom.us** with an admin account, then go to **Admin → Phone System Management**. Everything below starts there unless noted.

- **Roles:** User Management → Roles. Use the built-in Zoom Phone admin role or a custom role to limit what each admin can touch.
- **Account owner** can change billing and plans. Phone admins cannot.

## Add and provision users

1. Make sure the user exists in Zoom (SSO or Entra ID provisioning, if configured, creates the account).
2. Phone System Management → **Users & Rooms** → **Add**.
3. Pick the user, site, and calling plan (license).
4. Assign a direct number, or an extension only.
5. Save. The user sees the **Phone** tab after signing out and back in.

Bulk adds: use **Add → Bulk** with the CSV template. Entra sync handles the Zoom account but not the Phone license or number, so assign those here.

## Phone numbers

Phone System Management → **Number Management**.

| Task | Where |
| --- | --- |
| Buy a number | Phone Numbers → Add → pick area code and quantity |
| Port a number in | Number Management → Port Numbers. Have the carrier account number, PIN and a recent bill ready. |
| Assign a number | Phone Numbers → select number → Assign to user, auto receptionist, call queue or common area phone |
| Find free numbers | Phone Numbers → Unassigned filter |
| Emergency addresses | Company Info → emergency address / site settings (search "emergency"). Every site and number needs one. |

## Devices

Phone System Management → **Phones & Devices**.

1. **Desk Phones → Add.**
2. Enter the MAC address and pick the model.
3. Assign the user (or choose a common area phone).
4. Save, then plug in the phone. It pulls its config and registers on boot.

For a phone stuck in the wrong state, factory reset it, then re-add or re-provision it in the portal. **Common Area Phones** (lobby, conference room) are added the same way and get their own extension.

## Call routing

| Object | Use it for | Where |
| --- | --- | --- |
| Auto Receptionist | Main line menu, business hours, after-hours greeting | Auto Receptionists → Add |
| Call Queue | Ring a team (helpdesk, support). Pick distribution: simultaneous, sequential, rotating or longest idle. Set max wait and overflow. | Call Queues → Add |
| Shared Line Group | Several people answer one line (front desk) | Users & Rooms → Shared Line Groups |
| Common Area Phone | Lobby or room phone with no personal user | Phones & Devices → Common Area Phones |

Set business hours and holiday schedules on each object. After-hours routing is the most common thing that breaks quietly.

## Policies and settings

Settings cascade: **Account → Site → Group → User**. A lower level inherits from above unless it's overridden.

- **Account Settings** (Phone System Management → Account Settings): voicemail, call handling, call recording (automatic or on demand), emergency, security.
- **Lock** a setting at the account or group level to stop users from changing it.
- **Groups:** use them for department-level differences (for example, recording on for one team only).
- Call recordings live in Admin → Recording Management → Call Recordings.

## Monitoring and reporting

| Need | Where |
| --- | --- |
| Live health and call volume | Admin → Dashboard → Zoom Phone |
| Who called whom, duration, result | Phone System Management → Call Logs |
| Usage by user, number or site | Admin → Reports → Usage Reports → Phone |
| Call quality (MOS, jitter, packet loss) | Dashboard → Zoom Phone → call quality |
| Who changed what | Admin → Reports → Operation Logs |
| Zoom outage check | status.zoom.us |

## Common tasks

| Task | Steps |
| --- | --- |
| Offboard a user | Users & Rooms → select user → remove Phone license. Reassign the number to an auto receptionist, queue or the unassigned pool. Export voicemail and recordings first. |
| Reassign a number | Number Management → Phone Numbers → select number → Assign. |
| Forward a user's calls | Users & Rooms → user → Call Handling → set forwarding. |
| Replace a desk phone | Phones & Devices → Desk Phones → edit → new MAC address. |
| Add someone to a queue | Call Queues → queue → Members → Add. |
| User can't sign in | Check SSO / Entra ID account status first. Zoom doesn't hold their password. |

## Troubleshooting

Check in this order:

1. **License and number:** is the Phone license assigned and a number or extension set?
2. **Routing:** is the call handling or business-hours schedule sending calls somewhere unexpected?
3. **Device:** is the desk phone registered (Phones & Devices shows status)? Reboot, then re-provision.
4. **Network:** one-way audio or choppy calls usually mean a firewall, VPN or Wi-Fi problem. Check Zoom's published firewall rules and the call quality dashboard.
5. **Outage:** check status.zoom.us.

Still stuck? Open a Zoom support ticket from the admin portal (Support → Submit a request) with the call ID from Call Logs. Menu names can shift between Zoom releases.
