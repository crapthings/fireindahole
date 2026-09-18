# Game sound effects

Normalized copies of user-provided MP3 files; originals remain unchanged.
48 kHz / 16-bit PCM WAV avoids additional lossy compression.

| File | Event | Gain | Verified loudness | True peak |
| --- | --- | --- | --- | --- |
| fire-in-the-hole.wav | Grenade release | -4.57 dB | -18.02 LUFS | -6.90 dBTP |
| dry-fart.wav | Delayed successful hit | -3.35 dB | -18.00 LUFS* | -4.72 dBTP |
| body-impact.wav | Body surface collision | Peak-constrained normalization | -19.48 LUFS | -2.00 dBTP |

*The 0.31-second effect is shorter than the integrated loudness measurement window.
Its loudness was measured using 16 consecutive repetitions; the shipped file still
contains only the original single effect. Both outputs were checked with FFmpeg
loudnorm; peaks remain below -2 dBTP. Cloth and floor collision tones remain synthesized at a lower gain.

Playback skips 47 ms of leading silence in both files, with 3 ms fade-in and
5 ms fade-out. Fart onset is 50.5 ms and its sample peak is 67.4 ms (-4.72 dBFS);
voice onset is 52.7 ms and its sample peak is 145.6 ms (-6.91 dBFS).
Playback ends at 280 ms / 1740 ms respectively. The original WAVs remain intact.
The successful-entry animation takes 220 ms, followed by a 250 ms fuse before
the sound and visual burst trigger together. Hardware output latency is additional.

Body impact source: `universfield-cartoonish-impacts-277553.mp3` (user supplied).
The 2.448-second source has about 106 ms of leading silence. The output retains
101–1850 ms, with a 3 ms fade-in and 20 ms fade-out, at 48 kHz stereo / 16-bit PCM.
FFmpeg loudnorm targeted -18 LUFS with a -2 dBTP ceiling; the transient's crest
factor limits the resulting loudness to -19.48 LUFS. Verification on the exported
WAV measured -2.00 dBTP. Audible onset at the -45 dB threshold is about 5 ms.
It is predecoded with the other effects and played immediately on the `body`
collision event, without a fuse delay or additional playback offset.

## Ground bounce variants

Source: user-supplied `freesound_community-cartoon_boing-92413.mp3`.
Three separate events were detected using silence boundaries and PCM peaks.
Each slice starts about 5 ms before its -50 dBFS onset, with a 3 ms fade-in
and 20 ms fade-out. Outputs are 48 kHz stereo / 16-bit PCM, normalized toward
-18 LUFS with a -2 dBTP ceiling; variant 3 is peak constrained.

| File | Source interval (s) | Source peak (s) | Gain | Verified LUFS | True peak |
| --- | --- | --- | --- | --- | --- |
| ground-boing-1.wav | 0.204–0.963 | 0.25225 | +14.65 dB | -18.05 | -3.69 dBTP |
| ground-boing-2.wav | 3.036–3.684 | 3.09658 | +11.77 dB | -18.02 | -2.93 dBTP |
| ground-boing-3.wav | 6.730–8.107 | 6.77725 | +12.97 dB | -20.57 | -2.00 dBTP |

After a body collision, the first ground contact plays one predecoded variant,
randomly selected without immediate repetition when multiple variants loaded.
Subsequent ground contacts from the same throw do not retrigger it. A direct
ground miss retains the original clink effect.
