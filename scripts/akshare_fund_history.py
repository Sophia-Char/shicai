"""通过 AKShare 获取基金历史净值/收盘价，并计算详情卡片所需指标。

开放式基金使用 fund_open_fund_info_em；ETF 使用 fund_etf_hist_em。
该脚本只输出 JSON，供 Node 服务调用，不写入项目数据文件。
"""

import json
import sys
from datetime import date, datetime, timedelta

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def fail(message):
    print(json.dumps({"ok": False, "error": str(message)}, ensure_ascii=False))
    raise SystemExit(0)


def clean_number(value):
    try:
        number = float(value)
        return number if number == number else None
    except (TypeError, ValueError):
        return None


def load_history(ak, code):
    end = date.today()
    start = end - timedelta(days=400)
    start_text = start.strftime("%Y%m%d")
    end_text = end.strftime("%Y%m%d")

    # 先按开放式基金单位净值获取；ETF 代码通常不适用该接口，再切换 ETF 日线。
    try:
        frame = ak.fund_open_fund_info_em(symbol=code, indicator="单位净值走势")
        if frame is not None and not frame.empty and {"净值日期", "单位净值"}.issubset(frame.columns):
            rows = []
            for _, row in frame.iterrows():
                value = clean_number(row.get("单位净值"))
                if value is not None:
                    rows.append({"date": str(row.get("净值日期"))[:10], "value": value})
            if len(rows) >= 2:
                return rows, "单位净值", "开放式基金单位净值"
    except Exception:
        pass

    try:
        frame = ak.fund_etf_hist_em(
            symbol=code,
            period="daily",
            start_date=start_text,
            end_date=end_text,
            adjust="qfq",
        )
        if frame is None or frame.empty or not {"日期", "收盘"}.issubset(frame.columns):
            fail("AkShare 未返回该基金的开放式净值或 ETF 历史数据")
        rows = []
        for _, row in frame.iterrows():
            value = clean_number(row.get("收盘"))
            if value is not None:
                rows.append({"date": str(row.get("日期"))[:10], "value": value})
        if len(rows) < 2:
            fail("AkShare 历史数据不足，至少需要两个有效交易日")
        return rows, "收盘价", "ETF 前复权日线"
    except SystemExit:
        raise
    except Exception as exc:
        fail(f"AkShare 获取历史数据失败：{exc}")


def prepare(rows):
    unique = {}
    for row in rows:
        try:
            parsed = datetime.strptime(row["date"], "%Y-%m-%d").date()
        except (TypeError, ValueError):
            continue
        if row["value"] > 0:
            unique[parsed.isoformat()] = {"date": parsed.isoformat(), "value": row["value"]}
    return [unique[key] for key in sorted(unique)]


def period(rows, days):
    last = date.fromisoformat(rows[-1]["date"])
    cut = (last - timedelta(days=days)).isoformat()
    selected = [row for row in rows if row["date"] >= cut]
    return selected if len(selected) >= 2 else rows[-min(len(rows), 2):]


def change_percent(rows):
    return round((rows[-1]["value"] / rows[0]["value"] - 1) * 100, 2)


def max_drawdown(rows):
    peak = rows[0]["value"]
    worst = 0.0
    for row in rows:
        peak = max(peak, row["value"])
        worst = min(worst, (row["value"] / peak - 1) * 100)
    return round(worst, 2)


def sharpe_ratio(rows):
    returns = []
    for previous, current in zip(rows, rows[1:]):
        if previous["value"] > 0:
            returns.append(current["value"] / previous["value"] - 1)
    if len(returns) < 2:
        return None
    mean = sum(returns) / len(returns)
    variance = sum((item - mean) ** 2 for item in returns) / (len(returns) - 1)
    deviation = variance ** 0.5
    if deviation == 0:
        return None
    # 未额外拉取无风险利率，按0%计算，年化因子为252个交易日。
    return round(mean / deviation * (252 ** 0.5), 2)


def main():
    if len(sys.argv) != 2 or not sys.argv[1].isdigit() or len(sys.argv[1]) != 6:
        fail("基金代码必须是6位数字")
    try:
        import akshare as ak
    except Exception as exc:
        fail(f"当前 Python 环境未安装 AkShare：{exc}")

    code = sys.argv[1]
    rows, value_label, source_detail = load_history(ak, code)
    rows = prepare(rows)
    if len(rows) < 2:
        fail("清洗后有效历史数据不足")
    periods = {}
    for key, label, days in (("1m", "近1月", 31), ("3m", "近3月", 93), ("1y", "近1年", 366)):
        selected = period(rows, days)
        periods[key] = {
            "label": label,
            "labels": [item["date"] for item in selected],
            "values": [round(item["value"], 6) for item in selected],
            "change": change_percent(selected),
            "observations": len(selected),
        }

    one_year = period(rows, 366)
    print(json.dumps({
        "ok": True,
        "code": code,
        "valueLabel": value_label,
        "source": "AKShare",
        "sourceDetail": source_detail,
        "verificationStatus": "live_upstream",
        "dataAsOf": rows[-1]["date"],
        "retrievedAt": datetime.now().astimezone().isoformat(timespec="seconds"),
        "currentValue": round(rows[-1]["value"], 6),
        "sharpe": sharpe_ratio(one_year),
        "maxDrawdown": max_drawdown(one_year),
        "periods": periods,
        "observationCount": len(rows),
        "note": "ETF 曲线使用 AKShare 返回的东方财富前复权日线收盘价；开放式基金曲线使用单位净值。夏普率按日收益、252交易日、无风险利率0%年化计算。",
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
