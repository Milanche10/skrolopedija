import { useState } from 'react';
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

      {/* Skrolpedija promo */}
      <Section center>
        <div className="dz-app-promo">
          <div>
            <span className="dz-eyebrow">Naša aplikacija</span>
            <h2>Skrolpedija — uči dok skroluješ</h2>
            <p>Mikroučenje kroz kartice i kvizove: sajber bezbednost, AI, programiranje, biznis i još mnogo toga. Besplatno za sve.</p>
            <Link to="/app" className="dz-btn dz-btn-primary">Uđi u aplikaciju →</Link>
          </div>
          <img src="/logo-full.svg" alt="Skrolpedija" className="dz-app-promo-img" />
        </div>
      </Section>

      <Section title="Zašto Digitalni Zenit?" tint>
        <ul className="dz-checks">
          {[
            'Savremeni edukativni programi',
            'Stručni tim',
            'Međunarodna saradnja',
            'Projekti sa društvenim uticajem',
            'Fokus na digitalnu inkluziju',
            'Dugoročna vizija razvoja digitalnog društva',
          ].map((x) => (
            <li key={x}><span className="dz-check">✔</span> {x}</li>
          ))}
        </ul>
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
            <h3>🌅 Naša vizija</h3>
            <p>
              Društvo u kojem svaka osoba ima jednake mogućnosti da bezbedno koristi digitalne tehnologije,
              razvija svoje potencijale i aktivno učestvuje u digitalnoj budućnosti.
            </p>
          </div>
          <div className="dz-card">
            <h3>🎯 Naša misija</h3>
            <p>
              Kroz obrazovanje, istraživanje, inovacije i partnerstva razvijamo digitalnu pismenost,
              bezbednost, kritičko razmišljanje i odgovornu primenu novih tehnologija.
            </p>
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
      <CtaBanner />
    </>
  );
}

