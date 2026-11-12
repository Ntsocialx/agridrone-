import { useState } from "react";
import { api, errorText, formatDate, useApi } from "./api";
import { Button, Card, Chip, Field, ListState } from "./ui";

type Broadcast = { id: string; kind: "announcement" | "update"; title: string; body: string; createdAt: string };

export function NotifyTab() {
  const history = useApi<Broadcast[]>("/admin/notifications");
  const [kind, setKind] = useState<Broadcast["kind"]>("announcement");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors = {
    title: title.trim().length >= 3 ? undefined : "Add a short title (3+ characters)",
    body: body.trim().length >= 5 ? undefined : "Write the message (5+ characters)",
  };

  const review = () => {
    setSubmitted(true);
    if (!Object.values(errors).some(Boolean)) setConfirming(true);
  };

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/admin/notifications", { body: { kind, title: title.trim(), body: body.trim() } });
      setTitle("");
      setBody("");
      setSubmitted(false);
      setConfirming(false);
      await history.reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="two-col">
      <section>
        <div className="section-head"><h2>Send to everyone</h2></div>
        <Card>
          <p className="muted small">Every pilot and farm owner sees this under the bell in the app.</p>
          <div className="chips">
            <Chip label="Announcement" active={kind === "announcement"} onClick={() => setKind("announcement")} />
            <Chip label="App update" active={kind === "update"} onClick={() => setKind("update")} />
          </div>
          <div className="stack">
            <Field label="Title" placeholder="e.g. Planned maintenance on Sunday" value={title} onChange={setTitle} maxLength={120} error={submitted ? errors.title : undefined} />
            <Field label="Message" placeholder="What do people need to know?" value={body} onChange={setBody} multiline maxLength={1000} error={submitted ? errors.body : undefined} />
          </div>
          {error ? <div className="alert" role="alert">{error}</div> : null}
          {confirming ? (
            <div className="stack">
              <p className="small">Send this {kind === "update" ? "app update" : "announcement"} to every user? It can't be unsent.</p>
              <div className="row">
                <Button variant="outline" disabled={busy} onClick={() => setConfirming(false)}>Edit</Button>
                <Button busy={busy} onClick={send}>Send now</Button>
              </div>
            </div>
          ) : (
            <Button variant="dark" onClick={review}>Review and send</Button>
          )}
        </Card>
      </section>

      <section>
        <div className="section-head"><h2>Sent</h2></div>
        <ListState list={history} empty={{ title: "Nothing sent yet", body: "Announcements and app updates you send appear here." }}>
          {(items) => (
            <div className="stack">
              {items.map((b) => (
                <Card key={b.id}>
                  <p className="muted small">{b.kind === "update" ? "App update" : "Announcement"}, {formatDate(b.createdAt)}</p>
                  <h3>{b.title}</h3>
                  <p className="muted">{b.body}</p>
                </Card>
              ))}
            </div>
          )}
        </ListState>
      </section>
    </div>
  );
}
