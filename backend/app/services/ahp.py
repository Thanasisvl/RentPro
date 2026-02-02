from __future__ import annotations

from dataclasses import dataclass
from math import prod
from typing import Dict, Iterable, List, Tuple


# Saaty Random Index (RI) for n=1..10
_RI: Dict[int, float] = {
    1: 0.00,
    2: 0.00,
    3: 0.58,
    4: 0.90,
    5: 1.12,
    6: 1.24,
    7: 1.32,
    8: 1.41,
    9: 1.45,
    10: 1.49,
}

# Locked (UC-04)
CR_THRESHOLD = 0.10


@dataclass(frozen=True)
class AHPResult:
    criteria_keys: List[str]
    weights: Dict[str, float]
    lambda_max: float
    ci: float
    cr: float
    accepted: bool


def _build_matrix(
    criteria_keys: List[str],
    pairwise: Iterable[Tuple[str, str, float]],  # (a_key, b_key, value) where value = a over b
) -> List[List[float]]:
    n = len(criteria_keys)
    index = {k: i for i, k in enumerate(criteria_keys)}

    a = [[1.0 for _ in range(n)] for __ in range(n)]

    for k1, k2, v in pairwise:
        if k1 not in index or k2 not in index:
            raise ValueError(f"Unknown criterion key(s): {k1}, {k2}")
        if k1 == k2:
            raise ValueError("Self-comparisons are not allowed")
        if v <= 0:
            raise ValueError("Pairwise value must be > 0")

        i = index[k1]
        j = index[k2]
        a[i][j] = float(v)
        a[j][i] = 1.0 / float(v)

    return a


def _geometric_mean_weights(a: List[List[float]]) -> List[float]:
    n = len(a)
    gms: List[float] = []
    for i in range(n):
        row_prod = prod(a[i])
        gm = row_prod ** (1.0 / n)
        gms.append(gm)

    s = sum(gms)
    if s == 0:
        raise ValueError("Invalid pairwise matrix (sum of geometric means is 0)")
    return [gm / s for gm in gms]


def _lambda_max(a: List[List[float]], w: List[float]) -> float:
    n = len(a)
    aw = [sum(a[i][j] * w[j] for j in range(n)) for i in range(n)]
    lambdas = []
    for i in range(n):
        if w[i] == 0:
            raise ValueError("Invalid weights (zero weight encountered)")
        lambdas.append(aw[i] / w[i])
    return sum(lambdas) / n


def compute_ahp(
    criteria_keys: List[str],
    pairwise: Iterable[Tuple[str, str, float]],
    cr_threshold: float = CR_THRESHOLD,
) -> AHPResult:
    """
    Locked UC-04 rule:
      - Reject if CR >= 0.10 (threshold locked)
      - Accept if CR < 0.10
    """
    if len(criteria_keys) < 2:
        raise ValueError("Need at least 2 criteria for AHP")

    n = len(criteria_keys)
    a = _build_matrix(criteria_keys, pairwise)
    w = _geometric_mean_weights(a)
    lam = _lambda_max(a, w)

    ci = 0.0 if n <= 2 else (lam - n) / (n - 1)
    ri = _RI.get(n)
    if ri is None:
        raise ValueError(f"RI not defined for n={n}")

    cr = 0.0 if ri == 0 else (ci / ri)
    accepted = cr < cr_threshold

    return AHPResult(
        criteria_keys=list(criteria_keys),
        weights={criteria_keys[i]: w[i] for i in range(n)},
        lambda_max=lam,
        ci=ci,
        cr=cr,
        accepted=accepted,
    )