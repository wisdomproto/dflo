import type { StepProps } from './StepBasic';
import { YesNoField, TextField } from './fields';

export function StepFamily({ state, set, L }: StepProps) {
  const s = state.survey;
  const setSurvey = (patch: Partial<typeof s>) =>
    set({ survey: { ...s, ...patch } });

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-bold text-slate-800">{L.s3Title}</h2>

      <YesNoField
        label={L.pastConsult}
        value={s.past_clinic_consult}
        onChange={(v) => setSurvey({ past_clinic_consult: v })}
        yes={L.yes}
        no={L.no}
      />
      <YesNoField
        label={L.parentsInterested}
        value={s.parents_interested}
        onChange={(v) => setSurvey({ parents_interested: v })}
        yes={L.yes}
        no={L.no}
      />
      <YesNoField
        label={L.sportsAthlete}
        value={s.sports_athlete}
        onChange={(v) => setSurvey({ sports_athlete: v })}
        yes={L.yes}
        no={L.no}
      />
      <TextField
        label={L.sportsEvent}
        value={s.sports_event}
        onChange={(v) => setSurvey({ sports_event: v })}
      />
      <YesNoField
        label={L.childInterested}
        value={s.child_interested}
        onChange={(v) => setSurvey({ child_interested: v })}
        yes={L.yes}
        no={L.no}
      />
    </div>
  );
}
