---
title: "One step into each notable moment"
date: 2026-09-27
description: "The whole call debugger, live: heard vs said, the turn detector's decisions and latency on the audio clock, across stacks. A concept by Dan Olekh."
unlisted: true
image: /og/b-roark.jpg
---

_For the product team at Roark._

```demo:debugger
{"call": "stadtwerke-zaehlerstand", "finding": "early_endpoint:t3", "turn": "t3", "t": 16.06, "from": 14, "to": 19, "image": "/og/b-roark.jpg"}
```

Your July changelog put notable moments on the call player. This goes one step into each one, and opens where the turn detector cut the caller off in the middle of a number.

- **Heard vs said,** word by word, beside the recording.
- **The turn detector's decisions,** with their probability and wait.
- **Latency on the audio clock,** stage by stage, from LiveKit, Pipecat or ElevenLabs.

Built on [earshot](https://earshot.danolekh.com), my open-source React library ([GitHub](https://github.com/danolekh/earshot)). The call is synthetic: I wrote it, and an open-source text-to-speech model spoke it.

I'm Dan, a full-stack developer in Vienna. I'd like to join Roark as a founding product engineer. The post asks for four years and I have about three, so I wanted to show what I build. [danyaolekhq@gmail.com](mailto:danyaolekhq@gmail.com?subject=Roark) · [Resume](/resume)

---

<small>A concept I made on my own, on a synthetic call. It uses no Roark logo or data. Not affiliated with Roark.</small>
