---
title: "A call debugger for voice agents, for the product team at Roark"
date: 2026-09-27
description: "One voice-agent call on one clock: both sides' audio, what the agent heard against what was said, the turn detector's decisions and where each reply's wait went. Built on earshot, my open-source React library. A concept by Dan Olekh."
unlisted: true
image: /og/b-roark.jpg
cover: /videos/earshot-for-roark-poster.webp
video: /videos/earshot-for-roark-1600.mp4
---

_For the product team at Roark._

Your July changelog added notable moments to the call player: markers over the diarized tracks where a metric hit. I built a call debugger that goes one step further into each moment. It puts the call on one clock with its traces and shows why the moment happened.

```demo:call-inspector
{"call": "stadtwerke-zaehlerstand", "finding": "early_endpoint:t3", "title": "Stadtwerke Muster · meter reading"}
```

The call opens where the turn detector ended the caller's turn in the middle of a number: it committed after 310 ms at a probability of 0.62, and the caller went on 0.74 s later. Pick "Misheard words" for what was said next to what the recogniser heard, and "Slow reply" for where the caller's wait went, stage by stage.

The full debugger has the whole call on a timeline, a call list to triage from, and a test case you can save from any bad moment: [open this call in it](https://debugger.danolekh.com/call/stadtwerke-zaehlerstand/?finding=early_endpoint%3At3&turn=t3&t=16.06).

## What it would add at Roark

- Heard vs said, word by word, beside the recording.
- The turn detector's decisions, with their probability and wait, behind each cut-off.
- A reply's latency drawn on the audio clock, stage by stage, with the time no span explains shown on its own.
- It reads LiveKit, Pipecat and ElevenLabs exports, which fits a product that works across platforms.

## How it's built

It's built from [earshot](/p/earshot), a library of headless React parts for voice-agent interfaces that I wrote and published this month. A call comes in as layers (LiveKit's spans and session report, Pipecat's spans and events, or ElevenLabs Agents' conversation JSON, plus the recording), and one reader puts them on one clock. Twelve detectors flag the moments worth looking at, and each finding opens with the evidence that explains it. The parts ship no styles, so the look is plain CSS on top, and everything works from the keyboard. The stack is React 19, Base UI, TanStack Start and TypeScript.

The call is synthetic. I wrote it, generated the voices with an open-source text-to-speech model on my laptop, and timed the words with a forced aligner. The company, the caller and the numbers are made up.

[Call debugger](https://debugger.danolekh.com) · [Docs](https://earshot.danolekh.com) · [GitHub](https://github.com/danolekh/earshot)

## About me

I'm Dan, a full-stack developer in Vienna who cares most about the front end: tools people use all day, performance and the details they feel. I work in TypeScript and React every day. As the founding engineer at Quextro I built the product on Bun, Effect and React 19 with TanStack Router, with OpenTelemetry for observability. I've built and published two open-source libraries on my own, [cardstock](/p/cardstock) and [earshot](/p/earshot).

I'd like to join Roark as a founding software engineer on the product side. The post asks for four years, and I have about three of commercial work, so I wanted to show you what I build.

[danyaolekhq@gmail.com](mailto:danyaolekhq@gmail.com?subject=Roark) · [Resume](/resume) · [danolekh.com](/)

---

<small>A concept I made on my own, on a synthetic call. It uses no Roark logo or data. Not affiliated with Roark.</small>
