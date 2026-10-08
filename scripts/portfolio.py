"""Long-only allocation methods for the landing page's sample portfolio.

Inputs are annualized: mu = expected returns, cov = covariance matrix, rf = risk-free rate.
"""

import numpy as np
from scipy.optimize import minimize


def _solve(objective, n: int, invested: str = "eq", extra: list | None = None) -> np.ndarray:
    """Minimize objective over long-only weights; invested='eq' means fully invested, 'ineq' allows cash."""
    constraints = [{"type": invested, "fun": lambda w: 1 - w.sum()}] + (extra or [])
    res = minimize(objective, np.full(n, 1 / n), method="SLSQP", bounds=[(0, 1)] * n,
                   constraints=constraints, options={"ftol": 1e-12, "maxiter": 1000})
    return np.clip(res.x, 0, None)


def min_variance(cov: np.ndarray) -> np.ndarray:
    return _solve(lambda w: w @ cov @ w, len(cov))


def max_sharpe(mu: np.ndarray, cov: np.ndarray, rf: float) -> np.ndarray:
    """Markowitz tangency portfolio."""
    return _solve(lambda w: -(w @ mu - rf) / np.sqrt(w @ cov @ w), len(mu))


def risk_parity(cov: np.ndarray) -> np.ndarray:
    """Equal risk contribution via the convex log-barrier formulation (Spinu 2013)."""
    n = len(cov)
    res = minimize(lambda w: 0.5 * w @ cov @ w - np.log(w).sum() / n, np.full(n, 1 / n),
                   method="L-BFGS-B", bounds=[(1e-8, None)] * n)
    return res.x / res.x.sum()


def black_litterman(cov: np.ndarray, market_weights: np.ndarray, view_excess: np.ndarray,
                    tau: float = 0.05, delta: float = 2.5) -> np.ndarray:
    """Posterior excess returns: market-implied prior blended with one absolute view per asset."""
    prior = delta * cov @ market_weights
    prior_precision = np.linalg.inv(tau * cov)
    view_precision = np.linalg.inv(np.diag(np.diag(tau * cov)))  # He–Litterman view uncertainty
    return np.linalg.solve(prior_precision + view_precision,
                           prior_precision @ prior + view_precision @ view_excess)


def fractional_kelly(mu: np.ndarray, cov: np.ndarray, rf: float, fraction: float = 0.5) -> np.ndarray:
    """Growth-optimal weights scaled by `fraction`, no leverage; the remainder sits in cash."""
    return _solve(lambda w: -(w @ (mu - rf) - w @ cov @ w / (2 * fraction)), len(mu), invested="ineq")


def efficient_frontier(mu: np.ndarray, cov: np.ndarray, points: int = 40) -> list[list[float]]:
    lo, hi = min_variance(cov) @ mu, mu.max()
    curve = []
    for target in np.linspace(lo, hi, points):
        w = _solve(lambda w: w @ cov @ w, len(mu),
                   extra=[{"type": "eq", "fun": lambda w, t=target: w @ mu - t}])
        curve.append([round(float(np.sqrt(w @ cov @ w)), 4), round(float(target), 4)])
    return curve
