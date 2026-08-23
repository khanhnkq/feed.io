# Security policy

## Supported versions

Feed.io is pre-release. Security fixes are applied to the `main` branch until the first stable release defines a supported-version matrix.

## Report a vulnerability

Do not open a public issue. Use GitHub private vulnerability reporting for the repository. Include:

- affected commit/version;
- impact and attack prerequisites;
- minimal reproduction or proof of concept;
- suggested mitigation, if known;
- whether the vulnerability has been disclosed elsewhere.

Remove production credentials, customer data, share tokens and presigned URLs from the report.

## Response targets

- Acknowledgement: within 3 business days.
- Initial severity assessment: within 7 business days.
- Remediation timeline: communicated after reproduction and scope analysis.

These are targets for a community project, not a service-level agreement.

## Security boundaries

Feed.io owns authentication, server-side sessions, email action tokens and organization/project authorization. Passwords use Argon2id; raw refresh, verification and reset tokens are never stored. Suspected credential leakage, token reuse bypass, account takeover, cross-tenant access, unsafe media processing or secret exposure is considered high priority.
