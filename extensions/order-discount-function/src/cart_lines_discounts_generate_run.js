import en from '../locales/en.default.json';
import zhCN from '../locales/zh-CN.json';

const translations = {
  EN: en,
  ZH_CN: zhCN,
};

export function cartLinesDiscountsGenerateRun(input) {
  if (!input.cart || !input.cart.lines || input.cart.lines.length === 0) {
    return { operations: [] };
  }

  const lang = input.localization.language.isoCode || 'EN';
  const t = translations[lang] || translations.EN;

  const total = input.cart.lines.reduce(
    (sum, line) => sum + parseFloat(line.cost.subtotalAmount.amount),
    0
  );

  const operations = [];

  if (total >= 200) {
    operations.push({
      orderDiscountsAdd: {
        candidates: [
          {
            message: t.discounts.two,
            targets: [{ orderSubtotal: { excludedCartLineIds: [] } }],
            value: { percentage: { value: 20 } }
          }
        ],
        selectionStrategy: "FIRST"
      }
    });
  } else if (total >= 100) {
    operations.push({
      orderDiscountsAdd: {
        candidates: [
          {
            message: t.discounts.one,
            targets: [{ orderSubtotal: { excludedCartLineIds: [] } }],
            value: { percentage: { value: 10 } }
          }
        ],
        selectionStrategy: "FIRST"
      }
    });
  }

  return { operations };
}
