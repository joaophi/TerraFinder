import React from "react";
import Amount from "./Amount";

const Coin = ({ amount, denom, alreadyFormated, usd }: CoinData) => (
  <Amount denom={denom} alreadyFormated={alreadyFormated} usd={usd}>
    {amount}
  </Amount>
);

export default Coin;
