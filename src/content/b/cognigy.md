---
title: "A call debugger for voice agents, for the AI Innovation team at Cognigy"
date: 2026-09-27
description: "One voice-agent call on one clock: both sides' audio, what the agent heard against what was said, the tool calls and the model's input, with the bad moments found and turned into tests. Built on earshot, my open-source React library. A concept by Dan Olekh."
unlisted: true
image: /og/b-cognigy.jpg
cover: /videos/earshot-for-cognigy-poster.webp
video: /videos/earshot-for-cognigy-1600.mp4
---

_For the AI Innovation team at NiCE Cognigy._

Your open-source Cognigy plugin has a self-improvement loop: talk to your agent, evaluate the responses, improve it. I built the piece that explains a bad response before you change anything: a call debugger that puts one voice call on one clock and finds the moments that went wrong, with the reason next to each.

```demo:call-inspector
{"call": "stadtwerke-zaehlerstand", "finding": "heard_vs_said:t7", "title": "Stadtwerke Muster · meter reading"}
```

The call opens at a misheard number. The caller said "vier sieben eins null acht drei", the recogniser dropped the "null" and was unsure of "acht", and the lookup with the shorter number failed with a 404. Pick "Tool failed" to see the call with its arguments and result, and "Model input" to see what the model was given for that reply.

The full debugger has the whole call on a timeline, a call list to triage from, and a test case you can save from any bad moment: [open this call in it](https://debugger.danolekh.com/call/stadtwerke-zaehlerstand/?finding=heard_vs_said%3At7&turn=t7&t=23.82).

## Why it fits the AI Innovation team

- Evaluating a voice agent needs the audio next to the trace. This shows what was said above what was heard, word by word, which is where many bad replies start.
- Each finding becomes a test case that fails on this call and runs on the next version, so the loop can check a fix.
- It's a prototype and a demo UI in TypeScript, Node and React, which is the kind of work your post describes.

## How it's built

It's built from [earshot](/p/earshot), a library of headless React parts for voice-agent interfaces that I wrote and published this month. A call comes in as layers (LiveKit's spans and session report, Pipecat's spans and events, or ElevenLabs Agents' conversation JSON, plus the recording), and one reader puts them on one clock. Twelve detectors flag the moments worth looking at, and each finding opens with the evidence that explains it. The parts ship no styles, so the look is plain CSS on top, and everything works from the keyboard. The stack is React 19, Base UI, TanStack Start and TypeScript.

The call is synthetic. I wrote it, generated the voices with an open-source text-to-speech model on my laptop, and timed the words with a forced aligner. The company, the caller and the numbers are made up.

[Call debugger](https://debugger.danolekh.com) · [Docs](https://earshot.danolekh.com) · [GitHub](https://github.com/danolekh/earshot)

## About me

I'm Dan, a full-stack developer in Vienna who cares most about the front end: tools people use all day, performance and the details they feel. I work in TypeScript and React every day. As the founding engineer at Quextro I built the product on Bun, Effect and React 19 with TanStack Router, with OpenTelemetry for observability. I've built and published two open-source libraries on my own, [cardstock](/p/cardstock) and [earshot](/p/earshot).

I'd like to join the AI Innovation team as an AI software engineer.

[danyaolekhq@gmail.com](mailto:danyaolekhq@gmail.com?subject=Cognigy) · [Resume](/resume) · [danolekh.com](/)

---

<small>A concept I made on my own, on a synthetic call. It uses no NiCE Cognigy logo or data. Not affiliated with NiCE Cognigy.</small>
