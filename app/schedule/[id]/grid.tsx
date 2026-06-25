"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { idleResult, type FormResult } from "@/lib/form";
import { ui } from "@/lib/ui";
import { WEEKDAYS_EL } from "@/lib/dates";
import { setCellDuties, toggleRejection } from "../actions";

type DayCol = {
  date: string;
  day: number;
  dow: number;
  dayType: string;
  label: string | null;
  heavy: boolean;
};
type GridPerson = {
  id: string;
  name: string;
  rankName: string | null;
  status: string;
  eligible: string[];
};
type DutyMeta = { id: string; name: string; color: string | null };

const key = (personId: string, date: string) => `${personId}|${date}`;

export function Grid({
  scheduleId,
  readOnly,
  days,
  people,
  duties,
  dutyMeta,
  assignmentsByCell,
  rejectedCells,
}: {
  scheduleId: string;
  readOnly: boolean;
  days: DayCol[];
  people: GridPerson[];
  duties: DutyMeta[];
  dutyMeta: Record<string, { name: string; color: string | null }>;
  assignmentsByCell: Record<string, string[]>;
  rejectedCells: string[];
}) {
  const rejected = useMemo(() => new Set(rejectedCells), [rejectedCells]);
  const [sel, setSel] = useState<{ personId: string; date: string } | null>(
    null,
  );

  const selPerson = sel ? people.find((p) => p.id === sel.personId) : null;
  const selDay = sel ? days.find((d) => d.date === sel.date) : null;
  const selKey = sel ? key(sel.personId, sel.date) : "";

  return (
    <div className="mt-4">
      <div className={`${ui.card} overflow-x-auto`}>
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border-b border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Άτομο
              </th>
              {days.map((d) => (
                <th
                  key={d.date}
                  title={d.label ?? undefined}
                  className={`w-9 border-b border-l border-gray-100 px-0 py-1 text-center text-[11px] font-medium ${
                    d.heavy ? "bg-amber-50 text-amber-700" : "text-gray-500"
                  }`}
                >
                  <div>{d.day}</div>
                  <div className="text-[10px] font-normal opacity-70">
                    {WEEKDAYS_EL[d.dow]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id} className="group">
                <th
                  scope="row"
                  className="sticky left-0 z-10 max-w-[180px] border-b border-gray-100 bg-white px-3 py-1 text-left font-normal"
                >
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="truncate text-[11px] text-gray-400">
                    {p.rankName ?? "—"}
                    {p.status === "frozen" ? " · παγωμένος" : ""}
                  </div>
                </th>
                {days.map((d) => {
                  const k = key(p.id, d.date);
                  const isRej = rejected.has(k);
                  const asg = assignmentsByCell[k] ?? [];
                  const selectedCell = k === selKey;
                  return (
                    <td
                      key={d.date}
                      className={`border-b border-l border-gray-100 p-0 ${
                        d.heavy ? "bg-amber-50/40" : ""
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setSel({ personId: p.id, date: d.date })
                        }
                        className={`flex h-9 w-9 flex-wrap content-center items-center justify-center gap-0.5 ${
                          selectedCell ? "ring-2 ring-inset ring-gray-900" : ""
                        } ${isRej ? "bg-red-50" : "hover:bg-gray-100"}`}
                        title={
                          isRej
                            ? "απόρριψη"
                            : asg
                                .map((id) => dutyMeta[id]?.name ?? "")
                                .filter(Boolean)
                                .join(", ")
                        }
                      >
                        {isRej ? (
                          <span className="text-xs font-bold text-red-500">
                            ✕
                          </span>
                        ) : (
                          asg.slice(0, 4).map((id, i) => (
                            <span
                              key={i}
                              className="inline-block h-2.5 w-2.5 rounded-[2px]"
                              style={{
                                backgroundColor:
                                  dutyMeta[id]?.color ?? "#9ca3af",
                              }}
                            />
                          ))
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            {people.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-4 text-gray-400"
                  colSpan={days.length + 1}
                >
                  Κανένα (μη αρχειοθετημένο) άτομο. Πρόσθεσε από τη Διαχείριση.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {sel && selPerson && selDay ? (
        <CellEditor
          key={selKey}
          scheduleId={scheduleId}
          readOnly={readOnly}
          person={selPerson}
          day={selDay}
          assigned={assignmentsByCell[selKey] ?? []}
          rejected={rejected.has(selKey)}
          duties={duties}
          onClose={() => setSel(null)}
        />
      ) : null}
    </div>
  );
}

function CellEditor({
  scheduleId,
  readOnly,
  person,
  day,
  assigned,
  rejected,
  duties,
  onClose,
}: {
  scheduleId: string;
  readOnly: boolean;
  person: GridPerson;
  day: DayCol;
  assigned: string[];
  rejected: boolean;
  duties: DutyMeta[];
  onClose: () => void;
}) {
  const [saveState, saveAction, savePending] = useActionState(
    async (_p: FormResult, fd: FormData) => setCellDuties(fd),
    idleResult,
  );
  const [rejState, rejAction, rejPending] = useActionState(
    async (_p: FormResult, fd: FormData) => toggleRejection(fd),
    idleResult,
  );

  const eligible = duties.filter((d) => person.eligible.includes(d.id));
  const assignedSet = new Set(assigned);

  return (
    <div className={`${ui.card} mt-4 p-4`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">{person.name}</div>
          <div className="text-sm text-gray-500">
            {day.day} {WEEKDAYS_EL[day.dow]}
            {day.heavy ? (
              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                βαριά μέρα
              </span>
            ) : null}
            {day.label ? (
              <span className="ml-2 text-xs text-gray-400">{day.label}</span>
            ) : null}
          </div>
        </div>
        <button onClick={onClose} className={ui.btnSm} type="button">
          Κλείσιμο
        </button>
      </div>

      {readOnly ? (
        <p className="text-sm text-gray-500">
          {rejected
            ? "Απόρριψη."
            : assigned.length
              ? "Υπηρεσίες: " +
                assigned.map((id) => duties.find((d) => d.id === id)?.name ?? id).join(", ")
              : "Καμία υπηρεσία."}{" "}
          (οριστικοποιημένο — μόνο προβολή)
        </p>
      ) : rejected ? (
        <form action={rejAction} className="flex items-center gap-3">
          <input type="hidden" name="scheduleId" value={scheduleId} />
          <input type="hidden" name="personId" value={person.id} />
          <input type="hidden" name="date" value={day.date} />
          <span className="text-sm text-red-600">
            Το άτομο έχει δηλώσει να μην κάνει υπηρεσία.
          </span>
          <button className={ui.btnSm} disabled={rejPending}>
            Άρση απόρριψης
          </button>
          {rejState.error ? (
            <span className="text-sm text-red-600">{rejState.error}</span>
          ) : null}
        </form>
      ) : (
        <div className="space-y-4">
          {eligible.length === 0 ? (
            <p className="text-sm text-gray-400">
              Καμία διαθέσιμη υπηρεσία για τον βαθμό του ατόμου (έλεγξε βαθμό /
              ρυθμίσεις μήνα).
            </p>
          ) : (
            <form action={saveAction} className="space-y-3">
              <input type="hidden" name="scheduleId" value={scheduleId} />
              <input type="hidden" name="personId" value={person.id} />
              <input type="hidden" name="date" value={day.date} />
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {eligible.map((d) => (
                  <label
                    key={d.id}
                    className="inline-flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="dutyIds"
                      value={d.id}
                      defaultChecked={assignedSet.has(d.id)}
                      className="h-4 w-4"
                    />
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-3 w-3 rounded-[2px]"
                        style={{ backgroundColor: d.color ?? "#9ca3af" }}
                      />
                      {d.name}
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button className={ui.btn} disabled={savePending}>
                  Αποθήκευση
                </button>
                {saveState.ok ? (
                  <span className="text-sm text-green-600">Αποθηκεύτηκε.</span>
                ) : null}
                {saveState.error ? (
                  <span className="text-sm text-red-600">
                    {saveState.error}
                  </span>
                ) : null}
              </div>
            </form>
          )}

          <form action={rejAction}>
            <input type="hidden" name="scheduleId" value={scheduleId} />
            <input type="hidden" name="personId" value={person.id} />
            <input type="hidden" name="date" value={day.date} />
            <button className={ui.btnDanger} disabled={rejPending}>
              Απόρριψη ημέρας
            </button>
            {rejState.error ? (
              <span className="ml-2 text-sm text-red-600">
                {rejState.error}
              </span>
            ) : null}
          </form>
        </div>
      )}
    </div>
  );
}
