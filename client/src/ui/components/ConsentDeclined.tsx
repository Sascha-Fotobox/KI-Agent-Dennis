import { STORAGE_KEY_BASE } from "./ConsentGate";

type Props = {
  notice?: string;
  versionKey?: string;
  onAcceptNow: () => void;
};

export default function ConsentDeclined({
  notice = "Völlig verständlich, wenn du nicht zustimmen möchtest. Ohne Einwilligung kann die Chat-Funktion leider nicht genutzt werden.",
  versionKey = "v1",
  onAcceptNow,
}: Props) {
  const storageKey = STORAGE_KEY_BASE + versionKey;

  return (
    <div className="consent-declined">
      <h2>Keine Nutzung ohne Einwilligung</h2>
      <p>{notice}</p>
      <button
        className="consent-btn"
        onClick={() => {
          localStorage.setItem(storageKey, "accepted");
          onAcceptNow();
        }}
      >
        Ich stimme doch zu
      </button>
    </div>
  );
}
