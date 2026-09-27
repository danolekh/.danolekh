---
title: "One clock for a voice-agent call, for the team at Hamming"
date: 2026-09-27
description: "One voice-agent call on one clock: both sides' audio, the traces, the tool calls and the transcript together, with the bad moments found and turned into tests. Built on earshot, my open-source React library. A concept by Dan Olekh."
unlisted: true
image: /og/b-hamming.jpg
cover: /videos/earshot-for-hamming-poster.webp
video: /videos/earshot-for-hamming-1600.mp4
---

_For the team at Hamming._

One of your posts quotes a customer who pulled logs from three systems, lined the timestamps up in a spreadsheet and listened to about forty recordings, which took two days. I built a call debugger that does that lining up for you: one call's traces, transcript and recording on one clock, with the bad moments found.

```demo:call-inspector
{"call": "stadtwerke-zaehlerstand", "finding": "tool_error:000000000000002b", "title": "Stadtwerke Muster · meter reading"}
```

The call opens at a failed tool call: the recogniser dropped a "null" from the customer number, and the lookup with the shorter number returned a 404. Pick "Misheard words" to see where it started, then "Save as test case" in the full debugger to turn it into checks that run on other calls.

The full debugger has the whole call on a timeline, a call list to triage from, and a test case you can save from any bad moment: [open this call in it](https://debugger.danolekh.com/call/stadtwerke-zaehlerstand/?finding=tool_error%3A000000000000002b&turn=t8&t=25.62).

## What it would add at Hamming

- A production call opened at the moment a metric flagged, with the cause beside it.
- The call's traces from LiveKit, Pipecat or ElevenLabs on the audio clock, without a spreadsheet.
- A bad moment saved as a test case that runs on the next version.

## How it's built

It's built from [earshot](/p/earshot), a library of headless React parts for voice-agent interfaces that I wrote and published this month. A call comes in as layers (LiveKit's spans and session report, Pipecat's spans and events, or ElevenLabs Agents' conversation JSON, plus the recording), and one reader puts them on one clock. Twelve detectors flag the moments worth looking at, and each finding opens with the evidence that explains it. The parts ship no styles, so the look is plain CSS on top, and everything works from the keyboard. The stack is React 19, Base UI, TanStack Start and TypeScript.

The call is synthetic. I wrote it, generated the voices with an open-source text-to-speech model on my laptop, and timed the words with a forced aligner. The company, the caller and the numbers are made up.

[Call debugger](https://debugger.danolekh.com) · [Docs](https://earshot.danolekh.com) · [GitHub](https://github.com/danolekh/earshot)

## About me

I'm Dan, a full-stack developer in Vienna who cares most about the front end: tools people use all day, performance and the details they feel. I work in TypeScript and React every day. As the founding engineer at Quextro I built the product on Bun, Effect and React 19 with TanStack Router, with OpenTelemetry for observability. I've built and published two open-source libraries on my own, [cardstock](/p/cardstock) and [earshot](/p/earshot).

I know your product engineer role is in North America. I'm in Europe, and I'd be glad to talk if that changes or if a contract fits.

[danyaolekhq@gmail.com](mailto:danyaolekhq@gmail.com?subject=Hamming) · [Resume](/resume) · [danolekh.com](/)

---

<small>A concept I made on my own, on a synthetic call. It uses no Hamming logo or data. Not affiliated with Hamming.</small>
