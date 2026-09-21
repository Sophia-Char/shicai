'use strict';
// 基金池数据 —— 由 AkShare 批量更新；最大回撤由近一年净值曲线计算。
// 本次更新：净值/收益 497/500 只，最大回撤 500/500 只，数据截至 2026-09-18。
const funds = [
  {
    "code": "006609",
    "name": "申万菱信安泰瑞利中短债A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2219,
    "return1y": 2.58,
    "maxDrawdown": -0.12
  },
  {
    "code": "485119",
    "name": "工银信用纯债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.5876,
    "return1y": 3.4,
    "maxDrawdown": -0.21
  },
  {
    "code": "008204",
    "name": "交银稳利中短债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2361,
    "return1y": 2.34,
    "maxDrawdown": -0.2
  },
  {
    "code": "007419",
    "name": "国寿安保泰弘纯债债券",
    "type": "债券型",
    "risk": "低",
    "price": 1.2437,
    "return1y": 3.08,
    "maxDrawdown": -0.41
  },
  {
    "code": "018444",
    "name": "东财瑞利债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.1166,
    "return1y": 2.71,
    "maxDrawdown": -0.32
  },
  {
    "code": "006869",
    "name": "广发政策性金融债",
    "type": "债券型",
    "risk": "低",
    "price": 1.2362,
    "return1y": 2.9,
    "maxDrawdown": -0.75
  },
  {
    "code": "009655",
    "name": "工银尊益中短债A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2139,
    "return1y": 2.17,
    "maxDrawdown": -0.13
  },
  {
    "code": "011968",
    "name": "农银汇理金盛债券",
    "type": "债券型",
    "risk": "低",
    "price": 1.1899,
    "return1y": 2.91,
    "maxDrawdown": -0.72
  },
  {
    "code": "006758",
    "name": "农银汇理金禄债券",
    "type": "债券型",
    "risk": "低",
    "price": 1.3023,
    "return1y": 2.8,
    "maxDrawdown": -1.13
  },
  {
    "code": "017123",
    "name": "景顺长城景泰臻利纯债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.1275,
    "return1y": 3.72,
    "maxDrawdown": -2.41
  },
  {
    "code": "006210",
    "name": "东方臻宝纯债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 4.8804,
    "return1y": 2.87,
    "maxDrawdown": -0.4
  },
  {
    "code": "010653",
    "name": "农银汇理金玉债券",
    "type": "债券型",
    "risk": "低",
    "price": 1.2068,
    "return1y": 3.02,
    "maxDrawdown": -1.24
  },
  {
    "code": "270048",
    "name": "广发纯债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.7519,
    "return1y": 3.11,
    "maxDrawdown": -1.0
  },
  {
    "code": "010232",
    "name": "国寿安保泰安纯债债券",
    "type": "债券型",
    "risk": "低",
    "price": 1.2012,
    "return1y": 2.69,
    "maxDrawdown": -1.31
  },
  {
    "code": "006212",
    "name": "东方臻选纯债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.4667,
    "return1y": 3.22,
    "maxDrawdown": -0.29
  },
  {
    "code": "007754",
    "name": "上银慧永利中短期债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.1794,
    "return1y": 2.11,
    "maxDrawdown": -0.95
  },
  {
    "code": "007529",
    "name": "嘉实汇鑫中短债A",
    "type": "债券型",
    "risk": "低",
    "price": 1.189,
    "return1y": 2.1,
    "maxDrawdown": -1.95
  },
  {
    "code": "008409",
    "name": "景顺长城景泰裕利纯债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2201,
    "return1y": 2.8,
    "maxDrawdown": -0.85
  },
  {
    "code": "018581",
    "name": "中银纯债债券D",
    "type": "债券型",
    "risk": "低",
    "price": 1.2395,
    "return1y": 3.66,
    "maxDrawdown": -0.6
  },
  {
    "code": "010477",
    "name": "景顺长城景泰益利纯债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2094,
    "return1y": 2.87,
    "maxDrawdown": -2.1
  },
  {
    "code": "003315",
    "name": "景顺长城政策性金融债A",
    "type": "债券型",
    "risk": "低",
    "price": 1.351,
    "return1y": 3.2,
    "maxDrawdown": -0.41
  },
  {
    "code": "007194",
    "name": "长城短债A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2551,
    "return1y": 2.88,
    "maxDrawdown": -0.15
  },
  {
    "code": "008207",
    "name": "国泰合融纯债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2518,
    "return1y": 3.04,
    "maxDrawdown": -0.76
  },
  {
    "code": "023626",
    "name": "南方崇元纯债债券E",
    "type": "债券型",
    "risk": "低",
    "price": 1.2681,
    "return1y": 3.43,
    "maxDrawdown": -1.81
  },
  {
    "code": "004155",
    "name": "中信保诚至泰中短债A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2787,
    "return1y": 2.81,
    "maxDrawdown": -0.14
  },
  {
    "code": "015736",
    "name": "长盛盛裕纯债D",
    "type": "债券型",
    "risk": "低",
    "price": 1.2189,
    "return1y": 3.9,
    "maxDrawdown": -0.98
  },
  {
    "code": "007542",
    "name": "永赢开泰中高等级中短债A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2318,
    "return1y": 2.27,
    "maxDrawdown": -0.1
  },
  {
    "code": "019191",
    "name": "富国纯债债券发起式E",
    "type": "债券型",
    "risk": "低",
    "price": 1.2279,
    "return1y": 2.95,
    "maxDrawdown": -0.81
  },
  {
    "code": "002592",
    "name": "中欧纯债债券(LOF)E",
    "type": "债券型",
    "risk": "低",
    "price": 1.7006,
    "return1y": 2.92,
    "maxDrawdown": -0.26
  },
  {
    "code": "008864",
    "name": "鑫元中短债A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2074,
    "return1y": 1.86,
    "maxDrawdown": -0.08
  },
  {
    "code": "005725",
    "name": "国投瑞银恒泽中短债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2446,
    "return1y": 2.15,
    "maxDrawdown": -0.09
  },
  {
    "code": "006636",
    "name": "华富恒欣纯债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2551,
    "return1y": 4.05,
    "maxDrawdown": -0.4
  },
  {
    "code": "003285",
    "name": "国寿安保安康纯债债券",
    "type": "债券型",
    "risk": "低",
    "price": 1.3827,
    "return1y": 2.59,
    "maxDrawdown": -0.99
  },
  {
    "code": "016318",
    "name": "东方臻裕债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.1448,
    "return1y": 2.63,
    "maxDrawdown": -0.81
  },
  {
    "code": "202108",
    "name": "南方润元纯债债券A/B",
    "type": "债券型",
    "risk": "低",
    "price": 1.693,
    "return1y": 3.05,
    "maxDrawdown": -0.81
  },
  {
    "code": "008693",
    "name": "民生加银39个月定期纯债",
    "type": "债券型",
    "risk": "低",
    "price": 1.1843,
    "return1y": 2.67,
    "maxDrawdown": -1.95
  },
  {
    "code": "000606",
    "name": "天弘优选债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.3711,
    "return1y": 2.54,
    "maxDrawdown": -2.34
  },
  {
    "code": "020377",
    "name": "广发景丰纯债D",
    "type": "债券型",
    "risk": "低",
    "price": 1.2142,
    "return1y": 3.48,
    "maxDrawdown": -0.32
  },
  {
    "code": "016189",
    "name": "国联恒通纯债A",
    "type": "债券型",
    "risk": "低",
    "price": 1.1309,
    "return1y": 2.17,
    "maxDrawdown": -2.04
  },
  {
    "code": "003280",
    "name": "鹏华丰恒债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.3682,
    "return1y": 2.16,
    "maxDrawdown": -0.83
  },
  {
    "code": "007589",
    "name": "嘉实致元42个月定期债券",
    "type": "债券型",
    "risk": "低",
    "price": 1.2257,
    "return1y": 2.34,
    "maxDrawdown": -2.36
  },
  {
    "code": "021695",
    "name": "国寿安保泰宁利率债债券",
    "type": "债券型",
    "risk": "低",
    "price": 1.0654,
    "return1y": 2.87,
    "maxDrawdown": -0.64
  },
  {
    "code": "023031",
    "name": "招商稳嘉120天滚动持有纯债C",
    "type": "债券型",
    "risk": "低",
    "price": 1.0349,
    "return1y": 1.89,
    "maxDrawdown": -0.06
  },
  {
    "code": "000141",
    "name": "富国国有企业债债券C",
    "type": "债券型",
    "risk": "低",
    "price": 1.4676,
    "return1y": 1.69,
    "maxDrawdown": -0.4
  },
  {
    "code": "015439",
    "name": "长盛安逸纯债债券E",
    "type": "债券型",
    "risk": "低",
    "price": 1.306,
    "return1y": 3.46,
    "maxDrawdown": -0.29
  },
  {
    "code": "006966",
    "name": "财通安瑞短债债券C",
    "type": "债券型",
    "risk": "低",
    "price": 1.2308,
    "return1y": 1.69,
    "maxDrawdown": -0.03
  },
  {
    "code": "019491",
    "name": "大成景熙利率债A",
    "type": "债券型",
    "risk": "低",
    "price": 1.0997,
    "return1y": 2.38,
    "maxDrawdown": -0.78
  },
  {
    "code": "000015",
    "name": "华夏纯债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.597,
    "return1y": 2.67,
    "maxDrawdown": -0.3
  },
  {
    "code": "006427",
    "name": "招商添悦纯债A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2814,
    "return1y": 2.34,
    "maxDrawdown": -0.76
  },
  {
    "code": "019646",
    "name": "汇添富稳鑫90天持有债券C",
    "type": "债券型",
    "risk": "低",
    "price": 1.0784,
    "return1y": 1.47,
    "maxDrawdown": -0.04
  },
  {
    "code": "000402",
    "name": "工银纯债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.6212,
    "return1y": 2.94,
    "maxDrawdown": -2.27
  },
  {
    "code": "006626",
    "name": "山证资管超短债A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2603,
    "return1y": 2.1,
    "maxDrawdown": -0.08
  },
  {
    "code": "021105",
    "name": "银华中债0-5年政策性金融债指数",
    "type": "债券型",
    "risk": "低",
    "price": 1.0732,
    "return1y": 2.93,
    "maxDrawdown": -0.89
  },
  {
    "code": "019489",
    "name": "景顺长城景泰通利纯债A",
    "type": "债券型",
    "risk": "低",
    "price": 1.0971,
    "return1y": 3.13,
    "maxDrawdown": -0.73
  },
  {
    "code": "020741",
    "name": "华泰保兴安悦债券C",
    "type": "债券型",
    "risk": "低",
    "price": 1.2582,
    "return1y": 3.84,
    "maxDrawdown": -4.93
  },
  {
    "code": "006596",
    "name": "国泰聚禾纯债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.285,
    "return1y": 3.2,
    "maxDrawdown": -2.64
  },
  {
    "code": "020995",
    "name": "景顺长城景兴信用纯债债券F",
    "type": "债券型",
    "risk": "低",
    "price": 1.2619,
    "return1y": 2.88,
    "maxDrawdown": -0.43
  },
  {
    "code": "005079",
    "name": "兴银鑫日享短债A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2169,
    "return1y": 1.87,
    "maxDrawdown": -1.68
  },
  {
    "code": "004322",
    "name": "创金合信尊隆纯债A",
    "type": "债券型",
    "risk": "低",
    "price": 1.367,
    "return1y": 3.14,
    "maxDrawdown": -1.29
  },
  {
    "code": "006591",
    "name": "广发景明中短债A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2304,
    "return1y": 1.87,
    "maxDrawdown": -0.6
  },
  {
    "code": "000914",
    "name": "中加纯债债券",
    "type": "债券型",
    "risk": "低",
    "price": 1.7203,
    "return1y": 2.49,
    "maxDrawdown": -4.73
  },
  {
    "code": "006134",
    "name": "富国金融债债券型",
    "type": "债券型",
    "risk": "低",
    "price": 1.2877,
    "return1y": 2.67,
    "maxDrawdown": -1.72
  },
  {
    "code": "021131",
    "name": "大成稳康6个月持有期债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.0834,
    "return1y": 4.96,
    "maxDrawdown": -0.19
  },
  {
    "code": "006989",
    "name": "建信中短债纯债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2478,
    "return1y": 2.14,
    "maxDrawdown": -0.14
  },
  {
    "code": "006668",
    "name": "华夏中短债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2539,
    "return1y": 2.26,
    "maxDrawdown": -0.24
  },
  {
    "code": "022155",
    "name": "交银裕隆纯债债券D",
    "type": "债券型",
    "risk": "低",
    "price": 1.4394,
    "return1y": 2.92,
    "maxDrawdown": -3.89
  },
  {
    "code": "007492",
    "name": "上银政策性金融债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2714,
    "return1y": 2.66,
    "maxDrawdown": -2.88
  },
  {
    "code": "003417",
    "name": "中加丰泽纯债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.4191,
    "return1y": 2.82,
    "maxDrawdown": -1.01
  },
  {
    "code": "001578",
    "name": "博时裕瑞纯债债券",
    "type": "债券型",
    "risk": "低",
    "price": 1.4078,
    "return1y": 2.3,
    "maxDrawdown": -0.22
  },
  {
    "code": "021282",
    "name": "上银慧元利90天持有期债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.0742,
    "return1y": 1.96,
    "maxDrawdown": -0.03
  },
  {
    "code": "009463",
    "name": "东方臻慧纯债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2117,
    "return1y": 3.09,
    "maxDrawdown": -2.05
  },
  {
    "code": "018169",
    "name": "嘉实致诚纯债债券",
    "type": "债券型",
    "risk": "低",
    "price": 1.0938,
    "return1y": 2.45,
    "maxDrawdown": -0.54
  },
  {
    "code": "006043",
    "name": "永赢惠益债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.3157,
    "return1y": 3.16,
    "maxDrawdown": -1.69
  },
  {
    "code": "012265",
    "name": "天弘安怡30天滚动持有短债发起C",
    "type": "债券型",
    "risk": "低",
    "price": 1.1387,
    "return1y": 1.61,
    "maxDrawdown": -0.04
  },
  {
    "code": "007949",
    "name": "富国泽利纯债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2187,
    "return1y": 2.92,
    "maxDrawdown": -0.35
  },
  {
    "code": "015476",
    "name": "广发景阳纯债",
    "type": "债券型",
    "risk": "低",
    "price": 1.1272,
    "return1y": 2.74,
    "maxDrawdown": -0.25
  },
  {
    "code": "003156",
    "name": "招商招悦纯债A",
    "type": "债券型",
    "risk": "低",
    "price": 1.4586,
    "return1y": 3.62,
    "maxDrawdown": -0.39
  },
  {
    "code": "002276",
    "name": "中邮纯债恒利债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.594,
    "return1y": 3.49,
    "maxDrawdown": -2.18
  },
  {
    "code": "008242",
    "name": "英大通盈纯债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.1513,
    "return1y": 1.87,
    "maxDrawdown": -0.59
  },
  {
    "code": "022103",
    "name": "交银裕通纯债债券D",
    "type": "债券型",
    "risk": "低",
    "price": 1.1625,
    "return1y": 3.12,
    "maxDrawdown": -4.32
  },
  {
    "code": "006405",
    "name": "华富恒盛纯债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2621,
    "return1y": 3.78,
    "maxDrawdown": -0.36
  },
  {
    "code": "020301",
    "name": "平安惠嘉纯债A",
    "type": "债券型",
    "risk": "低",
    "price": 1.0265,
    "return1y": 0.83,
    "maxDrawdown": -1.04
  },
  {
    "code": "008040",
    "name": "鹏华0-5年利率发起式债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2355,
    "return1y": 2.43,
    "maxDrawdown": -0.85
  },
  {
    "code": "012325",
    "name": "兴全恒惠30天持有超短债C",
    "type": "债券型",
    "risk": "低",
    "price": 1.1381,
    "return1y": 1.51,
    "maxDrawdown": -0.04
  },
  {
    "code": "009625",
    "name": "天弘中债3-5年政策性金融债指数发起A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2275,
    "return1y": 2.37,
    "maxDrawdown": -0.58
  },
  {
    "code": "006542",
    "name": "财通资管鸿利中短债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2515,
    "return1y": 2.03,
    "maxDrawdown": -0.26
  },
  {
    "code": "021445",
    "name": "华安鸿福利率债",
    "type": "债券型",
    "risk": "低",
    "price": 1.0547,
    "return1y": 2.26,
    "maxDrawdown": -1.34
  },
  {
    "code": "007603",
    "name": "景顺长城中短债A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2052,
    "return1y": 2.04,
    "maxDrawdown": -0.17
  },
  {
    "code": "023015",
    "name": "招商招华纯债D",
    "type": "债券型",
    "risk": "低",
    "price": 1.0889,
    "return1y": 3.5,
    "maxDrawdown": -0.65
  },
  {
    "code": "016235",
    "name": "浦银普诚纯债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.1052,
    "return1y": 2.54,
    "maxDrawdown": -1.18
  },
  {
    "code": "006902",
    "name": "长盛安鑫中短债A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2397,
    "return1y": 2.81,
    "maxDrawdown": -0.22
  },
  {
    "code": "004920",
    "name": "富国泓利纯债债券型发起式A",
    "type": "债券型",
    "risk": "低",
    "price": 1.3865,
    "return1y": 2.54,
    "maxDrawdown": -1.39
  },
  {
    "code": "020611",
    "name": "东吴恒益纯债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.0389,
    "return1y": 1.88,
    "maxDrawdown": -0.42
  },
  {
    "code": "003618",
    "name": "招商招旺纯债A",
    "type": "债券型",
    "risk": "低",
    "price": 1.328,
    "return1y": 2.72,
    "maxDrawdown": -0.38
  },
  {
    "code": "012773",
    "name": "嘉实超短债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.1768,
    "return1y": 1.48,
    "maxDrawdown": -0.17
  },
  {
    "code": "006874",
    "name": "创金合信恒兴中短债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2927,
    "return1y": 2.22,
    "maxDrawdown": -0.13
  },
  {
    "code": "008774",
    "name": "招商鑫福中短债A",
    "type": "债券型",
    "risk": "低",
    "price": 1.199,
    "return1y": 1.7,
    "maxDrawdown": -0.05
  },
  {
    "code": "006066",
    "name": "中加颐睿纯债债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2985,
    "return1y": 2.62,
    "maxDrawdown": -0.74
  },
  {
    "code": "003869",
    "name": "长信稳势纯债",
    "type": "债券型",
    "risk": "低",
    "price": 1.6164,
    "return1y": 3.2,
    "maxDrawdown": -2.55
  },
  {
    "code": "007279",
    "name": "永赢众利债券A",
    "type": "债券型",
    "risk": "低",
    "price": 1.2709,
    "return1y": 2.91,
    "maxDrawdown": -3.15
  },
  {
    "code": "023512",
    "name": "景顺长城景颐丰利债券F",
    "type": "债券型",
    "risk": "中低",
    "price": 1.6371,
    "return1y": 11.75,
    "maxDrawdown": -7.82
  },
  {
    "code": "002065",
    "name": "景顺长城景盛双息收益债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.435,
    "return1y": 6.05,
    "maxDrawdown": -3.97
  },
  {
    "code": "400030",
    "name": "东方添益债券",
    "type": "债券型",
    "risk": "中低",
    "price": 1.6799,
    "return1y": 3.82,
    "maxDrawdown": -0.3
  },
  {
    "code": "022226",
    "name": "鹏华双债加利债券D",
    "type": "债券型",
    "risk": "中低",
    "price": 1.3552,
    "return1y": 9.22,
    "maxDrawdown": -6.08
  },
  {
    "code": "004042",
    "name": "华夏鼎茂债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.4917,
    "return1y": 3.7,
    "maxDrawdown": -0.53
  },
  {
    "code": "003949",
    "name": "兴全稳泰债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.4215,
    "return1y": 4.13,
    "maxDrawdown": -0.7
  },
  {
    "code": "002969",
    "name": "易方达丰和债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.7873,
    "return1y": 14.16,
    "maxDrawdown": -7.06
  },
  {
    "code": "004388",
    "name": "鹏华丰享债券",
    "type": "债券型",
    "risk": "中低",
    "price": 1.4799,
    "return1y": 3.04,
    "maxDrawdown": -0.34
  },
  {
    "code": "003504",
    "name": "景顺长城景颐丰利债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.6914,
    "return1y": 11.76,
    "maxDrawdown": -7.82
  },
  {
    "code": "000171",
    "name": "易方达裕丰回报债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 2.5564,
    "return1y": 9.74,
    "maxDrawdown": -6.35
  },
  {
    "code": "000385",
    "name": "景顺长城景颐双利债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 2.176,
    "return1y": 4.19,
    "maxDrawdown": -2.45
  },
  {
    "code": "018595",
    "name": "华商利欣回报债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.2732,
    "return1y": 12.04,
    "maxDrawdown": -4.64
  },
  {
    "code": "001752",
    "name": "华商信用增强债券C",
    "type": "债券型",
    "risk": "中低",
    "price": 1.964,
    "return1y": 14.45,
    "maxDrawdown": -5.27
  },
  {
    "code": "014088",
    "name": "永赢稳健增强债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.2104,
    "return1y": 4.49,
    "maxDrawdown": -4.58
  },
  {
    "code": "202105",
    "name": "南方广利回报债券A/B",
    "type": "债券型",
    "risk": "中低",
    "price": 2.5427,
    "return1y": 19.44,
    "maxDrawdown": -12.85
  },
  {
    "code": "018846",
    "name": "华泰保兴尊睿6个月持有债券发起A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.1637,
    "return1y": 3.6,
    "maxDrawdown": -0.46
  },
  {
    "code": "006985",
    "name": "兴全恒裕债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.2801,
    "return1y": 4.36,
    "maxDrawdown": -1.58
  },
  {
    "code": "021449",
    "name": "鑫元启丰债券",
    "type": "债券型",
    "risk": "中低",
    "price": 1.0644,
    "return1y": 2.52,
    "maxDrawdown": -0.29
  },
  {
    "code": "014846",
    "name": "博时恒乐债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.2469,
    "return1y": 3.57,
    "maxDrawdown": -3.21
  },
  {
    "code": "021883",
    "name": "南方宝元债券E",
    "type": "债券型",
    "risk": "中低",
    "price": 4.3826,
    "return1y": 5.7,
    "maxDrawdown": -3.33
  },
  {
    "code": "008556",
    "name": "易方达裕富债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.2938,
    "return1y": 4.55,
    "maxDrawdown": -2.61
  },
  {
    "code": "001257",
    "name": "兴业收益增强债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.878,
    "return1y": 4.7,
    "maxDrawdown": -3.58
  },
  {
    "code": "110017",
    "name": "易方达增强回报债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 2.691,
    "return1y": 3.77,
    "maxDrawdown": -2.47
  },
  {
    "code": "160718",
    "name": "嘉实多利收益债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.7856,
    "return1y": 12.96,
    "maxDrawdown": -7.97
  },
  {
    "code": "010011",
    "name": "景顺景颐招利6个月持有期债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.4279,
    "return1y": 6.76,
    "maxDrawdown": -3.99
  },
  {
    "code": "002351",
    "name": "易方达裕祥回报债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.941,
    "return1y": 2.19,
    "maxDrawdown": -3.06
  },
  {
    "code": "012465",
    "name": "上银慧嘉利债券",
    "type": "债券型",
    "risk": "中低",
    "price": 1.165,
    "return1y": 2.74,
    "maxDrawdown": -0.3
  },
  {
    "code": "002796",
    "name": "景顺长城景盈双利债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.4797,
    "return1y": 4.0,
    "maxDrawdown": -2.67
  },
  {
    "code": "022229",
    "name": "富国兴利增强债券E",
    "type": "债券型",
    "risk": "中低",
    "price": 1.8454,
    "return1y": 5.74,
    "maxDrawdown": -5.55
  },
  {
    "code": "019344",
    "name": "广发聚源债券(LOF)B",
    "type": "债券型",
    "risk": "中低",
    "price": 1.2846,
    "return1y": 3.01,
    "maxDrawdown": -3.34
  },
  {
    "code": "014775",
    "name": "招商安本增利债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 2.0969,
    "return1y": 5.9,
    "maxDrawdown": -3.72
  },
  {
    "code": "217023",
    "name": "招商信用增强债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.7515,
    "return1y": 3.15,
    "maxDrawdown": -4.05
  },
  {
    "code": "021609",
    "name": "广发中债7-10年国开债指数D",
    "type": "债券型",
    "risk": "中低",
    "price": 1.3845,
    "return1y": 4.3,
    "maxDrawdown": -0.71
  },
  {
    "code": "017592",
    "name": "汇添富添添乐双盈债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.2176,
    "return1y": 3.6,
    "maxDrawdown": -0.98
  },
  {
    "code": "002550",
    "name": "嘉实稳荣债券",
    "type": "债券型",
    "risk": "中低",
    "price": 1.4081,
    "return1y": 2.72,
    "maxDrawdown": -0.83
  },
  {
    "code": "002459",
    "name": "华夏鼎利债券发起式A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.8809,
    "return1y": 7.24,
    "maxDrawdown": -3.46
  },
  {
    "code": "018980",
    "name": "富国优化增强债券E",
    "type": "债券型",
    "risk": "中低",
    "price": 2.2,
    "return1y": 5.57,
    "maxDrawdown": -4.58
  },
  {
    "code": "015716",
    "name": "华夏稳享增利6个月滚动持有债A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.1902,
    "return1y": 1.88,
    "maxDrawdown": -1.27
  },
  {
    "code": "002474",
    "name": "中邮睿信增强债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.67,
    "return1y": 3.3,
    "maxDrawdown": -5.9
  },
  {
    "code": "110027",
    "name": "易方达安心回报债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 3.3987,
    "return1y": 8.03,
    "maxDrawdown": -6.58
  },
  {
    "code": "007562",
    "name": "景顺长城景泰纯利债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.3287,
    "return1y": 3.0,
    "maxDrawdown": -1.48
  },
  {
    "code": "014000",
    "name": "中欧丰利债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.1318,
    "return1y": -0.1,
    "maxDrawdown": -4.34
  },
  {
    "code": "016481",
    "name": "兴全恒信债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.1453,
    "return1y": 3.56,
    "maxDrawdown": -3.16
  },
  {
    "code": "007888",
    "name": "农银金盈债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.2933,
    "return1y": 3.33,
    "maxDrawdown": -1.46
  },
  {
    "code": "013070",
    "name": "华夏彭博政金债1-5年A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.1577,
    "return1y": 2.75,
    "maxDrawdown": -0.26
  },
  {
    "code": "012942",
    "name": "广发添财90天滚动持有债券C",
    "type": "债券型",
    "risk": "中低",
    "price": 1.1427,
    "return1y": 1.7,
    "maxDrawdown": -0.05
  },
  {
    "code": "675111",
    "name": "西部利得汇享债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.5582,
    "return1y": 3.63,
    "maxDrawdown": -0.64
  },
  {
    "code": "001235",
    "name": "中银国有企业债A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.5174,
    "return1y": 3.78,
    "maxDrawdown": -0.73
  },
  {
    "code": "010014",
    "name": "华夏鼎清债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.3068,
    "return1y": 10.24,
    "maxDrawdown": -8.61
  },
  {
    "code": "020218",
    "name": "万家锦利债券发起式A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.1847,
    "return1y": 6.37,
    "maxDrawdown": -5.75
  },
  {
    "code": "023513",
    "name": "银华增强收益债券D",
    "type": "债券型",
    "risk": "中低",
    "price": 1.3454,
    "return1y": 2.92,
    "maxDrawdown": -3.92
  },
  {
    "code": "008726",
    "name": "平安添裕债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.1423,
    "return1y": 2.83,
    "maxDrawdown": -5.6
  },
  {
    "code": "013449",
    "name": "广发景宁债券C",
    "type": "债券型",
    "risk": "中低",
    "price": 1.2537,
    "return1y": 2.93,
    "maxDrawdown": -0.24
  },
  {
    "code": "023813",
    "name": "摩根双债增利债券D",
    "type": "债券型",
    "risk": "中低",
    "price": 1.2251,
    "return1y": 4.61,
    "maxDrawdown": -3.11
  },
  {
    "code": "110008",
    "name": "易方达稳健收益债券B",
    "type": "债券型",
    "risk": "中低",
    "price": 2.6469,
    "return1y": 1.71,
    "maxDrawdown": -4.43
  },
  {
    "code": "023808",
    "name": "交银安心收益债券D",
    "type": "债券型",
    "risk": "中低",
    "price": 1.1414,
    "return1y": 4.84,
    "maxDrawdown": -4.38
  },
  {
    "code": "008999",
    "name": "景顺景颐嘉利6个月持有期债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.3695,
    "return1y": 4.44,
    "maxDrawdown": -2.95
  },
  {
    "code": "012789",
    "name": "汇添富双享回报债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.2046,
    "return1y": 4.82,
    "maxDrawdown": -7.95
  },
  {
    "code": "017024",
    "name": "天弘通享债券发起A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.0635,
    "return1y": 2.44,
    "maxDrawdown": -0.08
  },
  {
    "code": "014087",
    "name": "兴全恒悦180天持有债券C",
    "type": "债券型",
    "risk": "中低",
    "price": 1.1681,
    "return1y": 2.54,
    "maxDrawdown": -0.21
  },
  {
    "code": "007167",
    "name": "华安安和债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.2502,
    "return1y": 3.26,
    "maxDrawdown": -1.1
  },
  {
    "code": "013653",
    "name": "中银上清所0-5年农发行债券指数",
    "type": "债券型",
    "risk": "中低",
    "price": 1.144,
    "return1y": 2.57,
    "maxDrawdown": -0.9
  },
  {
    "code": "003429",
    "name": "中证兴业中高等级信用债指数A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.446,
    "return1y": 2.58,
    "maxDrawdown": -1.15
  },
  {
    "code": "217022",
    "name": "招商产业债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 2.1075,
    "return1y": 1.65,
    "maxDrawdown": -0.1
  },
  {
    "code": "001021",
    "name": "华夏亚债中国指数A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.6975,
    "return1y": 2.91,
    "maxDrawdown": -2.37
  },
  {
    "code": "015893",
    "name": "广发景益债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.143,
    "return1y": 2.85,
    "maxDrawdown": -0.31
  },
  {
    "code": "019603",
    "name": "鹏华精新添利债券C",
    "type": "债券型",
    "risk": "中低",
    "price": 1.2118,
    "return1y": 8.43,
    "maxDrawdown": -4.44
  },
  {
    "code": "016869",
    "name": "景顺长城稳健增益债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.1764,
    "return1y": 2.35,
    "maxDrawdown": -2.76
  },
  {
    "code": "009519",
    "name": "中欧鼎利债券E",
    "type": "债券型",
    "risk": "中低",
    "price": 1.516,
    "return1y": 5.03,
    "maxDrawdown": -6.84
  },
  {
    "code": "004451",
    "name": "汇添富双鑫添利债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.5461,
    "return1y": 1.95,
    "maxDrawdown": -2.79
  },
  {
    "code": "021423",
    "name": "易方达悦丰稳健债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.0961,
    "return1y": 3.7,
    "maxDrawdown": -3.94
  },
  {
    "code": "022612",
    "name": "国泰利添120天滚动持有债券C",
    "type": "债券型",
    "risk": "中低",
    "price": 1.0409,
    "return1y": 2.12,
    "maxDrawdown": -0.06
  },
  {
    "code": "590009",
    "name": "中邮稳定收益债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.745,
    "return1y": 2.48,
    "maxDrawdown": -0.68
  },
  {
    "code": "000189",
    "name": "易方达丰华债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.6807,
    "return1y": 5.31,
    "maxDrawdown": -3.62
  },
  {
    "code": "018736",
    "name": "景顺长城景颐裕利债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.1517,
    "return1y": 4.66,
    "maxDrawdown": -1.84
  },
  {
    "code": "470018",
    "name": "汇添富双利债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 2.3432,
    "return1y": 3.61,
    "maxDrawdown": -3.23
  },
  {
    "code": "005078",
    "name": "富国宝利增强债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.4939,
    "return1y": 4.18,
    "maxDrawdown": -2.26
  },
  {
    "code": "021430",
    "name": "富国投资级信用债债券型E",
    "type": "债券型",
    "risk": "中低",
    "price": 1.1331,
    "return1y": 3.05,
    "maxDrawdown": -0.71
  },
  {
    "code": "630007",
    "name": "华商稳健双利债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 2.383,
    "return1y": 14.7,
    "maxDrawdown": -3.74
  },
  {
    "code": "023392",
    "name": "景顺长城稳健增益债券F",
    "type": "债券型",
    "risk": "中低",
    "price": 1.1753,
    "return1y": 2.32,
    "maxDrawdown": -2.76
  },
  {
    "code": "015931",
    "name": "金鹰恒润债券发起式A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.193,
    "return1y": 4.98,
    "maxDrawdown": -4.98
  },
  {
    "code": "420102",
    "name": "天弘永利债券B",
    "type": "债券型",
    "risk": "中低",
    "price": 2.1058,
    "return1y": 2.06,
    "maxDrawdown": -2.65
  },
  {
    "code": "003547",
    "name": "鹏华丰禄债券",
    "type": "债券型",
    "risk": "中低",
    "price": 1.5001,
    "return1y": 2.74,
    "maxDrawdown": -1.84
  },
  {
    "code": "163806",
    "name": "中银增利债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.9316,
    "return1y": 3.19,
    "maxDrawdown": -0.85
  },
  {
    "code": "001299",
    "name": "兴业添利债券",
    "type": "债券型",
    "risk": "中低",
    "price": 1.4703,
    "return1y": 2.84,
    "maxDrawdown": -0.79
  },
  {
    "code": "006570",
    "name": "中金金元A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.2484,
    "return1y": 2.93,
    "maxDrawdown": -2.41
  },
  {
    "code": "011110",
    "name": "南方晖元6个月持有期债券C",
    "type": "债券型",
    "risk": "中低",
    "price": 1.0261,
    "return1y": 3.34,
    "maxDrawdown": -1.29
  },
  {
    "code": "010068",
    "name": "工银双盈债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.0372,
    "return1y": -4.71,
    "maxDrawdown": -7.08
  },
  {
    "code": "005666",
    "name": "上银慧佳盈债券",
    "type": "债券型",
    "risk": "中低",
    "price": 1.2928,
    "return1y": 3.07,
    "maxDrawdown": -2.22
  },
  {
    "code": "010927",
    "name": "大成元吉增利债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.1542,
    "return1y": 6.13,
    "maxDrawdown": -1.47
  },
  {
    "code": "009529",
    "name": "国联中债1-5年国开行A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.2119,
    "return1y": 2.84,
    "maxDrawdown": -0.23
  },
  {
    "code": "161119",
    "name": "易方达中债新综指发起式(LOF)A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.8051,
    "return1y": 3.31,
    "maxDrawdown": -0.52
  },
  {
    "code": "006961",
    "name": "南方中债7-10年国开行债券指数A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.4491,
    "return1y": 3.93,
    "maxDrawdown": -4.0
  },
  {
    "code": "022261",
    "name": "鹏华丰利债券(LOF)D",
    "type": "债券型",
    "risk": "中低",
    "price": 1.2309,
    "return1y": 3.32,
    "maxDrawdown": -1.09
  },
  {
    "code": "016644",
    "name": "国泰瑞悦3个月持有债券(FOF)",
    "type": "混合型",
    "risk": "中低",
    "price": 1.1339,
    "return1y": 2.88,
    "maxDrawdown": -2.46
  },
  {
    "code": "006839",
    "name": "安信聚利增强债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.3487,
    "return1y": 6.38,
    "maxDrawdown": -2.0
  },
  {
    "code": "003824",
    "name": "天弘信利债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.373,
    "return1y": 2.78,
    "maxDrawdown": -0.78
  },
  {
    "code": "012750",
    "name": "上银慧鼎利债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.1529,
    "return1y": 3.4,
    "maxDrawdown": -2.45
  },
  {
    "code": "003640",
    "name": "兴业裕丰债券A",
    "type": "债券型",
    "risk": "中低",
    "price": 1.3614,
    "return1y": 2.76,
    "maxDrawdown": -0.93
  },
  {
    "code": "018829",
    "name": "兴业嘉远债券",
    "type": "债券型",
    "risk": "中低",
    "price": 1.0969,
    "return1y": 2.41,
    "maxDrawdown": -0.56
  },
  {
    "code": "011803",
    "name": "景顺长城宁景6个月持有混合A",
    "type": "混合型",
    "risk": "中",
    "price": 1.4585,
    "return1y": 11.0,
    "maxDrawdown": -5.51
  },
  {
    "code": "110001",
    "name": "易方达平稳增长混合",
    "type": "混合型",
    "risk": "中",
    "price": 9.596,
    "return1y": 34.8,
    "maxDrawdown": -19.01
  },
  {
    "code": "001194",
    "name": "景顺长城稳健回报混合A",
    "type": "混合型",
    "risk": "中",
    "price": 6.279,
    "return1y": 51.08,
    "maxDrawdown": -35.87
  },
  {
    "code": "014767",
    "name": "景顺长城华城稳健6个月持有期混合A",
    "type": "混合型",
    "risk": "中",
    "price": 1.308,
    "return1y": 4.96,
    "maxDrawdown": -5.33
  },
  {
    "code": "011193",
    "name": "广发恒荣三个月持有期混合C",
    "type": "混合型",
    "risk": "中",
    "price": 1.0404,
    "return1y": 3.68,
    "maxDrawdown": -0.9
  },
  {
    "code": "012951",
    "name": "汇添富鑫享添利六个月持有混合A",
    "type": "混合型",
    "risk": "中",
    "price": 1.1713,
    "return1y": 0.88,
    "maxDrawdown": -1.45
  },
  {
    "code": "001316",
    "name": "安信稳健增值混合A",
    "type": "混合型",
    "risk": "中",
    "price": 1.8783,
    "return1y": 3.33,
    "maxDrawdown": -2.64
  },
  {
    "code": "519732",
    "name": "交银定期支付双息平衡混合",
    "type": "混合型",
    "risk": "中",
    "price": 8.951,
    "return1y": 49.08,
    "maxDrawdown": -27.7
  },
  {
    "code": "010624",
    "name": "富国稳健增长混合A",
    "type": "混合型",
    "risk": "中",
    "price": 0.8415,
    "return1y": 1.01,
    "maxDrawdown": -12.11
  },
  {
    "code": "018610",
    "name": "兴全中证同业存单AAA指数7天持有",
    "type": "债券型",
    "risk": "中",
    "price": 1.0573,
    "return1y": 1.28,
    "maxDrawdown": -0.02
  },
  {
    "code": "015863",
    "name": "华泰柏瑞中证同业存单AAA指数7天持有期",
    "type": "债券型",
    "risk": "中",
    "price": 1.0883,
    "return1y": 1.39,
    "maxDrawdown": -0.02
  },
  {
    "code": "014437",
    "name": "鹏华中证同业存单AAA指数7天持有",
    "type": "债券型",
    "risk": "中",
    "price": 1.1031,
    "return1y": 1.29,
    "maxDrawdown": -0.02
  },
  {
    "code": "015823",
    "name": "银华中证同业存单AAA指数7天持有",
    "type": "债券型",
    "risk": "中",
    "price": 1.0863,
    "return1y": 1.28,
    "maxDrawdown": -0.03
  },
  {
    "code": "519066",
    "name": "汇添富蓝筹稳健混合A",
    "type": "混合型",
    "risk": "中",
    "price": 4.63,
    "return1y": 10.92,
    "maxDrawdown": -26.07
  },
  {
    "code": "014430",
    "name": "南方中证同业存单AAA指数7天持有",
    "type": "债券型",
    "risk": "中",
    "price": 1.0964,
    "return1y": 1.29,
    "maxDrawdown": -0.03
  },
  {
    "code": "270002",
    "name": "广发稳健增长混合A",
    "type": "混合型",
    "risk": "中",
    "price": 4.6596,
    "return1y": 1.04,
    "maxDrawdown": -12.73
  },
  {
    "code": "012887",
    "name": "华夏可转债增强债券C",
    "type": "债券型",
    "risk": "中",
    "price": 1.9324,
    "return1y": 17.19,
    "maxDrawdown": -25.53
  },
  {
    "code": "015826",
    "name": "广发中证同业存单AAA指数7天持有",
    "type": "债券型",
    "risk": "中",
    "price": 1.0846,
    "return1y": 1.31,
    "maxDrawdown": -0.03
  },
  {
    "code": "022156",
    "name": "鹏华可转债债券D",
    "type": "债券型",
    "risk": "中",
    "price": 1.6188,
    "return1y": 8.88,
    "maxDrawdown": -13.57
  },
  {
    "code": "009951",
    "name": "广发稳健回报混合A",
    "type": "混合型",
    "risk": "中",
    "price": 0.9639,
    "return1y": 7.23,
    "maxDrawdown": -8.0
  },
  {
    "code": "015862",
    "name": "景顺长城中证同业存单AAA指数7天持有",
    "type": "债券型",
    "risk": "中",
    "price": 1.088,
    "return1y": 1.27,
    "maxDrawdown": -0.01
  },
  {
    "code": "015822",
    "name": "易方达中证同业存单AAA指数7天持有",
    "type": "债券型",
    "risk": "中",
    "price": 1.0849,
    "return1y": 1.31,
    "maxDrawdown": -0.02
  },
  {
    "code": "005273",
    "name": "华商可转债债券A",
    "type": "债券型",
    "risk": "中",
    "price": 2.5218,
    "return1y": 34.24,
    "maxDrawdown": -17.37
  },
  {
    "code": "040001",
    "name": "华安创新混合",
    "type": "混合型",
    "risk": "中",
    "price": 8.236,
    "return1y": 60.92,
    "maxDrawdown": -33.3
  },
  {
    "code": "016409",
    "name": "永赢中证同业存单AAA指数7天持有",
    "type": "债券型",
    "risk": "中",
    "price": 1.0776,
    "return1y": 1.33,
    "maxDrawdown": -0.02
  },
  {
    "code": "019753",
    "name": "海富通悦享一年持有期混合C",
    "type": "混合型",
    "risk": "中",
    "price": 1.1088,
    "return1y": 2.81,
    "maxDrawdown": -1.41
  },
  {
    "code": "014427",
    "name": "富国中证同业存单AAA指数7天持有",
    "type": "债券型",
    "risk": "中",
    "price": 1.0964,
    "return1y": 1.23,
    "maxDrawdown": -0.02
  },
  {
    "code": "010942",
    "name": "招商瑞乐6个月持有期混合A",
    "type": "混合型",
    "risk": "中",
    "price": 1.1962,
    "return1y": 5.09,
    "maxDrawdown": -2.02
  },
  {
    "code": "015825",
    "name": "国泰中证同业存单AAA指数7天持有",
    "type": "债券型",
    "risk": "中",
    "price": 1.0794,
    "return1y": 1.23,
    "maxDrawdown": -0.01
  },
  {
    "code": "006030",
    "name": "南方昌元可转债债券A",
    "type": "债券型",
    "risk": "中",
    "price": 2.1697,
    "return1y": 17.36,
    "maxDrawdown": -17.63
  },
  {
    "code": "002021",
    "name": "华夏回报二号混合",
    "type": "混合型",
    "risk": "中",
    "price": 3.79,
    "return1y": 5.67,
    "maxDrawdown": -6.23
  },
  {
    "code": "010940",
    "name": "大成安享得利六月持有混合A",
    "type": "混合型",
    "risk": "中",
    "price": 1.1609,
    "return1y": 3.32,
    "maxDrawdown": -0.72
  },
  {
    "code": "005984",
    "name": "兴业聚华混合A",
    "type": "混合型",
    "risk": "中",
    "price": 1.7913,
    "return1y": 8.62,
    "maxDrawdown": -5.19
  },
  {
    "code": "017423",
    "name": "天弘中证同业存单AAA指数7天持有",
    "type": "债券型",
    "risk": "中",
    "price": 1.071,
    "return1y": 1.24,
    "maxDrawdown": -0.02
  },
  {
    "code": "017704",
    "name": "兴业中证同业存单AAA指数7天持有期",
    "type": "债券型",
    "risk": "中",
    "price": 1.0629,
    "return1y": 1.3,
    "maxDrawdown": -0.02
  },
  {
    "code": "010056",
    "name": "平安瑞兴1年持有混合A",
    "type": "混合型",
    "risk": "中",
    "price": 1.4051,
    "return1y": 2.49,
    "maxDrawdown": -2.1
  },
  {
    "code": "000436",
    "name": "易方达裕惠定开混合A",
    "type": "混合型",
    "risk": "中",
    "price": 2.6651,
    "return1y": 3.64,
    "maxDrawdown": -4.26
  },
  {
    "code": "022563",
    "name": "农银中证同业存单AAA指数7天持有",
    "type": "债券型",
    "risk": "中",
    "price": 1.0225,
    "return1y": 1.15,
    "maxDrawdown": -0.02
  },
  {
    "code": "016071",
    "name": "华安智联混合(LOF)C",
    "type": "混合型",
    "risk": "中",
    "price": 2.1514,
    "return1y": 42.0,
    "maxDrawdown": -22.32
  },
  {
    "code": "202001",
    "name": "南方稳健成长混合",
    "type": "混合型",
    "risk": "中",
    "price": 4.6966,
    "return1y": 24.19,
    "maxDrawdown": -24.35
  },
  {
    "code": "010742",
    "name": "南方宁悦一年持有期混合A",
    "type": "混合型",
    "risk": "中",
    "price": 1.2759,
    "return1y": 6.02,
    "maxDrawdown": -1.84
  },
  {
    "code": "010658",
    "name": "海富通欣睿混合C",
    "type": "混合型",
    "risk": "中",
    "price": 1.3601,
    "return1y": 4.74,
    "maxDrawdown": -2.38
  },
  {
    "code": "015646",
    "name": "中金中证同业存单AAA指数7天持有发起",
    "type": "债券型",
    "risk": "中",
    "price": 1.0819,
    "return1y": 1.21,
    "maxDrawdown": -0.02
  },
  {
    "code": "014678",
    "name": "永赢添添悦6个月持有混合A",
    "type": "混合型",
    "risk": "中",
    "price": 1.1468,
    "return1y": 2.2,
    "maxDrawdown": -0.93
  },
  {
    "code": "018914",
    "name": "华夏聚嘉优选三个月持有混合(FOF)A",
    "type": "混合型",
    "risk": "中",
    "price": 1.1194,
    "return1y": -0.54,
    "maxDrawdown": -2.56
  },
  {
    "code": "011034",
    "name": "南方宝恒混合C",
    "type": "混合型",
    "risk": "中",
    "price": 1.2184,
    "return1y": 5.25,
    "maxDrawdown": -2.12
  },
  {
    "code": "015861",
    "name": "嘉实中证同业存单AAA指数7天持有期",
    "type": "债券型",
    "risk": "中",
    "price": 1.0809,
    "return1y": 1.16,
    "maxDrawdown": -0.01
  },
  {
    "code": "016063",
    "name": "华安中证同业存单AAA指数7天持有发起式",
    "type": "债券型",
    "risk": "中",
    "price": 1.0785,
    "return1y": 1.23,
    "maxDrawdown": -0.02
  },
  {
    "code": "008513",
    "name": "南方宝丰混合A",
    "type": "混合型",
    "risk": "中",
    "price": 1.36,
    "return1y": 3.73,
    "maxDrawdown": -3.58
  },
  {
    "code": "340001",
    "name": "兴全可转债混合",
    "type": "混合型",
    "risk": "中",
    "price": 4.2929,
    "return1y": 5.41,
    "maxDrawdown": -18.14
  },
  {
    "code": "013524",
    "name": "富国悦享回报12个月持有期混合A",
    "type": "混合型",
    "risk": "中",
    "price": 1.3112,
    "return1y": 14.1,
    "maxDrawdown": -3.95
  },
  {
    "code": "015960",
    "name": "创金合信中证同业存单AAA指数7天持有",
    "type": "债券型",
    "risk": "中",
    "price": 1.0709,
    "return1y": 1.22,
    "maxDrawdown": -0.03
  },
  {
    "code": "022565",
    "name": "银华华丰三个月持有期混合(FOF)A",
    "type": "混合型",
    "risk": "中",
    "price": 1.0483,
    "return1y": 1.66,
    "maxDrawdown": -1.69
  },
  {
    "code": "012430",
    "name": "农银瑞康6个月持有混合",
    "type": "混合型",
    "risk": "中",
    "price": 1.1899,
    "return1y": 3.28,
    "maxDrawdown": -3.4
  },
  {
    "code": "002052",
    "name": "诺安稳健回报混合C",
    "type": "混合型",
    "risk": "中",
    "price": 2.624,
    "return1y": 30.78,
    "maxDrawdown": -35.93
  },
  {
    "code": "023232",
    "name": "国泰合利6个月持有混合A",
    "type": "混合型",
    "risk": "中",
    "price": 1.081,
    "return1y": 4.03,
    "maxDrawdown": -1.07
  },
  {
    "code": "017422",
    "name": "天弘安康颐睿一年持有混合C",
    "type": "混合型",
    "risk": "中",
    "price": 1.1151,
    "return1y": 1.39,
    "maxDrawdown": -2.12
  },
  {
    "code": "010606",
    "name": "创金合信鑫祥混合C",
    "type": "混合型",
    "risk": "中",
    "price": 1.2262,
    "return1y": -0.28,
    "maxDrawdown": -5.31
  },
  {
    "code": "100026",
    "name": "富国天合稳健优选混合",
    "type": "混合型",
    "risk": "中",
    "price": 4.4469,
    "return1y": 1.91,
    "maxDrawdown": -16.52
  },
  {
    "code": "070003",
    "name": "嘉实稳健混合",
    "type": "混合型",
    "risk": "中",
    "price": 4.4879,
    "return1y": 6.84,
    "maxDrawdown": -8.31
  },
  {
    "code": "003401",
    "name": "工银可转债债券",
    "type": "债券型",
    "risk": "中",
    "price": 1.8656,
    "return1y": 7.38,
    "maxDrawdown": -16.81
  },
  {
    "code": "019665",
    "name": "景顺长城保守养老一年持有混合(FOF)A",
    "type": "混合型",
    "risk": "中",
    "price": 1.0928,
    "return1y": 1.86,
    "maxDrawdown": -1.25
  },
  {
    "code": "160323",
    "name": "华夏磐泰混合(LOF)A",
    "type": "混合型",
    "risk": "中",
    "price": 1.8176,
    "return1y": 3.26,
    "maxDrawdown": -5.05
  },
  {
    "code": "023081",
    "name": "南方致远混合E",
    "type": "混合型",
    "risk": "中",
    "price": 1.5652,
    "return1y": 6.58,
    "maxDrawdown": -2.21
  },
  {
    "code": "003161",
    "name": "南方安泰混合A",
    "type": "混合型",
    "risk": "中",
    "price": 1.6046,
    "return1y": 5.79,
    "maxDrawdown": -3.49
  },
  {
    "code": "024077",
    "name": "南方希元可转债债券D",
    "type": "债券型",
    "risk": "中",
    "price": 1.8579,
    "return1y": 9.31,
    "maxDrawdown": -11.48
  },
  {
    "code": "010439",
    "name": "汇添富稳健汇盈一年持有期混合",
    "type": "混合型",
    "risk": "中",
    "price": 1.0393,
    "return1y": 6.0,
    "maxDrawdown": -2.37
  },
  {
    "code": "023928",
    "name": "中欧可转债债券E",
    "type": "债券型",
    "risk": "中",
    "price": 1.588,
    "return1y": 2.15,
    "maxDrawdown": -9.58
  },
  {
    "code": "006880",
    "name": "交银安享稳健养老一年(FOF)A",
    "type": "混合型",
    "risk": "中",
    "price": 1.2806,
    "return1y": 1.59,
    "maxDrawdown": -3.33
  },
  {
    "code": "015955",
    "name": "万家中证同业存单AAA指数7天持有",
    "type": "债券型",
    "risk": "中",
    "price": 1.0839,
    "return1y": 1.2,
    "maxDrawdown": -0.02
  },
  {
    "code": "011096",
    "name": "博时恒泽混合C",
    "type": "混合型",
    "risk": "中",
    "price": 1.1801,
    "return1y": 2.63,
    "maxDrawdown": -3.64
  },
  {
    "code": "009121",
    "name": "广发招享混合A",
    "type": "混合型",
    "risk": "中",
    "price": 1.4175,
    "return1y": -1.82,
    "maxDrawdown": -4.03
  },
  {
    "code": "015421",
    "name": "南方浩鑫稳健优选6个月持有混合(FOF)A",
    "type": "混合型",
    "risk": "中",
    "price": 1.0726,
    "return1y": 1.54,
    "maxDrawdown": -0.69
  },
  {
    "code": "010870",
    "name": "汇添富稳健鑫添益六个月持有混合A",
    "type": "混合型",
    "risk": "中",
    "price": 1.1955,
    "return1y": 4.2,
    "maxDrawdown": -1.24
  },
  {
    "code": "023006",
    "name": "易方达汇享保守养老一年持有混合(FOF)A",
    "type": "混合型",
    "risk": "中",
    "price": 1.0577,
    "return1y": 2.3,
    "maxDrawdown": -1.89
  },
  {
    "code": "013360",
    "name": "华夏磐泰混合C",
    "type": "混合型",
    "risk": "中",
    "price": 1.812,
    "return1y": 3.16,
    "maxDrawdown": -5.07
  },
  {
    "code": "020358",
    "name": "东方红慧鑫甄选6个月持有混合A",
    "type": "混合型",
    "risk": "中",
    "price": 1.1375,
    "return1y": 4.47,
    "maxDrawdown": -2.2
  },
  {
    "code": "010379",
    "name": "广发均衡优选混合A",
    "type": "混合型",
    "risk": "中",
    "price": 1.016,
    "return1y": 8.84,
    "maxDrawdown": -13.34
  },
  {
    "code": "018636",
    "name": "嘉实稳健增利6个月持有混合C",
    "type": "混合型",
    "risk": "中",
    "price": 1.1656,
    "return1y": 5.46,
    "maxDrawdown": -2.53
  },
  {
    "code": "008809",
    "name": "安信民稳增长混合A",
    "type": "混合型",
    "risk": "中",
    "price": 1.7287,
    "return1y": 4.99,
    "maxDrawdown": -6.68
  },
  {
    "code": "011762",
    "name": "平安鑫瑞混合C",
    "type": "混合型",
    "risk": "中",
    "price": 1.1052,
    "return1y": 2.99,
    "maxDrawdown": -0.91
  },
  {
    "code": "010515",
    "name": "富国天兴回报混合A",
    "type": "混合型",
    "risk": "中",
    "price": 1.2155,
    "return1y": 0.61,
    "maxDrawdown": -7.68
  },
  {
    "code": "010807",
    "name": "融通稳信增益6个月持有期混合A",
    "type": "混合型",
    "risk": "中",
    "price": 1.7406,
    "return1y": 33.44,
    "maxDrawdown": -17.73
  },
  {
    "code": "011250",
    "name": "嘉实稳裕混合C",
    "type": "混合型",
    "risk": "中",
    "price": 1.1857,
    "return1y": 2.9,
    "maxDrawdown": -0.9
  },
  {
    "code": "004279",
    "name": "国寿安保稳荣混合A",
    "type": "混合型",
    "risk": "中",
    "price": 1.7378,
    "return1y": 8.96,
    "maxDrawdown": -2.88
  },
  {
    "code": "202002",
    "name": "南方稳健成长贰号混合",
    "type": "混合型",
    "risk": "中",
    "price": 3.2593,
    "return1y": 24.24,
    "maxDrawdown": -24.15
  },
  {
    "code": "013770",
    "name": "博时稳益9个月持有混合C",
    "type": "混合型",
    "risk": "中",
    "price": 1.2155,
    "return1y": 2.79,
    "maxDrawdown": -3.64
  },
  {
    "code": "021849",
    "name": "财通资管中证同业存单AAA指数7天持有期",
    "type": "债券型",
    "risk": "中",
    "price": 1.0214,
    "return1y": 1.07,
    "maxDrawdown": -0.01
  },
  {
    "code": "015944",
    "name": "中银中证同业存单AAA指数7天持有期",
    "type": "债券型",
    "risk": "中",
    "price": 1.0784,
    "return1y": 1.28,
    "maxDrawdown": -0.04
  },
  {
    "code": "001356",
    "name": "广发聚泰混合C",
    "type": "混合型",
    "risk": "中",
    "price": 1.4548,
    "return1y": 2.07,
    "maxDrawdown": -0.74
  },
  {
    "code": "009812",
    "name": "易方达悦兴一年持有期混合A",
    "type": "混合型",
    "risk": "中",
    "price": 1.3227,
    "return1y": 19.79,
    "maxDrawdown": -10.23
  },
  {
    "code": "019698",
    "name": "招商安泽稳利9个月持有期混合A",
    "type": "混合型",
    "risk": "中",
    "price": 1.2333,
    "return1y": 3.1,
    "maxDrawdown": -4.65
  },
  {
    "code": "010923",
    "name": "永赢鑫欣混合A",
    "type": "混合型",
    "risk": "中",
    "price": 1.2388,
    "return1y": 4.36,
    "maxDrawdown": -3.08
  },
  {
    "code": "017589",
    "name": "中泰天择稳健6个月持有混合(FOF)A",
    "type": "混合型",
    "risk": "中",
    "price": 1.2012,
    "return1y": 3.32,
    "maxDrawdown": -6.5
  },
  {
    "code": "012654",
    "name": "兴全优选平衡三个月持有混合(FOF)A",
    "type": "混合型",
    "risk": "中",
    "price": 1.1517,
    "return1y": 1.86,
    "maxDrawdown": -5.42
  },
  {
    "code": "005975",
    "name": "东方红配置精选混合C",
    "type": "混合型",
    "risk": "中",
    "price": 1.5654,
    "return1y": -2.1,
    "maxDrawdown": -4.94
  },
  {
    "code": "001182",
    "name": "易方达安心回馈混合A",
    "type": "混合型",
    "risk": "中",
    "price": 2.9002,
    "return1y": 13.07,
    "maxDrawdown": -6.04
  },
  {
    "code": "007872",
    "name": "金信稳健策略混合A",
    "type": "混合型",
    "risk": "中",
    "price": 3.7315,
    "return1y": 82.17,
    "maxDrawdown": -42.57
  },
  {
    "code": "090003",
    "name": "大成蓝筹稳健混合A",
    "type": "混合型",
    "risk": "中",
    "price": 3.9285,
    "return1y": 17.99,
    "maxDrawdown": -18.26
  },
  {
    "code": "320001",
    "name": "诺安平衡混合A",
    "type": "混合型",
    "risk": "中",
    "price": 4.1594,
    "return1y": 18.42,
    "maxDrawdown": -30.59
  },
  {
    "code": "013841",
    "name": "银华集成电路混合C",
    "type": "混合型",
    "risk": "中高",
    "price": 3.1662,
    "return1y": 143.42,
    "maxDrawdown": -32.15
  },
  {
    "code": "022365",
    "name": "永赢科技智选混合发起C",
    "type": "混合型",
    "risk": "中高",
    "price": 5.433,
    "return1y": 64.1,
    "maxDrawdown": -29.18
  },
  {
    "code": "002910",
    "name": "易方达供给改革混合",
    "type": "混合型",
    "risk": "中高",
    "price": 8.1136,
    "return1y": 158.66,
    "maxDrawdown": -16.25
  },
  {
    "code": "011452",
    "name": "华泰柏瑞质量成长C",
    "type": "混合型",
    "risk": "中高",
    "price": 3.1174,
    "return1y": 97.57,
    "maxDrawdown": -47.35
  },
  {
    "code": "011370",
    "name": "华商均衡成长混合C",
    "type": "混合型",
    "risk": "中高",
    "price": 3.7585,
    "return1y": 123.55,
    "maxDrawdown": -42.31
  },
  {
    "code": "008989",
    "name": "大成科技创新混合C",
    "type": "混合型",
    "risk": "中高",
    "price": 4.497,
    "return1y": 66.8,
    "maxDrawdown": -41.96
  },
  {
    "code": "002692",
    "name": "富国创新科技混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 4.756,
    "return1y": 84.27,
    "maxDrawdown": -46.45
  },
  {
    "code": "163406",
    "name": "兴全合润混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 8.7192,
    "return1y": 12.57,
    "maxDrawdown": -25.02
  },
  {
    "code": "018957",
    "name": "中航机遇领航混合发起C",
    "type": "混合型",
    "risk": "中高",
    "price": 4.6642,
    "return1y": 48.35,
    "maxDrawdown": -41.43
  },
  {
    "code": "016371",
    "name": "信澳业绩驱动混合C",
    "type": "混合型",
    "risk": "中高",
    "price": 2.9885,
    "return1y": 91.07,
    "maxDrawdown": -47.95
  },
  {
    "code": "110029",
    "name": "易方达科讯混合",
    "type": "混合型",
    "risk": "中高",
    "price": 15.9794,
    "return1y": 57.62,
    "maxDrawdown": -24.17
  },
  {
    "code": "000390",
    "name": "华商优势行业混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 5.81,
    "return1y": 82.51,
    "maxDrawdown": -41.89
  },
  {
    "code": "006533",
    "name": "易方达科融混合",
    "type": "混合型",
    "risk": "中高",
    "price": 8.6261,
    "return1y": 53.5,
    "maxDrawdown": -26.56
  },
  {
    "code": "001184",
    "name": "易方达新常态混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 2.1268,
    "return1y": 105.29,
    "maxDrawdown": -32.79
  },
  {
    "code": "161005",
    "name": "富国天惠成长混合(LOF)A",
    "type": "混合型",
    "risk": "中高",
    "price": 6.0757,
    "return1y": 7.67,
    "maxDrawdown": -12.13
  },
  {
    "code": "163415",
    "name": "兴全商业模式混合(LOF)A",
    "type": "混合型",
    "risk": "中高",
    "price": 5.904,
    "return1y": 9.68,
    "maxDrawdown": -22.55
  },
  {
    "code": "163402",
    "name": "兴全趋势投资混合(LOF)",
    "type": "混合型",
    "risk": "中高",
    "price": 11.3077,
    "return1y": 26.66,
    "maxDrawdown": -17.75
  },
  {
    "code": "001513",
    "name": "易方达信息产业混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 8.351,
    "return1y": 65.46,
    "maxDrawdown": -34.3
  },
  {
    "code": "017102",
    "name": "大摩数字经济混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 4.0439,
    "return1y": 75.98,
    "maxDrawdown": -38.84
  },
  {
    "code": "320007",
    "name": "诺安成长混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 2.955,
    "return1y": 40.46,
    "maxDrawdown": -22.4
  },
  {
    "code": "002943",
    "name": "广发多因子混合",
    "type": "混合型",
    "risk": "中高",
    "price": 5.3016,
    "return1y": 9.84,
    "maxDrawdown": -13.91
  },
  {
    "code": "110003",
    "name": "易方达上证50增强A",
    "type": "宽基指数",
    "risk": "中高",
    "price": 4.314,
    "return1y": 11.17,
    "maxDrawdown": -12.34
  },
  {
    "code": "519674",
    "name": "银河创新成长混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 12.3519,
    "return1y": 35.13,
    "maxDrawdown": -32.05
  },
  {
    "code": "023452",
    "name": "中欧信息科技混合发起C",
    "type": "混合型",
    "risk": "中高",
    "price": 2.7701,
    "return1y": 46.09,
    "maxDrawdown": -39.97
  },
  {
    "code": "377240",
    "name": "摩根新兴动力混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 10.7979,
    "return1y": 26.56,
    "maxDrawdown": -28.95
  },
  {
    "code": "002112",
    "name": "德邦鑫星价值灵活配置混合C",
    "type": "混合型",
    "risk": "中高",
    "price": 5.5441,
    "return1y": 61.43,
    "maxDrawdown": -45.8
  },
  {
    "code": "010198",
    "name": "易方达竞争优势企业混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 0.9044,
    "return1y": 54.52,
    "maxDrawdown": -21.7
  },
  {
    "code": "005827",
    "name": "易方达蓝筹精选混合",
    "type": "混合型",
    "risk": "中高",
    "price": 1.4865,
    "return1y": -27.21,
    "maxDrawdown": -28.8
  },
  {
    "code": "110020",
    "name": "易方达沪深300ETF联接A",
    "type": "宽基指数",
    "risk": "中高",
    "price": 1.8508,
    "return1y": 2.85,
    "maxDrawdown": -10.39
  },
  {
    "code": "003095",
    "name": "中欧医疗健康混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 2.2025,
    "return1y": -5.53,
    "maxDrawdown": -28.69
  },
  {
    "code": "003567",
    "name": "华夏行业景气混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 6.3738,
    "return1y": 33.23,
    "maxDrawdown": -26.37
  },
  {
    "code": "163417",
    "name": "兴全合宜混合(LOF)A",
    "type": "混合型",
    "risk": "中高",
    "price": 2.0603,
    "return1y": 2.47,
    "maxDrawdown": -15.73
  },
  {
    "code": "009049",
    "name": "易方达高端制造混合发起式A",
    "type": "混合型",
    "risk": "中高",
    "price": 4.1009,
    "return1y": 58.48,
    "maxDrawdown": -27.47
  },
  {
    "code": "011609",
    "name": "易方达上证科创50联接C",
    "type": "行业主题",
    "risk": "中高",
    "price": 1.2725,
    "return1y": 20.47,
    "maxDrawdown": -29.06
  },
  {
    "code": "000051",
    "name": "华夏沪深300ETF联接A",
    "type": "宽基指数",
    "risk": "中高",
    "price": 1.7269,
    "return1y": 2.57,
    "maxDrawdown": -10.48
  },
  {
    "code": "016874",
    "name": "广发远见智选混合C",
    "type": "混合型",
    "risk": "中高",
    "price": 1.7075,
    "return1y": 81.09,
    "maxDrawdown": -47.53
  },
  {
    "code": "001437",
    "name": "易方达瑞享混合I",
    "type": "混合型",
    "risk": "中高",
    "price": 12.5554,
    "return1y": 105.02,
    "maxDrawdown": -40.25
  },
  {
    "code": "007355",
    "name": "汇添富科技创新混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 4.7618,
    "return1y": 32.57,
    "maxDrawdown": -31.7
  },
  {
    "code": "001856",
    "name": "易方达环保主题混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 7.674,
    "return1y": 74.61,
    "maxDrawdown": -27.3
  },
  {
    "code": "007491",
    "name": "南方信息创新混合C",
    "type": "混合型",
    "risk": "中高",
    "price": 4.9229,
    "return1y": 125.86,
    "maxDrawdown": -35.31
  },
  {
    "code": "004320",
    "name": "前海开源沪港深乐享生活",
    "type": "混合型",
    "risk": "中高",
    "price": 6.9933,
    "return1y": 157.3,
    "maxDrawdown": -43.09
  },
  {
    "code": "260108",
    "name": "景顺长城新兴成长混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 3.314,
    "return1y": -17.2,
    "maxDrawdown": -23.18
  },
  {
    "code": "166002",
    "name": "中欧新蓝筹混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 4.8704,
    "return1y": 19.84,
    "maxDrawdown": -17.5
  },
  {
    "code": "018816",
    "name": "方正富邦核心优势混合C",
    "type": "混合型",
    "risk": "中高",
    "price": 2.0237,
    "return1y": 94.14,
    "maxDrawdown": -48.64
  },
  {
    "code": "007343",
    "name": "嘉实科技创新混合",
    "type": "混合型",
    "risk": "中高",
    "price": 5.6878,
    "return1y": 70.59,
    "maxDrawdown": -31.82
  },
  {
    "code": "011399",
    "name": "汇添富数字未来混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 1.525,
    "return1y": 57.14,
    "maxDrawdown": -38.25
  },
  {
    "code": "002010",
    "name": "中欧瑾通灵活配置混合C",
    "type": "混合型",
    "risk": "中高",
    "price": 1.6496,
    "return1y": 2.06,
    "maxDrawdown": -3.26
  },
  {
    "code": "002207",
    "name": "前海开源金银珠宝混合C",
    "type": "混合型",
    "risk": "中高",
    "price": 2.822,
    "return1y": 32.8,
    "maxDrawdown": -44.92
  },
  {
    "code": "110005",
    "name": "易方达积极成长混合",
    "type": "混合型",
    "risk": "中高",
    "price": 8.1129,
    "return1y": 118.4,
    "maxDrawdown": -26.39
  },
  {
    "code": "006113",
    "name": "汇添富创新医药混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 1.6402,
    "return1y": -20.76,
    "maxDrawdown": -33.49
  },
  {
    "code": "009707",
    "name": "工银新兴制造混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 4.9104,
    "return1y": 79.45,
    "maxDrawdown": -33.57
  },
  {
    "code": "011892",
    "name": "易方达先锋成长混合C",
    "type": "混合型",
    "risk": "中高",
    "price": 4.1501,
    "return1y": 106.49,
    "maxDrawdown": -41.8
  },
  {
    "code": "004011",
    "name": "华泰柏瑞鼎利灵活配置混合C",
    "type": "混合型",
    "risk": "中高",
    "price": 1.8658,
    "return1y": 2.46,
    "maxDrawdown": -2.92
  },
  {
    "code": "010115",
    "name": "易方达远见成长混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 3.8247,
    "return1y": 105.21,
    "maxDrawdown": -41.79
  },
  {
    "code": "519069",
    "name": "汇添富价值精选混合",
    "type": "混合型",
    "risk": "中高",
    "price": 4.919,
    "return1y": 9.15,
    "maxDrawdown": -11.96
  },
  {
    "code": "257070",
    "name": "国联安优选行业混合",
    "type": "混合型",
    "risk": "中高",
    "price": 6.8892,
    "return1y": 73.01,
    "maxDrawdown": -44.51
  },
  {
    "code": "015790",
    "name": "永赢高端装备智选混合发起C",
    "type": "混合型",
    "risk": "中高",
    "price": 1.0416,
    "return1y": 16.81,
    "maxDrawdown": -45.62
  },
  {
    "code": "004814",
    "name": "中欧红利优享混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 2.4451,
    "return1y": 2.39,
    "maxDrawdown": -24.75
  },
  {
    "code": "018125",
    "name": "永赢先进制造智选混合发起C",
    "type": "混合型",
    "risk": "中高",
    "price": 1.8756,
    "return1y": -26.34,
    "maxDrawdown": -41.59
  },
  {
    "code": "008903",
    "name": "广发科技先锋混合",
    "type": "混合型",
    "risk": "中高",
    "price": 1.1995,
    "return1y": 12.94,
    "maxDrawdown": -35.49
  },
  {
    "code": "002001",
    "name": "华夏回报混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 5.015,
    "return1y": 5.04,
    "maxDrawdown": -6.16
  },
  {
    "code": "001475",
    "name": "易方达国防军工混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 2.363,
    "return1y": 58.27,
    "maxDrawdown": -18.0
  },
  {
    "code": "720001",
    "name": "财通价值动量混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 15.805,
    "return1y": 112.12,
    "maxDrawdown": -36.38
  },
  {
    "code": "008555",
    "name": "华商龙头优势混合",
    "type": "混合型",
    "risk": "中高",
    "price": 2.6603,
    "return1y": 83.48,
    "maxDrawdown": -43.01
  },
  {
    "code": "160119",
    "name": "南方中证500ETF联接(LOF)A",
    "type": "宽基指数",
    "risk": "中高",
    "price": 2.3204,
    "return1y": 10.08,
    "maxDrawdown": -17.76
  },
  {
    "code": "160706",
    "name": "嘉实沪深300ETF联接A",
    "type": "宽基指数",
    "risk": "中高",
    "price": 3.3407,
    "return1y": 2.57,
    "maxDrawdown": -10.29
  },
  {
    "code": "000021",
    "name": "华夏优势增长混合",
    "type": "混合型",
    "risk": "中高",
    "price": 4.947,
    "return1y": 22.43,
    "maxDrawdown": -27.75
  },
  {
    "code": "003693",
    "name": "大成景尚灵活配置混合C",
    "type": "混合型",
    "risk": "中高",
    "price": 1.54,
    "return1y": 4.13,
    "maxDrawdown": -1.03
  },
  {
    "code": "019085",
    "name": "工银价值精选混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 0.8904,
    "return1y": -24.3,
    "maxDrawdown": -29.96
  },
  {
    "code": "007466",
    "name": "华泰柏瑞中证红利低波ETF联接A",
    "type": "宽基指数",
    "risk": "中高",
    "price": 1.9633,
    "return1y": 2.68,
    "maxDrawdown": -14.82
  },
  {
    "code": "180012",
    "name": "银华富裕主题混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 5.3218,
    "return1y": 4.28,
    "maxDrawdown": -19.76
  },
  {
    "code": "019432",
    "name": "永赢睿信混合C",
    "type": "混合型",
    "risk": "中高",
    "price": 2.1105,
    "return1y": 6.93,
    "maxDrawdown": -22.17
  },
  {
    "code": "481001",
    "name": "工银核心价值混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 6.0552,
    "return1y": 49.19,
    "maxDrawdown": -30.31
  },
  {
    "code": "018123",
    "name": "永赢数字经济智选混合发起C",
    "type": "混合型",
    "risk": "中高",
    "price": 1.8855,
    "return1y": 21.47,
    "maxDrawdown": -40.75
  },
  {
    "code": "161903",
    "name": "万家行业优选混合(LOF)",
    "type": "混合型",
    "risk": "中高",
    "price": 5.6409,
    "return1y": 17.8,
    "maxDrawdown": -20.26
  },
  {
    "code": "110026",
    "name": "易方达创业板ETF联接A",
    "type": "宽基指数",
    "risk": "中高",
    "price": 3.4686,
    "return1y": 10.14,
    "maxDrawdown": -24.31
  },
  {
    "code": "022368",
    "name": "永赢睿恒混合C",
    "type": "混合型",
    "risk": "中高",
    "price": 2.7739,
    "return1y": 48.32,
    "maxDrawdown": -30.05
  },
  {
    "code": "001480",
    "name": "财通成长优选混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 7.933,
    "return1y": 124.29,
    "maxDrawdown": -41.07
  },
  {
    "code": "000083",
    "name": "汇添富消费行业混合",
    "type": "混合型",
    "risk": "中高",
    "price": 4.447,
    "return1y": -15.81,
    "maxDrawdown": -23.04
  },
  {
    "code": "110009",
    "name": "易方达价值精选混合",
    "type": "混合型",
    "risk": "中高",
    "price": 4.4688,
    "return1y": 18.7,
    "maxDrawdown": -17.76
  },
  {
    "code": "162703",
    "name": "广发小盘成长混合(LOF)A",
    "type": "混合型",
    "risk": "中高",
    "price": 5.8327,
    "return1y": 46.48,
    "maxDrawdown": -32.85
  },
  {
    "code": "162201",
    "name": "宏利成长混合",
    "type": "混合型",
    "risk": "中高",
    "price": 9.4956,
    "return1y": 92.73,
    "maxDrawdown": -39.31
  },
  {
    "code": "018824",
    "name": "国金智享量化选股混合C",
    "type": "混合型",
    "risk": "中高",
    "price": 1.4921,
    "return1y": 14.44,
    "maxDrawdown": -21.74
  },
  {
    "code": "006551",
    "name": "中庚价值领航混合",
    "type": "混合型",
    "risk": "中高",
    "price": 3.7054,
    "return1y": 16.21,
    "maxDrawdown": -11.98
  },
  {
    "code": "002190",
    "name": "农银新能源主题A",
    "type": "混合型",
    "risk": "中高",
    "price": 2.5376,
    "return1y": -8.17,
    "maxDrawdown": -26.55
  },
  {
    "code": "014287",
    "name": "泰康新锐成长混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 1.7231,
    "return1y": 27.29,
    "maxDrawdown": -14.99
  },
  {
    "code": "501054",
    "name": "东方红睿泽三年持有混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 1.9407,
    "return1y": 25.96,
    "maxDrawdown": -19.13
  },
  {
    "code": "002170",
    "name": "东吴移动互联混合C",
    "type": "混合型",
    "risk": "中高",
    "price": 6.502,
    "return1y": 13.58,
    "maxDrawdown": -32.62
  },
  {
    "code": "519771",
    "name": "交银优择回报灵活配置混合C",
    "type": "混合型",
    "risk": "中高",
    "price": 6.0981,
    "return1y": 92.32,
    "maxDrawdown": -29.33
  },
  {
    "code": "018993",
    "name": "中欧数字经济混合发起A",
    "type": "混合型",
    "risk": "中高",
    "price": 3.7465,
    "return1y": 27.06,
    "maxDrawdown": -35.92
  },
  {
    "code": "400015",
    "name": "东方新能源汽车混合",
    "type": "混合型",
    "risk": "中高",
    "price": 2.9309,
    "return1y": -10.29,
    "maxDrawdown": -35.56
  },
  {
    "code": "005875",
    "name": "易方达中盘成长混合",
    "type": "混合型",
    "risk": "中高",
    "price": 3.7404,
    "return1y": 77.23,
    "maxDrawdown": -32.0
  },
  {
    "code": "001123",
    "name": "鹏华弘利混合C",
    "type": "混合型",
    "risk": "中高",
    "price": 1.9259,
    "return1y": 7.71,
    "maxDrawdown": -2.5
  },
  {
    "code": "162605",
    "name": "景顺长城鼎益混合(LOF)A",
    "type": "混合型",
    "risk": "中高",
    "price": 4.563,
    "return1y": -15.52,
    "maxDrawdown": -30.01
  },
  {
    "code": "180031",
    "name": "银华中小盘混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 8.417,
    "return1y": 71.06,
    "maxDrawdown": -42.45
  },
  {
    "code": "009548",
    "name": "汇添富中盘价值精选混合A",
    "type": "混合型",
    "risk": "中高",
    "price": 0.9049,
    "return1y": 6.57,
    "maxDrawdown": -16.82
  },
  {
    "code": "110013",
    "name": "易方达科翔混合",
    "type": "混合型",
    "risk": "中高",
    "price": 16.755,
    "return1y": 42.44,
    "maxDrawdown": -20.6
  },
  {
    "code": "007639",
    "name": "汇添富竞争优势灵活配置混合",
    "type": "混合型",
    "risk": "中高",
    "price": 2.5387,
    "return1y": 101.04,
    "maxDrawdown": -33.41
  },
  {
    "code": "100032",
    "name": "富国中证红利指数增强A",
    "type": "宽基指数",
    "risk": "中高",
    "price": 3.269,
    "return1y": 1.88,
    "maxDrawdown": -16.37
  },
  {
    "code": "166301",
    "name": "华商新趋势优选灵活配置混合",
    "type": "混合型",
    "risk": "中高",
    "price": 15.87,
    "return1y": 23.55,
    "maxDrawdown": -34.12
  },
  {
    "code": "270023",
    "name": "广发全球精选股票(QDII)人民币A",
    "type": "QDII",
    "risk": "高",
    "price": 6.6485,
    "return1y": 37.08,
    "maxDrawdown": -25.63
  },
  {
    "code": "022184",
    "name": "富国全球科技互联网股票(QDII)C",
    "type": "QDII",
    "risk": "高",
    "price": 4.936,
    "return1y": 35.1,
    "maxDrawdown": -26.9
  },
  {
    "code": "001048",
    "name": "富国新兴产业股票A",
    "type": "股票型",
    "risk": "高",
    "price": 6.1714,
    "return1y": 66.3,
    "maxDrawdown": -32.66
  },
  {
    "code": "017470",
    "name": "嘉实上证科创板芯片ETF发起联接C",
    "type": "行业主题",
    "risk": "高",
    "price": 2.8785,
    "return1y": 51.72,
    "maxDrawdown": -34.46
  },
  {
    "code": "002611",
    "name": "博时黄金ETF联接C",
    "type": "宽基指数",
    "risk": "高",
    "price": 2.9669,
    "return1y": 13.22,
    "maxDrawdown": -29.84
  },
  {
    "code": "002963",
    "name": "易方达黄金ETF联接C",
    "type": "宽基指数",
    "risk": "高",
    "price": 3.0059,
    "return1y": 13.54,
    "maxDrawdown": -30.09
  },
  {
    "code": "004253",
    "name": "国泰黄金ETF联接C",
    "type": "宽基指数",
    "risk": "高",
    "price": 3.3339,
    "return1y": 13.78,
    "maxDrawdown": -29.9
  },
  {
    "code": "010391",
    "name": "易方达战略新兴产业股票A",
    "type": "股票型",
    "risk": "高",
    "price": 2.7587,
    "return1y": 76.36,
    "maxDrawdown": -28.61
  },
  {
    "code": "014855",
    "name": "嘉实中证半导体指数增强发起式C",
    "type": "行业主题",
    "risk": "高",
    "price": 3.3145,
    "return1y": 88.22,
    "maxDrawdown": -33.67
  },
  {
    "code": "008888",
    "name": "华夏国证半导体芯片ETF联接C",
    "type": "行业主题",
    "risk": "高",
    "price": 1.9676,
    "return1y": 31.35,
    "maxDrawdown": -36.78
  },
  {
    "code": "011983",
    "name": "永赢中债3-5年政金债指数A",
    "type": "债券型",
    "risk": "高",
    "price": 1.2092,
    "return1y": 3.19,
    "maxDrawdown": -1.01
  },
  {
    "code": "270042",
    "name": "广发纳斯达克100ETF联接人民币(QDII)A",
    "type": "QDII",
    "risk": "高",
    "price": 8.3641,
    "return1y": 16.61,
    "maxDrawdown": -14.26
  },
  {
    "code": "000979",
    "name": "景顺长城沪港深精选股票A",
    "type": "股票型",
    "risk": "高",
    "price": 4.959,
    "return1y": 39.73,
    "maxDrawdown": -35.8
  },
  {
    "code": "020640",
    "name": "广发半导体设备ETF联接C",
    "type": "行业主题",
    "risk": "高",
    "price": 3.3308,
    "return1y": 109.51,
    "maxDrawdown": -36.41
  },
  {
    "code": "001938",
    "name": "中欧时代先锋股票A",
    "type": "股票型",
    "risk": "高",
    "price": 3.4107,
    "return1y": 19.78,
    "maxDrawdown": -12.48
  },
  {
    "code": "012039",
    "name": "中加1-5年国开债指数",
    "type": "债券型",
    "risk": "高",
    "price": 1.1582,
    "return1y": 2.49,
    "maxDrawdown": -0.87
  },
  {
    "code": "008163",
    "name": "南方标普红利低波50ETF联接A",
    "type": "宽基指数",
    "risk": "高",
    "price": 1.7414,
    "return1y": 4.26,
    "maxDrawdown": -15.85
  },
  {
    "code": "001410",
    "name": "信澳新能源产业股票A",
    "type": "股票型",
    "risk": "高",
    "price": 7.007,
    "return1y": 44.78,
    "maxDrawdown": -39.55
  },
  {
    "code": "008702",
    "name": "华夏黄金ETF联接C",
    "type": "宽基指数",
    "risk": "高",
    "price": 2.0415,
    "return1y": 13.87,
    "maxDrawdown": -30.16
  },
  {
    "code": "008327",
    "name": "东财通信C",
    "type": "行业主题",
    "risk": "高",
    "price": 4.6173,
    "return1y": 94.16,
    "maxDrawdown": -40.6
  },
  {
    "code": "005698",
    "name": "华夏全球科技先锋混合(QDII)A(人民币)",
    "type": "QDII",
    "risk": "高",
    "price": 2.6785,
    "return1y": 28.28,
    "maxDrawdown": -41.97
  },
  {
    "code": "010013",
    "name": "易方达信息行业精选股票A",
    "type": "股票型",
    "risk": "高",
    "price": 2.6738,
    "return1y": 61.73,
    "maxDrawdown": -35.23
  },
  {
    "code": "000628",
    "name": "大成高鑫股票A",
    "type": "股票型",
    "risk": "高",
    "price": 4.8616,
    "return1y": -4.99,
    "maxDrawdown": -12.11
  },
  {
    "code": "161725",
    "name": "招商中证白酒指数(LOF)A",
    "type": "行业主题",
    "risk": "高",
    "price": 2.2444,
    "return1y": -34.27,
    "maxDrawdown": -39.43
  },
  {
    "code": "016708",
    "name": "华夏有色金属ETF联接C",
    "type": "行业主题",
    "risk": "高",
    "price": 1.6865,
    "return1y": 21.98,
    "maxDrawdown": -35.67
  },
  {
    "code": "017193",
    "name": "天弘中证工业有色金属主题ETF发起联接C",
    "type": "行业主题",
    "risk": "高",
    "price": 1.7042,
    "return1y": 26.55,
    "maxDrawdown": -32.15
  },
  {
    "code": "016452",
    "name": "南方纳斯达克100指数发起(QDII)A",
    "type": "QDII",
    "risk": "高",
    "price": 2.2795,
    "return1y": 14.28,
    "maxDrawdown": -13.56
  },
  {
    "code": "110022",
    "name": "易方达消费行业股票",
    "type": "股票型",
    "risk": "高",
    "price": 2.811,
    "return1y": -24.01,
    "maxDrawdown": -30.24
  },
  {
    "code": "013309",
    "name": "易方达恒生科技ETF联接(QDII)C",
    "type": "QDII",
    "risk": "高",
    "price": 1.032,
    "return1y": -32.39,
    "maxDrawdown": -35.91
  },
  {
    "code": "008286",
    "name": "易方达研究精选股票",
    "type": "股票型",
    "risk": "高",
    "price": 1.3338,
    "return1y": 33.13,
    "maxDrawdown": -17.66
  },
  {
    "code": "012734",
    "name": "易方达中证人工智能主题ETF联接C",
    "type": "行业主题",
    "risk": "高",
    "price": 2.022,
    "return1y": 18.27,
    "maxDrawdown": -23.8
  },
  {
    "code": "006373",
    "name": "国富全球科技互联混合(QDII)人民币A",
    "type": "QDII",
    "risk": "高",
    "price": 6.7371,
    "return1y": 62.39,
    "maxDrawdown": -29.72
  },
  {
    "code": "001717",
    "name": "工银前沿医疗股票A",
    "type": "股票型",
    "risk": "高",
    "price": 3.278,
    "return1y": -8.56,
    "maxDrawdown": -27.33
  },
  {
    "code": "040046",
    "name": "华安纳斯达克100ETF联接(QDII)A",
    "type": "QDII",
    "risk": "高",
    "price": 8.1459,
    "return1y": 14.15,
    "maxDrawdown": -14.36
  },
  {
    "code": "012349",
    "name": "天弘恒生科技ETF联接C",
    "type": "QDII",
    "risk": "高",
    "price": 0.5928,
    "return1y": -33.11,
    "maxDrawdown": -36.57
  },
  {
    "code": "004433",
    "name": "南方有色金属ETF联接C",
    "type": "行业主题",
    "risk": "高",
    "price": 1.7497,
    "return1y": 21.11,
    "maxDrawdown": -35.16
  },
  {
    "code": "000697",
    "name": "汇添富移动互联股票A",
    "type": "股票型",
    "risk": "高",
    "price": 4.133,
    "return1y": 64.2,
    "maxDrawdown": -35.91
  },
  {
    "code": "161726",
    "name": "招商国证生物医药指数(LOF)A",
    "type": "行业主题",
    "risk": "高",
    "price": 0.9635,
    "return1y": -13.54,
    "maxDrawdown": -28.75
  },
  {
    "code": "017641",
    "name": "摩根标普500指数(QDII)人民币A",
    "type": "QDII",
    "risk": "高",
    "price": 1.6939,
    "return1y": 10.29,
    "maxDrawdown": -9.24
  },
  {
    "code": "006503",
    "name": "财通集成电路产业股票C",
    "type": "股票型",
    "risk": "高",
    "price": 7.3421,
    "return1y": 119.02,
    "maxDrawdown": -41.56
  },
  {
    "code": "008087",
    "name": "华夏中证5G通信主题ETF联接C",
    "type": "行业主题",
    "risk": "高",
    "price": 3.0033,
    "return1y": 53.4,
    "maxDrawdown": -36.85
  },
  {
    "code": "110011",
    "name": "易方达优质精选混合(QDII)",
    "type": "QDII",
    "risk": "高",
    "price": 5.8143,
    "return1y": -29.82,
    "maxDrawdown": -32.96
  },
  {
    "code": "006751",
    "name": "富国互联科技股票A",
    "type": "股票型",
    "risk": "高",
    "price": 6.3413,
    "return1y": 59.0,
    "maxDrawdown": -35.9
  },
  {
    "code": "013641",
    "name": "博道成长智航股票A",
    "type": "股票型",
    "risk": "高",
    "price": 1.7578,
    "return1y": 21.89,
    "maxDrawdown": -28.4
  },
  {
    "code": "017437",
    "name": "华宝纳斯达克精选股票发起式(QDII)C",
    "type": "QDII",
    "risk": "高",
    "price": 2.3381,
    "return1y": 4.22,
    "maxDrawdown": -20.44
  },
  {
    "code": "003834",
    "name": "华夏能源革新股票A",
    "type": "股票型",
    "risk": "高",
    "price": 2.722,
    "return1y": -8.87,
    "maxDrawdown": -29.55
  },
  {
    "code": "008987",
    "name": "广发上海金ETF联接C",
    "type": "宽基指数",
    "risk": "高",
    "price": 1.9866,
    "return1y": 14.13,
    "maxDrawdown": -30.35
  },
  {
    "code": "006327",
    "name": "易方达中证海外互联网50ETF联接(QDII)A",
    "type": "QDII",
    "risk": "高",
    "price": 0.8015,
    "return1y": -39.53,
    "maxDrawdown": -43.7
  },
  {
    "code": "000411",
    "name": "景顺长城优质成长股票A",
    "type": "股票型",
    "risk": "高",
    "price": 5.218,
    "return1y": 73.81,
    "maxDrawdown": -35.27
  },
  {
    "code": "000043",
    "name": "嘉实美国成长股票人民币",
    "type": "QDII",
    "risk": "高",
    "price": 6.224,
    "return1y": 11.54,
    "maxDrawdown": -14.86
  },
  {
    "code": "018230",
    "name": "易方达全球优质企业混合(QDII)C(人民币份额)",
    "type": "QDII",
    "risk": "高",
    "price": 1.9624,
    "return1y": 35.27,
    "maxDrawdown": -25.59
  },
  {
    "code": "000751",
    "name": "嘉实新兴产业股票",
    "type": "股票型",
    "risk": "高",
    "price": 4.717,
    "return1y": 28.18,
    "maxDrawdown": -23.95
  },
  {
    "code": "000834",
    "name": "大成纳斯达克100ETF联接(QDII)A",
    "type": "QDII",
    "risk": "高",
    "price": 6.2704,
    "return1y": 13.92,
    "maxDrawdown": -14.01
  },
  {
    "code": "012805",
    "name": "广发恒生科技ETF联接(QDII)C",
    "type": "QDII",
    "risk": "高",
    "price": 0.7015,
    "return1y": -33.14,
    "maxDrawdown": -36.48
  },
  {
    "code": "007818",
    "name": "国泰中证全指通信设备ETF联接C",
    "type": "行业主题",
    "risk": "高",
    "price": 3.9069,
    "return1y": 58.4,
    "maxDrawdown": -38.87
  },
  {
    "code": "016702",
    "name": "银华海外数字经济量化选股混合发起式(QDII)C",
    "type": "QDII",
    "risk": "高",
    "price": 2.1132,
    "return1y": 24.44,
    "maxDrawdown": -18.2
  },
  {
    "code": "021894",
    "name": "易方达半导体设备ETF联接C",
    "type": "行业主题",
    "risk": "高",
    "price": 2.532,
    "return1y": 109.6,
    "maxDrawdown": -36.14
  },
  {
    "code": "004070",
    "name": "南方中证全指证券公司ETF联接C",
    "type": "行业主题",
    "risk": "高",
    "price": 1.0996,
    "return1y": -13.72,
    "maxDrawdown": -21.86
  },
  {
    "code": "164906",
    "name": "交银中证海外中国互联网指数(LOF)A",
    "type": "QDII",
    "risk": "高",
    "price": 0.8722,
    "return1y": -40.57,
    "maxDrawdown": -41.9
  },
  {
    "code": "118001",
    "name": "易方达亚洲精选股票",
    "type": "QDII",
    "risk": "高",
    "price": 1.626,
    "return1y": 21.52,
    "maxDrawdown": -13.56
  },
  {
    "code": "005669",
    "name": "前海开源公用事业股票",
    "type": "股票型",
    "risk": "高",
    "price": 3.078,
    "return1y": -4.25,
    "maxDrawdown": -14.55
  },
  {
    "code": "018998",
    "name": "景顺长城研究精选股票C",
    "type": "股票型",
    "risk": "高",
    "price": 3.717,
    "return1y": 50.0,
    "maxDrawdown": -35.29
  },
  {
    "code": "006228",
    "name": "中欧医疗创新股票A",
    "type": "股票型",
    "risk": "高",
    "price": 1.6931,
    "return1y": -3.99,
    "maxDrawdown": -33.51
  },
  {
    "code": "013403",
    "name": "华夏恒生科技ETF发起式联接(QDII)C",
    "type": "QDII",
    "risk": "高",
    "price": 0.7174,
    "return1y": -33.04,
    "maxDrawdown": -36.39
  },
  {
    "code": "009505",
    "name": "富国上海金ETF联接C",
    "type": "宽基指数",
    "risk": "高",
    "price": 1.9885,
    "return1y": 14.62,
    "maxDrawdown": -30.06
  },
  {
    "code": "001672",
    "name": "国寿安保智慧生活股票A",
    "type": "股票型",
    "risk": "高",
    "price": 3.633,
    "return1y": 51.28,
    "maxDrawdown": -39.37
  },
  {
    "code": "017967",
    "name": "华富新能源股票型发起式C",
    "type": "股票型",
    "risk": "高",
    "price": 0.9577,
    "return1y": -8.76,
    "maxDrawdown": -36.08
  },
  {
    "code": "161604",
    "name": "融通深证100指数A",
    "type": "宽基指数",
    "risk": "高",
    "price": 3.321,
    "return1y": 2.87,
    "maxDrawdown": -18.42
  },
  {
    "code": "162412",
    "name": "华宝医疗ETF联接A",
    "type": "行业主题",
    "risk": "高",
    "price": 0.4606,
    "return1y": -12.76,
    "maxDrawdown": -25.29
  },
  {
    "code": "018229",
    "name": "易方达全球优质企业混合(QDII)A(人民币份额)",
    "type": "QDII",
    "risk": "高",
    "price": 1.9928,
    "return1y": 35.98,
    "maxDrawdown": -25.51
  },
  {
    "code": "009891",
    "name": "融通产业趋势臻选股票A",
    "type": "股票型",
    "risk": "高",
    "price": 2.8346,
    "return1y": 40.28,
    "maxDrawdown": -44.54
  },
  {
    "code": "009478",
    "name": "中银上海金ETF联接C",
    "type": "宽基指数",
    "risk": "高",
    "price": 2.0912,
    "return1y": 13.34,
    "maxDrawdown": -29.3
  },
  {
    "code": "011103",
    "name": "天弘中证光伏产业指数C",
    "type": "行业主题",
    "risk": "高",
    "price": 0.6937,
    "return1y": -8.56,
    "maxDrawdown": -32.34
  },
  {
    "code": "100050",
    "name": "富国全球债券(QDII)人民币A",
    "type": "QDII",
    "risk": "高",
    "price": 1.3265,
    "return1y": -5.05,
    "maxDrawdown": -6.33
  },
  {
    "code": "006195",
    "name": "国金量化多因子股票A",
    "type": "股票型",
    "risk": "高",
    "price": 3.2531,
    "return1y": 13.56,
    "maxDrawdown": -25.0
  },
  {
    "code": "020357",
    "name": "华夏半导体材料设备ETF联接C",
    "type": "行业主题",
    "risk": "高",
    "price": 3.4726,
    "return1y": 109.63,
    "maxDrawdown": -36.55
  },
  {
    "code": "009581",
    "name": "国寿中债3-5年政金债指数A",
    "type": "债券型",
    "risk": "高",
    "price": 1.2062,
    "return1y": 2.63,
    "maxDrawdown": -1.2
  },
  {
    "code": "002400",
    "name": "南方亚洲美元收益债券(QDII)A(人民币)",
    "type": "QDII",
    "risk": "高",
    "price": 1.0183,
    "return1y": -5.18,
    "maxDrawdown": -5.85
  },
  {
    "code": "161028",
    "name": "富国中证新能源汽车指数(LOF)A",
    "type": "行业主题",
    "risk": "高",
    "price": 1.276,
    "return1y": -12.18,
    "maxDrawdown": -31.54
  },
  {
    "code": "009863",
    "name": "富国创新趋势股票A",
    "type": "股票型",
    "risk": "高",
    "price": 0.9477,
    "return1y": 16.57,
    "maxDrawdown": -31.54
  },
  {
    "code": "009034",
    "name": "建信上海金ETF联接C",
    "type": "宽基指数",
    "risk": "高",
    "price": 2.1792,
    "return1y": 14.09,
    "maxDrawdown": -30.16
  },
  {
    "code": "004450",
    "name": "嘉实前沿科技沪港深股票A",
    "type": "股票型",
    "risk": "高",
    "price": 3.3149,
    "return1y": 39.1,
    "maxDrawdown": -34.62
  },
  {
    "code": "002980",
    "name": "华夏创新前沿股票A",
    "type": "股票型",
    "risk": "高",
    "price": 4.897,
    "return1y": 46.27,
    "maxDrawdown": -25.22
  },
  {
    "code": "002891",
    "name": "华夏移动互联混合人民币",
    "type": "QDII",
    "risk": "高",
    "price": 2.674,
    "return1y": 81.9,
    "maxDrawdown": -36.91
  },
  {
    "code": "020900",
    "name": "天弘中证全指通信设备指数发起C",
    "type": "行业主题",
    "risk": "高",
    "price": 3.666,
    "return1y": 65.19,
    "maxDrawdown": -39.2
  },
  {
    "code": "340006",
    "name": "兴全全球视野股票",
    "type": "股票型",
    "risk": "高",
    "price": 6.7161,
    "return1y": 38.09,
    "maxDrawdown": -27.3
  },
  {
    "code": "009341",
    "name": "易方达均衡成长股票",
    "type": "股票型",
    "risk": "高",
    "price": 1.5707,
    "return1y": 10.13,
    "maxDrawdown": -22.17
  },
  {
    "code": "000071",
    "name": "华夏恒生ETF联接A",
    "type": "QDII",
    "risk": "高",
    "price": 1.4624,
    "return1y": -10.45,
    "maxDrawdown": -19.72
  },
  {
    "code": "015905",
    "name": "广发新能源精选股票C",
    "type": "股票型",
    "risk": "高",
    "price": 1.0896,
    "return1y": 5.26,
    "maxDrawdown": -27.0
  },
  {
    "code": "004851",
    "name": "广发医疗保健股票A",
    "type": "股票型",
    "risk": "高",
    "price": 1.8554,
    "return1y": -11.73,
    "maxDrawdown": -25.26
  },
  {
    "code": "017731",
    "name": "嘉实全球产业升级股票发起式(QDII)C",
    "type": "QDII",
    "risk": "高",
    "price": 3.994,
    "return1y": 81.47,
    "maxDrawdown": -28.15
  },
  {
    "code": "000248",
    "name": "汇添富中证主要消费ETF联接A",
    "type": "行业主题",
    "risk": "高",
    "price": 1.7955,
    "return1y": -22.73,
    "maxDrawdown": -29.23
  },
  {
    "code": "024663",
    "name": "富国创业板人工智能ETF发起式联接C",
    "type": "行业主题",
    "risk": "高",
    "price": 1.9782,
    "return1y": 43.35,
    "maxDrawdown": -33.68
  },
  {
    "code": "000925",
    "name": "汇添富外延增长股票A",
    "type": "股票型",
    "risk": "高",
    "price": 2.272,
    "return1y": 23.24,
    "maxDrawdown": -9.55
  },
  {
    "code": "007531",
    "name": "华宝券商ETF联接C",
    "type": "行业主题",
    "risk": "高",
    "price": 1.4397,
    "return1y": -13.97,
    "maxDrawdown": -21.85
  },
  {
    "code": "005777",
    "name": "广发科技动力股票",
    "type": "股票型",
    "risk": "高",
    "price": 2.6527,
    "return1y": 61.29,
    "maxDrawdown": -38.19
  },
  {
    "code": "016665",
    "name": "天弘全球高端制造混合(QDII)C",
    "type": "QDII",
    "risk": "高",
    "price": 2.7373,
    "return1y": 67.85,
    "maxDrawdown": -40.77
  },
  {
    "code": "011036",
    "name": "嘉实中证稀土产业ETF联接C",
    "type": "宽基指数",
    "risk": "高",
    "price": 1.148,
    "return1y": -3.23,
    "maxDrawdown": -31.06
  },
  {
    "code": "017489",
    "name": "嘉实信息产业股票发起式C",
    "type": "股票型",
    "risk": "高",
    "price": 3.6179,
    "return1y": 60.62,
    "maxDrawdown": -41.46
  },
  {
    "code": "024195",
    "name": "永赢国证商用卫星通信产业ETF发起联接C",
    "type": "行业主题",
    "risk": "高",
    "price": 1.304,
    "return1y": 12.75,
    "maxDrawdown": -41.89
  }
];
funds.snapshotAsOf = "2026-09-18";
funds.generatedAt = "2026-09-19T05:51:41Z";
funds.updatedFields = ["price", "return1y", "maxDrawdown"];
funds.staleFields = [];
module.exports = funds;
