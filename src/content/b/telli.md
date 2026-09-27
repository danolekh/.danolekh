---
title: "A call debugger for telli, on a LiveKit call"
date: 2026-09-27
description: "The whole call debugger, live, on a LiveKit call: both sides' audio, what the agent heard, the turn detector and the pipeline on one clock. A concept by Dan Olekh."
unlisted: true
image: /og/b-telli.jpg
---

_For the engineering team at telli._

```demo:debugger
{"call": "stadtwerke-zaehlerstand", "finding": "early_endpoint:t3", "turn": "t3", "t": 16.06, "from": 14, "to": 19, "image": "/og/b-telli.jpg"}
```

Your job post asks to make every bad call easy to understand and debug. This is how I'd do it: one LiveKit call on one clock, opened where the turn detector cut the caller off in the middle of a number.

- **The spans you already send to Honeycomb, on the audio.** Each reply's wait is split into stages, with the time nothing explains shown on its own.
- **The decision behind every cut-off.** The turn detector ended this turn at p = 0.62, and the caller went on 0.74 s later.
- **What was said next to what was heard.** German numbers are where it shows: the recogniser dropped a "null" here, and the lookup failed.

Built on [earshot](https://earshot.danolekh.com), my open-source React library ([GitHub](https://github.com/danolekh/earshot)). The call is synthetic: I wrote it, and an open-source text-to-speech model spoke it.

I'm Dan, a full-stack developer in Vienna. I'd like to join telli as a product engineer on this side of the product. [danyaolekhq@gmail.com](mailto:danyaolekhq@gmail.com?subject=telli) · [Resume](/resume)

---

<small>A concept I made on my own, on a synthetic call. It uses no telli logo or data. Not affiliated with telli.</small>
