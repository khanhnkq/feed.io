---
type: project
created: 2026-08-23
updated: 2026-08-23
---

# Feed.io Technical Decisions

## Canonical Product Hierarchy

Feed.io uses this ubiquitous language and ownership tree:

```text
User
└── Global Dashboard
    ├── Workspace (for example K Studio)
    ├── Workspace (for example ABC Media)
    └── Workspace (for example Freelance)
        └── Workspace Dashboard
            ├── Project
            │   ├── Folder
            │   ├── Assets
            │   │   └── Asset
            │   │       └── Asset / Review View
            │   │           ├── Version
            │   │           ├── Comment
            │   │           ├── Annotation
            │   │           └── Review
            │   └── Members
            └── Additional projects
```

Rules:

- A user reaches their workspaces from the global dashboard.
- A workspace is the tenant boundary and has its own dashboard.
- Projects are created inside a workspace, never as part of workspace onboarding.
- `Workspace` and `Organization` must not be used as synonyms.
- Membership and role names must state their scope, such as workspace or project.
