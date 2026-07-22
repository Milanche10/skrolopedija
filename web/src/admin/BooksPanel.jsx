import { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';

const STATUS_LABEL = { uploaded: 'čeka', processing: 'obrada', done: 'gotovo', failed: 'greška' };

export default function BooksPanel({ onToast, aiReady, aiHint }) {
  const [books, setBooks] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef(null);
  const pollRef = useRef(null);

  async function load() {
    try {
      setBooks(await api.books());
    } catch (e) {
      onToast(e.message);
    }
  }

  useEffect(() => {
    load();
    // osvežavaj samo dok se nešto obrađuje (ne troši zahteve bez potrebe)
    pollRef.current = setInterval(async () => {
      const list = await api.books().catch(() => null);
      if (list) setBooks(list);
    }, 4000);
    return () => clearInterval(pollRef.current);
  }, []);

  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadBook(file);
      onToast('Knjiga dodata — obrada počinje.');
      load();
    } catch (err) {
      onToast(err.message, 4000);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function scan() {
    setScanning(true);
    try {
      const r = await api.scan();
      if (r.addedCount > 0) onToast(`Skenirano: ${r.addedCount} novih knjiga, ${r.existing} već poznato.`);
      else if (r.error) onToast(r.error, 5000);
      else onToast(`Skenirano: 0 novih, ${r.existing} već poznato.`);
      load();
    } catch (e) {
      onToast(e.message, 4000);
    } finally {
      setScanning(false);
    }
  }

  async function process(id) {
    try {
      await api.processBook(id);
      onToast('Obrada pokrenuta…');
    } catch (e) {
      onToast(e.message, 5000);
    }
    load();
  }
  async function remove(id) {
    if (!confirm('Obrisati knjigu i sve njene kartice?')) return;
    await api.deleteBook(id).catch((e) => onToast(e.message));
    load();
  }

  const missingCount = books.filter((b) => b.fileMissing).length;

  return (
    <div>
      <div className="info-box">
        <strong>📚 Kako se dodaju knjige</strong>
        <p className="muted">
          Na hostingu knjige dodaješ dugmetom <b>Upload</b> (PDF/DOCX) — odmah se obrađuju AI-jem i kartice ostaju
          trajno u bazi. „Skeniraj bazu znanja" radi samo lokalno (folder <code>Baza znanja/</code> na tvom računaru).
          Velike biblioteke je najbolje obraditi lokalno u produkcijsku bazu (vidi <code>DEPLOY.md</code>).
        </p>
      </div>

      <div className="toolbar">
        <input ref={fileRef} type="file" accept=".pdf,.docx" onChange={upload} style={{ display: 'none' }} id="bookfile" />
        <button className="btn" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? 'Otpremanje…' : '⬆️ Upload knjige'}
        </button>
        <button className="btn ghost" disabled={scanning} onClick={scan}>
          {scanning ? 'Skeniram…' : '📂 Skeniraj bazu znanja'}
        </button>
        {!aiReady && <span className="muted">⚠️ {aiHint || 'AI nije spreman'} — obrada neće izvući kartice.</span>}
      </div>

      {missingCount > 0 && (
        <p className="muted" style={{ margin: '0 2px 12px' }}>
          ℹ️ {missingCount} {missingCount === 1 ? 'knjiga je' : 'knjiga(e) su'} registrovane lokalno — njihovi fajlovi
          nisu na serveru, pa se ne mogu obraditi ovde (obradi ih lokalno ili ponovo preko „Upload").
        </p>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Naslov</th>
              <th>Tip</th>
              <th>Status</th>
              <th>Napredak</th>
              <th>Kartica</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {books.length === 0 && (
              <tr>
                <td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 28 }}>
                  Još nema knjiga. Klikni <b>Upload</b> da dodaš PDF ili DOCX.
                </td>
              </tr>
            )}
            {books.map((b) => (
              <tr key={b.id} className={b.fileMissing ? 'row-muted' : ''}>
                <td>
                  {b.title}
                  {b.author ? <span className="muted"> · {b.author}</span> : null}
                  {b.fileMissing && <span className="chip-local" title="Fajl nije na ovom serveru">lokalno</span>}
                </td>
                <td>{b.fileType}</td>
                <td>
                  <span className={`status-badge status-${b.status}`}>{STATUS_LABEL[b.status] || b.status}</span>
                  {b.error && (
                    <div className="muted err-text" title={b.error}>
                      {b.error}
                    </div>
                  )}
                </td>
                <td style={{ minWidth: 150 }}>
                  {b.status === 'processing' || b.doneSegments > 0 ? (
                    <>
                      <div className="progress">
                        <div style={{ width: `${b.progress}%` }} />
                      </div>
                      <span className="muted">
                        {b.doneSegments}/{b.totalSegments} segm. ({b.progress}%)
                      </span>
                    </>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>{b.cardCount}</td>
                <td>
                  <div className="row-actions">
                    {b.fileMissing ? (
                      <button className="btn ghost" disabled title="Fajl nije na serveru">
                        Nedostupno
                      </button>
                    ) : (
                      <button
                        className="btn ghost"
                        disabled={b.status === 'processing' || b.queued}
                        onClick={() => process(b.id)}
                      >
                        {b.status === 'done' ? 'Ponovo' : 'Obradi'}
                      </button>
                    )}
                    <button className="btn danger" onClick={() => remove(b.id)}>
                      Obriši
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
