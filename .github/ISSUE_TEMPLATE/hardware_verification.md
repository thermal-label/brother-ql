---
name: Hardware Verification
about: Report that a Brother QL model works (or doesn't) with this driver
title: '[Hardware] QL-XXXX — verified / partial / broken'
labels: hardware-verification
assignees: ''
---

## Device

- **Model:** QL-XXXX
- **USB PID:** `0xXXXX`
- **Firmware version:** (if known)
- **Connection tested:** USB / TCP / both

## Test Results

Run `BROTHER_INTEGRATION=1 pnpm test` and paste the output:

```
<test output here>
```

## Checklist

- [ ] `print-text` — text label printed correctly
- [ ] `print-image` — image label printed correctly
- [ ] `print-two-color` — (QL-800 series only) black + red label printed correctly
- [ ] `tcp` — printed via TCP transport (if network-capable model)
- [ ] Auto-cut worked correctly
- [ ] Status response decoded correctly

## Notes

Any quirks, caveats, or partial failures to document.
