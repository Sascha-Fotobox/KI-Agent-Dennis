import { useEffect, useState } from "react";

type Props = {
  brand?: string;
  noticeText: string;
  privacyLink?: string;
  versionKey?: string; // bei Textänderung erhöhen
  onAccept: () => void;
  onDecline: () => void;
};

export const STORAGE_KEY_BASE = "dennis_privacy_consent_" as const;

export default function ConsentGate({
  brand = "Assistent",
  noticeText,
  privacyLink,
  versionKey = "v1",
  onAccept,
  onDecline,
}: Props) {
  const storageKey = STORAGE_KEY_BASE + versionKey;
  const [checked, setChecked] = useState(false);
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);
  const [alreadyDeclined, setAlreadyDeclined] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem(storageKey);
    setAlreadyAccepted(v === "accepted");
    setAlreadyDeclined(v === "declined");
  }, [storageKey]);

  useEffect(() => {
    if (alreadyAccepted) onAccept();
    if (alreadyDeclined) onDecline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alreadyAccepted, alreadyDeclined]);

  if (alreadyAccepted || alreadyDeclined) return null;

  return (
    <div className="consent-backdrop">
      <div className="consent-modal" role="dialog" aria-modal="true" aria-labelledby="consent-title">
        <h2 id="consent-title" className="consent-title">Datenschutz & Einverständnis</h2>

        <p className="consent-text">
          {noticeText}
          {privacyLink ? (
            <> Mehr dazu in unserer{" "}
              <a href={privacyLink} target="_blank" rel="noreferrer">Datenschutzerklärung</a>.
            </>
          ) : null}
        </p>

        <label className="consent-check">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            aria-describedby="consent-title"
          />
          <span>Ich bestätige, dass ich die Hinweise gelesen habe und zustimme.</span>
        </label>

        <div className="consent-actions">
          <button
            className="consent-btn"
            disabled={!checked}
            onClick={() => {
              localStorage.setItem(storageKey, "accepted");
              onAccept();
            }}
          >
            Zustimmen & starten
          </button>

          <button
            className="consent-btn-secondary"
            onClick={() => {
              localStorage.setItem(storageKey, "declined");
              onDecline();
            }}
          >
            Ablehnen
          </button>
        </div>
      </div>
    </div>
  );
}
