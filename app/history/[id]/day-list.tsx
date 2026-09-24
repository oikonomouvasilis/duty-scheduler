"use client";

import { useState, useActionState } from "react";
import { idleResult, type FormResult } from "@/lib/form";
import { ui } from "@/lib/ui";
import { WEEKDAYS_EL } from "@/lib/dates";
import { addDayAssignment, removeDayAssignment } from "@/app/schedule/actions";

type PersonRef = { personId: string; name: string };
type EligiblePerson = { id: string; name: string; rankName: string | null };
type DutyMeta = { name: string; color: string | null };
type DayRow = {
  date: string;
  day: number;
  dow: number;
  label: string | null;
  heavy: boolean;
  assignmentsByDuty: Record<string, PersonRef[]>;
  rejectedIds: string[];
};

export function DayList({
  scheduleId,
  readOnly,
  days,
  dutyOrder,
  dutyMeta,
  eligibleByDuty,
  rejByDate,
}: {
  scheduleId: string;
  readOnly: boolean;
  days: DayRow[];
  dutyOrder: string[];
  dutyMeta: Record<string, DutyMeta>;
  eligibleByDuty: Record<string, EligiblePerson[]>;
  rejByDate: Record<string, number>;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className={`${ui.card} divide-y divide-gray-100 dark:divide-gray-800`}>
      {days.map((d) => {
        const rej = rejByDate[d.date] ?? 0;
        const isOpen = expanded === d.date;
        const hasAny = Object.values(d.assignmentsByDuty).some(
          (l) => l.length > 0,
        );
        return (
          <div key={d.date}>
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : d.date)}
              className={`flex w-full gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-white/5 ${
                d.heavy ? "bg-amber-50/40 dark:bg-amber-500/5" : ""
              } ${isOpen ? "bg-gray-50 dark:bg-white/5" : ""}`}
            >
              <div className="w-10 shrink-0 text-center">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {d.day}
                </div>
                <div className="text-[11px] text-gray-400 dark:text-gray-500">
                  {WEEKDAYS_EL[d.dow]}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                {d.label ? (
                  <div className="text-xs text-amber-700 dark:text-amber-500">
                    {d.label}
                  </div>
                ) : null}
                {hasAny ? (
                  <div className="flex flex-col gap-1">
                    {dutyOrder
                      .filter((did) => (d.assignmentsByDuty[did] ?? []).length > 0)
                      .map((did) => (
                        <div
                          key={did}
                          className="flex flex-wrap items-baseline gap-x-2 text-sm"
                        >
                          <span className="inline-flex items-center gap-1.5 font-medium text-gray-900 dark:text-gray-100">
                            <span
                              className="h-2.5 w-2.5 rounded-[2px]"
                              style={{
                                backgroundColor: dutyMeta[did]?.color ?? "#9ca3af",
                              }}
                            />
                            {dutyMeta[did]?.name ?? "—"}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            {d.assignmentsByDuty[did].map((p) => p.name).join(", ")}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-300 dark:text-gray-600">—</div>
                )}
              </div>
              {rej > 0 ? (
                <div
                  className="shrink-0 self-center text-[11px] text-red-400 dark:text-red-500"
                  title={`${rej} απορρίψεις`}
                >
                  {rej} απόρρ.
                </div>
              ) : null}
            </button>

            {isOpen ? (
              <DayEditor
                scheduleId={scheduleId}
                readOnly={readOnly}
                date={d.date}
                dutyOrder={dutyOrder}
                dutyMeta={dutyMeta}
                assignmentsByDuty={d.assignmentsByDuty}
                eligibleByDuty={eligibleByDuty}
                rejectedIds={d.rejectedIds}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function DayEditor({
  scheduleId,
  readOnly,
  date,
  dutyOrder,
  dutyMeta,
  assignmentsByDuty,
  eligibleByDuty,
  rejectedIds,
}: {
  scheduleId: string;
  readOnly: boolean;
  date: string;
  dutyOrder: string[];
  dutyMeta: Record<string, DutyMeta>;
  assignmentsByDuty: Record<string, PersonRef[]>;
  eligibleByDuty: Record<string, EligiblePerson[]>;
  rejectedIds: string[];
}) {
  const relevant = dutyOrder.filter(
    (did) => (assignmentsByDuty[did] ?? []).length > 0 || eligibleByDuty[did],
  );
  const rejectedSet = new Set(rejectedIds);

  return (
    <div className="space-y-3 border-t border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-white/5">
      {relevant.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Καμία διαθέσιμη υπηρεσία για αυτή τη μέρα.
        </p>
      ) : (
        relevant.map((did) => (
          <DutyEditorRow
            key={did}
            scheduleId={scheduleId}
            readOnly={readOnly}
            date={date}
            dutyId={did}
            meta={dutyMeta[did]}
            assigned={assignmentsByDuty[did] ?? []}
            eligible={eligibleByDuty[did] ?? []}
            rejectedSet={rejectedSet}
          />
        ))
      )}
      {rejectedIds.length > 0 ? (
        <p className="text-xs text-red-400 dark:text-red-500">
          {rejectedIds.length} άτομο/α έχουν δηλώσει μη διαθεσιμότητα αυτή τη μέρα.
        </p>
      ) : null}
    </div>
  );
}

function DutyEditorRow({
  scheduleId,
  readOnly,
  date,
  dutyId,
  meta,
  assigned,
  eligible,
  rejectedSet,
}: {
  scheduleId: string;
  readOnly: boolean;
  date: string;
  dutyId: string;
  meta: DutyMeta | undefined;
  assigned: PersonRef[];
  eligible: EligiblePerson[];
  rejectedSet: Set<string>;
}) {
  const [addState, addAction] = useActionState(
    async (_p: FormResult, fd: FormData) => addDayAssignment(fd),
    idleResult,
  );

  const assignedIds = new Set(assigned.map((p) => p.personId));
  const options = eligible.filter(
    (p) => !assignedIds.has(p.id) && !rejectedSet.has(p.id),
  );

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100">
        <span
          className="h-2.5 w-2.5 rounded-[2px]"
          style={{ backgroundColor: meta?.color ?? "#9ca3af" }}
        />
        {meta?.name ?? "—"}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {assigned.length === 0 ? (
          <span className="text-sm text-gray-400 dark:text-gray-500">
            Κανένας
          </span>
        ) : (
          assigned.map((p) => (
            <RemoveChip
              key={p.personId}
              scheduleId={scheduleId}
              date={date}
              dutyId={dutyId}
              personId={p.personId}
              name={p.name}
              readOnly={readOnly}
            />
          ))
        )}
      </div>
      {!readOnly && options.length > 0 ? (
        <form action={addAction} className="mt-1.5 flex items-center gap-2">
          <input type="hidden" name="scheduleId" value={scheduleId} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="dutyTypeId" value={dutyId} />
          <select
            key={assigned.length}
            name="personId"
            defaultValue=""
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className={`${ui.input} max-w-[220px] py-1 text-xs`}
          >
            <option value="" disabled>
              + Προσθήκη ατόμου…
            </option>
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.rankName ? ` (${p.rankName})` : ""}
              </option>
            ))}
          </select>
          {addState.error ? (
            <span className="text-xs text-red-600 dark:text-red-400">
              {addState.error}
            </span>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}

function RemoveChip({
  scheduleId,
  date,
  dutyId,
  personId,
  name,
  readOnly,
}: {
  scheduleId: string;
  date: string;
  dutyId: string;
  personId: string;
  name: string;
  readOnly: boolean;
}) {
  const [state, action, pending] = useActionState(
    async (_p: FormResult, fd: FormData) => removeDayAssignment(fd),
    idleResult,
  );

  if (readOnly) {
    return (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-white/10 dark:text-gray-300">
        {name}
      </span>
    );
  }

  return (
    <form action={action} className="inline-flex">
      <input type="hidden" name="scheduleId" value={scheduleId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="dutyTypeId" value={dutyId} />
      <input type="hidden" name="personId" value={personId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-red-950/40 dark:hover:text-red-400"
        title="Αφαίρεση"
      >
        {name} <span aria-hidden>×</span>
      </button>
      {state.error ? (
        <span className="ml-2 self-center text-xs text-red-600 dark:text-red-400">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
