---
title: "A call debugger for telli's engineers, on a LiveKit call"
date: 2026-09-27
description: "One LiveKit call on one clock, with both sides' audio, what the agent heard, the turn detector's decisions and the pipeline's spans, and the bad moments found for you. Built on earshot, my open-source React library. A concept by Dan Olekh."
unlisted: true
image: /og/b-telli.jpg
cover: /videos/earshot-for-telli-poster.webp
video: /videos/earshot-for-telli-1600.mp4
---

_For the engineering team at telli._

Your changelog says you can now review a call with a zoomable waveform, a transcript aligned to the recording, turn timing and issues tied to a range of the audio. Your job post asks for the next step: make every bad call easy to understand and debug. So I built the layer I'd put under that screen. It reads a LiveKit call's OpenTelemetry spans and session report, puts them on one clock with the recording, and finds the moments that went wrong.

```demo:call-inspector
{"call": "stadtwerke-zaehlerstand", "finding": "early_endpoint:t3", "title": "Stadtwerke Muster · meter reading"}
```

The call opens where the turn detector ended the caller's turn in the middle of a customer number. It committed after 310 ms at a probability of 0.62, and the caller went on 0.74 s later with "null acht drei." Press play to hear it. Then pick "Misheard words" to see the "null" the recogniser dropped, and "Slow reply" to see where the caller's 3.1 s wait went, stage by stage, with the 488 ms nothing explains shown on its own.

The full debugger has the whole call on a timeline, a call list to triage from, and a test case you can save from any bad moment: [open this call in it](https://debugger.danolekh.com/call/stadtwerke-zaehlerstand/?finding=early_endpoint%3At3&turn=t3&t=16.06).

## What it would add at telli

- The same OpenTelemetry spans you already send to Honeycomb, lined up with both sides of the recording, turn by turn.
- The end-of-turn and speech decisions behind each cut-off, with their probability and wait, so "the agent interrupted me" has a cause.
- What the agent heard next to what was said, which matters most for German numbers, names and compound words.
- A check that the agent said it's an AI in its first sentences, on every call.
- Each finding as a test case that fails on this call and runs on the next prompt version.

## How it's built

It's built from [earshot](/p/earshot), a library of headless React parts for voice-agent interfaces that I wrote and published this month. A call comes in as layers (LiveKit's spans and session report, Pipecat's spans and events, or ElevenLabs Agents' conversation JSON, plus the recording), and one reader puts them on one clock. Twelve detectors flag the moments worth looking at, and each finding opens with the evidence that explains it. The parts ship no styles, so the look is plain CSS on top, and everything works from the keyboard. The stack is React 19, Base UI, TanStack Start and TypeScript.

The call is synthetic. I wrote it, generated the voices with an open-source text-to-speech model on my laptop, and timed the words with a forced aligner. The company, the caller and the numbers are made up.

[Call debugger](https://debugger.danolekh.com) · [Docs](https://earshot.danolekh.com) · [GitHub](https://github.com/danolekh/earshot)

## About me

I'm Dan, a full-stack developer in Vienna who cares most about the front end: tools people use all day, performance and the details they feel. I work in TypeScript and React every day. As the founding engineer at Quextro I built the product on Bun, Effect and React 19 with TanStack Router, with OpenTelemetry for observability. I've built and published two open-source libraries on my own, [cardstock](/p/cardstock) and [earshot](/p/earshot).

I'd like to join telli as a product engineer and work on the call review and debugging side.

[danyaolekhq@gmail.com](mailto:danyaolekhq@gmail.com?subject=telli) · [Resume](/resume) · [danolekh.com](/)

---

<small>A concept I made on my own for this application, on a synthetic call. It uses no telli logo or data. Not affiliated with telli.</small>
