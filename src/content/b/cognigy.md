---
title: "Why a voice answer went wrong, for Cognigy's AI Innovation team"
date: 2026-09-27
description: "The whole call debugger, live: what was said next to what the agent heard, the tool calls and the model's input on one clock. A concept by Dan Olekh."
unlisted: true
image: /og/b-cognigy.jpg
---

_For the AI Innovation team at NiCE Cognigy._

```demo:debugger
{"call": "stadtwerke-zaehlerstand", "finding": "heard_vs_said:t7", "turn": "t7", "t": 23.82, "from": 22, "to": 27, "image": "/og/b-cognigy.jpg"}
```

Your plugin's improvement loop starts by evaluating the agent's answers. This is the step before it, why a voice answer went wrong, and it opens where the recogniser dropped a "null" from a customer number.

- **Heard vs said, then what it caused.** The shorter number went to the lookup, and the lookup failed with a 404.
- **What the model was given,** for every reply, next to the audio.
- **Each finding a test** that fails on this call and runs on the next version.

Built on [earshot](https://earshot.danolekh.com), my open-source React library ([GitHub](https://github.com/danolekh/earshot)). The call is synthetic: I wrote it, and an open-source text-to-speech model spoke it.

I'm Dan, a full-stack developer in Vienna. I'd like to join the AI Innovation team as an AI software engineer. [danyaolekhq@gmail.com](mailto:danyaolekhq@gmail.com?subject=Cognigy) · [Resume](/resume)

---

<small>A concept I made on my own, on a synthetic call. It uses no NiCE Cognigy logo or data. Not affiliated with NiCE Cognigy.</small>
