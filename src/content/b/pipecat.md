---
title: "Pipecat's spans on the audio clock, in a call debugger"
date: 2026-09-27
description: "A Pipecat call on one clock: the conversation, turn, stt, llm and tts spans and the observer events lined up with both sides of the recording, with the bad moments found for you. Built on earshot, my open-source React library. A concept by Dan Olekh."
unlisted: true
image: /og/b-pipecat.jpg
cover: /videos/earshot-for-pipecat-poster.webp
video: /videos/earshot-for-pipecat-1600.mp4
---

_For the Pipecat team at Daily._

Whisker shows a Pipecat pipeline's frames, and the OpenTelemetry tracing shows its turns and their latency. I built a call debugger that puts those spans and the observers' events on the same clock as the recording, so a turn's timing and what the caller heard sit together.

```demo:call-inspector
{"call": "stadtwerke-zaehlerstand-pipecat", "finding": "early_endpoint:t3", "title": "Stadtwerke Muster · meter reading"}
```

The call opens where the turn ended in the middle of a number. The turn was closed while the caller was still reading it out, and the agent talked over the rest. Pick "Slow reply" to see a wait split into stages from the spans, with the 1.9 s the meter-reading tool took.

The full debugger has the whole call on a timeline, a call list to triage from, and a test case you can save from any bad moment: [open this call in it](https://debugger.danolekh.com/call/stadtwerke-zaehlerstand-pipecat/?finding=early_endpoint%3At3&turn=t3&t=16.06).

## What I'd like to do for Pipecat

- The reader for Pipecat is open source: it takes the `conversation` > `turn` > `stt`/`llm`/`tts` spans and the `SpeakingObserver` and `FunctionCallObserver` events.
- I'd be glad to help bring an audio-aligned view like this into Pipecat's own tooling, next to Whisker.

## How it's built

It's built from [earshot](/p/earshot), a library of headless React parts for voice-agent interfaces that I wrote and published this month. A call comes in as layers (LiveKit's spans and session report, Pipecat's spans and events, or ElevenLabs Agents' conversation JSON, plus the recording), and one reader puts them on one clock. Twelve detectors flag the moments worth looking at, and each finding opens with the evidence that explains it. The parts ship no styles, so the look is plain CSS on top, and everything works from the keyboard. The stack is React 19, Base UI, TanStack Start and TypeScript.

The call is synthetic. I wrote it, generated the voices with an open-source text-to-speech model on my laptop, and timed the words with a forced aligner. The company, the caller and the numbers are made up.

[Call debugger](https://debugger.danolekh.com) · [Docs](https://earshot.danolekh.com) · [GitHub](https://github.com/danolekh/earshot)

## About me

I'm Dan, a full-stack developer in Vienna who cares most about the front end: tools people use all day, performance and the details they feel. I work in TypeScript and React every day. As the founding engineer at Quextro I built the product on Bun, Effect and React 19 with TanStack Router, with OpenTelemetry for observability. I've built and published two open-source libraries on my own, [cardstock](/p/cardstock) and [earshot](/p/earshot).

I know Daily isn't hiring right now. I'd still like to help with Pipecat, and I'd be glad to talk if a role opens.

[danyaolekhq@gmail.com](mailto:danyaolekhq@gmail.com?subject=Pipecat) · [Resume](/resume) · [danolekh.com](/)

---

<small>A concept I made on my own, on a synthetic call. It uses no Daily logo or data. Not affiliated with Daily.</small>
