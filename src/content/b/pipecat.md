---
title: "Pipecat's spans on the audio clock"
date: 2026-09-27
description: "The whole call debugger, live, on a Pipecat call: the spans and observer events on the same clock as the recording. A concept by Dan Olekh."
unlisted: true
image: /og/b-pipecat.jpg
---

_For the Pipecat team at Daily._

```demo:debugger
{"call": "stadtwerke-zaehlerstand-pipecat", "finding": "early_endpoint:t3", "turn": "t3", "t": 16.06, "from": 14, "to": 19, "image": "/og/b-pipecat.jpg"}
```

Whisker shows a pipeline's frames. This puts a Pipecat call's spans and observer events on the same clock as the recording, and opens where the turn closed while the caller was still reading a number.

- **Spans on the audio:** stt, llm, tts and tools per turn, beside both sides' speech.
- **The reader is open source,** from the OpenTelemetry spans and the SpeakingObserver and FunctionCallObserver events.
- **An offer:** I'd be glad to help bring an audio-aligned view into Pipecat's own tooling.

Built on [earshot](https://earshot.danolekh.com), my open-source React library ([GitHub](https://github.com/danolekh/earshot)). The call is synthetic: I wrote it, and an open-source text-to-speech model spoke it.

I'm Dan, a full-stack developer in Vienna. I know Daily isn't hiring right now. I'd still like to help, and to talk if a role opens. [danyaolekhq@gmail.com](mailto:danyaolekhq@gmail.com?subject=Pipecat) · [Resume](/resume)

---

<small>A concept I made on my own, on a synthetic call. It uses no Daily logo or data. Not affiliated with Daily.</small>
