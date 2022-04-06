import { useContracts } from "./api.js"
import getTokenAddress from "./tokenAddress.js"

const getTerraAddress = async (address) => {
    const contracts = await useContracts()

    const getContractName = (contractAddress) => {
        const contract = contracts?.[contractAddress]
        if (!contract) {
            return undefined
        }
        const { protocol, name: contractName } = contract

        return [protocol, contractName].join(' ')
    }

    return getContractName(address) ?? getTokenAddress(address)
}

export default getTerraAddress