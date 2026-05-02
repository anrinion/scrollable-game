# Swipe Game - Design Document

## Game Concept

A minimalist gesture-based game where scrolling/swiping is the primary interaction mechanic. Players progress through levels by performing the correct swipe direction (up/down/left/right) or occasionally tapping buttons. The core gameplay revolves around quick reactions and following on-screen instructions, similar to WarioWare but with swipe-based controls.

## Technology Stack

### Engine Selection

We evaluated several options for web-based mobile game development:

**Pure JavaScript + CSS Scroll Snap**
- Pros: Zero dependencies, full control over touch physics, instant deployment, tiny bundle size, works everywhere
- Cons: Need to implement touch handling manually, no built-in physics or particle systems

**Phaser 3**
- Pros: Built-in touch events, physics engine, extensive documentation
- Cons: Overkill for simple swipe mechanics, larger bundle size, learning curve

**PixiJS**
- Pros: WebGL rendering, good performance, lighter than Phaser
- Cons: Still overhead for our use case, touch input not built-in

**Three.js**
- Pros: 3D capabilities, shader effects
- Cons: Completely unnecessary for 2D swipe game

### Final Decision: Pure JavaScript + CSS Scroll Snap

The game mechanics are simple enough that a full game engine would be unnecessary overhead. Native web APIs provide everything needed:
- CSS Scroll Snap for TikTok-style snapping behavior
- Touch Events API for gesture detection
- Native DOM for UI elements
- No build step required, just HTML/CSS/JS

## Future: Mobile Store Deployment

When passport documentation becomes available and mobile store submission is possible:

**Recommended approach: Capacitor**
- Wraps the web app in a native container with WebView
- Accepted by both Google Play Store and Apple App Store
- Minimal code changes needed
- Maintains single codebase for web and mobile
- Provides access to native APIs if needed later (vibration, notifications, etc)

**Requirements for store approval:**
- Implement offline mode (Service Worker)
- Optimize performance (60fps target)
- Add native splash screen
- Handle platform-specific UI quirks (notches, safe areas)

Alternative: Cordova (older, more established but being phased out in favor of Capacitor)

## Technical Implementation

### Scroll Snap Implementation

Key CSS properties for TikTok-style scrolling:

```css
.game-container {
  scroll-snap-type: y mandatory;
  overscroll-behavior: contain;
  overflow-y: scroll;
  height: 100vh;
  touch-action: pan-y; /* Allow vertical scroll only, prevent pinch zoom */
}

.level-screen {
  scroll-snap-align: start;
  height: 100vh;
  width: 100vw;
}
```

For levels requiring horizontal swipes, dynamically change:
```css
touch-action: pan-x; /* Switch to horizontal-only scrolling */
scroll-snap-type: x mandatory;
```

### Touch Event Handling

Gesture detection pattern:

```javascript
let touchStartX, touchStartY;

element.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

element.addEventListener('touchend', (e) => {
  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;
  
  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;
  
  // Determine primary direction
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // Horizontal swipe
    const direction = deltaX > 0 ? 'swipe_right' : 'swipe_left';
  } else {
    // Vertical swipe
    const direction = deltaY > 0 ? 'swipe_down' : 'swipe_up';
  }
});
```

### Mobile Optimization

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

```css
/* Smooth scrolling on iOS (deprecated but still works) */
-webkit-overflow-scrolling: touch;
```

Use passive event listeners for better scroll performance:
```javascript
element.addEventListener('touchmove', handler, { passive: true });
```

Use `requestAnimationFrame` for animations instead of `setTimeout/setInterval`.

## Architecture: Finite State Machine

Each level is described as a state machine (directed graph) rather than imperative code. This allows declarative level design without programming.

### Level Structure

Each level is a graph of nodes (states) with transitions (edges) between them.

**Node properties:**
- `id`: Unique identifier for this state
- `content`: What to display (text, HTML, images, custom UI)
- `transitions`: Array of possible transitions to other nodes
- `onEnter`: Optional callback when entering this state
- `onExit`: Optional callback when leaving this state

**Transition properties:**
- `event`: Event type that triggers this transition (e.g., 'swipe_up', 'button_click', 'auto')
- `target`: ID of the target node
- `condition`: Optional function that must return true for transition to occur
- `delay`: Optional delay in milliseconds for 'auto' events

### Configuration Format

**JSON** is used for level definitions. Benefits:
- Native JavaScript parsing (no dependencies)
- User-editable in dev mode
- Can be validated with JSON Schema
- Users can create/share custom level packs by replacing the config file

Example level structure:

