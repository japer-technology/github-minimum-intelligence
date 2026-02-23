# .minimum-intelligence 🦞 Enabled

### Delete or rename this file to disable .minimum-intelligence

<p align="center">
  <picture>
    <img src="https://raw.githubusercontent.com/japer-technology/minimum-intelligence/main/.minimum-intelligence/MINIMUM-INTELLIGENCE-LOGO.png" alt="Minimum Intelligence" width="500">
  </picture>
</p>

## File existence behavior

All `MINIMUM-INTELLIGENCE-*` workflows run `.minimum-intelligence/lifecycle/MINIMUM-INTELLIGENCE-ENABLED.ts` as the first blocking guard step. If this file is missing, the guard exits non-zero and prints:

> Minimum Intelligence disabled by missing MINIMUM-INTELLIGENCE-ENABLED.md

That fail-closed guard blocks all subsequent MINIMUM-INTELLIGENCE workflow logic.
