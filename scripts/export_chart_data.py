"""Export chart data from the local stock database to public/data/market-data.js.

Read-only. Connection uses libpq env vars (PGHOST, PGPORT, PGPASSWORD, ...);
PGDATABASE defaults to financial_statement and PGUSER to postgres.

    PGPASSWORD=... python scripts/export_chart_data.py
"""

import json
import os
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
import psycopg2

from portfolio import (black_litterman, efficient_frontier, fractional_kelly, max_sharpe,
                       min_variance, risk_parity)

OUT = Path(__file__).resolve().parent.parent / "public" / "data" / "market-data.js"
REQUIRED_RETURN, LONG_TERM_GROWTH = 14.0, 4.0  # % — same defaults as the page calculator
MIN_SECTOR_STOCKS = 7
MIN_MARKET_STOCKS = 150  # months with thinner coverage give a meaningless median
EXCLUDED_BANKS = {"EVF"}  # non-bank credit institution: bank ratios don't apply
PORTFOLIO = ["FPT", "VCB", "HPG", "MWG", "VNM", "GAS"]
PORTFOLIO_YEARS = 3
RISK_FREE = 0.04  # roughly the Vietnam 10-year government bond yield


def month_end_pe(con, since: date) -> pd.DataFrame:
    """Each stock's last positive trailing P/E in every month (some month-end dates are sparse)."""
    return pd.read_sql(
        """
        SELECT DISTINCT ON (v.ticker, date_trunc('month', v.trade_date))
               v.ticker, date_trunc('month', v.trade_date)::date AS month, v.pe, s.industry_code
        FROM daily_valuation v
        JOIN tbl_stocks s USING (ticker)
        WHERE v.pe > 0 AND v.trade_date >= %s
        ORDER BY v.ticker, date_trunc('month', v.trade_date), v.trade_date DESC
        """,
        con,
        params=(since,),
    )


def market_pe(pe: pd.DataFrame) -> dict:
    g = pe.groupby("month")["pe"]
    df = pd.DataFrame({"median": g.median(), "p25": g.quantile(0.25), "p75": g.quantile(0.75), "n": g.size()})
    df = df[df["n"] >= MIN_MARKET_STOCKS].reset_index().round(2)
    return {
        "dates": df["month"].astype(str).tolist(),
        "median": df["median"].tolist(),
        "p25": df["p25"].tolist(),
        "p75": df["p75"].tolist(),
        "n": df["n"].tolist(),
        "average": round(float(df["median"].mean()), 2),
    }


def sector_pe(pe: pd.DataFrame, names: dict, since: date) -> list:
    recent = pe[pe["month"] >= since]
    series = recent.groupby(["industry_code", "month"])["pe"].agg(["median", "size"]).reset_index()
    rows = []
    for code, s in series.groupby("industry_code"):
        s = s.sort_values("month")
        latest = s.iloc[-1]
        if latest["size"] < MIN_SECTOR_STOCKS:
            continue
        hist = s["median"]
        rows.append({
            "sector": names.get(code) or code.replace("_", " ").title(),
            "current": round(float(latest["median"]), 2),
            "low": round(float(hist.quantile(0.1)), 2),
            "mid": round(float(hist.median()), 2),
            "high": round(float(hist.quantile(0.9)), 2),
            "percentile": round(float((hist < latest["median"]).mean() * 100)),
            "n": int(latest["size"]),
        })
    return sorted(rows, key=lambda r: r["percentile"])


def banks(con) -> dict:
    cur = con.cursor()
    cur.execute(
        """
        SELECT year, quarter FROM v_chi_so_bank
        WHERE ratio_type = 'RATIO_TTM' AND roe IS NOT NULL
        GROUP BY year, quarter ORDER BY year DESC, quarter DESC LIMIT 1
        """
    )
    year, quarter = cur.fetchone()
    cur.execute(
        """
        SELECT b.ticker, b.roe::float, v.pb, b.market_cap::float
        FROM v_chi_so_bank b
        JOIN LATERAL (SELECT pb, trade_date FROM daily_valuation d
                      WHERE d.ticker = b.ticker AND d.pb > 0
                      ORDER BY trade_date DESC LIMIT 1) v ON TRUE
        WHERE b.ratio_type = 'RATIO_TTM' AND b.year = %s AND b.quarter = %s AND b.roe IS NOT NULL
        ORDER BY b.ticker
        """,
        (year, quarter),
    )
    points = [
        {"ticker": t, "roe": round(roe, 2), "pb": round(pb, 2), "marketCap": round(mcap or 0)}
        for t, roe, pb, mcap in cur.fetchall()
        if t not in EXCLUDED_BANKS
    ]
    cur.execute("SELECT MAX(trade_date) FROM daily_valuation WHERE pb > 0")
    return {
        "roePeriod": f"Q{quarter} {year}",
        "pbDate": str(cur.fetchone()[0]),
        "requiredReturn": REQUIRED_RETURN,
        "growth": LONG_TERM_GROWTH,
        "points": points,
    }


