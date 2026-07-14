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
    // periodično osvežavanje dok se nešto obrađuje
    pollRef.current = setInterval(async () => {
      const list = await api.books().catch(() => null);
      if (list) {
        setBooks(list);
        if (!list.some((b) => b.status === 'processing' || b.queued)) {
          /* i dalje osvežavamo ređe je ok — ostavi interval */
        }
      }
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, []);

  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.uploadBook(file);
      onToast('Knjiga dodata, obrada počinje…');
      load();
    } catch (err) {
      onToast(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function scan() {
    setScanning(true);
    try {
      const r = await api.scan();
      if (r.error) onToast(r.error);
      else onToast(`Sken: ${r.addedCount} novih, ${r.existing} već poznato`);
      load();
    } catch (e) {
      onToast(e.message);
    } finally {
      setScanning(false);
    }
  }

  async function process(id) {
    await api.processBook(id).catch((e) => onToast(e.message));
    load();
  }
  async function remove(id) {
    if (!confirm('Obrisati knjigu i sve njene kartice?')) return;
    await api.deleteBook(id).catch((e) => onToast(e.message));
    load();
  }

  return (
    <div>
      <div className="card-box" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input ref={fileRef} type="file" accept=".pdf,.docx" onChange={upload} style={{ display: 'none' }} id="bookfile" />
        <button className="btn" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? 'Otpremanje…' : '⬆️ Upload knjige (.pdf/.docx)'}
        </button>
        <button className="btn ghost" disabled={scanning} onClick={scan}>
          {scanning ? 'Skeniram…' : '📂 Skeniraj bazu znanja'}
        </button>
        {!aiReady && <span className="muted">⚠️ {aiHint || 'AI nije spreman'} — obrada neće izvući kartice dok se AI ne osposobi.</span>}
      </div>

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
              <td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 24 }}>
                Nema knjiga. Ubaci fajl u folder <code>Baza znanja/</code> pa klikni „Skeniraj", ili otpremi knjigu.
              </td>
            </tr>
          )}
          {books.map((b) => (
            <tr key={b.id}>
              <td>{b.title}{b.author ? <span className="muted"> · {b.author}</span> : null}</td>
              <td>{b.fileType}</td>
              <td>
                <span className={`status-badge status-${b.status}`}>{STATUS_LABEL[b.status] || b.status}</span>
                {b.error && <div className="muted" title={b.error} style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.error}</div>}
              </td>
              <td style={{ minWidth: 140 }}>
                {b.status === 'processing' || b.doneSegments > 0 ? (
                  <>
                    <div className="progress"><div style={{ width: `${b.progress}%` }} /></div>
                    <span className="muted">{b.doneSegments}/{b.totalSegments} segm. ({b.progress}%)</span>
                  </>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
              <td>{b.cardCount}</td>
              <td>
                <div className="row-actions">
                  <button className="btn ghost" disabled={b.status === 'processing' || b.queued} onClick={() => process(b.id)}>
                    {b.status === 'done' ? 'Ponovo' : 'Obradi'}
                  </button>
                  <button className="btn danger" onClick={() => remove(b.id)}>Obriši</button>
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
