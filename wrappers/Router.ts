import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type RouterConfig = {
    admin: Address;
    isLocked: number;
    poolCode: Cell;
    lpAccountCode: Cell;
    lpWalletCode: Cell;
};

export function RouterConfigToCell(config: RouterConfig): Cell {
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


export class Router implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Router(address);
    }

    static createFromConfig(config: RouterConfig, code: Cell, workchain = 0) {
        const data = RouterConfigToCell(config);
        const init = { code, data };
        return new Router(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY
        });
    }

    
    async getDexData(provider: ContractProvider) {
        let res = await provider.get('get_router_data', []);
        let isLocked = res.stack.readBoolean();
        let admin_address = res.stack.readAddress();
        let temp_upgrade = res.stack.readCell();
        let pool_code = res.stack.readCell();
        let lp_wallet_code = res.stack.readCell();
        let lp_account_code = res.stack.readCell();
        return {
            isLocked,
            admin_address,
            temp_upgrade,
            pool_code,
            lp_wallet_code,
            lp_account_code
        };
    }
    
}
