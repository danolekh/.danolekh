---
title: earshot
subtitle: A call debugger for voice agents, and the headless React parts it's built from, open source on npm
description: "earshot case study: headless React parts for voice-agent interfaces, and a call debugger that puts one call on one clock (both sides' audio, what the agent heard, the turn detector, the pipeline) to explain why it went wrong."
client: Personal, open source
role: Design, engineering and docs
year: 2026
date: 2026-09-27
liveUrl: https://debugger.danolekh.com
stack:
  - React 19
  - Base UI
  - TypeScript
  - TanStack Start
  - Web Audio
  - WebGL2
  - OpenTelemetry
  - Vitest
  - Playwright
  - Cloudflare Workers
---

## What it is

When a voice agent gets a call wrong, the reasons are spread over a recording, a transcript, a trace and a pile of timings. Was the caller cut off mid-sentence? Did the recogniser hear the number? Was the tool slow, or the model? earshot puts one call on one clock and shows all of it together, so the bad moment explains itself.

It's two things. A library of headless React parts for voice-agent interfaces (an orb, a transcript that follows the recording word by word, a call-review timeline, and the parts that explain a moment), and a [call debugger](https://debugger.danolekh.com) built on them.

```block:stack
{
  "title": "What it's built on",
  "items": ["React 19", "Base UI", "TypeScript", "TanStack Start", "Web Audio", "WebGL2", "OpenTelemetry", "Vitest", "Playwright", "Fumadocs", "Cloudflare Workers"]
}
```

```tsx
const trace = detect(
  readCall(
    livekit({ otlp, report }), // or pipecat({ otlp, events }), elevenLabsAgents(conversation)
    recording({ startedAtUnixMs, sources, peaks }),
  ),
);

<Player.Root conversation={toConversation(trace)} src="/call.ogg">
  <FindingList.Root findings={trace.findings} />
  <Latency.Root breakdown={latencyBreakdown(trace, turnId)}>
    <Latency.Bar />
    <Latency.Stages />
  </Latency.Root>
</Player.Root>
```

## How it's built

### One call, from any stack

A call comes in as layers. LiveKit Agents' OpenTelemetry spans and session report, Pipecat's spans and observer events, or ElevenLabs Agents' conversation JSON each say what they know, and the recording says when time zero is. `readCall` puts them on one clock, works out which caller turn each reply answers, where the caller cut in, and where a turn's edges really were, from the words or from the speech found in the waveform. When a stack didn't record something, the debugger says so where it would be: ElevenLabs keeps no turn-detector decisions, so that part reads "Not recorded by ElevenLabs."

### Twelve detectors, and the reasons behind each

Detectors flag the moments worth looking at: a reply that took too long, a turn ended while the caller was still reading a number, both sides talking at once, the agent not stopping when interrupted, a word said but not heard, a tool that failed. Each finding opens with the evidence that explains it. A slow reply shows where the wait went, measured on the recording and split into stages from the spans, with the time nothing explains shown on its own. A misheard word shows what was said above what the recogniser heard, word by word.

### From a bad call to a test

Any bad moment becomes a test case: checks that fail on this call, found again by what the caller said, so they run on other calls of the same flow. The demo has the fix too: the same call on the next agent version, where the saved test passes. Tests export as JSON or as a LiveKit Agents test in Python.

### Headless, like cardstock

Every part renders plain elements and reports its state as `data-*` attributes and CSS variables, so the debugger's look is its own CSS on top. The orb draws through the same WebGL2 context as cardstock's shaders, now its own small package. The transcript, the timeline and the inspector work from the keyboard and with a screen reader.

### The calls are synthetic

The nine demo calls are German customer-service calls I wrote, spoken by an open-source text-to-speech model on my laptop and timed word by word with a forced aligner. The traces are what LiveKit, Pipecat and ElevenLabs would export for them, and the reader goes through the same path a real call would.

The video above is the real debugger. The recorder drives the app frame by frame on a virtual clock and lays the call's own recording under the picture afterwards, so what you hear is exactly what was playing.

[Call debugger](https://debugger.danolekh.com) · [Docs and live demos](https://earshot.danolekh.com) · [npm](https://www.npmjs.com/package/@danolekh/earshot) · [GitHub](https://github.com/danolekh/earshot)
