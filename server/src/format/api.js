import { AccAddress, LCDClient } from "@terra-money/terra.js"
import axios from "axios";

const TERRA_ASSETS = 'https://assets.terra.money';
export const chainID = "mainnet"

const lcd = new LCDClient({ URL: "https://lcd.terra.dev", chainID })

export const useLCDClient = () => lcd

export const useWhitelist = async () => {
    const config = { baseURL: TERRA_ASSETS }
    const { data } = await axios.get('cw20/tokens.json', config)
    return data[chainID]
}

export const useTokenContractQuery = async (address) => {
    const lcd = useLCDClient()
    const whitelist = await useWhitelist()

    if (AccAddress.validate(address)) {
        if (whitelist?.[address]) {
            return whitelist[address]
        }

        try {
            const tokenInfo = await lcd.wasm.contractQuery(address, {
                token_info: {},
            })
            return tokenInfo
        } catch (error) {
            
        }
    }
}

export const useDenomTrace = async (denom = "", lcd) => {
    if (denom.startsWith('ibc')) {
        const hash = denom.replace('ibc/', '')
        const denom_trace = await lcd.ibcTransfer.denomTrace(hash)
        return denom_trace
    }
}

export const useContracts = async () => {
    const config = { baseURL: TERRA_ASSETS }
    const { data } = await axios.get('cw20/contracts.json', config)
    return data[chainID];
}