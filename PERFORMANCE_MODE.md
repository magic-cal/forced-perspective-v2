# Performance Mode Configuration

## Overview
The application now includes a performance mode toggle for local testing and lower-end devices.

## How to Enable Low Performance Mode

Edit `client/src/config/trick.ts` and set:

```typescript
PERFORMANCE: {
  lowPerformanceMode: true,  // Change this to true
  // ...
}
```

## What Changes in Low Performance Mode

When enabled, the following optimizations are applied:

1. **Reduced Rotation Speed**: Card sphere rotates 4x slower (0.005 vs 0.02)
2. **Fewer Cards**: Maximum cards per row reduced by 50% (24 vs 48)
3. **Faster Animations**: All animation durations cut in half
   - Card flip: 1.5s (vs 3s)
   - Camera unlink: 3s (vs 7s)
   - Card reveal: 0.75s (vs 1.5s)
4. **Reduced Animation Frequency**: Stagger delay doubled (60ms vs 30ms)

## Performance Impact

Low performance mode significantly reduces:
- GPU load (fewer cards to render)
- Animation complexity (slower rotations)
- Frame rate requirements (simpler animations)

This makes the experience smoother on:
- Older devices
- Mobile browsers
- Development environments with hot reload
- Systems with integrated graphics
