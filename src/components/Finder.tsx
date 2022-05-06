import React from "react";
import { Link } from "react-router-dom";
import c from "classnames";
import { useCurrentChain } from "../contexts/ChainsContext";
import format from "../scripts/format";
import useLabel from "../hooks/useLabel";

type Props = {
  q: string;
  v?: string;
  children: string;
  className?: string;
  brand?: boolean;
  network?: string;
};

const Finder = ({ q, v, children, className, brand, network }: Props) => {
  const { name } = useCurrentChain();
  const { data } = useLabel(v || children);

  let text: string;
  if (data) {
    text = `${data} (${format.truncate(v || children, [6, 6])})`;
  } else {
    text = children;
  }

  return (
    <span>
      <Link
        to={`/${name}/${q}/${v || children}`}
        className={c(className, brand && "text-primary")}
        rel="noopener noreferrer"
      >
        {text}
      </Link>
      <span> </span>
      {q == "address" ? (
        <a
          href={`https://apeboard.finance/dashboard/${v || children}`}
          className={c(className, brand && "text-primary")}
          target="_blank"
          rel="noopener noreferrer"
        >
          [APE]
        </a>
      ) : null}
    </span>
  );
};

export default Finder;
