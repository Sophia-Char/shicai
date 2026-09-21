(function () {
  'use strict';

  // 画像建立问卷配置。
  // 可直接修改题目文字和选项文案；key/id 请保持不变，否则后端无法完成评分和校验。
  window.ProfileQuestionnaire = [
    {
      key: 'liquidity',
      q: '**1. 应急资金场景**\n\n如果突然需要一笔钱，你会不会动用这笔投资？',
      options: [
        { id: 'liquidity_emergency', label: '很可能会动用' },
        { id: 'liquidity_monthly', label: '大概率不用' },
        { id: 'liquidity_long', label: '至少三年不用' },
        { id: 'liquidity_very_long', label: '长期完全不需要动用' },
      ],
    },
    {
      key: 'cashflow',
      q: '**2. 现金流场景**\n\n如果市场连续下跌，你的日常生活和还款会受到影响吗？',
      options: [
        { id: 'cashflow_tight', label: '可能会，收入不稳定或有较大短期债务压力' },
        { id: 'cashflow_basic', label: '影响不大，但应急金还不充分或仍有还款压力' },
        { id: 'cashflow_stable', label: '基本不会，收入较稳定且有基本应急金' },
        { id: 'cashflow_strong', label: '不会，收入和应急金都较充足' },
      ],
    },
    {
      key: 'allocation',
      q: '**3. 资金占比场景**\n\n如果把可支配资产分成 10 份，你大约有几份放在投资产品里？',
      options: [
        { id: 'allocation_most', label: '7 份以上' },
        { id: 'allocation_half', label: '5-7 份' },
        { id: 'allocation_part', label: '2-5份' },
        { id: 'allocation_small', label: '少于 2 份，主要是现金或低波动资产' },
      ],
    },
    {
      key: 'drawdown',
      q: '**4. 亏损情景**\n\n如果组合短期下跌约 20%，你更可能怎么做？',
      options: [
        { id: 'drawdown_sell', label: '很难接受，可能尽快卖出止损' },
        { id: 'drawdown_worry', label: '会焦虑，先观察但可能改变原计划' },
        { id: 'drawdown_plan', label: '接受波动，按原计划观察和调整' },
        { id: 'drawdown_accept', label: '能承受较大波动，必要时按计划加仓或继续持有' },
      ],
    },
    {
      key: 'tradeoff',
      q: '**5. 收益与风险取舍**\n\nA 可能赚 5%、损失较小；B 可能赚 20%、也可能亏 25% 以上。你会怎样分配？',
      options: [
        { id: 'tradeoff_safe', label: '全部选择 A' },
        { id: 'tradeoff_safe_more', label: '两者都有，但大部分选择 A' },
        { id: 'tradeoff_half', label: '两者各一半' },
        { id: 'tradeoff_growth_more', label: '两者都有，但大部分选择 B' },
      ],
    },
    {
      key: 'experience',
      q: '**6. 投资经验场景**\n\n下面哪种经历最接近你？',
      options: [
        { id: 'experience_none', label: '基本没有投资经验，主要是存款' },
        { id: 'experience_fund', label: '买过基金、保险或银行理财，还需要指导' },
        { id: 'experience_stock', label: '交易过基金或股票，能独立做一些判断' },
        { id: 'experience_highrisk', label: '接触过期权、期货、融资融券等高风险产品' },
      ],
    },
    {
      key: 'objective',
      q: '**7. 目标场景**\n\n如果这笔钱要承担一个主要任务，哪种描述最接近你的情况？',
      options: [
        { id: 'objective_preserve', label: '短期备用' },
        { id: 'objective_steady', label: '稳健储蓄替代' },
        { id: 'objective_growth', label: '长期增长' },
        { id: 'objective_high', label: '高波动增值' },
      ],
    },
    {
      key: 'style',
      q: '**8. 陪伴方式**\n\n你希望小拾平时怎样回答？对小拾有什么个性化要求？',
      options: [
        { id: 'style_concise', label: '简洁直接：先给结论，再列关键风险' },
        { id: 'style_standard', label: '通俗清楚：解释概念，保留必要数据' },
        { id: 'style_detailed', label: '详细分析：多给数据、区间和来源' },
        { id: 'style_coach', label: '教练模式：发现我冲动时直接提醒' },
      ],
    },
  ];
})();
