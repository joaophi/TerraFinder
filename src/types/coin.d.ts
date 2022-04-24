interface CoinData {
  amount: string;
  denom: string;
  alreadyFormated?: boolean;
  usd?: number;
}

type Coins = ICoin[] | null;
