// Confere se as regras de acerto do cliente (src/game.js) dão o mesmo resultado
// que o servidor nos casos compartilhados de backend/tests/answer_cases.json.
// Uso: node scripts/check-game-rules.js

const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

async function main() {
  // src/game.js usa sintaxe ESM; o Node só a carrega como .mjs neste pacote.
  const tmp = path.join(os.tmpdir(), `crabjeu-game-${process.pid}.mjs`);
  fs.copyFileSync(path.join(__dirname, '..', 'src', 'game.js'), tmp);
  const { isCorrect, levelInfo, streakInfo, dayKey } = await import(pathToFileURL(tmp).href);
  fs.unlinkSync(tmp);
  const shared = name =>
    JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'backend', 'tests', name), 'utf8'));

  let failures = 0;
  const cases = shared('answer_cases.json');
  for (const c of cases) {
    const got = isCorrect(c.kind, c.answer, c.expected);
    if (got !== c.correct) {
      failures++;
      console.error(`FALHOU ${c.kind} "${c.answer}" vs "${c.expected}": esperado ${c.correct}, obtido ${got}`);
    }
  }

  // Curva de níveis e faixas (backend/app/game_rules.py).
  const levels = shared('level_cases.json');
  for (const c of levels) {
    const got = levelInfo(c.coins);
    if (got.level !== c.level || got.into !== c.into || got.needed !== c.needed || got.tier.title !== c.tier) {
      failures++;
      console.error(`FALHOU nível com ${c.coins} moedas: esperado ${JSON.stringify(c)}, obtido ${JSON.stringify(got)}`);
    }
  }

  // Ofensiva (dias seguidos) e o "dia" no horário de Recife.
  const streaks = shared('streak_cases.json');
  for (const c of streaks) {
    const got = streakInfo(new Set(c.days), c.today);
    if (got.current !== c.current || got.best !== c.best || got.activeToday !== c.active_today) {
      failures++;
      console.error(`FALHOU ofensiva "${c.name}": esperado ${JSON.stringify(c)}, obtido ${JSON.stringify(got)}`);
    }
  }
  const dayChecks = [
    ['2026-11-19T01:30:00Z', '2026-11-18'],
    ['2026-11-19T03:00:00Z', '2026-11-19'],
  ];
  for (const [moment, expected] of dayChecks) {
    if (dayKey(moment) !== expected) {
      failures++;
      console.error(`FALHOU dia de ${moment}: esperado ${expected}, obtido ${dayKey(moment)}`);
    }
  }

  const total = cases.length + levels.length + streaks.length + dayChecks.length;
  console.log(`${total - failures}/${total} casos iguais ao servidor`);
  process.exit(failures ? 1 : 0);
}

main();
