---
title: "A call debugger for an ElevenLabs Agents conversation"
date: 2026-09-27
description: "The whole call debugger, live, on an ElevenLabs Agents conversation: the recording, what the agent heard and where each reply's wait went. A concept by Dan Olekh."
unlisted: true
image: /og/b-elevenlabs.jpg
---

_For the design engineering team at ElevenLabs._

```demo:debugger
{"call": "stadtwerke-zaehlerstand-elevenlabs", "finding": "slow_turn:t13", "turn": "t13", "t": 43.92, "from": 41, "to": 49, "image": "/og/b-elevenlabs.jpg"}
```

I built a call debugger for voice agents, and here it reads an ElevenLabs Agents conversation: the messages, the tool calls with their latency, and a thumbs-down someone left on a reply.

- **Reported stages, laid out and marked.** The data says how long each stage took but not when, so they're placed end to end from the caller's last word and hatched.
- **What the export doesn't hold, named.** There are no turn-detector decisions in it, so that part reads "Not recorded by ElevenLabs".
- **Front-end craft.** Headless parts, motion and every action on the keyboard, the kind of work your design engineering post asks for.

Built on [earshot](https://earshot.danolekh.com), my open-source React library ([GitHub](https://github.com/danolekh/earshot)). The call is synthetic: I wrote it, and an open-source text-to-speech model spoke it.

I'm Dan, a full-stack developer in Vienna. I'd like to join ElevenLabs as a design engineer, or on the front-end-leaning full-stack side. [danyaolekhq@gmail.com](mailto:danyaolekhq@gmail.com?subject=ElevenLabs) · [Resume](/resume)

---

<small>A concept I made on my own, on a synthetic call. It uses no ElevenLabs logo or data. Not affiliated with ElevenLabs.</small>
