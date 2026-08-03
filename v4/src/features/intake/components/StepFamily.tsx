import type { StepProps } from './StepBasic';
import { YesNoField, TextField, SelectField } from './fields';

export function StepFamily({ state, set, L }: StepProps) {
  const s = state.survey;
  const setSurvey = (patch: Partial<typeof s>) =>
    set({ survey: { ...s, ...patch } });

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-bold text-slate-800">{L.s3Title}</h2>

      <SelectField
        label={L.acquisitionChannel}
        value={s.acquisition_channel ?? ''}
        onChange={(v) => setSurvey({ acquisition_channel: v || null })}
        options={L.acquisitionChannelOpts}
      />

      {/* 검색으로 온 사람에게만. 구글은 검색어의 90%+ 를 가리므로 환자에게 직접 묻는 게
          우리가 실제 검색 문장을 얻는 유일한 경로다. */}
      {['google', 'naver', 'ai'].includes(s.acquisition_channel ?? '') && (
        <TextField
          label={L.acquisitionKeyword}
          value={s.acquisition_keyword ?? ''}
          onChange={(v) => setSurvey({ acquisition_keyword: v || null })}
          hint={L.acquisitionKeywordHint}
        />
      )}

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
