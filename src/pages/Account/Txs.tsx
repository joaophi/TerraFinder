import { useEffect, useState } from "react";
import { isEmpty } from "lodash";
import Pagination from "../../components/Pagination";
import FlexTable from "../../components/FlexTable";
import Card from "../../components/Card";
import Info from "../../components/Info";
import Finder from "../../components/Finder";
import Loading from "../../components/Loading";
import Coin from "../../components/Coin";
import { useCurrentChain } from "../../contexts/ChainsContext";
import format from "../../scripts/format";
import useFCD from "../../hooks/useFCD";
import s from "./Txs.module.scss";
import PaginationButtons from "../../components/PaginationButtons";

const Txs = ({ address }: { address: string }) => {
  const { chainID } = useCurrentChain();
  const [offset, setOffset] = useState<number>(0);

  const { data, isLoading } = useFCD<{ next: number; txs: SimpleTxResponse[] }>(
    "/v1/txs",
    offset,
    100,
    address
  );
  const [allTx, setAllTx] = useState<SimpleTxResponse[]>([]);
  const [txsRow, setTxsRow] = useState<JSX.Element[][]>([]);

  useEffect(() => {
    if (data?.txs) {
      const txRow = data.txs.map(tx => getRow(tx, chainID));
      setAllTx([...allTx, ...data.txs]);
      setTxsRow(stack => [...stack, ...txRow]);
      if (data.next) setOffset(data.next);
    }
    // eslint-disable-next-line
  }, [data, chainID, address]);

  const head = [
    `Tx hash`,
    `Address`,
    `Amount (Out)`,
    `Amount (In)`,
    `Timestamp`
  ];

  const exportCSV = () => {
    const element = document.createElement("a");

    const csv = allTx
      .flatMap(tx => {
        const lines: string[] = [];
        tx.amountIn.forEach(amount =>
          lines.push(
            `${tx.timestamp};${amount.denom};${amount.amount};${tx.addresses[0]}`
          )
        );
        tx.amountOut.forEach(amount =>
          lines.push(
            `${tx.timestamp};${amount.denom};-${amount.amount};${tx.addresses[0]}`
          )
        );
        return lines;
      })
      .join("\n");

    element.setAttribute(
      "href",
      "data:text/csv;charset=utf-8," +
        encodeURIComponent("date;currency;amount;address\n" + csv)
    );
    element.setAttribute("download", `${address}.csv`);

    element.style.display = "none";
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  };

  return (
    <Card title="Transactions" bordered headerClassName={s.cardTitle}>
      <Pagination
        next={data?.next}
        title="transaction"
        action={setOffset}
        loading={isLoading}
      >
        <div className={s.cardBodyContainer}>
          {isEmpty(txsRow) && isLoading ? (
            <Loading />
          ) : !isEmpty(txsRow) ? (
            <FlexTable
              head={head}
              body={txsRow}
              tableStyle={{ border: "none" }}
              headStyle={{ background: "none" }}
            />
          ) : (
            <Card>
              <Info icon="info_outline" title="">
                No more transactions
              </Info>
            </Card>
          )}
        </div>
      </Pagination>
      <PaginationButtons
        text="Export to CSV"
        action={exportCSV}
        offset={1}
        loading={false}
      />
    </Card>
  );
};

export default Txs;

const getRow = (response: SimpleTxResponse, network: string) => {
  const { txHash, addresses, amountIn, amountOut, timestamp } = response;

  return [
    <span>
      <div className={s.wrapper}>
        <Finder q="tx" network={network} v={txHash}>
          {format.truncate(txHash, [8, 8])}
        </Finder>
      </div>
    </span>,
    <span>
      <Finder q="address" network={network} v={addresses[0]}>
        {addresses[0]}
      </Finder>
    </span>,
    <span className={s.amount}>
      {amountOut.length
        ? amountOut.map(({ amount, denom }, index) => {
            return (
              <span key={index}>
                -<Coin amount={amount} denom={denom} alreadyFormated={true} />
              </span>
            );
          })
        : "-"}
    </span>,
    <span className={s.amount}>
      {amountIn.length
        ? amountIn.map(({ amount, denom }, index) => {
            return (
              <span key={index}>
                +<Coin amount={amount} denom={denom} alreadyFormated={true} />
              </span>
            );
          })
        : "-"}
    </span>,
    <span>{timestamp}</span>
  ];
};
