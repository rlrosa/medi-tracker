<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Testing & Development Practices

- **Testing Infrastructure**: A **Vitest** testing framework is configured in `vitest.config.ts`. It includes a Prisma singleton mock for isolated logic testing.
- **New Logic**: Always unit test new logic and anything relevant to its interactions with existing systems.
- **Verification**: You should verify functionality through the browser subagent, unit tests, or both before committing.
- **Commits**: Group logic changes into a single, cohesive commit. NEVER commit unverified code.

