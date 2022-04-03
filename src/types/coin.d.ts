interface CoinData {
  amount: string;
  denom: string;
  alreadyFormated?: boolean;
}

type Coins = ICoin[] | null;
