---
title: "Dead air tied to the slow tool, on a voice-agent call"
date: 2026-09-27
description: "A voice-agent call on one clock, where a long silence is tied to the tool call that caused it, automatically. Built on earshot, my open-source React library. A concept by Dan Olekh."
unlisted: true
image: /og/b-synthflow.jpg
cover: /videos/earshot-for-synthflow-poster.webp
video: /videos/earshot-for-synthflow-1600.mp4
---

_For the engineering team at Synthflow._

Your docs say an action's duration is how you find the slow endpoint behind a long silence on a call. I built a call debugger that makes that connection for you: it finds the silence in the recording, measures the caller's wait, and shows which step of the pipeline took the time.

```demo:call-inspector
{"call": "stadtwerke-zaehlerstand", "finding": "dead_air:44.22", "title": "Stadtwerke Muster · meter reading"}
```

The call opens at 2.4 s of dead air after the caller read out their meter. Pick "Slow reply" to see the whole wait split into stages: the turn detector, the model, the 1.9 s the meter-reading tool took, the speech, and the time nothing explains. Press play to hear the silence.

The full debugger has the whole call on a timeline, a call list to triage from, and a test case you can save from any bad moment: [open this call in it](https://debugger.danolekh.com/call/stadtwerke-zaehlerstand/?finding=dead_air%3A44.22&turn=t12&t=43.92).

## What it would add at Synthflow

- Every long silence tied to the action that caused it, without opening the logs.
- The action timings you already log, drawn under both sides of the recording.
- A bad moment saved as a test case that runs on the next version of the agent.

## How it's built

It's built from [earshot](/p/earshot), a library of headless React parts for voice-agent interfaces that I wrote and published this month. A call comes in as layers (LiveKit's spans and session report, Pipecat's spans and events, or ElevenLabs Agents' conversation JSON, plus the recording), and one reader puts them on one clock. Twelve detectors flag the moments worth looking at, and each finding opens with the evidence that explains it. The parts ship no styles, so the look is plain CSS on top, and everything works from the keyboard. The stack is React 19, Base UI, TanStack Start and TypeScript.

The call is synthetic. I wrote it, generated the voices with an open-source text-to-speech model on my laptop, and timed the words with a forced aligner. The company, the caller and the numbers are made up.

[Call debugger](https://debugger.danolekh.com) · [Docs](https://earshot.danolekh.com) · [GitHub](https://github.com/danolekh/earshot)

## About me

I'm Dan, a full-stack developer in Vienna who cares most about the front end: tools people use all day, performance and the details they feel. I work in TypeScript and React every day. As the founding engineer at Quextro I built the product on Bun, Effect and React 19 with TanStack Router, with OpenTelemetry for observability. I've built and published two open-source libraries on my own, [cardstock](/p/cardstock) and [earshot](/p/earshot).

I'd like to work with Synthflow's engineering team, on the call logs and debugging side if there's room for it.

[danyaolekhq@gmail.com](mailto:danyaolekhq@gmail.com?subject=Synthflow) · [Resume](/resume) · [danolekh.com](/)

---

<small>A concept I made on my own, on a synthetic call. It uses no Synthflow logo or data. Not affiliated with Synthflow.</small>
