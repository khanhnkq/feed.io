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

Authentication is delegated to self-hosted Keycloak. Feed.io remains responsible for organization/project authorization, share-link scope, object access and audit events. Suspected cross-tenant access, authentication bypass, unsafe media processing or secret exposure is considered high priority.
