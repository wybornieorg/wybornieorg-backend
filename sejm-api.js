// Collector backed by the official Sejm API (api.sejm.gov.pl).
//
// Replaces the old HTML scraper: since the 2023 redesign the sejm.gov.pl
// voting pages are client-rendered, so the data is simply not in the HTML.
//
// Scope note: only *deciding* votes (topic "głosowanie nad całością
// projektu") are collected, mirroring the old przeglad_projust scope — one
// meaningful vote per bill rather than thousands of procedural ones.

const db = require('./database.js');

const API = 'https://api.sejm.gov.pl/sejm/term';
const UA = 'wybornie.org collector (https://wybornie.org)';

// API vote -> the wording the UI already understands.
const VOTE_MAP = {
  YES: 'Za',
  NO: 'Przeciw',
  ABSTAIN: 'Wstrzymał się',
  ABSENT: 'Nieobecny'
};

const base = (kadencja) => `${API}${kadencja}`;

async function fetchJson(url, tries = 3) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        signal: AbortSignal.timeout(45000)
      });
      if (response.status === 404) {
        return null;
      }
      if (response.ok) {
        return await response.json();
      }
      console.warn(`  -> HTTP ${response.status} ${url}`);
    } catch (err) {
      console.warn(`  -> ${err.message} ${url}`);
    }
    if (attempt < tries) {
      await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
    }
  }
  return null;
}

// "…(druki nr 1209 i 1278)" / "…dotyczące druku nr 1261" -> [1209, 1278]
function parseDruki(...texts) {
  const found = new Set();
  const phrase = /druk\w*\s*nr\.?\s*([0-9][0-9\s,i]*[0-9]|[0-9])/gi;
  for (const text of texts) {
    if (!text) {
      continue;
    }
    phrase.lastIndex = 0;
    let match;
    while ((match = phrase.exec(text))) {
      for (const n of match[1].match(/\d+/g) || []) {
        found.add(parseInt(n));
      }
    }
  }
  return [...found];
}

const isDecidingVote = (voting) =>
  (voting.topic || '').toLowerCase().includes('całoś');

function isapLink(process) {
  const link = (process.links || []).find((l) => l.rel === 'isap');
  return link ? link.href : undefined;
}

function projectStatus(process) {
  if (!process || process.passed === undefined || process.passed === null) {
    return 'przed III czytaniem';
  }
  return process.passed ? 'uchwalono' : 'odrzucony';
}

async function saveVoting(kadencja, sitting, voting, detail) {
  const numbers = {
    kadencja,
    posiedzenie: sitting,
    glosowanie: voting.votingNumber
  };

  const deputies = (detail.votes || []).map((v) => ({
    name: `${v.lastName} ${v.firstName}`,
    vote: VOTE_MAP[v.vote] || v.vote,
    group: v.club
  }));

  const absent = deputies.filter((d) => d.vote === 'Nieobecny').length;
  const frekwencja = deputies.length ? 1 - absent / deputies.length : 0;

  const haystack = `${detail.title || ''} ${detail.topic || ''}`.toLowerCase();
  const votingIntention = haystack.includes('odrzucen') ? 'odrzucenie' : 'przyjęcie';

  // "passed" here means the literal yes/no majority; for a rejection motion the
  // meaning inverts, which is exactly what votingIntention tells the UI to undo.
  const majority = (detail.yes || 0) > (detail.no || 0);
  const adopted = votingIntention === 'odrzucenie' ? !majority : majority;

  const votingLink = `https://www.sejm.gov.pl/Sejm${kadencja}.nsf/Glosowanie.xsp?posiedzenie=${sitting}&glosowanie=${voting.votingNumber}`;

  const [row] = await db.Voting.findOrCreate({
    where: { numbers },
    defaults: {
      status: adopted ? 'uchwalono' : 'odrzucony',
      frekwencja,
      votingLink,
      votingDate: new Date(detail.date),
      votingIntention,
      numbers,
      groupLinks: [],
      deputies
    }
  });

  return row;
}

async function saveProjects(kadencja, votingRow, detail, processesByNumber) {
  const druki = parseDruki(detail.title, detail.topic);

  for (const nr of druki) {
    const process = processesByNumber.get(nr);
    const [project] = await db.Project.findOrCreate({
      where: { drukNr: nr, kadencja },
      defaults: {
        drukNr: nr,
        kadencja,
        tytul: process ? process.titleFinal || process.title : `Projekt nr ${nr} (kadencja ${kadencja})`,
        status: projectStatus(process),
        prawoUE: !!(process && process.UE === 'YES'),
        isapLink: process ? isapLink(process) : undefined,
        trescLink: `https://www.sejm.gov.pl/Sejm${kadencja}.nsf/druk.xsp?nr=${nr}`,
        przebiegLink: `https://www.sejm.gov.pl/Sejm${kadencja}.nsf/PrzebiegProc.xsp?nr=${nr}`,
        drukPdfLink: `https://api.sejm.gov.pl/sejm/term${kadencja}/prints/${nr}/${nr}.pdf`,
        votingId: votingRow.id
      }
    });

    // A project can already exist from an earlier term-scoped run; make sure
    // it points at this deciding vote.
    if (project && project.votingId == null) {
      project.votingId = votingRow.id;
      await project.save();
    }
  }
}

/**
 * Collect the deciding votes (and the bills they concern) for one term.
 * Returns {saved, skipped, proceses}.
 */
async function collectTerm(kadencja) {
  console.log(`\n=== Sejm API: kadencja ${kadencja} ===`);

  const processes = (await fetchJson(`${base(kadencja)}/processes?limit=5000`)) || [];
  const processesByNumber = new Map();
  for (const p of processes) {
    const n = parseInt(p.number);
    if (!Number.isNaN(n)) {
      processesByNumber.set(n, p);
    }
  }
  console.log(`procesy: ${processes.length}`);

  const summary = (await fetchJson(`${base(kadencja)}/votings`)) || [];
  const sittings = [...new Set(summary.map((s) => s.proceeding))].sort((a, b) => a - b);
  console.log(`posiedzenia: ${sittings.length}`);

  let saved = 0;
  let skipped = 0;
  let scanned = 0;

  for (const sitting of sittings) {
    const votings = await fetchJson(`${base(kadencja)}/votings/${sitting}`);
    if (!votings) {
      continue;
    }

    for (const voting of votings.filter(isDecidingVote)) {
      const numbers = { kadencja, posiedzenie: sitting, glosowanie: voting.votingNumber };
      const existing = await db.Voting.findOne({ where: { numbers } });
      if (existing) {
        skipped++;
        continue;
      }

      const detail = await fetchJson(`${base(kadencja)}/votings/${sitting}/${voting.votingNumber}`);
      scanned++;
      if (!detail || !detail.votes || detail.votes.length === 0) {
        console.warn(`  brak głosów: ${sitting}/${voting.votingNumber}`);
        continue;
      }

      const votingRow = await saveVoting(kadencja, sitting, voting, detail);
      await saveProjects(kadencja, votingRow, detail, processesByNumber);
      saved++;

      if (saved % 50 === 0) {
        console.log(`  zapisano ${saved} głosowań...`);
      }
    }
  }

  console.log(`kadencja ${kadencja}: zapisano ${saved}, pominięto (już w bazie) ${skipped}, pobrano ${scanned}`);
  return { saved, skipped, scanned };
}

module.exports = { collectTerm, VOTE_MAP, parseDruki, isDecidingVote };
