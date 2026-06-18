"""
国内模型识别 — 单一来源

filter_cn_models.py (诊断) / build_frontend_models.py / enrich_models.py 共用。
新增国内厂商时, 同时更新两个列表, 三处自动同步。
"""

CN_COMPANIES = [
    'deepseek', 'alibaba', 'tencent', 'baidu', 'bytedance',
    'xiaomi', 'zhipu', 'moonshot', 'minimax', '01.ai',
    'stepfun', 'baichuan', 'inclusionai', 'infini', 'xverse',
    'kwai', 'kuaishou', 'longcat', 'kimi', 'z ai',
]

CN_MODEL_NAMES = [
    'deepseek', 'qwen', 'glm-', 'kimi', 'hunyuan', 'doubao',
    'mimo-', 'minimax', 'ernie', 'baichuan', 'skywork',
    'step-', 'ling-', 'xverse', 'hy3', 'qwq', 'seed-oss',
    'chatglm', 'codegeex', 'internlm', 'kat-coder', 'longcat',
]


def is_cn_company(company: str) -> bool:
    comp = (company or '').lower()
    return any(c in comp for c in CN_COMPANIES)


def is_cn_model_name(name: str) -> bool:
    name = (name or '').lower()
    return any(k in name for k in CN_MODEL_NAMES)


def is_cn_model(m: dict) -> bool:
    """AA 格式 dict: 用 short_name + company 联合判定"""
    return is_cn_company(m.get('company', '')) or is_cn_model_name(m.get('short_name', ''))
