# Skills

Terms used by the skills in this repo, grouped by skill.

## Language

### Recording (record-user-journey)

**Frame timeline**:
The captured frames of one run in time order, each with how long it stays on screen in the video.
_Avoid_: frame list, concat list

**Held frame**:
A frame that stays on screen much longer than the run's usual frame gap, because the screen did not change.
_Avoid_: stall, gap, freeze

**Tail hold**:
How long the final frame stays on screen, from its capture to the end of capture, capped per journey.
_Avoid_: last-frame hold, closing hold
