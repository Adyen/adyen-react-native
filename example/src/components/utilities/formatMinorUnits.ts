export function formatMinorUnits(
  amount: number,
  currency: string,
  locale: string
) {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  });

  switch (currency) {
    case 'JPY':
    case 'IDR':
      break;
    case 'BHD':
    case 'KWD':
      amount = amount / 1000;
      break;
    default:
      amount = amount / 100;
      break;
  }

  return formatter.format(amount);
}
