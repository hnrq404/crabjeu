"""Regras do jogo — espelhadas em mobile/src/game.js.

O servidor é a fonte da verdade: ele recalcula acerto, moedas e nível a partir
das tentativas sincronizadas, sem confiar nos valores enviados pelo aparelho.
Qualquer mudança aqui deve ser replicada no cliente (e vice-versa).
"""

import math
import re
import unicodedata

DIFFICULTIES = ("facil", "medio", "dificil")

# Moedas ganhas no PRIMEIRO acerto de cada pergunta, por dificuldade.
REWARDS = {"facil": 1, "medio": 2, "dificil": 3}

# Moedas necessárias para subir cada nível.
COINS_PER_LEVEL = 20

# Fração mínima de acertos para a fase contar como concluída (4 de 6).
PASS_RATIO = 2 / 3

# Similaridade mínima entre o que o aluno falou e a frase esperada.
VOICE_THRESHOLD = 0.75


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFD", text or "")
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower()
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


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


def similarity(a: str, b: str) -> float:
    na, nb = normalize(a), normalize(b)
    longest = max(len(na), len(nb), 1)
    return 1 - levenshtein(na, nb) / longest


def is_correct(kind: str, answer: str, correct_answer: str) -> bool:
    if kind == "voice":
        return similarity(answer, correct_answer) >= VOICE_THRESHOLD
    return answer == correct_answer


def coins_for(difficulties_of_earned: list[str]) -> int:
    return sum(REWARDS.get(d, 0) for d in difficulties_of_earned)


def level_for(coins: int) -> int:
    return coins // COINS_PER_LEVEL


def phase_passed(correct_count: int, total: int) -> bool:
    return total > 0 and correct_count >= math.ceil(total * PASS_RATIO)
