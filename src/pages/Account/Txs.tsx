import { useEffect, useMemo, useState } from "react";
import { useRecoilValue } from "recoil";
import { isEmpty } from "lodash";
import {
  LogFinderAmountResult,
  getTxAmounts,
  createLogMatcherForAmounts
} from "@terra-money/log-finder-ruleset";
import Pagination from "../../components/Pagination";
import FlexTable from "../../components/FlexTable";
import Card from "../../components/Card";
import Info from "../../components/Info";
import Icon from "../../components/Icon";
import Finder from "../../components/Finder";
import Loading from "../../components/Loading";
import Coin from "../../components/Coin";
import { useCurrentChain } from "../../contexts/ChainsContext";
import {
  fromISOTime,
  isTerraAddress,
  sliceMsgType,
  splitCoinData
} from "../../scripts/utility";
import format from "../../scripts/format";
import { plus } from "../../scripts/math";
import { LogfinderAmountRuleSet } from "../../store/LogfinderRuleSetStore";
import useFCD from "../../hooks/useFCD";
import TxAmount from "../Tx/TxAmount";
import s from "./Txs.module.scss";
import { da } from "date-fns/locale";
import ModalWithButton from "../../components/ModalWithButton";
import PaginationButtons from "../../components/PaginationButtons";
import { Tokens } from "../../hooks/cw20/useTokenBalance";
import { Whitelist } from "../../store/WhitelistStore";
import { Contracts } from "../../store/ContractStore";
import { Dictionary } from "ramda/tools";

type Fee = {
  denom: string;
  amount: string;
};

const getTxFee = (prop: Fee) =>
  prop && `${format.amount(prop.amount)} ${format.denom(prop.denom)}`;

const getRenderAmount = (
  amountList: string[] | undefined,
  amountArray: JSX.Element[]
) => {
  amountList?.forEach(amount => {
    const coin = splitCoinData(amount.trim());
    if (coin) {
      const { amount, denom } = coin;
      const element = <Coin amount={amount} denom={denom} />;

      amountArray.push(element);
    }
  });
};

const getMultiSendAmount = (
  matchedLogs: LogFinderAmountResult[],
  address: string,
  amountIn: JSX.Element[],
  amountOut: JSX.Element[]
) => {
  const amountInMap = new Map<string, string>();
  const amountOutMap = new Map<string, string>();

  matchedLogs.forEach(log => {
    const recipient = log.match[0].value;
    const coin = log.match[1].value.split(",").map(splitCoinData);

    coin.forEach(data => {
      if (data) {
        const { amount, denom } = data;
        const amountInStack = amountInMap.get(denom);
        const amountOutStack = amountOutMap.get(denom);

        const inStack = amountInStack ? plus(amountInStack, amount) : amount;
        const outStack = amountOutStack ? plus(amountOutStack, amount) : amount;

        if (recipient === address) {
          amountInMap.set(denom, inStack);
        } else {
          amountOutMap.set(denom, outStack);
        }
      }
    });
  });

  amountInMap.forEach((amount, denom) =>
    amountIn.push(<Coin amount={amount} denom={denom} />)
  );

  amountOutMap.forEach((amount, denom) =>
    amountOut.push(<Coin amount={amount} denom={denom} />)
  );
};

const getAmount = (address: string, matchedMsg?: LogFinderAmountResult[][]) => {
  const amountIn: JSX.Element[] = [];
  const amountOut: JSX.Element[] = [];
  matchedMsg?.forEach(matchedLog => {
    if (matchedLog && matchedLog[0]?.transformed?.type === "multiSend") {
      getMultiSendAmount(matchedLog, address, amountIn, amountOut);
    } else {
      matchedLog?.forEach(log => {
        const amounts = log.transformed?.amount?.split(",");
        const sender = log.transformed?.sender;
        const recipient = log.transformed?.recipient;

        if (address === sender) {
          getRenderAmount(amounts, amountOut);
        }

        if (address === recipient) {
          getRenderAmount(amounts, amountIn);
        }
      });
    }
  });

  //amount row limit
  return [amountIn.slice(0, 3), amountOut.slice(0, 3)];
};

