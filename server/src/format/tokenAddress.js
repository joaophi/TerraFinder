import { truncate } from "terra-utils";
import { useContracts, useTokenContractQuery } from "./api.js";

export const getTokenAddress = async (address) => {
    const contracts = useContracts()
    const tokenInfo = await useTokenContractQuery(address)
    const token = contracts?.[address]?.name || tokenInfo?.symbol

    return token ?? truncate(address)
};

export default getTokenAddress