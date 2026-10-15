"""Threshold certificate: bounds on the debt level where the drift turns positive."""
import numpy as np


def certificate(v, s):
    """The bounds apply when the drift is negative and increasing at b."""
    return (np.asarray(v) < 0) & (np.asarray(s) > 0)


def bounds(b, v, s, M, D=np.inf):
    """Lower and upper bounds [L, U] on the crossing r given Delta(b)=v<0, Delta'(b)=s>0
    and 0 <= Delta'' <= M on [b, D]. Returns (L, U, valid) where valid requires U <= D.

    U = b - v/s,  L = b + (-2v) / (s + sqrt(s^2 - 2 M v)).  For M = 0, L = U.
    """
    v, s, M = np.broadcast_arrays(np.asarray(v, float), np.asarray(s, float),
                                  np.asarray(M, float))
    ok = certificate(v, s)
    with np.errstate(invalid="ignore", divide="ignore"):
        U = np.where(ok, b - v / s, np.nan)
        L = np.where(ok, b + (-2 * v) / (s + np.sqrt(s ** 2 - 2 * M * v)), np.nan)
    valid = ok & (U <= D)
    return L, U, valid


def random_admissible_drift(b, D, M, rng, n_pieces=None, n_grid=4001):
    """Random drift on [b, D] with v<0, s>0 and piecewise-constant curvature in [0, M].

    Returns (grid, Delta values, v, s).
    """
    k = n_pieces or rng.integers(1, 9)
    cuts = np.sort(rng.uniform(b, D, k - 1))
    edges = np.concatenate([[b], cuts, [D]])
    curv = rng.uniform(0, M, k)
    x = np.linspace(b, D, n_grid)
    c = curv[np.clip(np.searchsorted(edges, x, side="right") - 1, 0, k - 1)]
    s = rng.uniform(0.002, 0.1)
    v = -rng.uniform(0.001, 0.1)
    # integrate curvature exactly per piece: Delta' and Delta are piecewise quadratic
    dx = np.diff(x)
    slope = s + np.concatenate([[0], np.cumsum(c[:-1] * dx)])
    val = v + np.concatenate([[0], np.cumsum(slope[:-1] * dx + 0.5 * c[:-1] * dx ** 2)])
    return x, val, v, s


def first_crossing(x, val):
    idx = np.where((val[:-1] < 0) & (val[1:] >= 0))[0]
    if len(idx) == 0:
        return np.nan
    k = idx[0]
    return x[k] + (0 - val[k]) * (x[k + 1] - x[k]) / (val[k + 1] - val[k])
