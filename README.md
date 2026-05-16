# 大健云仓管理层持股与减持图谱

这是一个静态网页，用于整理 GigaCloud Technology Inc.（NASDAQ: GCT）管理层、历史高管及相关申报人的直接/间接持股、Form 4 增减持记录与 Form 144 拟售通知。

## 本地预览

```bash
python3 -m http.server 8787
```

然后打开 `http://127.0.0.1:8787/`。

## 数据口径

- 交易数据来自 SEC Form 3、Form 4、Form 144。
- 股本比例使用交易日之前最近一期 10-K/10-Q 披露的 Class A + Class B 普通股数量估算。
- Class B 普通股按 1:1 转换为 Class A 的等效股口径处理。
- Form 144 为拟售通知，不等同于已完成出售；页面将拟售计划与已执行 Form 4 交易分开展示。

## 主要来源

- SEC Company Submissions: https://data.sec.gov/submissions/CIK0001857816.json
- 2026 DEF 14A: https://www.sec.gov/Archives/edgar/data/1857816/000185781626000047/gct-20260430.htm
- 2026 Q1 10-Q: https://www.sec.gov/Archives/edgar/data/1857816/000185781626000055/gct-20260331.htm
- 2025 10-K: https://www.sec.gov/Archives/edgar/data/1857816/000185781626000018/gct-20251231.htm
- 2026-05-11 Form 144: https://www.sec.gov/Archives/edgar/data/1857816/000200430226000008/primary_doc.xml
