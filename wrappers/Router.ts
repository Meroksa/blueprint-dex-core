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



    static swapMessage(jetton_amount: bigint, to: Address,
        responseAddress: Address,
        customPayload: Cell,
        forward_ton_amount: bigint,
        minOut: bigint,
        to_address: Address,
        has_ref: number,
        ref_address: Address) {

        let payload_cell = beginCell()
                    .storeUint(0x25938561, 32)
                    .storeCoins(minOut)
                    .storeAddress(to_address)
                    .storeBit(has_ref);
        if (has_ref) {
            payload_cell = payload_cell.storeAddress(ref_address);
        }
        return beginCell().storeUint(0xf8a7ea5, 32).storeUint(0, 64) // op, queryId
            .storeCoins(jetton_amount).storeAddress(to)
            .storeAddress(responseAddress)
            .storeMaybeRef(customPayload)
            .storeCoins(forward_ton_amount)
            .storeMaybeRef(payload_cell.endCell())
            .endCell();
    }

    async sendSwap(provider: ContractProvider, via: Sender,
        value: bigint,
        jetton_amount: bigint, to: Address,
        responseAddress: Address,
        customPayload: Cell,
        forward_ton_amount: bigint,
        minOut: bigint,
        to_address: Address,
        has_ref: number,
        ref_address: Address) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: Router.swapMessage(jetton_amount, to, responseAddress, customPayload, forward_ton_amount, minOut, to_address, has_ref, ref_address),
            value: value
        });
    }

    static provideLpMessage(jetton_amount: bigint, to: Address,
        responseAddress: Address,
        customPayload: Cell,
        forward_ton_amount: bigint,
        minLpOut: bigint) {

        let payload_cell = beginCell()
        .storeUint(0xfcf9e58f, 32)
        .storeCoins(minLpOut)
        .endCell();
        return beginCell().storeUint(0xf8a7ea5, 32).storeUint(0, 64) // op, queryId
            .storeCoins(jetton_amount).storeAddress(to)
            .storeAddress(responseAddress)
            .storeMaybeRef(customPayload)
            .storeCoins(forward_ton_amount)
            .storeMaybeRef(payload_cell)
            .endCell();
    }

    async provideLp(provider: ContractProvider, via: Sender,
        value: bigint,
        jetton_amount: bigint, to: Address,
        responseAddress: Address,
        customPayload: Cell,
        forward_ton_amount: bigint,
        minLpOut: bigint) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: Router.provideLpMessage(jetton_amount, to, responseAddress, customPayload, forward_ton_amount, minLpOut),
            value: value
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
