#!/usr/bin/env python3
"""
Step 5: 从 ranking.json 生成可视化报告

输出:
  - ../4-final/report.html   (浏览器打开的 HTML 报告)
  - 终端文本摘要

用法: python3 build_report.py
依赖: 无 (纯标准库)
"""

import json
import os
from datetime import datetime, timezone, timedelta

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
INPUT = os.path.join(PROJECT_DIR, '4-final', 'ranking.json')
OUTPUT_HTML = os.path.join(PROJECT_DIR, '4-final', 'report.html')

# ── 北京时区 ──
CST = timezone(timedelta(hours=8))

# ══════════════════════════════════════════════════════════════
# 数据加载
# ══════════════════════════════════════════════════════════════

def load_data():
    with open(INPUT, 'r', encoding='utf-8') as f:
        return json.load(f)


# ══════════════════════════════════════════════════════════════
# 文本报告
# ══════════════════════════════════════════════════════════════

def compute_stats(models: list) -> dict:
    """计算报告所需的聚合统计"""
    n = len(models)
    frontier = sum(1 for m in models if m['flags']['frontier'])
    open_src = sum(1 for m in models if m['flags']['open_weights'])
    zh = sum(1 for m in models if m['flags']['chinese_eval'])
    complete = sum(1 for m in models if m['flags']['data_complete'])
    has_speed = sum(1 for m in models if m['flags']['has_speed'])
    has_price = sum(1 for m in models if m['flags']['has_pricing'])

    companies = {}
    for m in models:
        c = m['company']
        companies[c] = companies.get(c, 0) + 1
    top_companies = sorted(companies.items(), key=lambda x: -x[1])

    dims = ['intelligence', 'coding', 'agentic']
    dim_cov = {d: sum(1 for m in models if m['scores'].get(d) is not None) for d in dims}

    return {
        'n': n, 'frontier': frontier, 'open_src': open_src, 'zh': zh,
        'complete': complete, 'has_speed': has_speed, 'has_price': has_price,
        'companies': companies, 'top_companies': top_companies[:5],
        'top_companies_10': top_companies[:10], 'dim_cov': dim_cov,
    }


# ══════════════════════════════════════════════════════════════
# 文本报告
# ══════════════════════════════════════════════════════════════

def text_report(models: list, stats: dict):
    now = datetime.now(CST).strftime('%Y-%m-%d %H:%M')
    n = stats['n']
    frontier = stats['frontier']
    open_src = stats['open_src']
    zh = stats['zh']
    complete = stats['complete']
    has_speed = stats['has_speed']
    has_price = stats['has_price']
    top_companies = stats['top_companies']
    dim_cov = stats['dim_cov']

    print(f"""
╔══════════════════════════════════════════════════════════════╗
║          LLMCompare 国内模型数据报告  {now} CST          ║
╠══════════════════════════════════════════════════════════════╣
║  总模型: {n:<4}  Frontier: {frontier:<3}  开源: {open_src:<4}  闭源: {n-open_src:<4}             ║
║  中文评测: {zh:<3}  数据完整: {complete:<4}  有速度: {has_speed:<4}  有价格: {has_price:<4}      ║
╠══════════════════════════════════════════════════════════════╣
║  维度覆盖:  intel={dim_cov['intelligence']}/{n}  coding={dim_cov['coding']}/{n}               ║
║             agentic={dim_cov['agentic']}/{n}                                                    ║
╠══════════════════════════════════════════════════════════════╣
║  厂商 Top 5:                                                ║""")
    for i, (c, cnt) in enumerate(top_companies, 1):
        print(f"║    {i}. {c:<20} {cnt} 模型{'':<20}║")
    print("""╚══════════════════════════════════════════════════════════════╝
""")

    # Top 15 表格
    print(f"{'#':<4} {'模型':<35} {'厂商':<14} {'智能':>6} {'代码':>6} {'Agent':>6} {'速度(t/s)':>10} {'价格($/M)':>10} {'标记'}")
    print("-" * 105)
    for i, m in enumerate(models[:15]):
        rank = i + 1
        s = m['scores']
        sp = m['speed']
        p = m['pricing']
        flags = []
        if m['flags']['frontier']: flags.append('前沿')
        if m['flags']['open_weights']: flags.append('开源')
        if m['flags']['reasoning']: flags.append('推理')
        if m['flags']['chinese_eval']: flags.append('中文')
        if not m['flags']['data_complete']: flags.append('缺数据')

        intel = f"{s['intelligence']:.1f}" if s['intelligence'] else '-'
        coding = f"{s['coding']:.1f}" if s['coding'] else '-'
        agentic = f"{s['agentic']:.1f}" if s['agentic'] else '-'
        tps = f"{sp['median_tps']:.0f}" if sp['median_tps'] else '-'
        price = f"{p.get('blended'):.3f}" if p.get('blended') else '-'

        print(f"{rank:<4} {m['name']:<35} {m['company']:<14} {intel:>6} {coding:>6} {agentic:>6} {tps:>10} {price:>10} {' '.join(flags)}")

    print(f"\nHTML 报告: {OUTPUT_HTML}")


