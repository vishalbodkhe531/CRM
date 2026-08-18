export function numberToWords(num: number): string {
  if (isNaN(num)) return "";
  if (num === 0) return "Zero Rupees Only";

  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  const convertLessThanOneThousand = (n: number): string => {
    if (n === 0) return "";
    let str = "";
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + " ";
      if (n % 10 > 0) {
        str += a[n % 10] + " ";
      }
    } else if (n > 0) {
      str += a[n] + " ";
    }
    return str.trim();
  };

  let rupeeVal = Math.floor(num);
  const paisaVal = Math.round((num - rupeeVal) * 100);

  let result = "";

  if (rupeeVal > 0) {
    // Crores (1,00,00,000)
    if (rupeeVal >= 10000000) {
      const cr = Math.floor(rupeeVal / 10000000);
      result += convertLessThanOneThousand(cr) + " Crore ";
      rupeeVal %= 10000000;
    }
    // Lakhs (1,00,000)
    if (rupeeVal >= 100000) {
      const lk = Math.floor(rupeeVal / 100000);
      result += convertLessThanOneThousand(lk) + " Lakh ";
      rupeeVal %= 100000;
    }
    // Thousands (1,000)
    if (rupeeVal >= 1000) {
      const th = Math.floor(rupeeVal / 1000);
      result += convertLessThanOneThousand(th) + " Thousand ";
      rupeeVal %= 1000;
    }
    // Remainder
    if (rupeeVal > 0) {
      result += convertLessThanOneThousand(rupeeVal) + " ";
    }
    result = result.trim() + " Rupees";
  }

  if (paisaVal > 0) {
    if (result !== "") {
      result += " and ";
    }
    result += convertLessThanOneThousand(paisaVal) + " Paisa";
  }

  return result ? result + " Only" : "Zero Rupees Only";
}
