# reelkit

Minimalist React primitives for **short-reel preview & timeline editing** — a scrub player
with sub-second precision, (soon) timeline tracks and an editable caption layer.

Self-contained: only `react` as a peer dependency, no Tailwind or CSS import required — all
styling is inline, so it drops into any React app.

> Not a render engine. reelkit is the **preview / editing layer**; render your final MP4 with
> your own pipeline (FFmpeg, a cloud API, …). Keep preview ↔ render in sync via a shared
> caption spec.

## Install

```bash
npm i reelkit
# or from GitHub:
npm i github:<owner>/reelkit
```

## Usage

```tsx
import { ReelPreview } from "reelkit";

<ReelPreview
  src={url}
  className="my-frame"        // set the frame via your own CSS (e.g. aspect-ratio: 9/16)
  accent="#8b5cf6"           // scrubber / thumb color
  fps={30}                    // frame-step size for the ⟨ ⟩ arrows
  precision="cs"             // "cs" → 0:03.24 (default) · "ms" → 0:03.240
/>
```

### Props (`ReelPreview`)

| prop | type | default | notes |
|------|------|---------|-------|
| `src` | `string` | — | video URL (mp4/webm/object URL) |
| `poster` | `string?` | — | poster frame before play |
| `className` / `style` | — | — | container — set the frame/size here |
| `accent` | `string` | `#8b5cf6` | scrubber fill + thumb ring |
| `fps` | `number` | `30` | frame-step (`⟨`/`⟩`) size = `1/fps` |
| `precision` | `"cs" \| "ms"` | `"cs"` | timer sub-second precision |
| `natural` | `boolean` | `false` | video sets its own height by aspect (vs. filling a fixed frame) |
| `ruler` | `boolean` | `true` | timecode ruler with second / sub-second ticks |
| `controls` | `"overlay" \| "panel"` | `"overlay"` | controls over the video, or in a panel below it |
| `radius` | `number` | `14` | container corner radius (px); `0` for square corners |
| `labels` | `Partial<ReelPreviewLabels>` | English | aria/title text (i18n) |

## Roadmap

- `Timeline` — video / audio / caption tracks with a playhead synced to the video.
- `CaptionLayer` — editable caption overlay (font / size / position / timing).
- `CaptionSpec` — one JSON spec that drives both the preview and your renderer.

## Author

**Vladimir Maslov**

GitHub: [@investmaslov](https://github.com/investmaslov)

## License

Copyright 2026 Vladimir Maslov

Licensed under the Apache License, Version 2.0.
You may obtain a copy of the License at:

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
