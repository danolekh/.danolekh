---
title: "A call debugger for LiveKit Agents, on the spans and session report"
date: 2026-09-27
description: "A LiveKit Agents call on one clock: both sides' audio, the user_turn and agent_turn spans, the turn detector's decisions and the bad moments found for you, from the OpenTelemetry export and session report. Built on earshot, my open-source React library. A concept by Dan Olekh."
unlisted: true
image: /og/b-livekit.jpg
cover: /videos/earshot-for-livekit-poster.webp
video: /videos/earshot-for-livekit-1600.mp4
---

_For the Agents observability team at LiveKit._

Your post on debugging short utterances says a user_turn span much longer than the caller's speech means the final transcript or the end of speech never arrived. I built a call debugger that checks for things like that on every call. It reads a LiveKit Agents call's OpenTelemetry spans and session report, finds the speech in the recording, and flags the moments where the two disagree.

```demo:call-inspector
{"call": "praxis-termin", "finding": "false_interruption:17.35", "title": "Praxis Dr. Berger · rescheduling"}
```

The call opens where the agent stopped for a backchannel: the caller said "mhm" and the agent dropped its sentence. Pick "Didn't stop when interrupted" for the opposite, the agent talking on over a real interruption. Every finding comes with the spans and turn-taking signals behind it, and with the stretch of audio where it happened.

The full debugger has the whole call on a timeline, a call list to triage from, and a test case you can save from any bad moment: [open this call in it](https://debugger.danolekh.com/call/praxis-termin/?finding=false_interruption%3A17.35&turn=t4&t=17.05).

## Why it fits LiveKit

- Agent Insights shows a call's audio, transcript and traces together on LiveKit Cloud. This works from the OpenTelemetry export and the session report, so a self-hosted agent gets the same view, and it runs detectors over it.
- The turn-taking findings (a turn ended too early, a false interruption, the agent not stopping) come straight from `user_turn`, `agent_turn` and the end-of-turn spans, lined up with the speech in the recording.
- A bad moment becomes a test case, and it exports as a LiveKit Agents test in Python.

## How it's built

It's built from [earshot](/p/earshot), a library of headless React parts for voice-agent interfaces that I wrote and published this month. A call comes in as layers (LiveKit's spans and session report, Pipecat's spans and events, or ElevenLabs Agents' conversation JSON, plus the recording), and one reader puts them on one clock. Twelve detectors flag the moments worth looking at, and each finding opens with the evidence that explains it. The parts ship no styles, so the look is plain CSS on top, and everything works from the keyboard. The stack is React 19, Base UI, TanStack Start and TypeScript.

The call is synthetic. I wrote it, generated the voices with an open-source text-to-speech model on my laptop, and timed the words with a forced aligner. The company, the caller and the numbers are made up.

[Call debugger](https://debugger.danolekh.com) · [Docs](https://earshot.danolekh.com) · [GitHub](https://github.com/danolekh/earshot)

## About me

I'm Dan, a full-stack developer in Vienna who cares most about the front end: tools people use all day, performance and the details they feel. I work in TypeScript and React every day. As the founding engineer at Quextro I built the product on Bun, Effect and React 19 with TanStack Router, with OpenTelemetry for observability. I've built and published two open-source libraries on my own, [cardstock](/p/cardstock) and [earshot](/p/earshot).

I'd like to join LiveKit as a product engineer on the dashboards and debug surfaces. The post asks for six years, and I have about three of commercial work, so I wanted to show you what I build instead.

[danyaolekhq@gmail.com](mailto:danyaolekhq@gmail.com?subject=LiveKit) · [Resume](/resume) · [danolekh.com](/)

---

<small>A concept I made on my own, on a synthetic call. It uses no LiveKit logo or data. Not affiliated with LiveKit.</small>
