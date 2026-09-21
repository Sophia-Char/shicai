"""用 AkShare 批量更新拾财基金池的净值、近一年收益和最大回撤。

该脚本用于原始基金快照文件不可用时的安全更新：基金分类和风险沿用现有基金池，
净值/收益来自批量排名接口，最大回撤由单只基金近一年净值曲线计算，并记录数据日期。
"""

import json
import math
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "server" / "funds-data.js"
MIN_COVERAGE = 0.9


def number(value):
    try:
        value = float(value)
        return value if math.isfinite(value) else None
    except (TypeError, ValueError):
        return None


def date_text(value):
    timestamp = number(value)
    if timestamp is not None and timestamp > 100000000000:
        return datetime.fromtimestamp(timestamp / 1000, tz=timezone.utc).date().isoformat()
    text = str(value or '').strip()
    if text.lower() in {'nat', 'nan', 'none', 'null'}:
        return ''
    return text[:10] if text else ''


def history_max_drawdown(ak, code):
    """读取单只基金近一年净值曲线并计算最大回撤。"""
    frame = None
    try:
        frame = ak.fund_open_fund_info_em(symbol=code, indicator='单位净值走势')
        date_index = next((i for i, col in enumerate(frame.columns) if '日期' in str(col)), 0)
        value_index = next((i for i, col in enumerate(frame.columns) if '单位净值' in str(col)), 1)
    except Exception:
        # ETF 等非开放式基金回退到日线收盘价。
        try:
            end = datetime.now(timezone.utc).date()
            start = end - timedelta(days=400)
            frame = ak.fund_etf_hist_em(
                symbol=code,
                period='daily',
                start_date=start.strftime('%Y%m%d'),
                end_date=end.strftime('%Y%m%d'),
                adjust='qfq',
            )
            date_index = next((i for i, col in enumerate(frame.columns) if '日期' in str(col)), 0)
            value_index = next((i for i, col in enumerate(frame.columns) if '收盘' in str(col)), min(4, len(frame.columns) - 1))
        except Exception:
            return None
    if frame is None or len(frame) < 2:
        return None

    rows = []
    for row in frame.itertuples(index=False, name=None):
        try:
            day = datetime.fromisoformat(str(row[date_index])[:10]).date()
        except (TypeError, ValueError):
            continue
        value = number(row[value_index])
        if value is not None and value > 0:
            rows.append((day, value))
    if len(rows) < 2:
        return None
    rows.sort(key=lambda item: item[0])
    cutoff = rows[-1][0] - timedelta(days=366)
    values = [value for day, value in rows if day >= cutoff]
    if len(values) < 2:
        values = [value for _, value in rows[-2:]]
    peak = values[0]
    worst = 0.0
    for value in values:
        peak = max(peak, value)
        worst = min(worst, (value / peak - 1) * 100)
    return round(worst, 2)


def load_funds():
    source = TARGET.read_text(encoding='utf-8')
    match = re.search(r'(?:const\s+funds|module\.exports)\s*=\s*(\[[\s\S]*?\]);', source)
    if not match:
        raise RuntimeError(f'无法从 {TARGET} 读取基金数组')
    return json.loads(match.group(1))