const Txs = ({ address }: { address: string }) => {
  const { chainID } = useCurrentChain();
  const [offset, setOffset] = useState<number>(0);

  const { data, isLoading } = useFCD<{ next: number; txs: TxResponse[] }>(
    "/v1/txs",
    offset,
    100,
    address
  );
  const [txsRow, setTxsRow] = useState<JSX.Element[][]>([]);

  const ruleArray = useRecoilValue(LogfinderAmountRuleSet);
  const logMatcher = useMemo(
    () => createLogMatcherForAmounts(ruleArray),
    [ruleArray]
  );

  useEffect(() => {
    if (data?.txs) {
      const txRow = data.txs
        .map<[TxResponse, LogFinderAmountResult[][] | undefined]>(tx => [
          tx,
          getTxAmounts(JSON.stringify(tx), logMatcher, address)
        ])
        .filter(([tx, matchedLogs]) => {
          let amountIn = false;
          let amountOut = false;
          matchedLogs?.forEach(matchedLog => {
            if (
              matchedLog &&
              matchedLog[0]?.transformed?.type === "multiSend"
            ) {
              matchedLog.forEach(log => {
                const recipient = log.match[0].value;
                const coin = log.match[1].value.split(",").map(splitCoinData);

                coin.forEach(data => {
                  if (data) {
                    if (recipient === address) {
                      amountIn = true;
                    } else {
                      amountOut = true;
                    }
                  }
                });
              });
            } else {
              matchedLog?.forEach(log => {
                const sender = log.transformed?.sender;
                const recipient = log.transformed?.recipient;

                if (address === sender) {
                  amountOut = true;
                }

                if (address === recipient) {
                  amountIn = true;
                }
              });
            }
          });
          return amountOut != amountIn;
        })
        .map(([tx, matchedLogs]) => getRow(tx, chainID, address, matchedLogs));
      setTxsRow(stack => [...stack, ...txRow]);
      if (data.next) setOffset(data.next);
    }
    // eslint-disable-next-line
  }, [data, chainID, address]);

  const head = [
    `Tx hash`,
    `Type`,
    `Address`,
    `Amount (Out)`,
    `Amount (In)`,
    `Timestamp`
    // `Fee`
  ];

  const whitelist: Tokens = useRecoilValue(Whitelist);
  const contracts: Dictionary<Contracts> = useRecoilValue(Contracts);

  const exportCSV = () => {
    const element = document.createElement("a");

    const csv = txsRow
      .map(row => {
        const address = row[2].props.children.props.v;
        let amount;
        let currency;
        if (row[3].props.children === "-") {
          amount =
            row[4].props.children[0].props.children[0] +
            row[4].props.children[0].props.children[1].props.amount;
          currency = row[4].props.children[0].props.children[1].props.denom;
        } else {
          amount =
            row[3].props.children[0].props.children[0] +
            row[3].props.children[0].props.children[1].props.amount;
          currency = row[3].props.children[0].props.children[1].props.denom;
        }
        const date = row[5].props.children;

        const list = whitelist?.[currency];
        const contract = contracts?.[currency];
        if (isTerraAddress(currency) && (list || contract)) {
          currency = list?.symbol ? list?.symbol : contract?.name;
        } else if (format.denom(currency).length >= 40) {
          currency = "Token";
        } else {
          currency = format.denom(currency);
        }
        amount = amount.slice(0, amount.length - 6) + "." + amount.slice(-6);

        return `${date};${currency};${amount};${address}`;
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

const getRow = (
  response: TxResponse,
  network: string,
  address: string,
  matchedMsg?: LogFinderAmountResult[][]
) => {
  const { tx: txBody, txhash, height, timestamp, chainId } = response;
  const isSuccess = !response.code;
  const [amountIn, amountOut] = getAmount(address, matchedMsg);
  // const fee = getTxFee(txBody?.value?.fee?.amount?.[0]);
  // const feeData = fee?.split(" ");
  let otherAddress = "not found";
  matchedMsg?.forEach(matchedLog => {
    if (matchedLog && matchedLog[0]?.transformed?.type === "multiSend") {
      matchedLog.forEach(log => {
        const recipient = log.match[0].value;
        const coin = log.match[1].value.split(",").map(splitCoinData);

        coin.forEach(data => {
          if (data) {
            if (recipient === address) {
              // otherAddress = sender;
            } else {
              otherAddress = recipient;
            }
          }
        });
      });
    } else {
      matchedLog?.forEach(log => {
        const sender = log.transformed?.sender;
        const recipient = log.transformed?.recipient;

        if (address === sender) {
          otherAddress = recipient ?? "not found";
        }

        if (address === recipient) {
          otherAddress = sender ?? "not found";
        }
      });
    }
  });

  return [
    <span>
      <div className={s.wrapper}>
        <Finder q="tx" network={network} v={txhash}>
          {format.truncate(txhash, [8, 8])}
        </Finder>
        {isSuccess ? (
          <Icon name="check" className={s.success} />
        ) : (
          <Icon name="warning" className={s.fail} />
        )}
      </div>
    </span>,
    <span className="type">{sliceMsgType(txBody.value.msg[0].type)}</span>,
    <span>
      <Finder q="address" network={network} v={otherAddress}>
        {otherAddress}
      </Finder>
      {/* <span>({chainId})</span> */}
    </span>,
    <span className={s.amount}>
      {amountOut.length
        ? amountOut.map((amount, index) => {
            if (index >= 2) {
              return <Finder q="tx" v={txhash} children="..." key={index} />;
            } else {
              return <span key={index}>-{amount}</span>;
            }
          })
        : "-"}
    </span>,
    <span className={s.amount}>
      {amountIn.length
        ? amountIn.map((amount, index) => {
            if (index >= 2) {
              return <Finder q="tx" v={txhash} children="..." key={index} />;
            } else {
              return <span key={index}>+{amount}</span>;
            }
          })
        : "-"}
    </span>,
    <span>{fromISOTime(timestamp.toString())}</span>
    // <span>
    //   {<TxAmount amount={feeData?.[0]} denom={feeData?.[1]} isFormatAmount />}
    // </span>
  ];
};
