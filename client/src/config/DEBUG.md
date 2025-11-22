# Debug Configuration

## Quick Start

To enable debug mode, simply change the `DEBUG` constant in `client/src/config/debug.ts`:

```typescript
export const DEBUG = true;  // Enable debug mode
export const DEBUG = false; // Disable debug mode (production)
```

## Features

### 1. Conditional Logging
All debug logs are completely removed when `DEBUG = false`, making it more performant than regular `console.log`.

```typescript
import { debug } from '@/config/debug';

// These only log when DEBUG = true
debug.log('General debug message');
debug.warn('Warning message');
debug.error('Error message');
```

### 2. Specialized Loggers
Use category-specific loggers for better organization:

```typescript
debug.socket('Socket event');    // [SOCKET] Socket event
debug.camera('Camera moved');     // [CAMERA] Camera moved
debug.trick('Trick state');       // [TRICK] Trick state
debug.store('Store updated');     // [STORE] Store updated
```

### 3. Performance Monitoring
Track performance of specific operations:

```typescript
import { perf } from '@/config/debug';

perf.start('card-flip');
// ... your code ...
perf.end('card-flip');
// Output: [PERF] card-flip: 123.45ms
```

## Why This is Better

1. **Zero overhead in production**: When `DEBUG = false`, all debug calls become no-ops
2. **Type-safe**: Full TypeScript support
3. **Easy to toggle**: Single constant to change
4. **Organized**: Category-specific loggers help filter logs
5. **Performance tracking**: Built-in performance monitoring

## Usage Examples

```typescript
// Socket events
debug.socket('Connected to server', socketId);

// Camera operations
debug.camera('Position:', camera.position);

// Trick state changes
debug.trick('State changed:', oldState, '->', newState);

// Store updates
debug.store('Role set to:', role);

// Performance tracking
perf.start('render-cards');
renderCards();
perf.end('render-cards');
```
