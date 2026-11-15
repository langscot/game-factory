# OS audio

One service owns one `AudioContext`. Apps ask for a sound by name; they never
create a context, ship a sound file or invent their own volume control.

```js
ctx.audio?.play("notify");                  // a one-shot from the sound table
ctx.audio?.startAmbience("office");         // continuous room tone
ctx.audio?.setLoad(0.75);                   // 0..1, lifts the fan and room tone
```

If a harness has no shell (and therefore no `ctx.audio`), the service can also be
imported directly from `./src/audio/index.js` with `initAudio()`. Do not build a
second engine around it.

## API

| Call | What it does |
| --- | --- |
| `play(name, options?)` | One-shot by semantic name. `options.gain` scales it. Safe before unlock; safe when muted; never throws. |
| `startAmbience(preset?)` | Starts the office bed with a slow fade. Currently `"office"`. Respects a stored "room tone off" choice. |
| `stopAmbience()` | Fades out and stops the bed. |
| `setLoad(0..1)` | Tells the machine how hard it is working. Lifts the fan pitch/level and the bed very slightly. |
| `setMuted(bool)` / `isMuted()` | Mute state. Persisted in `helpdesk.prefs`. |
| `setVolume(0..1)` | Master volume. Persisted in `helpdesk.prefs`. |
| `unlock()` | Idempotent. The shell calls it on the first pointer/key gesture; boot is queued until then. |

## Sound table

All sounds are synthesised at runtime. Peak and RMS are measured by
`src/audio/check.html` through the live graph.

| Name | Fires when | Character | Design |
| --- | --- | --- | --- |
| `boot` / `login` | Sign-in | Rising G-major chime with a low root | 1.05 s |
| `logout` | Restart / shut down | Descending three-note sign-off | 0.68 s |
| `notify` | A toast appears | Two quick high pings | 0.40 s |
| `success` | App confirms work | Small rising triangle triad | 0.55 s |
| `error` | A failed action dialog opens | Descending saw/square buzz | 0.55 s |
| `warning` | A neutral dialog opens | Double mid beep | 0.48 s |
| `click` | A button/tile is pressed | Filtered tick + tiny body | 0.06 s |
| `window.open` | A window appears | Upward noise swoosh + ping | 0.30 s |
| `window.close` | A window closes | Downward swoosh | 0.26 s |
| `window.minimise` | A window minimises | Quick falling triangle | 0.19 s |
| `menu.open` | A context menu opens | High soft tick | 0.075 s |
| `menu.close` | A context menu closes | Lower soft tick | 0.065 s |
| `usb.connect` | Device attached (available to apps) | Low-high two-note bell | 0.66 s |
| `usb.disconnect` | Device removed (available to apps) | High-low two-note bell | 0.55 s |
| `empty.bin` | The Bin emptied (available to apps) | Seven noise crinkles + low thump | 0.72 s |
| `lock` | Lock / sign out | Metal tick + falling tone | 0.36 s |

Plus `keyboard.key`, `keyboard.enter`, `keyboard.space`, `keyboard.backspace`:
the global typing clatter, fired by one `keydown` listener for any text field.
Modifiers, auto-repeat and Ctrl/Alt/Meta shortcuts are skipped. Add
`data-audio-typing="off"` to a subtree to opt out.

## Output graph

```
one-shots ─┐
keyboard ──┼─ bus (ui / alerts / ambience / keyboard)
ambience ──┘        │
                   master gain (volume, mute)
                        │
                 soft compressor / limiter
                        │
                   destination
```

The context is created lazily on the first gesture. When the tab is hidden the
context suspends and the ambience bed is torn down; both return on the next
visible frame. Ambience also fades out when the user mutes (master gain), but
the mute state is not a stop: unmuting does not restart anything by surprise.

## Files

```
src/audio/
  index.js     service + OS wiring (menus, clicks, dialogs, toasts, unlock)
  engine.js    context, buses, master, mute/volume, voice cap, visibility
  sounds.js    the sound table (names → recipes)
  typing.js    global keystroke clatter
  ambience.js  seamless room tone + fan + distant events
  tray.js      taskbar control and its injected stylesheet
  check.html   offline render check
  check.js     render and assert every sound
```
