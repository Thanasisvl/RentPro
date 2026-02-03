from __future__ import annotations

from dataclasses import dataclass
from math import sqrt
from typing import List


@dataclass(frozen=True)
class TopsisResultItem:
    index: int
    score: float  # closeness coefficient in [0,1]
    d_best: float
    d_worst: float


def topsis_rank(
    decision_matrix: List[List[float]],  # m x n
    weights: List[float],  # n
    is_benefit: List[bool],  # n
) -> List[TopsisResultItem]:
    """
    Classical TOPSIS:
    - vector normalization
    - weighted normalization
    - ideal best/worst based on benefit/cost
    - euclidean distances
    - closeness = d_worst / (d_best + d_worst)
    """
    m = len(decision_matrix)
    if m == 0:
        return []
    n = len(decision_matrix[0])

    if len(weights) != n or len(is_benefit) != n:
        raise ValueError("weights/is_benefit length must match number of criteria")

    # norms per criterion
    norms = []
    for j in range(n):
        s = sum((decision_matrix[i][j] ** 2) for i in range(m))
        norms.append(sqrt(s) if s > 0 else 1.0)

    # weighted normalized matrix
    v = [[0.0 for _ in range(n)] for __ in range(m)]
    for i in range(m):
        for j in range(n):
            r_ij = decision_matrix[i][j] / norms[j]
            v[i][j] = r_ij * weights[j]

    # ideal best/worst
    ideal_best = [0.0] * n
    ideal_worst = [0.0] * n
    for j in range(n):
        col = [v[i][j] for i in range(m)]
        if is_benefit[j]:
            ideal_best[j] = max(col)
            ideal_worst[j] = min(col)
        else:
            ideal_best[j] = min(col)
            ideal_worst[j] = max(col)

    # distances + closeness
    results: List[TopsisResultItem] = []
    for i in range(m):
        d_best = sqrt(sum((v[i][j] - ideal_best[j]) ** 2 for j in range(n)))
        d_worst = sqrt(sum((v[i][j] - ideal_worst[j]) ** 2 for j in range(n)))
        denom = d_best + d_worst
        score = (d_worst / denom) if denom > 0 else 0.0
        results.append(
            TopsisResultItem(index=i, score=score, d_best=d_best, d_worst=d_worst)
        )

    results.sort(key=lambda x: x.score, reverse=True)
    return results
