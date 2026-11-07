# 产品迭代计划（2026-11 起）

站点是静态 Next.js，数据来自 AA / OpenRouter / Arena 三个源，每日两次 Actions 刷新后直接推送 main。

## 这次踩到的坑（已修）

| 问题 | 根因 | 修复 |
| --- | --- | --- |
| 每日刷新连续失败 30 天 | Arena 镜像自 2026-10-07 起只产出空 `_index.json`，管线降级用缓存后仍被「快照 > 21 天」硬失败 | 单源过期降级为告警；只有全部源都过期才失败 |
| 镜像空快照导致大量 404 重试 | 只信任 `latest.json` 的日期 | 先用 `_index.json` 探测，回退 7 天找最近完整快照，找不到直接走缓存（exit 3） |
| 速度字段全空（0/725） | AA 把速度从 `timescaleData.medianOutputSpeed` 挪到 `headline.outputSpeed` | 新增 `deep_find` 兜底，覆盖率恢复到 394/725 |
| CI 红 | ① 生产依赖安全审计阻断（next 16.3.8 / source-map-js 1.2.1）② runner 升级到 Ubuntu 26.04，Playwright 不支持 | next 升到 16.4.5、override source-map-js ^1.2.2；e2e 钉 ubuntu-24.04 |
| 数据刷新时前端单测失败 | 测试写死 3 个模型 id，数据刷新后 id 不存在 | 改为运行时从 `getAllModels()` 取 |

## P0（本周收尾）

- 观察连续 3 天定时刷新，确认数据每天自动更新
- 依赖安全：生产依赖清零（已完成），dev 依赖按 dependabot 分批处理
- 失败告警：同一个 issue 聚合，避免每次失败刷屏

## P1（本月）

1. **数据源健康看板**：workflow summary 已有基础，补一条「源状态」卡片，页面角落里显示各源最后更新时间
2. **Arena 备用源**：评估直接解析 arena.ai 或第二镜像；短期先让页面明确标注「Arena 数据截至 X 日」
3. **AA 覆盖恢复**：跟踪 intelligence 字段是否恢复；若长期置空，评估从排行榜页/其他来源补齐
4. **详情页数据来源**：每个分数标注来源与时间

## P2（下季度）

- 榜单页支持「最近 7 天变化」排序
- 开放只读静态 API（`ranking.json` + CDN + CORS）与 RSS 变更订阅
- 多语言扩到日/韩
- 性能：图片、字体、LCP；Lighthouse 保持 ≥ 90

## 指标

| 指标 | 目标 |
| --- | --- |
| 每日刷新成功率 | ≥ 99% |
| 数据新鲜度 | ≤ 24h |
| 生产依赖高危漏洞 | 0 |
| LCP | < 2.5s |
| Lighthouse（性能/可访问性） | ≥ 90 |

## 风险

- **单一上游镜像**：Arena 只有一个社区镜像，随时可能停更/改版 —— 需要备用源
- **AA 频繁改版**：字段一年内已三次漂移（codingIndex、agenticIndex、outputSpeed）
- **Runner 升级**：GitHub 会周期升级 runner 镜像，Playwright/浏览器依赖容易断