/* ---------- NAŠI STUBOVI ---------- */
export function Pillars() {
  const pillars = [
    ['🌐', 'Digitalno društvo', 'Projekti koji doprinose digitalnoj transformaciji zajednice i povećavaju dostupnost digitalnih usluga.'],
    ['📚', 'Digitalna pismenost', 'Podižemo nivo digitalnih veština kod dece, mladih, odraslih i starijih kroz praktične edukacije.'],
    ['🛡️', 'Sajber bezbednost', 'Pomažemo građanima i organizacijama da razviju bezbedne digitalne navike i zaštite svoje podatke.'],
    ['🔎', 'Digitalna forenzika', 'Promovišemo razvoj digitalne forenzike kroz istraživanja, edukacije i stručne programe.'],
    ['🤖', 'Veštačka inteligencija', 'Podržavamo odgovoran razvoj i primenu AI tehnologija u obrazovanju, javnom sektoru i privredi.'],
    ['📰', 'Medijska i informaciona pismenost', 'Pomažemo građanima da prepoznaju dezinformacije, manipulacije i digitalne prevare.'],
    ['💼', 'Digitalna ekonomija', 'Podržavamo razvoj digitalnog preduzetništva, novih zanimanja i ekonomije zasnovane na znanju.'],
    ['💡', 'Istraživanje i inovacije', 'Razvijamo istraživačke projekte i testiramo nova digitalna rešenja sa društvenim uticajem.'],
  ];
  return (
    <>
      <PageHead title="Naši stubovi" subtitle="Oblasti kroz koje delujemo" />
      <Section>
        <div className="dz-cards">
          {pillars.map(([icon, t, d]) => (
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

/* ---------- PARTNERI ---------- */
export function Partners() {
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

      <Section title="Za koga je partnerstvo" tint>
        <div className="dz-cards">
          {[
            ['🏢', 'Za kompanije', 'Društveno odgovorni projekti, edukacije zaposlenih, zajedničke inicijative i sponzorstva.'],
            ['🏫', 'Za škole', 'Programi digitalne pismenosti i bezbednosti za učenike, nastavnike i roditelje.'],
            ['🏛️', 'Za organizacije', 'Zajednički projekti, istraživanja i inicijative civilnog društva.'],
            ['🎓', 'Za fakultete', 'Istraživačka saradnja, stručna predavanja, praksa i razvoj mladih talenata.'],
          ].map(([icon, t, d]) => (
            <article className="dz-card" key={t}>
              <div className="dz-card-icon">{icon}</div>
              <h3>{t}</h3>
              <p>{d}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section center>
        <div className="dz-docs">
          <h3>📄 Dokumenti za partnerstvo</h3>
          <p className="dz-muted">Ako vas zanima saradnja, ovde ćemo objaviti prezentaciju partnerstva i predloge saradnje.</p>
          <p className="dz-muted"><em>(Dokumenti se dodaju uskoro.)</em></p>
          <Link to="/kontakt" className="dz-btn dz-btn-primary">Postani partner</Link>
        </div>
      </Section>
    </>
  );
}

/* ---------- TIM ---------- */
export function Team() {
  return (
    <>
      <PageHead title="Tim" subtitle="Ljudi iza Digitalnog Zenita" />
      <Section>
        <p className="dz-lead">
          Naš tim čine stručnjaci različitih profila koje povezuje zajednička vizija razvoja digitalnog
          društva. Kombinujemo znanja iz informacionih tehnologija, obrazovanja, digitalne forenzike,
          sajber bezbednosti, komunikacija, projektnog menadžmenta i istraživanja. Verujemo da su
          različite perspektive ključ uspešnih inovacija.
        </p>
        <div className="dz-team">
          {[1, 2, 3, 4].map((i) => (
            <article className="dz-team-card" key={i}>
              <div className="dz-team-photo">👤</div>
              <h4>Ime Prezime</h4>
              <span className="dz-team-role">Funkcija</span>
              <p className="dz-muted">Kratka biografija člana tima. (Ovde ide pravi sadržaj.)</p>
            </article>
          ))}
        </div>
        <p className="dz-muted dz-center"><em>Kartice članova tima — fotografije, funkcije i biografije — dodaju se uskoro.</em></p>
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
    const body = encodeURIComponent(
      `Ime: ${f.ime} ${f.prezime}\nE-mail: ${f.email}\nOrganizacija: ${f.org}\n\nPoruka:\n${f.poruka}`
    );
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
            <p>Kontaktirajte nas i zajedno ćemo pronaći najbolje rešenje.</p>
            <p className="dz-contact-item">✉️ <a href="mailto:digitalnizenit@gmail.com">digitalnizenit@gmail.com</a></p>
            <p className="dz-muted">Pratite nas i na društvenim mrežama kako biste bili u toku sa našim projektima, edukacijama i događajima.</p>
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
  return (
    <>
      <PageHead title="Podrži Digitalni Zenit" subtitle="Podržite razvoj digitalnog društva" />
      <Section>
        <p className="dz-lead">
          Digitalni Zenit razvija projekte koji doprinose obrazovanju, digitalnoj bezbednosti,
          istraživanjima i razvoju zajednice. Vaša podrška omogućava realizaciju radionica, istraživanja,
          edukativnih programa, razvoja digitalnih alata i besplatnih sadržaja namenjenih građanima.
        </p>
      </Section>
      <Section title="Kako možete pomoći?" tint>
        <div className="dz-cards">
          {[
            ['💛', 'Donacija', 'Podržite realizaciju naših programa jednokratnom ili redovnom donacijom.'],
            ['🤝', 'Partnerstvo', 'Postanite strateški partner i zajedno razvijajmo projekte od društvenog značaja.'],
            ['⭐', 'Sponzorstvo', 'Podržite naše događaje, konferencije i edukativne programe.'],
            ['🙌', 'Volontiranje', 'Pridružite se našem timu i svojim znanjem doprinesite razvoju digitalnog društva.'],
          ].map(([icon, t, d]) => (
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
