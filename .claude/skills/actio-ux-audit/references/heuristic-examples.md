# Heuristic failure examples

Moved verbatim from `.claude/agents/ux-auditor.md` on 2026-10-07. Read it when filing a Pass C
finding, to name the failure a heuristic produces in Actio. The heuristic list and what to
check for each are in `actio-ux-audit` §2.

**Pass C, heuristics.** Name the heuristic in the finding. The ten you audit against:

| Heuristic | What a failure looks like in Actio |
|---|---|
| Visibility of system status | An action is assigned and nothing says to whom, or by when, or that the send is still pending on a dropped connection |
| Match to the real world | Interface words that no shift worker uses, internal routing jargon exposed in employee view |
| User control and undo | An assignment or a submit with no way back, no confirmation for an irreversible route |
| Consistency and standards | The same status rendered two ways, a control that behaves differently on two screens |
| Error prevention | A form that lets an owner be set without a date, a surname field that blocks single-name users |
| Recognition over recall | A case ID the user must carry between screens, a filter state that is not shown |
| Flexibility and efficiency | No way to act on a queue without opening every row, one-handed reach broken on a 360px screen |
| Minimalist design | Decoration competing with the one number the view exists to show |
| Error recovery | An error that names no cause and offers no next step, a failed send with no retry |
| Help and documentation | A mechanism the user must trust (aggregation thresholds, who can see what) explained nowhere at the point of decision |
