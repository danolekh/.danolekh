---
title: "A call debugger on the LiveKit Agents export"
date: 2026-09-27
description: "The whole call debugger, live, on a LiveKit Agents call: the spans, the turn-taking and both sides' audio on one clock, from the OpenTelemetry export. A concept by Dan Olekh."
unlisted: true
image: /og/b-livekit.jpg
---

_For the Agents team at LiveKit._

```demo:debugger
{"call": "praxis-termin", "finding": "false_interruption:17.35", "turn": "t4", "t": 17.05, "from": 15, "to": 20, "image": "/og/b-livekit.jpg"}
```

Your post on short utterances says a user_turn span much longer than the speech means an event never arrived. This checks for that kind of thing on every call, and opens where the agent stopped for a "mhm".

- **Works on the export.** It reads the OpenTelemetry spans and the session report, so a self-hosted agent gets the same view.
- **Turn-taking from the spans.** Turns ended too early, false interruptions and the agent not stopping, lined up with both sides' speech.
- **Bad moments become tests,** and a test exports as a LiveKit Agents test in Python.

Built on [earshot](https://earshot.danolekh.com), my open-source React library ([GitHub](https://github.com/danolekh/earshot)). The call is synthetic: I wrote it, and an open-source text-to-speech model spoke it.

I'm Dan, a full-stack developer in Vienna. I'd like to join LiveKit as a product engineer on the dashboards and debug surfaces. The post asks for six years and I have about three, so I wanted to show what I build. [danyaolekhq@gmail.com](mailto:danyaolekhq@gmail.com?subject=LiveKit) · [Resume](/resume)

---

<small>A concept I made on my own, on a synthetic call. It uses no LiveKit logo or data. Not affiliated with LiveKit.</small>
