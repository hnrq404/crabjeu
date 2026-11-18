"""Regras do jogo — espelhadas em mobile/src/game.js.

O servidor é a fonte da verdade: ele recalcula acerto, moedas e nível a partir
das tentativas sincronizadas, sem confiar nos valores enviados pelo aparelho.
Qualquer mudança aqui deve ser replicada no cliente (e vice-versa).
"""

import re
import unicodedata
from datetime import date, datetime, timedelta, timezone

DIFFICULTIES = ("facil", "medio", "dificil")

# Moedas ganhas no PRIMEIRO acerto de cada pergunta, por dificuldade.
REWARDS = {"facil": 1, "medio": 2, "dificil": 3}

# Curva de níveis: cada nível custa mais moedas que o anterior.
# Do nível L para o L+1 são LEVEL_BASE + LEVEL_STEP * L moedas (10, 15, 20, 25...).
LEVEL_BASE = 10
LEVEL_STEP = 5

# Títulos por faixa de nível (aparecem na barra de nível).
TIERS = (
    {"min_level": 0, "title": "Caranguejinho"},
    {"min_level": 2, "title": "Explorador do mangue"},
    {"min_level": 4, "title": "Aventureiro"},
    {"min_level": 6, "title": "Navegador"},
    {"min_level": 8, "title": "Capitão"},
    {"min_level": 11, "title": "Mestre do francês"},
)

# Perguntas por rodada (a fase é jogada em rodadas, na ordem do conteúdo).
ROUND_SIZE = 6

# Similaridade mínima entre o que o aluno falou e a frase esperada.
VOICE_THRESHOLD = 0.75

# ------------------------------------------------------------- correção da fala
# O reconhecimento de voz às vezes devolve números como dígitos ("5" em vez de
# "cinq"); por isso os números viram palavras em francês antes de comparar.

_UNITS = ["zero", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix",
          "onze", "douze", "treize", "quatorze", "quinze", "seize"]
_TENS = {20: "vingt", 30: "trente", 40: "quarante", 50: "cinquante", 60: "soixante"}


def number_to_french(n: int) -> str:
    if n < 17:
        return _UNITS[n]
    if n < 20:
        return "dix " + _UNITS[n - 10]
    if n < 70:
        tens, unit = n - n % 10, n % 10
        if unit == 0:
            return _TENS[tens]
        return f"{_TENS[tens]} et un" if unit == 1 else f"{_TENS[tens]} {_UNITS[unit]}"
    if n < 80:
        return "soixante et onze" if n == 71 else "soixante " + number_to_french(n - 60)
    if n == 80:
        return "quatre vingts"
    if n < 100:
        return "quatre vingt " + number_to_french(n - 80)
    if n == 100:
        return "cent"
    return str(n)


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFD", text or "")
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower()
    text = re.sub(r"\d+", lambda m: f" {number_to_french(int(m.group()))} ", text)
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def _phonetic_word(word: str) -> str:
    """Aproxima a pronúncia: letras mudas e grafias que soam igual viram uma só."""
    for a, b in (("eaux", "o"), ("eau", "o"), ("aux", "o"), ("au", "o"), ("ph", "f"), ("qu", "k"),
                 ("ch", "x"), ("ai", "e"), ("ei", "e"), ("y", "i"), ("h", "")):
        word = word.replace(a, b)
    word = re.sub(r"c(?=[eiy])", "s", word)
    word = word.replace("c", "k").replace("q", "k")
    word = re.sub(r"(er|ez|et)$", "e", word)
    word = re.sub(r"(.)+", r"", word)
    # Letras finais mudas: um "e" e depois uma consoante (s, t, x, d).
    if len(word) > 2 and word.endswith("e"):
        word = word[:-1]
    if len(word) > 2 and word[-1] in "stxd":
        word = word[:-1]
    return word


def phonetic(text: str) -> str:
    return " ".join(_phonetic_word(w) for w in normalize(text).split())


def levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def _ratio(a: str, b: str) -> float:
    return 1 - levenshtein(a, b) / max(len(a), len(b), 1)


def _contains_in_order(answer: list[str], expected: list[str]) -> bool:
    it = iter(answer)
    return bool(expected) and all(word in it for word in expected)


def similarity(a: str, b: str) -> float:
    """O maior valor entre a comparação da escrita e a da pronúncia aproximada."""
    na, nb = normalize(a), normalize(b)
    if not na or not nb:
        return 0.0
    # Falou a frase inteira com algo a mais ("euh... cinq"): conta como certo.
    if _contains_in_order(na.split(), nb.split()):
        return 1.0
    return max(_ratio(na, nb), _ratio(phonetic(a), phonetic(b)))


def is_correct(kind: str, answer: str, correct_answer: str) -> bool:
    if kind == "voice":
        return similarity(answer, correct_answer) >= VOICE_THRESHOLD
    return answer == correct_answer


def coins_for(difficulties_of_earned: list[str]) -> int:
    return sum(REWARDS.get(d, 0) for d in difficulties_of_earned)


def coins_to_next(level: int) -> int:
    """Moedas necessárias para ir do nível `level` ao seguinte."""
    return LEVEL_BASE + LEVEL_STEP * level


def level_info(coins: int) -> dict:
    """Nível atual e progresso dentro dele (espelho de levelInfo no cliente)."""
    level, into = 0, max(coins, 0)
    while into >= coins_to_next(level):
        into -= coins_to_next(level)
        level += 1
    needed = coins_to_next(level)
    return {"level": level, "into": into, "needed": needed, "remaining": needed - into}


def level_for(coins: int) -> int:
    return level_info(coins)["level"]


def tier_for(level: int) -> dict:
    return [t for t in TIERS if level >= t["min_level"]][-1]


# --------------------------------------------------------------------- ofensiva
# Dias seguidos em que o aluno respondeu pelo menos uma pergunta.
# O "dia" segue o horário de Recife (UTC-3, sem horário de verão), igual no
# servidor e no aparelho, para que a contagem não mude perto da meia-noite.
STREAK_UTC_OFFSET_HOURS = -3


def day_key(moment: datetime) -> str:
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    local = moment.astimezone(timezone(timedelta(hours=STREAK_UTC_OFFSET_HOURS)))
    return local.date().isoformat()


def streak_info(days: set[str], today: str) -> dict:
    """current: sequência que termina hoje (ou ontem, se ainda não jogou hoje)."""
    def prev(key: str) -> str:
        return (date.fromisoformat(key) - timedelta(days=1)).isoformat()

    active_today = today in days
    current = 0
    cursor = today if active_today else prev(today)
    while cursor in days:
        current += 1
        cursor = prev(cursor)

    best = run = 0
    last = None
    for key in sorted(days):
        run = run + 1 if last is not None and prev(key) == last else 1
        best = max(best, run)
        last = key
    return {"current": current, "best": best, "active_today": active_today}