```json
{
  "levels": {
    "level_01": {
      "id": "level_01",
      "initial": "intro",
      "nodes": {
        "intro": {
          "id": "intro",
          "content": {
            "type": "text",
            "value": "Swipe up to continue"
          },
          "transitions": [
            {
              "event": "swipe_up",
              "target": "success"
            }
          ]
        },
        "success": {
          "id": "success",
          "content": {
            "type": "text",
            "value": "Perfect! Next level loading..."
          },
          "transitions": [
            {
              "event": "auto",
              "target": "level_02",
              "delay": 1500
            }
          ]
        }
      }
    },
    "level_02": {
      "initial": "challenge",
      "nodes": {
        "challenge": {
          "id": "challenge",
          "content": {
            "type": "html",
            "value": "<h1>Now swipe DOWN</h1>"
          },
          "transitions": [
            {
              "event": "swipe_down",
              "target": "correct"
            },
            {
              "event": "swipe_up",
              "target": "wrong"
            }
          ]
        },
        "correct": {
          "content": { "type": "text", "value": "Correct!" },
          "transitions": [{ "event": "auto", "target": "level_03", "delay": 1000 }]
        },
        "wrong": {
          "content": { "type": "text", "value": "Wrong direction! Try again." },
          "transitions": [{ "event": "auto", "target": "challenge", "delay": 1500 }]
        }
      }
    }
  }
}
```

### State Machine Engine

A lightweight state machine runner:
1. Loads level config from JSON
2. Initializes at `initial` node
3. Listens for events (swipe gestures, button clicks, custom events)
4. Checks current node's transitions for matching event
5. Evaluates condition if present
6. Transitions to target node
7. Calls onExit/onEnter hooks
8. Renders new content

### Custom Mechanics

For levels requiring unique behavior (timers, mini-games, special UI), the node can specify a custom component:

```json
{
  "content": {
    "type": "component",
    "component": "TimerChallenge",
    "props": {
      "duration": 5000,
      "requiredAction": "swipe_left"
    }
  }
}
```

The state machine treats these as black boxes - the component handles its own rendering and dispatches events back to the state machine when appropriate.

## Dev Mode Visualizer

An interactive graph visualization tool for level designers to see and debug state machines.

### Library Options

**vis.js (vis-network)**
- Pros: Simple API, automatic graph layout, interactive out of the box, lightweight
- Cons: Less customization than alternatives, abandoned by original maintainer (community fork exists)

**Cytoscape.js**
- Pros: Very powerful, extensive layout algorithms, active development, good for complex graphs
- Cons: Steeper learning curve, heavier bundle size, overkill for simple state machines

**D3.js with d3-graphviz**
- Pros: Maximum control, beautiful visualizations possible
- Cons: Requires significant custom code, higher complexity

### Final Decision: vis.js (vis-network)

For this project, vis.js provides the best balance:
- Simple enough to implement quickly
- Automatic layout solves positioning problem
- Interactive nodes/edges work out of the box
- Click-to-trigger events fits our testing workflow

### Visualizer Features

1. **Graph Rendering**
   - Nodes represent states
   - Edges represent transitions with event labels
   - Current state highlighted with distinct color

2. **Interactive Testing**
   - Click on transition edge to emit that event
   - Simulates the gesture/action without actually performing it
   - Allows rapid testing of all paths through the level

3. **Dev Mode Toggle**
   - Hidden by default in production
   - Accessible via URL parameter (`?dev=true`) or console command
   - Overlay panel showing graph + current state info

4. **State Inspection**
   - Click node to see full state data
   - View node content, transitions, hooks
   - See transition conditions as readable text

Example implementation:

```javascript
// Parse level config into vis.js format
const nodes = Object.entries(level.nodes).map(([id, node]) => ({
  id: id,
  label: id,
  color: id === currentState ? '#4CAF50' : '#2196F3'
}));

const edges = Object.entries(level.nodes).flatMap(([id, node]) => 
  node.transitions.map(t => ({
    from: id,
    to: t.target,
    label: t.event,
    arrows: 'to'
  }))
);

// Render graph
const network = new vis.Network(container, { nodes, edges }, options);

// Handle edge click to simulate event
network.on('selectEdge', (params) => {
  const edge = edges.find(e => e.id === params.edges[0]);
  stateMachine.dispatch(edge.label); // Trigger the event
});
```

## User Modding Support

The JSON config approach enables user-generated content:

1. **Dev mode includes JSON editor** - Users can modify levels directly in browser
2. **Export/Import** - Save custom level pack as JSON file
3. **URL-based loading** - Share custom levels via URL parameter: `?levels=custom_pack.json`
4. **Validation** - JSON Schema validation ensures custom configs won't break the game

This creates potential for community-driven content without additional development.

## Deployment

**Cloudflare Pages** (chosen platform)
- Automatic HTTPS
- Global CDN
- Git-based deployment (push to deploy)
- Free tier sufficient for this project
- Instant rollbacks
- Preview deployments for branches

## Summary

The architecture prioritizes:
1. **Simplicity** - Pure web tech, no build step or framework overhead
2. **Declarative design** - Levels are data (JSON), not code
3. **Debuggability** - Visual state machine editor for rapid iteration
4. **Extensibility** - Custom components for unique mechanics
5. **Moddability** - Users can create and share custom levels
6. **Performance** - Native APIs, minimal dependencies, optimized for mobile

This approach separates engine development (write once) from content creation (iterate rapidly), enabling faster level design iteration.
