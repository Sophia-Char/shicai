# 拾财 · AI理财陪伴Web应用

「拾财」是一个面向中国年轻人（18-30岁）的教育陪伴型理财入口。核心理念是 **AI帮你理解，不帮你决策**。

## 技术栈

- 前端：纯 HTML / CSS / JavaScript（单页应用，Hash 路由）
- 后端：Node.js（内置 `http` 模块，零第三方运行时依赖）
- 数据库：SQLite（Node 内置 `node:sqlite`）
- 图表：ECharts（CDN）
- AI：DeepSeek API（OpenAI 兼容），后端代理调用；未配置密钥时自动降级为内置合规回复引擎

## 快速开始

```bash
# 直接启动（零依赖，无需 npm install）
node server/index.js
```

浏览器打开 <http://localhost:3000>。

## 账号与登录

应用已支持账号密码登录，不同用户的数据（画像、对话、模拟仓、学习进度、情绪日记）完全隔离。

- 默认演示账号：**拾光者 / 123456**
- 首页进入时会检查主动陪伴状态；当大盘三项指数平均涨跌幅超过 ±5% 时，首页显示小拾的上涨/下跌提醒，并可继续前往 AI 搭子对话。提醒会结合用户画像和真实持仓，先共情再给出理性检查建议；每天同一用户最多展示一次市场提醒。首页也提供模拟大涨/大跌按钮用于演示。
- 首次注册或首次登录新账号后，会进入小拾的开放式引导对话：用自然语言回答资金使用、现金流、投资占比、亏损反应、收益风险取舍、投资经历、投资目标和陪伴方式等问题，完成初始画像；不通过选择标签给用户分类。
- 画像建立问卷独立在 `public/js/profile-questionnaire.js`，可手动编辑题目和选项文案；为保持后端评分、校验和重答逻辑正常，请不要修改每道题的 `key` 及选项的 `id`。
- 后续可在个人中心继续补充或修正画像，或点击聊天中的「添加到个人画像」沉淀具体信息。
- AI 搭子页提供「建立/更新我的画像」入口，也支持直接输入自定义陪伴人格，例如希望小拾更像教练、朋友或数据分析师。
- 画像汇总会把题目语义和用户原答一起交给模型，即使回答夹杂口语、顺序混乱也按题意归位；模型响应超过 30 秒时，只有标准选项答案允许使用本地兜底，自定义或混合回答会明确要求重做，不会静默猜测。
- 密码使用 `scrypt` 加盐哈希存储，登录态通过服务端随机 token（Bearer）维护。

## 多会话对话

「AI搭子」支持像主流 AI 应用一样的多会话能力：左侧可新建、切换、删除多个对话，避免不同场景互相干扰；AI 回复以 Markdown 排版渲染（粗体、列表、小知识等）。

## 接入 DeepSeek

应用已内置 DeepSeek 代理：后端负责拼装 System Prompt（含用户画像、市场状态、人格），前端不会直接接触你的密钥。

推荐方式——在项目根目录新建 `.env` 文件（可复制 `.env.example`）：

```bash
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

然后重启服务即可切换为真实大模型回复。也可以用环境变量方式：

```bash
# Windows (PowerShell)
$env:DEEPSEEK_API_KEY="sk-xxxx"
node server/index.js
```

可选变量：

- `DEEPSEEK_BASE_URL`（默认 `https://api.deepseek.com`）
- `DEEPSEEK_MODEL`（默认 `deepseek-chat`）
- `PORT`（默认 `3000`）

> 未配置 `DEEPSEEK_API_KEY` 或调用失败时，应用自动使用内置的合规回复引擎，保证演示可用。

### 用户自行接入 API Key

登录后可在「个人中心 → AI 接入设置」填写自己的 DeepSeek API Key、API 地址和模型，不必把 Key 写入代码或 `.env`。个人 Key 优先于站点默认 Key；服务端使用 AES-GCM 加密保存，前端接口仅返回掩码。

线上部署建议额外设置一个固定且保密的 `AI_CONFIG_SECRET`，用于加密用户 Key。未设置时系统会自动生成本地密钥并保存在 SQLite 中，因此需要使用持久化磁盘。

### 提示词集中配置

各模块的 DeepSeek System Prompt 集中在 `server/prompts.js`，包含主聊天、市场点评、新闻解读、新闻真实性验证、社区评论和默认提问。修改后重启服务即可加载；新闻验证提示词只允许依据调用方传入的来源证据判断，证据不足时必须返回 `unverified`。

## 基金详情数据（AkShare）

首页和模拟仓的基金详情会通过本地 Python 适配层调用 AkShare 获取真实历史数据：开放式基金使用 `fund_open_fund_info_em` 的单位净值走势，ETF 使用 `fund_etf_hist_em` 的前复权日线收盘价。夏普率按日收益、252 个交易日、无风险利率 0% 年化计算；数据截止日期、来源和口径会在详情卡片中展示。

