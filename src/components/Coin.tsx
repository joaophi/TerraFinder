import React from "react";
import Amount from "./Amount";

const Coin = ({ amount, denom, alreadyFormated }: CoinData) => (
  <Amount denom={denom} alreadyFormated={alreadyFormated}>
    {amount}
  </Amount>
);

export default Coin;
