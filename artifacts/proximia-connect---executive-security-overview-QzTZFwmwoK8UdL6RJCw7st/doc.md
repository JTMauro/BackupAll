# Proximia Connect — Executive Security Overview

# Proximia Connect — Executive Security Overview

## Proximia Connect — Executive Summary

2026-10-29 · ITOPS — Internal, For Leadership Review

### Bottom line

Proximia Connect is a commercial passwordless sign-in agent for Windows that signs users in by confirming their presence — phone, face, or proximity card — instead of a typed password. To do this it takes ownership of the real Windows/AD password, stores it recoverably on every endpoint, and places a vendor-operated cloud service in the logon path, concentrating trust in the local credential vault and Proximia's cloud tenant. Two static security assessments rated this high-risk and recommended no broad deployment, only a tightly contained pilot. Hands-on testing on Oct 27 then confirmed the worst case directly: a cellphone photo of an enrolled user's face, with their card in range, unlocked that user's account — defeating the product's primary authentication factor with the simplest possible attack. Recommendation: do not approve Proximia Connect for production; in its current build it does not meet Cydcor's minimum security requirements.

### What the product is and does

Proximia Connect is a commercial passwordless / proximity sign-in product for Windows. Instead of typing a password, the user is signed in when the agent confirms their presence through a paired phone over Bluetooth, facial recognition, a proximity card, or a phone approval.

The core architectural problem is how it achieves this. To make logon "passwordless," the agent takes ownership of the actual Windows/AD account password: it generates a password the user never knows, stores it on each machine in a recoverable (reversible) form, and rotates it on its own schedule. It also installs a background service running as SYSTEM (the highest privilege on Windows), a sign-in tile at the logon screen, a software security key that Windows and browsers treat as hardware, and a live command channel to the vendor's cloud.

Convenience to the user therefore comes from the agent holding a reusable domain credential on the endpoint, not from eliminating the password. That concentrates a great deal of trust in two places: the local credential vault on every PC, and Proximia's cloud tenant.

### Key security concerns

The static assessments identified 13 distinct concerns (1 critical, 6 high, 4 medium, 2 governance) and 10 candidate attack paths (3 critical, 5 high, 2 medium). The highest-impact items are consolidated below.

| Theme | Concern | Severity |
|---|---|---|
| Credential custody | The real Windows/AD password is stored on each endpoint in a recoverable form; one compromised machine can yield a working domain credential | Critical |
| Credential custody | The password is generated and rotated by the agent, not the user; agent/vault/TPM failure can cause a self-inflicted lockout with no one knowing the password | High |
| Endpoint surface | A SYSTEM-level web API runs on every PC with developer tooling (Swagger) left enabled | High |
| Endpoint surface | The password passes between tile and service over a local named pipe; that channel's permissions are the only boundary, and the service can create processes as other users and add accounts to privileged groups | High |
| Cloud control plane | The vendor cloud can command every enrolled device (lock, sign-out, collect logs, change settings, push an upgrade, disable the device) | High |
| Privacy | Biometric templates and identity data are stored in Proximia's cloud, raising biometric-privacy and data-residency exposure | High |
| Availability | The agent owns the password and brokers every logon, making it a single point of failure for sign-in | High |
| Authentication | Proximity (Bluetooth) and face factors can be relayed or spoofed | Medium |
| Secrets hygiene | A confidential cloud client secret ships in plain text in the installer, alongside dev/staging defaults and verbose logging | Medium |
| Hardening | Install expands the machine trust store, force-installs a browser extension, and loosens webcam consent | Medium |
| Governance | The installer deliberately bypasses Cisco Duo MFA for its own sign-in tile | Governance |
| Governance | Adopting it makes a vendor's cloud and update channel part of Cydcor's identity and endpoint control plane | Governance |

Several "development" / "staging" defaults in a shipping build signal a product not fully hardened for production.

### Live test results — the decisive finding

On Oct 27, the team moved from static analysis to a hands-on test on a non-domain laptop, and the most basic spoofing attack succeeded. After a tester enrolled his face and proximity card and confirmed he could log in without a password, a second person logged into his account using only a cellphone photo of his face while the card was in range. The facial-recognition liveness defense was defeated by a photograph.

This directly confirms, in the simplest possible way, the presence/face-spoofing risk that both static reports had flagged only as a hypothesis. It moved that risk from theoretical to demonstrated.

Follow-up testing on Oct 29 showed the unlock is not even proximity-bound. With one tester at the keyboard, the enrolled user stood roughly 30 feet away and out of visual range, tapped the app on his phone, and the machine unlocked. "Presence" can therefore be satisfied remotely from the phone app rather than by the user actually being at the device — undermining the core premise of the product.

The same test surfaced additional practical problems:

- The machine does not lock promptly when the user leaves: in testing the enrolled user had to cross to the far side of the building and then wait 30 seconds before it locked — impractical for a security control.
- Once enabled, users lose the ability to type a password; password changes are handled by Proximia.
- The agent locked down the local machine's firewall, routing egress through the vendor's system.

The tester's conclusion was that the system is not secure and risks giving users a false sense of security.

### Recommendation and next steps

Do not approve Proximia Connect for production deployment. The concentration of credential custody on each endpoint, the vendor cloud control plane, and the demonstrated photo-based bypass of its primary authentication factor are each significant on their own; together they are disqualifying in the current build.

If leadership wants any further evaluation rather than closing the matter, it should be gated on all of the following:

- A demonstrated vendor fix for the photo-based facial-recognition bypass, re-tested by Cydcor.
- Written vendor answers on vault encryption and key protection (TPM binding, offline/disk-theft exposure), local API/pipe authentication, cloud control-plane access and blast radius, and biometric data storage, residency, and deletion.
- Confirmation that password and RDP logon paths still enforce Duo MFA, with the Duo bypass formally approved by the MFA policy owner.
- Standard third-party / vendor risk review (SOC 2 Type II, independent pen-test evidence, breach history, contractual security and data-processing terms).
- Containment to a small set of isolated, non-privileged test machines with dedicated accounts and break-glass local admin.

Sources: Proximia Connect Security Risk Assessment — Executive Overview (Brian Minor, Oct 19, 2026); Proximia Connect Attack Surface Analysis (Brian Minor, Oct 20, 2026); internal test results email (Michael Warren, Oct 27, 2026).
