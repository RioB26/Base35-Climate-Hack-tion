import { useState, type FormEvent } from "react";
import { useData } from "../data";
import { DEFAULTS, STATES, validateNewSite } from "../../../supabase/functions/add-site/validate";

type Period = { fromYear: string; toYear: string; tonnesPerYear: string };

const emptyPeriod = (): Period => ({ fromYear: "", toYear: "", tonnesPerYear: "" });
const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

export function AddSiteForm({ onClose, onAdded }: { onClose: () => void; onAdded: (id: string) => void }) {
  const { addSite } = useData();
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [periods, setPeriods] = useState<Period[]>([emptyPeriod()]);
  const [k, setK] = useState("");
  const [L0, setL0] = useState("");
  const [capture, setCapture] = useState("");
  const [source, setSource] = useState("");
  const [passcode, setPasscode] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const setPeriod = (i: number, key: keyof Period, value: string) =>
    setPeriods((ps) => ps.map((p, j) => (j === i ? { ...p, [key]: value } : p)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const input = {
      name,
      state,
      lat: num(lat),
      lon: num(lon),
      acceptance: periods.map((p) => ({ fromYear: num(p.fromYear), toYear: num(p.toYear), tonnesPerYear: num(p.tonnesPerYear) })),
      // Blank advanced fields fall back to the server defaults.
      ...(k.trim() ? { k: num(k) } : {}),
      ...(L0.trim() ? { L0: num(L0) } : {}),
      ...(capture.trim() ? { existingCapture: num(capture) / 100 } : {}),
      source,
    };
    const check = validateNewSite(input);
    if (!check.ok) return setErrors(check.errors);
    if (!passcode) return setErrors(["Enter the passcode."]);
    setErrors([]);
    setBusy(true);
    const res = await addSite(input, passcode);
    setBusy(false);
    if (res.ok) onAdded(res.id);
    else setErrors(res.errors);
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-title" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal-card" onSubmit={submit} noValidate>
        <h2 id="add-title">Add a landfill</h2>
        <p className="muted small">
          We fetch the Sentinel-5P satellite data for it, which takes a few minutes. The waste figures are screening
          inputs, so the site is marked as using proxy inputs unless you cite a source.
        </p>

        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Spring Farm Landfill" required />
        </label>
        <div className="row">
          <label>
            State or territory
            <select value={state} onChange={(e) => setState(e.target.value)} required>
              <option value="">Select…</option>
              {STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Latitude
            <input inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-34.05" required />
          </label>
          <label>
            Longitude
            <input inputMode="decimal" value={lon} onChange={(e) => setLon(e.target.value)} placeholder="150.70" required />
          </label>
        </div>

        <fieldset>
          <legend>Waste accepted per year</legend>
          {periods.map((p, i) => (
            <div className="row" key={i}>
              <input aria-label={`Period ${i + 1} from year`} inputMode="numeric" placeholder="From year" value={p.fromYear} onChange={(e) => setPeriod(i, "fromYear", e.target.value)} />
              <input aria-label={`Period ${i + 1} to year`} inputMode="numeric" placeholder="To year" value={p.toYear} onChange={(e) => setPeriod(i, "toYear", e.target.value)} />
              <input aria-label={`Period ${i + 1} tonnes per year`} inputMode="numeric" placeholder="Tonnes / year" value={p.tonnesPerYear} onChange={(e) => setPeriod(i, "tonnesPerYear", e.target.value)} />
              {periods.length > 1 && (
                <button type="button" className="ghost" onClick={() => setPeriods((ps) => ps.filter((_, j) => j !== i))} aria-label={`Remove period ${i + 1}`}>
                  Remove
                </button>
              )}
            </div>
          ))}
          {periods.length < 6 && (
            <button type="button" className="ghost" onClick={() => setPeriods((ps) => [...ps, emptyPeriod()])}>
              Add another period
            </button>
          )}
        </fieldset>

        <details>
          <summary>Model settings and source (optional)</summary>
          <div className="row">
            <label>
              Decay rate k (1/yr)
              <input inputMode="decimal" value={k} onChange={(e) => setK(e.target.value)} placeholder={String(DEFAULTS.k)} />
            </label>
            <label>
              L0 (m³ CH₄ per tonne)
              <input inputMode="decimal" value={L0} onChange={(e) => setL0(e.target.value)} placeholder={String(DEFAULTS.L0)} />
            </label>
            <label>
              Methane already captured (%)
              <input inputMode="decimal" value={capture} onChange={(e) => setCapture(e.target.value)} placeholder={String(DEFAULTS.existingCapture * 100)} />
            </label>
          </div>
          <label>
            Source for these figures (link or citation)
            <input value={source} onChange={(e) => setSource(e.target.value)} />
          </label>
        </details>

        <label>
          Passcode
          <input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} autoComplete="off" required />
        </label>

        {errors.length > 0 && (
          <ul className="form-errors" role="alert">
            {errors.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}

        <div className="actions">
          <button type="submit" className="primary" disabled={busy}>
            {busy ? "Adding…" : "Add landfill"}
          </button>
          <button type="button" className="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
