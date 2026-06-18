# 1-fetch — 数据抓取

从 Artificial Analysis 抓取模型全维度数据。

## 文件

| 文件 | 说明 |
|------|------|
| `fetch_aa_data.py` | 抓取脚本: RSC Header Trick 获取 Next.js 序列化载荷，解析 JSON |
| `aa_data_extraction.md` | 字段完整说明 (72 字段的定义、范围、覆盖率) |
| `SKILL.md` | Claude Code skill 定义 (何时触发、如何运行) |

## 用法

```bash
python3 fetch_aa_data.py --output ../2-raw/
```

输出到 `../2-raw/`:
- `aa_all_full.json` — 全部 ~512 模型
- `aa_top64_full.json` — Intelligence Index 前 64 名

## 前置条件

- Python 3.6+
- 网络可访问 `artificialanalysis.ai`
- 无需 API key 或认证