基金池可使用 `scripts/update-fund-pool-akshare.py` 更新：净值和近一年收益来自批量排名接口，最大回撤由每只基金最近 366 个日历日的净值曲线脚本计算（从历史峰值到后续低点的最大跌幅）。服务启动时会检查快照是否超过 48 小时，过期则在后台自动更新；之后每天检查一次。脚本要求基金池和最大回撤覆盖率至少 90% 才会写入，写入后记录快照日期、生成时间和字段新鲜度，失败时保留旧快照并在服务日志中记录原因。

模拟仓会先按基金交易方式处理订单：明确的场内 ETF 按实时参考价即时成交；开放式基金、ETF 联接和当前未选择场内渠道的 LOF 只能挂单，等新的收盘净值快照可用后确认成交。定投计划沿用同一规则，到期后不再把开放式基金直接按现价买入；挂单期间买入金额会冻结，卖出份额会占用，避免重复下单。交易记录会标注“实时成交”或“收盘净值确认”。服务每分钟检查到期计划和收盘挂单，打开模拟仓或进行交易时也会触发一次检查。

首次使用需要安装 Python 依赖（建议使用 Python 3.12+）：

```powershell
uv venv .venv
uv pip install --python .venv\Scripts\python.exe -r requirements.txt
```

也可以通过 `AKSHARE_PYTHON` 指定已经安装 AkShare 的 Python 可执行文件。上游接口不可用或基金历史数据不足时，详情卡片会显示错误，不会回退为伪造曲线。

## 行情与新闻数据来源

「今日市场概览」实时拉取上证指数、深证成指、创业板指的涨跌幅（无需密钥，60 秒缓存），按以下顺序自动切换：

- 数据源 1：东方财富 `https://push2.eastmoney.com/api/qt/ulist.np/get`（JSON）
- 数据源 2：腾讯 `https://qt.gtimg.cn/q=sh000001,sz399001,sz399006`（GBK，备用）
- 兜底：两个数据源均失败时降级为模拟数据，保证离线也能演示（首页会标注「模拟数据」）

- 当配置了 `DEEPSEEK_API_KEY` 时，首页「小拾点评」会由真实模型基于当日行情生成；否则使用内置的确定性点评兜底。

「热点解读」每日定时更新，聚合**财联社电报快讯**、**中国新闻网财经 RSS**、**搜狐财经公开 Feed**和**南方周末官网新闻列表**，服务启动时立即抓取一次，之后每 30 分钟自动刷新；抓取失败时保留其他渠道和种子新闻兜底。热点页会显示抓取渠道与发布方，重复标题只保留一条，避免把转载重复算作独立来源。开启个性化筛选后，后端会把个人画像和最新新闻标题交给 DeepSeek 选择并排序相关热点；模型不可用时降级为本地规则筛选。每条新闻可点击「✨ 生成 AI 解读」，由 DeepSeek 生成四段式解读（发生了什么 / 和你的关系 / 术语 / 理性看待）。AI 搭子聊天会先由 DeepSeek 判断当前问题是否需要联网获取最新信息，并生成检索词；DeepSeek 不可用或返回格式不合法时，回退到 `server/research.js` 中的关键词规则。涉及基金代码、净值、基金经理、申购赎回、基金公告等内容时，网页检索优先覆盖基金管理人官网、监管机构、基金业协会、交易所和上市公司公告等官方域名；基金历史指标可由 AkShare 获取并用于回答。基金池快照由上游每日更新，读取时按 48 小时有效期检查；快照缺少时间元数据或已过期时，页面会显示警告。

## 线上部署

项目提供 `Dockerfile`、`docker-compose.yml` 和 `render.yaml`，镜像内同时包含 Node.js、Python 和 AkShare，并持久化 `/app/data`。

使用 Docker Compose 启动：

```bash
docker compose up -d --build
```

仓库推送到 GitHub 后，也可以在 Render 使用 Blueprint 部署。Render 配置会生成 `AI_CONFIG_SECRET` 并挂载 1 GB 持久化磁盘，确保用户加密 Key、账号和数据库在重启后仍保留。

线上环境至少应设置：

- `AI_CONFIG_SECRET`：随机长字符串，用于加密用户保存的 API Key。
- `DEEPSEEK_API_KEY`：可选；作为新用户的站点默认 Key。
- `DEEPSEEK_BASE_URL`：可选，默认 `https://api.deepseek.com`。
- `DEEPSEEK_MODEL`：可选，默认 `deepseek-chat`。

## 目录结构

```
server/
  index.js       HTTP 服务与 API 路由
  db.js          SQLite 建表与种子数据
  ai.js          System Prompt 构建、DeepSeek 客户端、合规回复引擎
  prompts.js     集中维护各模块 System Prompt 与 AI 任务指令
  personas.js    自定义人格兼容模块
  market.js      模拟行情、基金列表、主动陪伴触发
public/
  index.html
  css/style.css
  js/core.js     路由、API、公共组件
  js/pages/*.js  六个页面模块
```

## 免责声明

本项目仅用于学习与演示，所有行情、基金、新闻数据均为模拟或公开示例，不构成任何投资建议。
