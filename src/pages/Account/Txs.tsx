import { isEmpty } from "lodash";
import { useEffect, useState } from "react";
import Card from "../../components/Card";
import Coin from "../../components/Coin";
import Finder from "../../components/Finder";
import FlexTable from "../../components/FlexTable";
import Info from "../../components/Info";
import Loading from "../../components/Loading";
import Pagination from "../../components/Pagination";
import PaginationButtons from "../../components/PaginationButtons";
import { useCurrentChain } from "../../contexts/ChainsContext";
import useAPI from "../../hooks/useAPI";
import format from "../../scripts/format";
import s from "./Txs.module.scss";

const Txs = ({ address }: { address: string }) => {
  const { chainID } = useCurrentChain();
  const [offset, setOffset] = useState<number | undefined>(undefined);

  const { data, isLoading } = useAPI<{ next: string; txs: SimpleTxResponse[] }>(
    "/v1/txs",
    offset,
    100,
    address
  );
  const [allTx, setAllTx] = useState<SimpleTxResponse[]>([]);
  // const [txsRow, setTxsRow] = useState<JSX.Element[][]>([]);

  useEffect(() => {
    if (data?.txs) {
      setAllTx(allTx => [...allTx, ...data.txs]);
      // const txRow = data.txs.map(tx => getRow(tx, chainID));
      // setTxsRow(stack => [...stack, ...txRow]);
      // if (data.next) setOffset(data.next);
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

  const [filter, setFilter] = useState<string>("A");

  const select = (
    <select
      key={"SELECT"}
      onChange={e => setFilter(e.target.value)}
      value={filter}
    >
      <option key={"ALL"} value={"A"}>
        ALL
      </option>
      <option key={"ONE"} value={"O"}>
        ONE SIDED
      </option>
      <option key={"TWO"} value={"T"}>
        TWO SIDED
      </option>
    </select>
  );

  const txsRow = allTx
    .filter(
      tx =>
        filter === "A" ||
        (filter === "O" &&
          Boolean(tx.amountIn.length) !== Boolean(tx.amountOut.length)) ||
        (filter === "T" &&
          Boolean(tx.amountIn.length) === Boolean(tx.amountOut.length))
    )
    .map(tx => getRow(tx, chainID));

  return (
    <Card
      title="Transactions"
      bordered
      headerClassName={s.cardTitle}
      actions={[select]}
    >
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
    <span className={s.amount}>
      {addresses.map((address, index) => {
        return (
          <span key={index}>
            <Finder q="address" network={network} v={address}>
              {format.truncate(address, [6, 6])}
            </Finder>
          </span>
        );
      })}
    </span>,
    <span className={s.amount}>
      {amountOut.length
        ? amountOut.map(({ amount, denom, usd }, index) => {
            return (
              <span key={index}>
                -
                <Coin
                  amount={amount}
                  denom={denom}
                  alreadyFormated={true}
                  usd={usd}
                />
              </span>
            );
          })
        : "-"}
    </span>,
    <span className={s.amount}>
      {amountIn.length
        ? amountIn.map(({ amount, denom, usd }, index) => {
            return (
              <span key={index}>
                +
                <Coin
                  amount={amount}
                  denom={denom}
                  alreadyFormated={true}
                  usd={usd}
                />
              </span>
            );
          })
        : "-"}
    </span>,
    <span>{timestamp}</span>
  ];
};
