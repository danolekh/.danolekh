---
title: "A call debugger for an ElevenLabs Agents conversation"
date: 2026-09-27
description: "An ElevenLabs Agents conversation on one clock: the recording, what the agent heard, the tool calls and where each reply's wait went, with the bad moments found for you. Built on earshot, my open-source React library. A concept by Dan Olekh."
unlisted: true
image: /og/b-elevenlabs.jpg
cover: /videos/earshot-for-elevenlabs-poster.webp
video: /videos/earshot-for-elevenlabs-1600.mp4
---

_For the design engineering team at ElevenLabs._

I wanted to show you the kind of product work I'd bring, so I built a call debugger for voice agents, and here it reads a conversation from ElevenLabs Agents: the messages from the conversation API, the tool calls with their latency, the per-message figures and a thumbs-down someone left on a reply.

```demo:call-inspector
{"call": "stadtwerke-zaehlerstand-elevenlabs", "finding": "slow_turn:t13", "title": "Stadtwerke Muster · meter reading"}
```

The call opens at a slow reply. The conversation data says how long each stage took, but not when it started, so the debugger lays the stages end to end from the caller's last word, hatches them, and says that it placed them. What the export doesn't hold is named where it would be: there are no turn-detector decisions in it, so that part reads "Not recorded by ElevenLabs." Pick "Misheard words" to see the "null" the recogniser dropped before the lookup failed.

The full debugger has the whole call on a timeline, a call list to triage from, and a test case you can save from any bad moment: [open this call in it](https://debugger.danolekh.com/call/stadtwerke-zaehlerstand-elevenlabs/?finding=slow_turn%3At13&turn=t13&t=43.92).

## Why I sent it

- I care about the same things your design engineering post asks for: an eye for design, motion and a portfolio of things I built end to end. The orb on [earshot's home page](https://earshot.danolekh.com) is one WebGL2 shader that listens, thinks and answers along with a voice, and the [call-review block](https://earshot.danolekh.com/docs/installation#the-call-review-block) wears four skins in plain CSS.
- Your Agents docs now export a conversation as OpenTelemetry traces, and warn not to assume the events are in speaking order. Putting them back on one clock with the recording is exactly what this does, and that export would be the next source I'd add.

## How it's built

It's built from [earshot](/p/earshot), a library of headless React parts for voice-agent interfaces that I wrote and published this month. A call comes in as layers (LiveKit's spans and session report, Pipecat's spans and events, or ElevenLabs Agents' conversation JSON, plus the recording), and one reader puts them on one clock. Twelve detectors flag the moments worth looking at, and each finding opens with the evidence that explains it. The parts ship no styles, so the look is plain CSS on top, and everything works from the keyboard. The stack is React 19, Base UI, TanStack Start and TypeScript.

The call is synthetic. I wrote it, generated the voices with an open-source text-to-speech model on my laptop, and timed the words with a forced aligner. The company, the caller and the numbers are made up.

[Call debugger](https://debugger.danolekh.com) · [Docs](https://earshot.danolekh.com) · [GitHub](https://github.com/danolekh/earshot)

## About me

I'm Dan, a full-stack developer in Vienna who cares most about the front end: tools people use all day, performance and the details they feel. I work in TypeScript and React every day. As the founding engineer at Quextro I built the product on Bun, Effect and React 19 with TanStack Router, with OpenTelemetry for observability. I've built and published two open-source libraries on my own, [cardstock](/p/cardstock) and [earshot](/p/earshot).

I'd like to join ElevenLabs as a design engineer, or on the front-end-leaning full-stack side.

[danyaolekhq@gmail.com](mailto:danyaolekhq@gmail.com?subject=ElevenLabs) · [Resume](/resume) · [danolekh.com](/)

---

<small>A concept I made on my own, on a synthetic call. It uses no ElevenLabs logo or data. Not affiliated with ElevenLabs.</small>