def main():
    # 某些开发工具注入了不可写的 SSLKEYLOGFILE，会阻断 AkShare HTTPS 请求。
    os.environ.pop('SSLKEYLOGFILE', None)
    try:
        import akshare as ak
    except Exception as exc:
        raise RuntimeError(f'当前 Python 环境未安装 AkShare：{exc}') from exc

    funds = load_funds()
    ranking = ak.fund_open_fund_rank_em()
    if ranking is None or len(ranking) == 0 or len(ranking.columns) < 12:
        raise RuntimeError('AkShare 基金排名接口没有返回可用数据')

    # AkShare 当前列顺序：序号、基金代码、简称、日期、单位净值、累计净值、日增长率……近1年。
    rows = {}
    snapshot_dates = []
    for row in ranking.itertuples(index=False, name=None):
        code = str(row[1] or '').strip().zfill(6)
        if not re.fullmatch(r'\d{6}', code):
            continue
        unit_nav = number(row[4])
        accumulated_nav = number(row[5])
        return_1y = number(row[11])
        nav = accumulated_nav if accumulated_nav is not None else unit_nav
        if nav is None and return_1y is None:
            continue
        item = {}
        if nav is not None:
            item['price'] = round(nav, 4)
        if return_1y is not None:
            item['return1y'] = round(return_1y, 2)
        rows[code] = item
        if date_text(row[3]):
            snapshot_dates.append(date_text(row[3]))

    matched = 0
    updated = []
    for fund in funds:
        item = rows.get(str(fund.get('code', '')).zfill(6))
        if not item:
            continue
        fund.update(item)
        matched += 1
        updated.append(fund.get('code'))

    coverage = matched / max(len(funds), 1)
    if coverage < MIN_COVERAGE:
        raise RuntimeError(f'AkShare 覆盖率只有 {coverage:.1%}，低于安全阈值 {MIN_COVERAGE:.0%}，拒绝覆盖基金池')

    print(f'净值/近一年收益已匹配 {matched}/{len(funds)}，开始计算近一年最大回撤…', flush=True)
    drawdowns = {}
    with ThreadPoolExecutor(max_workers=6) as pool:
        tasks = {pool.submit(history_max_drawdown, ak, str(fund.get('code', '')).zfill(6)): str(fund.get('code', '')).zfill(6) for fund in funds}
        for index, task in enumerate(as_completed(tasks), start=1):
            code = tasks[task]
            try:
                result = task.result()
            except Exception:
                result = None
            if result is not None:
                drawdowns[code] = result
            if index % 25 == 0 or index == len(tasks):
                print(f'最大回撤进度 {index}/{len(tasks)}，成功 {len(drawdowns)}', flush=True)

    drawdown_matched = 0
    for fund in funds:
        code = str(fund.get('code', '')).zfill(6)
        if code in drawdowns:
            fund['maxDrawdown'] = drawdowns[code]
            drawdown_matched += 1

    drawdown_coverage = drawdown_matched / max(len(funds), 1)
    if drawdown_coverage < MIN_COVERAGE:
        raise RuntimeError(f'最大回撤覆盖率只有 {drawdown_coverage:.1%}，低于安全阈值 {MIN_COVERAGE:.0%}，拒绝写入最大回撤更新')

    snapshot_as_of = max(snapshot_dates) if snapshot_dates else ''
    generated_at = datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')
    content = "'use strict';\n"
    content += '// 基金池数据 —— 由 AkShare 批量更新；最大回撤由近一年净值曲线计算。\n'
    content += f'// 本次更新：净值/收益 {matched}/{len(funds)} 只，最大回撤 {drawdown_matched}/{len(funds)} 只，数据截至 {snapshot_as_of or "未知"}。\n'
    content += f'const funds = {json.dumps(funds, ensure_ascii=False, indent=2)};\n'
    content += f'funds.snapshotAsOf = {json.dumps(snapshot_as_of)};\n'
    content += f'funds.generatedAt = {json.dumps(generated_at)};\n'
    content += 'funds.updatedFields = ["price", "return1y", "maxDrawdown"];\n'
    stale_fields = ['maxDrawdown'] if drawdown_matched < len(funds) else []
    content += f'funds.staleFields = {json.dumps(stale_fields, ensure_ascii=False)};\n'
    content += 'module.exports = funds;\n'
    TARGET.write_text(content, encoding='utf-8')
    print(json.dumps({
        'ok': True,
        'matched': matched,
        'total': len(funds),
        'coverage': round(coverage, 4),
        'drawdownCoverage': round(drawdown_coverage, 4),
        'snapshotAsOf': snapshot_as_of,
        'updatedFields': ['price', 'return1y', 'maxDrawdown'],
        'staleFields': stale_fields,
    }, ensure_ascii=False))


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(json.dumps({'ok': False, 'error': str(exc)}, ensure_ascii=False))
        sys.exit(1)
