import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

/* ---------- POČETNA ---------- */
export function Home() {
  return (
    <>
      <section className="dz-hero">
        <div className="dz-container dz-hero-inner">
          <span className="dz-eyebrow">Digitalni Zenit</span>
          <h1>Gradimo sigurnije, pametnije i inkluzivnije digitalno društvo.</h1>
          <p>
            Digitalni Zenit je organizacija posvećena razvoju digitalnog društva kroz obrazovanje,
            istraživanje, inovacije i međunarodnu saradnju. Povezujemo tehnologiju i ljude kako bismo
            stvorili sigurniju, pravedniju i održiviju digitalnu budućnost.
          </p>
          <div className="dz-hero-cta">
            <Link to="/o-nama" className="dz-btn dz-btn-primary">Saznaj više</Link>
            <Link to="/podrzi" className="dz-btn dz-btn-ghost">Podrži naš rad</Link>
          </div>
        </div>
      </section>

      <Section title="Naša misija" center>
        <p className="dz-lead">
          Verujemo da digitalne tehnologije treba da budu dostupne svima i da služe javnom interesu.
          Naša misija je da razvijamo digitalnu pismenost, podižemo nivo sajber bezbednosti, promovišemo
          odgovornu upotrebu veštačke inteligencije i doprinosimo razvoju digitalnog društva kroz
          obrazovanje, istraživanje i inovacije.
        </p>
      </Section>

      {/* Brojači */}
      <section className="dz-section tint">
        <div className="dz-container dz-counters">
          <Counter to={12} label="Projekata" />
          <Counter to={5} label="Partnera" />
          <Counter to={30} label="Radionica" />
          <Counter to={800} label="Učesnika" suffix="+" />
        </div>
      </section>

      <Section title="Čime se bavimo" tint>
        <div className="dz-cards">
          {[
            ['🎓', 'Edukacija', 'Radionice, predavanja, konferencije i obuke za građane, škole, studente, kompanije i institucije.'],
            ['🛡️', 'Digitalna bezbednost', 'Pomažemo pojedincima i organizacijama da bezbednije koriste internet i razviju otpornost na digitalne pretnje.'],
            ['🤖', 'Veštačka inteligencija', 'Promovišemo odgovornu primenu AI tehnologija kroz edukaciju, istraživanja i praktične projekte.'],
            ['🔎', 'Digitalna forenzika', 'Znanja iz oblasti digitalne forenzike, očuvanja digitalnih dokaza i savremenih metoda digitalnih istraga.'],
            ['📊', 'Istraživanja', 'Istraživanja o digitalnom društvu, medijskoj pismenosti i uticaju novih tehnologija.'],
            ['🤝', 'Zajednica', 'Gradimo mrežu partnera, volontera, stručnjaka i institucija koje zajedno stvaraju bolje digitalno okruženje.'],
          ].map(([icon, t, d]) => (
            <article className="dz-card" key={t}>
              <div className="dz-card-icon">{icon}</div>
              <h3>{t}</h3>
              <p>{d}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* Istaknuti projekti */}
      <Section title="Istaknuti projekti">
        <div className="dz-cards">
          {[
            ['🛡️', 'Bezbedni na mreži', 'Radionice sajber bezbednosti za učenike, nastavnike i roditelje.'],
            ['🤖', 'AI za sve', 'Uvod u odgovornu upotrebu veštačke inteligencije u obrazovanju.'],
            ['📱', 'Skrolopedija', 'Aplikacija za mikroučenje — uči dok skroluješ. Besplatno za sve.'],
          ].map(([icon, t, d]) => (
            <article className="dz-card" key={t}>
              <div className="dz-card-icon">{icon}</div>
              <h3>{t}</h3>
              <p>{d}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* Skrolopedija promo */}
      <Section center>
        <div className="dz-app-promo">
          <div>
            <span className="dz-eyebrow">Naša aplikacija</span>
            <h2>Skrolopedija — uči dok skroluješ</h2>
            <p>Mikroučenje kroz kartice i kvizove: sajber bezbednost, AI, programiranje, biznis i još mnogo toga. Besplatno za sve.</p>
            <Link to="/app" className="dz-btn dz-btn-primary">Uđi u aplikaciju →</Link>
          </div>
          <img src="/logo-full.svg" alt="Skrolopedija" className="dz-app-promo-img" />
        </div>
      </Section>

      <CtaBanner />
    </>
  );
}

/* ---------- O NAMA ---------- */
export function About() {
  return (
    <>
      <PageHead title="O nama" subtitle="Ko smo i šta nas pokreće" />
      <Section>
        <h2 className="dz-h2">Ko smo</h2>
        <p className="dz-lead">
          Digitalni Zenit je nezavisna neprofitna organizacija koja okuplja stručnjake, istraživače,
          studente i profesionalce sa zajedničkim ciljem — stvaranjem sigurnijeg, inkluzivnijeg i
          održivijeg digitalnog društva.
        </p>
        <p>
          Kroz obrazovne programe, istraživanja, razvoj inovativnih projekata i međunarodnu saradnju
          doprinosimo odgovornoj digitalnoj transformaciji društva. Naš rad zasniva se na otvorenosti,
          stručnosti, etici i verovanju da tehnologija treba da unapređuje kvalitet života svih građana.
        </p>
      </Section>

      <Section tint>
        <div className="dz-two-col">
          <div className="dz-card">
            <h3>🎯 Misija</h3>
            <p>Kroz obrazovanje, istraživanje, inovacije i partnerstva razvijamo digitalnu pismenost, bezbednost, kritičko razmišljanje i odgovornu primenu novih tehnologija.</p>
          </div>
          <div className="dz-card">
            <h3>🌅 Vizija</h3>
            <p>Društvo u kojem svaka osoba ima jednake mogućnosti da bezbedno koristi digitalne tehnologije, razvija svoje potencijale i aktivno učestvuje u digitalnoj budućnosti.</p>
          </div>
        </div>
      </Section>

      <Section title="Naše vrednosti" center>
        <div className="dz-values">
          {['Znanje', 'Integritet', 'Otvorenost', 'Inovacije', 'Saradnja', 'Odgovornost', 'Društveni uticaj'].map((v) => (
            <span className="dz-pill" key={v}>{v}</span>
          ))}
        </div>
      </Section>

      <Section tint>
        <div className="dz-two-col">
          <div>
            <h2 className="dz-h2">Istorija organizacije</h2>
            <p>Digitalni Zenit je nastao iz ideje grupe entuzijasta okupljenih oko zajedničke vizije — da znanje o tehnologiji učine dostupnim svima. Od prvih radionica do razvoja sopstvenih digitalnih alata, rastemo zajedno sa zajednicom koju gradimo.</p>
          </div>
          <div>
            <h2 className="dz-h2">Zašto postojimo</h2>
            <p>Digitalni svet donosi ogromne mogućnosti, ali i nove rizike — dezinformacije, prevare, digitalnu nejednakost. Postojimo da bismo osnažili ljude da bezbedno, kritički i odgovorno koriste tehnologiju i da niko ne ostane po strani.</p>
          </div>
        </div>
      </Section>
      <CtaBanner />
    </>
  );
}

/* ---------- NAŠI STUBOVI ---------- */
export function Pillars() {
  const pillars = [
    ['🌐', 'Digitalno društvo'],
    ['🚀', 'Digitalna budućnost'],
    ['📚', 'Digitalna pismenost'],
    ['📰', 'Medijska pismenost'],
    ['🛡️', 'Sajber bezbednost'],
    ['🤖', 'Veštačka inteligencija'],
    ['⚖️', 'Digitalna prava i etika'],
    ['🌍', 'Digitalna inkluzija'],
    ['💼', 'Digitalna ekonomija i budućnost rada'],
    ['💡', 'Istraživanje i inovacije'],
    ['♻️', 'Održivi digitalni razvoj'],
    ['🤝', 'Međunarodna saradnja'],
  ];
  return (
    <>
      <PageHead title="Naši stubovi" subtitle="Oblasti kroz koje delujemo" />
      <Section>
        <div className="dz-cards">
          {pillars.map(([icon, t]) => (
            <article className="dz-card dz-card-mini" key={t}>
              <div className="dz-card-icon">{icon}</div>
              <h3>{t}</h3>
            </article>
          ))}
        </div>
      </Section>
      <CtaBanner />
    </>
  );
}

/* ---------- OBLASTI RADA ---------- */
export function Areas() {
  const areas = [
    ['📚', 'Digitalna pismenost', 'Osnovne i napredne digitalne veštine za sve uzraste.'],
    ['🛡️', 'Sajber bezbednost', 'Bezbedne navike i zaštita podataka na internetu.'],
    ['🤖', 'Veštačka inteligencija', 'Odgovorna i etička primena AI tehnologija.'],
    ['📰', 'Medijska pismenost', 'Kritičko razumevanje medija i informacija.'],
    ['🌐', 'Internet kultura', 'Razumevanje digitalnog društva i online zajednica.'],
    ['🔒', 'Digitalna privatnost', 'Zaštita ličnih podataka i digitalnog identiteta.'],
    ['🚫', 'Borba protiv dezinformacija', 'Prepoznavanje i suzbijanje lažnih vesti i manipulacija.'],
    ['🔄', 'Digitalna transformacija', 'Podrška institucijama u digitalnom razvoju.'],
    ['⚖️', 'Digitalna prava', 'Zaštita prava i sloboda u digitalnom okruženju.'],
    ['🔓', 'Otvoreno znanje', 'Promocija slobodnog pristupa znanju i resursima.'],
    ['📊', 'Istraživanje i analitika', 'Analiza digitalnih trendova i društvenog uticaja.'],
    ['👩‍🏫', 'Edukacija nastavnika', 'Osnaživanje prosvetnih radnika za digitalno doba.'],
    ['🧒', 'Bezbednost dece na internetu', 'Zaštita najmlađih u online svetu.'],
    ['🏙️', 'Pametne zajednice', 'Tehnologija u službi lokalnih zajednica.'],
  ];
  return (
    <>
      <PageHead title="Oblasti rada" subtitle="Čime se konkretno bavimo" />
      <Section>
        <div className="dz-cards">
          {areas.map(([icon, t, d]) => (
            <article className="dz-card" key={t}>
              <div className="dz-card-icon">{icon}</div>
              <h3>{t}</h3>
              <p>{d}</p>
            </article>
          ))}
        </div>
      </Section>
      <CtaBanner />
    </>
  );
}

/* ---------- BAZA ZNANJA ---------- */
export function KnowledgeBase() {
  const cats = [
    '🛡️ Sajber bezbednost', '🤖 Veštačka inteligencija', '🌐 Internet', '📚 Digitalna pismenost',
    '📰 Medijska pismenost', '🔒 Digitalna privatnost', '⚖️ Digitalna prava', '📊 Istraživanja',
    '📄 Publikacije', '📕 PDF dokumenti', '📘 Word dokumenti', '📗 Priručnici i vodiči',
  ];
  return (
    <>
      <PageHead title="Baza znanja" subtitle="Znanje dostupno svima" />
      <Section center>
        <p className="dz-lead">
          Prikupljamo i objavljujemo obrazovne materijale, istraživanja, publikacije i praktične vodiče.
          Za interaktivno učenje kroz kartice i kvizove — probaj našu aplikaciju.
        </p>
        <Link to="/app" className="dz-btn dz-btn-primary" style={{ marginTop: 16 }}>Otvori Skrolopediju →</Link>
      </Section>
      <Section title="Kategorije" tint>
        <div className="dz-tags">
          {cats.map((c) => <span className="dz-tag" key={c}>{c}</span>)}
        </div>
        <p className="dz-muted dz-center" style={{ marginTop: 24 }}><em>Dokumenti i materijali se dodaju uskoro.</em></p>
      </Section>
    </>
  );
}

/* ---------- PARTNERI ---------- */
export function Partners() {
  const schools = [
    'Prirodno-matematički fakultet u Kragujevcu',
    'Fakultet inženjerskih nauka Univerziteta u Kragujevcu',
    'Elektrotehnička i građevinska škola „Nikola Tesla" Jagodina',
    'Ekonomska škola Paraćin',
    'Gimnazija Paraćin',
  ];
  const future = ['Kompanije', 'Lokalne samouprave', 'Međunarodne organizacije', 'Nevladine organizacije', 'Medijski partneri'];
  return (
    <>
      <PageHead title="Partneri" subtitle="Zajedno gradimo digitalnu budućnost" />
      <Section center>
        <p className="dz-lead">
          Verujemo da najveći društveni izazovi zahtevaju zajednički rad. Sarađujemo sa obrazovnim
          institucijama, kompanijama, državnim organima, međunarodnim organizacijama, fondacijama i
          organizacijama civilnog društva kako bismo razvijali projekte koji imaju dugoročan pozitivan uticaj.
        </p>
      </Section>

      <Section title="Obrazovne ustanove" tint>
        <div className="dz-cards">
          {schools.map((s) => (
            <article className="dz-card dz-partner" key={s}>
              <div className="dz-card-icon">🎓</div>
              <h3>{s}</h3>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Uskoro i saradnja sa">
        <div className="dz-values">
          {future.map((f) => <span className="dz-pill" key={f}>{f}</span>)}
        </div>
      </Section>

      <Section center>
        <div className="dz-docs">
          <h3>📄 Dokumenti za partnerstvo</h3>
          <p className="dz-muted">Ako vas zanima saradnja, ovde ćemo objaviti prezentaciju partnerstva i predloge saradnje za kompanije, škole, organizacije i fakultete.</p>
          <p className="dz-muted"><em>(Dokumenti se dodaju uskoro.)</em></p>
          <Link to="/kontakt" className="dz-btn dz-btn-primary">Postani partner</Link>
        </div>
      </Section>
    </>
  );
}

/* ---------- ZA ŠKOLE ---------- */
export function ForSchools() {
  const items = [
    ['🛠️', 'Radionice', 'Interaktivne radionice o bezbednosti, AI i digitalnim veštinama.'],
    ['🎤', 'Predavanja', 'Stručna predavanja za učenike, nastavnike i roditelje.'],
    ['📁', 'Projekti', 'Zajednički obrazovni projekti sa školama.'],
    ['👩‍🏫', 'Edukacija nastavnika', 'Obuke za prosvetne radnike u oblasti digitalnog obrazovanja.'],
    ['🧑‍🤝‍🧑', 'Vršnjačka edukacija', 'Programi u kojima učenici uče jedni od drugih.'],
    ['🧭', 'Savetovanje škola', 'Podrška u razvoju digitalnih politika i bezbednog okruženja.'],
  ];
  return (
    <>
      <PageHead title="Za škole" subtitle="Podrška obrazovnim ustanovama" />
      <Section>
        <div className="dz-cards">
          {items.map(([icon, t, d]) => (
            <article className="dz-card" key={t}>
              <div className="dz-card-icon">{icon}</div>
              <h3>{t}</h3>
              <p>{d}</p>
            </article>
          ))}
        </div>
      </Section>
      <CtaBanner />
    </>
  );
}

/* ---------- ZA KOMPANIJE ---------- */
export function ForCompanies() {
  const items = [
    ['🤝', 'CSR partnerstva', 'Društveno odgovorni projekti sa merljivim uticajem.'],
    ['💛', 'Donacije', 'Podrška realizaciji naših obrazovnih programa.'],
    ['⭐', 'Sponzorstva', 'Podrška događajima, konferencijama i radionicama.'],
    ['🎓', 'Edukacije zaposlenih', 'Obuke o sajber bezbednosti, AI i digitalnim veštinama.'],
    ['🧩', 'Zajednički projekti', 'Razvoj rešenja od zajedničkog društvenog značaja.'],
  ];
  return (
    <>
      <PageHead title="Za kompanije" subtitle="Partnerstvo sa privredom" />
      <Section>
        <div className="dz-cards">
          {items.map(([icon, t, d]) => (
            <article className="dz-card" key={t}>
              <div className="dz-card-icon">{icon}</div>
              <h3>{t}</h3>
              <p>{d}</p>
            </article>
          ))}
        </div>
      </Section>
      <CtaBanner />
    </>
  );
}

/* ---------- TIM ---------- */
const TEAM = [
  ['Filip Đorđević', 'Predsednik udruženja'],
  ['Milan Jovanović', 'Koordinator strateških operacija'],
  ['Teodora Brkić', 'Ambasadorka i koordinatorka komunikacija'],
  ['Đorđe Marković', 'Koordinator za podkaste i digitalne medije'],
  ['Đorđe Jovanović', 'Koordinator za partnerstva i outreach'],
  ['Milica Perić', 'Koordinatorka društvenih mreža'],
];
const initials = (name) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export function Team() {
  return (
    <>
      <PageHead title="Tim" subtitle="Ljudi iza Digitalnog Zenita" />
      <Section>
        <p className="dz-lead">
          Naš tim čine stručnjaci različitih profila koje povezuje zajednička vizija razvoja digitalnog
          društva. Kombinujemo znanja iz informacionih tehnologija, obrazovanja, digitalne forenzike,
          sajber bezbednosti, komunikacija, projektnog menadžmenta i istraživanja.
        </p>
        <div className="dz-team">
          {TEAM.map(([name, role]) => (
            <article className="dz-team-card" key={name}>
              <div className="dz-team-photo">{initials(name)}</div>
              <h4>{name}</h4>
              <span className="dz-team-role">{role}</span>
            </article>
          ))}
        </div>
      </Section>
      <CtaBanner />
    </>
  );
}

/* ---------- KONTAKT ---------- */
export function Contact() {
  const [sent, setSent] = useState(false);
  const [f, setF] = useState({ ime: '', prezime: '', email: '', org: '', poruka: '' });
  const on = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function submit(e) {
    e.preventDefault();
    const subject = encodeURIComponent(`Kontakt sa sajta — ${f.ime} ${f.prezime}`);
    const body = encodeURIComponent(`Ime: ${f.ime} ${f.prezime}\nE-mail: ${f.email}\nOrganizacija: ${f.org}\n\nPoruka:\n${f.poruka}`);
    window.location.href = `mailto:digitalnizenit@gmail.com?subject=${subject}&body=${body}`;
    setSent(true);
  }

  return (
    <>
      <PageHead title="Kontakt" subtitle="Hajde da razgovaramo" />
      <Section>
        <div className="dz-contact">
          <div className="dz-contact-info">
            <p>Imate ideju za projekat? Želite saradnju? Tražite predavače ili edukacije? Zainteresovani ste za partnerstvo?</p>
            <ul className="dz-contact-list">
              <li>✉️ <b>Email:</b> <a href="mailto:digitalnizenit@gmail.com">digitalnizenit@gmail.com</a></li>
              <li>📞 <b>Telefon:</b> <span className="dz-muted">uskoro</span></li>
              <li>📍 <b>Lokacija:</b> Srbija</li>
              <li>🔗 <b>Društvene mreže:</b> <span className="dz-muted">uskoro</span></li>
            </ul>
            <p className="dz-muted">Pratite nas na društvenim mrežama kako biste bili u toku sa projektima, edukacijama i događajima.</p>
          </div>

          <form className="dz-form" onSubmit={submit}>
            <div className="dz-form-row">
              <label>Ime<input required value={f.ime} onChange={on('ime')} /></label>
              <label>Prezime<input required value={f.prezime} onChange={on('prezime')} /></label>
            </div>
            <label>E-mail<input type="email" required value={f.email} onChange={on('email')} /></label>
            <label>Organizacija<input value={f.org} onChange={on('org')} /></label>
            <label>Poruka<textarea rows={5} required value={f.poruka} onChange={on('poruka')} /></label>
            <button className="dz-btn dz-btn-primary" type="submit">Pošalji poruku</button>
            {sent && <p className="dz-form-ok">Otvorili smo tvoj mejl klijent — pošalji poruku da završiš. Hvala! ✅</p>}
          </form>
        </div>
      </Section>
    </>
  );
}

/* ---------- PODRŽI ---------- */
export function Support() {
  const ways = [
    ['💛', 'Doniraj', 'Podrži realizaciju naših programa jednokratnom ili redovnom donacijom.'],
    ['🤝', 'Postani partner', 'Zajedno razvijajmo projekte od društvenog značaja.'],
    ['🙌', 'Postani volonter', 'Pridruži se timu i doprinesi svojim znanjem i vremenom.'],
    ['💻', 'Podrži opremom', 'Doniraj opremu i resurse za radionice i edukacije.'],
    ['🧑‍🏫', 'Postani mentor', 'Prenesi svoje znanje mladima i članovima zajednice.'],
  ];
  return (
    <>
      <PageHead title="Podrži Digitalni Zenit" subtitle="Podržite razvoj digitalnog društva" />
      <Section>
        <p className="dz-lead">
          Vaša podrška omogućava realizaciju radionica, istraživanja, edukativnih programa, razvoja
          digitalnih alata i besplatnih sadržaja namenjenih građanima.
        </p>
      </Section>
      <Section title="Kako možete pomoći?" tint>
        <div className="dz-cards">
          {ways.map(([icon, t, d]) => (
            <article className="dz-card" key={t}>
              <div className="dz-card-icon">{icon}</div>
              <h3>{t}</h3>
              <p>{d}</p>
            </article>
          ))}
        </div>
      </Section>
      <Section center>
        <div className="dz-support-close">
          <h2>Zajedno možemo više.</h2>
          <p>Svaka podrška predstavlja ulaganje u znanje, bezbednost i digitalnu budućnost društva.</p>
          <p className="dz-strong">Hvala što zajedno gradimo Digitalni Zenit.</p>
          <Link to="/kontakt" className="dz-btn dz-btn-primary">Kontaktiraj nas</Link>
        </div>
      </Section>
    </>
  );
}

/* ---------- PRAVNE STRANICE (placeholderi) ---------- */
export function Privacy() {
  return (
    <>
      <PageHead title="Politika privatnosti" subtitle="Zaštita vaših podataka" />
      <Section>
        <p className="dz-lead">Digitalni Zenit poštuje vašu privatnost. Ova stranica će sadržati detaljnu politiku o prikupljanju, obradi i zaštiti ličnih podataka.</p>
        <p className="dz-muted"><em>Kompletan tekst se priprema.</em></p>
      </Section>
    </>
  );
}
export function Terms() {
  return (
    <>
      <PageHead title="Uslovi korišćenja" subtitle="Pravila korišćenja" />
      <Section>
        <p className="dz-lead">Ova stranica će sadržati uslove korišćenja sajta i aplikacije Digitalni Zenit.</p>
        <p className="dz-muted"><em>Kompletan tekst se priprema.</em></p>
      </Section>
    </>
  );
}

/* ---------- deljive komponente ---------- */
function Section({ title, children, center, tint }) {
  return (
    <section className={`dz-section${tint ? ' tint' : ''}`}>
      <div className="dz-container">
        {title && <h2 className={`dz-section-title${center ? ' center' : ''}`}>{title}</h2>}
        <div className={center ? 'dz-center-block' : ''}>{children}</div>
      </div>
    </section>
  );
}

function PageHead({ title, subtitle }) {
  return (
    <div className="dz-pagehead">
      <div className="dz-container">
        <span className="dz-eyebrow">{subtitle}</span>
        <h1>{title}</h1>
      </div>
    </div>
  );
}

function CtaBanner() {
  return (
    <section className="dz-cta-banner">
      <div className="dz-container">
        <h2>Digitalna budućnost ne nastaje sama. Gradimo je zajedno.</h2>
        <p>Pridruži se našoj zajednici, postani partner ili podrži naše projekte.</p>
        <div className="dz-hero-cta">
          <Link to="/podrzi" className="dz-btn dz-btn-primary">Podrži nas</Link>
          <Link to="/kontakt" className="dz-btn dz-btn-ghost-light">Kontakt</Link>
        </div>
      </div>
    </section>
  );
}

// Animirani brojač
function Counter({ to, label, suffix = '' }) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !started.current) {
        started.current = true;
        const dur = 1200;
        const t0 = performance.now();
        const tick = (t) => {
          const p = Math.min((t - t0) / dur, 1);
          setN(Math.round((1 - Math.pow(1 - p, 3)) * to));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [to]);
  return (
    <div className="dz-counter" ref={ref}>
      <div className="dz-counter-num">{n}{suffix}</div>
      <div className="dz-counter-lbl">{label}</div>
    </div>
  );
}
