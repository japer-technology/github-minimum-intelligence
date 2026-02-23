# .minimum-intelligence 🦞 Heart Not Required

### Rename this file to `MINIMUM-INTELLIGENCE-HEART-REQUIRED.md` to require a ❤️ heart emoji in the issue body for the agent to process new issues.

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/minimum-intelligence/main/.minimum-intelligence/MINIMUM-INTELLIGENCE-LOGO.png" alt="Minimum Intelligence" width="500">
  </picture>
</p>

## File existence behavior

The workflow runs `.minimum-intelligence/lifecycle/MINIMUM-INTELLIGENCE-HEART-GUARD.ts` as a guard step. If a file matching `MINIMUM-INTELLIGENCE-HEART-REQUIRED.*` exists in the `.minimum-intelligence/` directory, the guard checks that new issues contain a ❤️ heart emoji in their body. If the heart emoji is missing, the guard exits non-zero and prints:

> Minimum Intelligence heart guard — issue does not contain a ❤️ heart emoji. Skipping.

This check only applies to `issues.opened` events. Comments on existing issues are always processed regardless of this setting.

## How to enable

```bash
cd .minimum-intelligence
mv MINIMUM-INTELLIGENCE-HEART-NOT-REQUIRED.md MINIMUM-INTELLIGENCE-HEART-REQUIRED.md
git add -A
git commit -m "Require heart emoji for new issues"
git push
```

## How to disable

```bash
cd .minimum-intelligence
mv MINIMUM-INTELLIGENCE-HEART-REQUIRED.md MINIMUM-INTELLIGENCE-HEART-NOT-REQUIRED.md
git add -A
git commit -m "Remove heart emoji requirement for new issues"
git push
```
