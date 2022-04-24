import React from "react";
import { Link } from "react-router-dom";
import c from "classnames";
import { useCurrentChain } from "../contexts/ChainsContext";
import useAPI from "../hooks/useAPI";

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
  // const { data } = useAPI<{ label?: string }>("/v1/label", undefined, undefined, v || children)
  const text = /*data?.label ||*/ children;

  return (
    <Link
      to={`/${name}/${q}/${v || children}`}
      className={c(className, brand && "text-primary")}
      rel="noopener noreferrer"
    >
      {text}
    </Link>
  );
};

export default Finder;