# ══════════════════════════════════════════════════════════════
# HTML 报告
# ══════════════════════════════════════════════════════════════

def html_report(models: list, stats: dict):
    now = datetime.now(CST).strftime('%Y-%m-%d %H:%M CST')
    n = stats['n']
    frontier = stats['frontier']
    open_src = stats['open_src']
    zh = stats['zh']
    complete = stats['complete']
    has_speed = stats['has_speed']
    has_price = stats['has_price']
    dim_cov = stats['dim_cov']
    top_companies = stats['top_companies_10']

    # ── HTML 构建 ──
    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LLMCompare 国内模型数据报告 — {now}</title>
<style>
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; background: #0d1117; color: #c9d1d9; padding: 24px; line-height: 1.5; }}
h1 {{ font-size: 22px; margin-bottom: 4px; color: #f0f6fc; }}
h2 {{ font-size: 16px; margin: 32px 0 12px; color: #f0f6fc; border-bottom: 1px solid #21262d; padding-bottom: 8px; }}
.subtitle {{ color: #8b949e; font-size: 13px; margin-bottom: 24px; }}

/* 仪表盘 */
.dashboard {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 32px; }}
.card {{ background: #161b22; border: 1px solid #21262d; border-radius: 8px; padding: 14px 16px; text-align: center; }}
.card .value {{ font-size: 28px; font-weight: 700; color: #f0f6fc; }}
.card .label {{ font-size: 12px; color: #8b949e; margin-top: 4px; }}
.card.frontier {{ border-color: #d2991d; }}
.card.frontier .value {{ color: #d2991d; }}

/* 表格 */
table {{ width: 100%; border-collapse: collapse; font-size: 13px; }}
th {{ text-align: left; padding: 8px 10px; background: #161b22; color: #8b949e; font-weight: 600; border-bottom: 1px solid #21262d; position: sticky; top: 0; }}
td {{ padding: 7px 10px; border-bottom: 1px solid #21262d; }}
tr:hover {{ background: #1c2128; }}
tr.frontier {{ background: #1a1200; }}
tr.frontier:hover {{ background: #241a00; }}
.num {{ text-align: right; font-variant-numeric: tabular-nums; }}
.missing {{ color: #484f58; font-style: italic; }}
.tag {{ display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 11px; margin: 0 1px; }}
.tag.frontier {{ background: #d2991d22; color: #d2991d; }}
.tag.open {{ background: #3fb95022; color: #3fb950; }}
.tag.closed {{ background: #8b949e22; color: #8b949e; }}
.tag.reasoning {{ background: #a371f722; color: #a371f7; }}
.tag.image {{ background: #79c0ff22; color: #79c0ff; }}
.tag.zh {{ background: #f778ba22; color: #f778ba; }}

/* 进度条 */
.bar-container {{ margin: 6px 0; display: flex; align-items: center; gap: 10px; }}
.bar-label {{ width: 120px; font-size: 13px; color: #c9d1d9; }}
.bar-track {{ flex: 1; height: 8px; background: #21262d; border-radius: 4px; overflow: hidden; }}
.bar-fill {{ height: 100%; border-radius: 4px; transition: width 0.3s; }}
.bar-num {{ font-size: 12px; color: #8b949e; min-width: 55px; text-align: right; }}

/* Frontier 卡片 */
.frontier-cards {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }}
.fcard {{ background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 14px; }}
.fcard.frontier {{ border-color: #d2991d; }}
.fcard h3 {{ font-size: 14px; margin-bottom: 8px; }}
.fcard .company {{ color: #8b949e; font-size: 12px; }}
.fcard .scores {{ margin: 8px 0; }}
.fcard .score-row {{ display: flex; justify-content: space-between; font-size: 13px; margin: 2px 0; }}
.fcard .score-row .dim {{ color: #8b949e; }}
.fcard .meta-row {{ font-size: 12px; color: #8b949e; margin: 8px 0 2px; }}

/* 厂商条 */
.company-bar {{ display: flex; align-items: center; margin: 4px 0; gap: 10px; }}
.company-bar .name {{ width: 100px; font-size: 13px; text-align: right; }}
.company-bar .bar {{ flex: 1; height: 20px; background: #21262d; border-radius: 3px; overflow: hidden; }}
.company-bar .fill {{ height: 100%; background: linear-gradient(90deg, #1f6feb, #58a6ff); border-radius: 3px; display: flex; align-items: center; justify-content: flex-end; padding-right: 6px; font-size: 11px; color: #fff; min-width: 0; }}
.company-bar .count {{ font-size: 12px; color: #8b949e; min-width: 40px; }}
</style>
</head>
<body>

<h1>📊 LLMCompare 国内模型数据报告</h1>
<div class="subtitle">数据来源: Artificial Analysis · 生成时间: {now} · 模型总数: {n}</div>

<!-- ═══ 仪表盘 ═══ -->
<h2>数据总览</h2>
<div class="dashboard">
  <div class="card"><div class="value">{n}</div><div class="label">模型总数</div></div>
  <div class="card frontier"><div class="value">{frontier}</div><div class="label">Frontier</div></div>
  <div class="card"><div class="value">{open_src}</div><div class="label">开源</div></div>
  <div class="card"><div class="value">{n-open_src}</div><div class="label">闭源</div></div>
  <div class="card"><div class="value">{zh}</div><div class="label">中文评测</div></div>
  <div class="card"><div class="value">{complete}</div><div class="label">数据完整</div></div>
  <div class="card"><div class="value">{has_speed}</div><div class="label">有速度数据</div></div>
  <div class="card"><div class="value">{has_price}</div><div class="label">有价格数据</div></div>
</div>

<!-- ═══ 排行榜 Top 30 ═══ -->
<h2>排行榜 Top 30</h2>
<table>
<thead><tr>
  <th>#</th><th>模型</th><th>厂商</th><th class="num">智能分</th><th class="num">代码</th><th class="num">Agent</th><th class="num">速度(t/s)</th><th class="num">价格($/M)</th><th>标记</th>
</tr></thead>
<tbody>
"""
    for i, m in enumerate(models[:30]):
        s = m['scores']
        sp = m['speed']
        p = m['pricing']
        is_f = m['flags']['frontier']
        row_class = ' class="frontier"' if is_f else ''

        def fmt(v, decimals=2):
            if v is None: return '<span class="missing">-</span>'
            return f'{v:.{decimals}f}'

        tags = []
        if is_f: tags.append('<span class="tag frontier">前沿</span>')
        if m['flags']['open_weights']: tags.append('<span class="tag open">开源</span>')
        else: tags.append('<span class="tag closed">闭源</span>')
        if m['flags']['reasoning']: tags.append('<span class="tag reasoning">推理</span>')
        if m['flags']['image_input']: tags.append('<span class="tag image">多模态</span>')
        if m['flags']['chinese_eval']: tags.append('<span class="tag zh">中文</span>')

        html += f"""<tr{row_class}>
  <td>{i+1}</td>
  <td>{m['name']}</td>
  <td>{m['company']}</td>
  <td class="num">{fmt(s['intelligence'], 1)}</td>
  <td class="num">{fmt(s['coding'], 2)}</td>
  <td class="num">{fmt(s['agentic'], 2)}</td>
  <td class="num">{fmt(sp['median_tps'], 0)}</td>
  <td class="num">{fmt(p.get('blended'), 3)}</td>
  <td>{' '.join(tags)}</td>
</tr>
"""

    html += """</tbody></table>

<!-- ═══ Frontier 对比 ═══ -->
<h2>Frontier 模型对比</h2>
<div class="frontier-cards">
"""
    frontier_models = [m for m in models if m['flags']['frontier']]
    for fi, m in enumerate(frontier_models):
        s = m['scores']
        sp = m['speed']
        p = m['pricing']
        mt = m['meta']

        def f(v, d=2):
            return f'{v:.{d}f}' if v is not None else '<span class="missing">-</span>'

        html += f"""  <div class="fcard frontier">
    <h3>#{fi+1} {m['name']}</h3>
    <div class="company">{m['company']} · {m['type']}</div>
    <div class="scores">
      <div class="score-row"><span class="dim">智能分</span><span>{f(s['intelligence'], 1)}</span></div>
      <div class="score-row"><span class="dim">代码</span><span>{f(s['coding'])}</span></div>
      <div class="score-row"><span class="dim">Agent</span><span>{f(s['agentic'])}</span></div>
    </div>
    <div class="meta-row">速度: {f(sp['median_tps'], 0)} t/s · TTFT: {f(sp['ttft_seconds'], 1)}s</div>
    <div class="meta-row">价格: ${f(p.get('blended'), 3)}/M · 输入${f(p['input'])}/输出${f(p['output'])}</div>
    <div class="meta-row">上下文: {mt['context_window'] or '<span class="missing">-</span>'} · 体积: {mt['size_class'] or '<span class="missing">-</span>'} · {mt['release_date'] or '<span class="missing">-</span>'}</div>
  </div>
"""
    html += """</div>

<!-- ═══ 数据质量 ═══ -->
<h2>数据质量 — 维度覆盖率</h2>
"""
    dim_labels = {'intelligence': '智能分', 'coding': '代码', 'agentic': 'Agent'}
    dim_colors = {'intelligence': '#58a6ff', 'coding': '#3fb950', 'agentic': '#a371f7'}
    for d in dim_cov:
        pct = dim_cov[d] / n * 100
        color = dim_colors[d]
        html += f"""<div class="bar-container">
  <span class="bar-label">{dim_labels[d]}</span>
  <div class="bar-track"><div class="bar-fill" style="width:{pct}%;background:{color}"></div></div>
  <span class="bar-num">{dim_cov[d]}/{n} ({pct:.0f}%)</span>
</div>
"""
    # 速度和价格
    sp_pct = has_speed / n * 100
    pr_pct = has_price / n * 100
    html += f"""<div class="bar-container">
  <span class="bar-label">速度数据</span>
  <div class="bar-track"><div class="bar-fill" style="width:{sp_pct}%;background:#d2991d"></div></div>
  <span class="bar-num">{has_speed}/{n} ({sp_pct:.0f}%)</span>
</div>
<div class="bar-container">
  <span class="bar-label">价格数据</span>
  <div class="bar-track"><div class="bar-fill" style="width:{pr_pct}%;background:#79c0ff"></div></div>
  <span class="bar-num">{has_price}/{n} ({pr_pct:.0f}%)</span>
</div>
"""

    # ═══ 厂商分布 ═══
    html += """<h2>厂商分布</h2>
"""
    max_cnt = top_companies[0][1] if top_companies else 1
    for c, cnt in top_companies:
        pct = cnt / max_cnt * 100
        html += f"""<div class="company-bar">
  <span class="name">{c}</span>
  <div class="bar"><div class="fill" style="width:{pct}%">{cnt}</div></div>
  <span class="count">{cnt} 模型</span>
</div>
"""

    html += f"""
</body>
</html>"""

    with open(OUTPUT_HTML, 'w', encoding='utf-8') as f:
        f.write(html)


# ══════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════

def main():
    print(f'读取: {INPUT}')
    models = load_data()
    print(f'模型数: {len(models)}')

    stats = compute_stats(models)

    text_report(models, stats)

    html_report(models, stats)
    size_kb = os.path.getsize(OUTPUT_HTML) / 1024
    print(f'HTML 报告: {OUTPUT_HTML} ({size_kb:.0f} KB)')


if __name__ == '__main__':
    main()