def sample_portfolio(con) -> dict:
    """Allocate the sample portfolio with each method on real covariance.

    Expected return per stock = earnings yield + long-term growth — a simple, illustrative input.
    """
    prices = pd.read_sql(
        """
        SELECT trade_date, ticker, adjusted_close::float AS px FROM daily_price
        WHERE ticker = ANY(%s)
          AND trade_date >= (SELECT MAX(trade_date) FROM daily_price) - make_interval(years => %s)
        """,
        con,
        params=(PORTFOLIO, PORTFOLIO_YEARS),
    ).pivot(index="trade_date", columns="ticker", values="px")[PORTFOLIO]
    cov = prices.pct_change().dropna().cov().to_numpy() * 252

    cur = con.cursor()
    cur.execute(
        """
        SELECT DISTINCT ON (ticker) ticker, pe FROM daily_valuation
        WHERE ticker = ANY(%s) AND pe > 0 ORDER BY ticker, trade_date DESC
        """,
        (PORTFOLIO,),
    )
    pe = dict(cur.fetchall())
    mu = np.array([1 / pe[t] + LONG_TERM_GROWTH / 100 for t in PORTFOLIO])
    cur.execute(
        """
        SELECT DISTINCT ON (ticker) ticker, market_cap::float FROM (
            SELECT ticker, year, quarter, market_cap FROM v_chi_so_gen WHERE ratio_type = 'RATIO_TTM'
            UNION ALL
            SELECT ticker, year, quarter, market_cap FROM v_chi_so_bank WHERE ratio_type = 'RATIO_TTM'
        ) m
        WHERE ticker = ANY(%s) AND market_cap IS NOT NULL
        ORDER BY ticker, year DESC, quarter DESC
        """,
        (PORTFOLIO,),
    )
    caps = dict(cur.fetchall())
    market_weights = np.array([caps[t] for t in PORTFOLIO])
    market_weights /= market_weights.sum()
    bl_mu = black_litterman(cov, market_weights, mu - RISK_FREE) + RISK_FREE

    methods = {  # same order as the method cards on the page
        "Markowitz": max_sharpe(mu, cov, RISK_FREE),
        "Black-Litterman": max_sharpe(bl_mu, cov, RISK_FREE),
        "Risk parity": risk_parity(cov),
        "Half Kelly": fractional_kelly(mu, cov, RISK_FREE),
        "Minimum variance": min_variance(cov),
        "Equal weight": np.full(len(PORTFOLIO), 1 / len(PORTFOLIO)),
    }

    def summary(name: str, w: np.ndarray) -> dict:
        cash = max(0.0, 1 - float(w.sum()))
        ret, vol = float(w @ mu + cash * RISK_FREE), float(np.sqrt(w @ cov @ w))
        return {
            "name": name,
            "weights": [round(float(x), 4) for x in w],
            "cash": round(cash, 4),
            "ret": round(ret, 4),
            "vol": round(vol, 4),
            "sharpe": round((ret - RISK_FREE) / vol, 2),
        }

    return {
        "tickers": PORTFOLIO,
        "from": str(prices.index[0]),
        "to": str(prices.index[-1]),
        "riskFree": RISK_FREE,
        "stocks": [
            {"ticker": t, "ret": round(float(mu[i]), 4), "vol": round(float(np.sqrt(cov[i, i])), 4)}
            for i, t in enumerate(PORTFOLIO)
        ],
        "methods": [summary(name, w) for name, w in methods.items()],
        "frontier": efficient_frontier(mu, cov),
    }


def main() -> None:
    con = psycopg2.connect(
        dbname=os.getenv("PGDATABASE", "financial_statement"),
        user=os.getenv("PGUSER", "postgres"),
    )
    con.set_session(readonly=True)
    try:
        pe = month_end_pe(con, date(2018, 1, 1))
        names = dict(pd.read_sql("SELECT industry_code, industry_name_en FROM tbl_industries", con).values)
        last = pe["month"].max()
        b = banks(con)
        data = {
            "asOf": b["pbDate"],
            "marketPe": market_pe(pe),
            "sectorPe": sector_pe(pe, names, date(last.year - 5, last.month, 1)),
            "banks": b,
            "portfolio": sample_portfolio(con),
        }
    finally:
        con.close()
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(
        "// Generated by scripts/export_chart_data.py — do not edit by hand.\n"
        f"window.FAIRLINE_DATA = {json.dumps(data, ensure_ascii=False)};\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUT} (as of {data['asOf']})")


if __name__ == "__main__":
    main()
