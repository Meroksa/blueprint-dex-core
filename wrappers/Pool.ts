import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type RouterConfig = {
    admin: Address;
    isLocked: number;
    poolCode: Cell;
    lpAccountCode: Cell;
    lpWalletCode: Cell;
};

export function PoolConfigToCell(config: RouterConfig): Cell {
    return beginCell()
        .storeBit(config.isLocked)
        .storeAddress(config.admin)
        .storeRef(config.lpWalletCode)
        .storeRef(config.poolCode)
        .storeRef(config.lpAccountCode)
        .storeRef(beginCell()
            .storeUint(0, 64)
            .storeUint(0, 64)
            .storeAddress(null)
            .storeRef(beginCell().endCell()).endCell())
        .endCell();
}


export class Pool implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Pool(address);
    }

    static createFromConfig(config: RouterConfig, code: Cell, workchain = 0) {
        const data = PoolConfigToCell(config);
        const init = { code, data };
        return new Pool(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY
        });
    }

    async getPoolData(provider: ContractProvider) {
        let res = await provider.get('get_pool_data', []);
        let reserve0 = res.stack.readBigNumber();
        let reserve1 = res.stack.readBigNumber();
        let token0_address = res.stack.readAddress();
        let token1_address = res.stack.readAddress();
        let lp_fee = res.stack.readBigNumber();
        let protocol_fee = res.stack.readBigNumber();
        let ref_fee = res.stack.readBigNumber();
        let protocol_fee_address = res.stack.readAddress();
        let collected_token0_protocol_fee = res.stack.readBigNumber();
        let collected_token1_protocol_fee = res.stack.readBigNumber();
        return {
            reserve0,
            reserve1,
            token0_address,
            token1_address,
            lp_fee,
            protocol_fee,
            ref_fee,
            protocol_fee_address,
            collected_token0_protocol_fee,
            collected_token1_protocol_fee
        };
    }

}
