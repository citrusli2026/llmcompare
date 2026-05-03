# 模型图鉴

国内大模型数据，整理在一起。

[在线浏览](https://llmcompare.cc) · [GitHub](https://github.com/citrusli2026/llmcompare)

<img src="docs/screenshots/screenshot_home.png" alt="首页截图" width="50%" />

<img src="docs/screenshots/screenshot_detail.png" alt="详情截图" width="50%" />

## 关于项目

模型图鉴是一个开源数据项目，收集和整理国内各大语言模型的公开数据，包括：

- **智能评分** — 综合 MMLU、HumanEval、MATH 等基准测试
- **API 速度** — 中位输出速度 (TPS)、首 Token 延迟
- **官方定价** — 各厂商标准 API 定价

数据来源于 Artificial Analysis 和各模型厂商官网，为开发者和研究者提供参考。

## 本地运行

```bash
npm install && npm run dev
```

## 技术栈

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui

## 贡献

修正或补充模型信息 → [提交 Issue](https://github.com/citrusli2026/llmcompare/issues)

## License

MIT
