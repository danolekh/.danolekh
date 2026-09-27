---
title: "Dead air tied to the slow step, on a voice-agent call"
date: 2026-09-27
description: "The whole call debugger, live: a long silence tied to the step that caused it, on one clock with both sides' audio. A concept by Dan Olekh."
unlisted: true
image: /og/b-synthflow.jpg
---

_For the engineering team at Synthflow._

```demo:debugger
{"call": "stadtwerke-zaehlerstand", "finding": "dead_air:44.22", "turn": "t12", "t": 43.92, "from": 42, "to": 49, "image": "/og/b-synthflow.jpg"}
```

Your docs say an action's duration is how to find the slow endpoint behind a long silence. This finds it for you, and opens at 2.4 s of dead air while a tool took 1.9 s to save a meter reading.

- **Silence tied to its cause,** found in the recording and split into stages from the traces.
- **Action timings under both sides of the audio,** turn by turn.
- **Saved as a test** that runs on the next version of the agent.

Built on [earshot](https://earshot.danolekh.com), my open-source React library ([GitHub](https://github.com/danolekh/earshot)). The call is synthetic: I wrote it, and an open-source text-to-speech model spoke it.

I'm Dan, a full-stack developer in Vienna. I'd like to work with your engineering team on the call logs and debugging side. [danyaolekhq@gmail.com](mailto:danyaolekhq@gmail.com?subject=Synthflow) · [Resume](/resume)

---

<small>A concept I made on my own, on a synthetic call. It uses no Synthflow logo or data. Not affiliated with Synthflow.</small>
