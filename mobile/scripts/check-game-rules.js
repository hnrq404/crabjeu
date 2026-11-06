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
  const { isCorrect } = await import(pathToFileURL(tmp).href);
  fs.unlinkSync(tmp);
  const cases = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '..', 'backend', 'tests', 'answer_cases.json'), 'utf8')
  );
  let failures = 0;
  for (const c of cases) {
    const got = isCorrect(c.kind, c.answer, c.expected);
    if (got !== c.correct) {
      failures++;
      console.error(`FALHOU ${c.kind} "${c.answer}" vs "${c.expected}": esperado ${c.correct}, obtido ${got}`);
    }
  }
  console.log(`${cases.length - failures}/${cases.length} casos iguais ao servidor`);
  process.exit(failures ? 1 : 0);
}

main();
