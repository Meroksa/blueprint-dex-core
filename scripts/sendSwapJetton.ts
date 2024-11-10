import { Address, toNano, Cell, beginCell, OpenedContract } from '@ton/core';
import { Router } from '../wrappers/Router';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { compile } from '@ton/blueprint';
import { promptAmount, promptBool } from '../wrappers/utils';
import { JettonWallet } from '../wrappers/JettonWallet';
let jetton_wallet: OpenedContract<JettonWallet>;

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    // const address = Address.parse("kQDj7LzOe6KlkHaA-npX4IY6f8hiq1sFDoVv3jdx8LxuoN95");

    const router_address = Address.parse(args.length > 0 ? args[0] : await ui.input('Router address: '));

    if (!(await provider.isContractDeployed(router_address))) {
        ui.write(`Error: Contract at address ${router_address} is not deployed!`);
        return;
    }


    const jetton0 = Address.parse(await ui.input('First jetton wallet address: '));
    const jetton1 = Address.parse(await ui.input('Second jetton wallet address of Router: '));

    const amount_to_send = await promptAmount("Jetton amount to send: ", ui);

    const minOut = await promptAmount("Slippage (amount of tokens out): ", ui);

    const jetton_wallet = provider.open(JettonWallet.createFromAddress(jetton0));

    const jetton_wallet1 = provider.open(JettonWallet.createFromAddress(jetton1));

    let amountBefore = await jetton_wallet1.getJettonBalance();

    const has_ref = await promptBool("Do you have a referral?", ["Yes", "No"], ui);


    const router = provider.open(Router.createFromAddress(router_address));

    let payload_cell = beginCell()
                    .storeUint(0x25938561, 32)
                    .storeAddress(jetton1)
                    .storeCoins(toNano(minOut))
                    .storeAddress(provider.sender().address as Address)
                    .storeBit(has_ref);
    if (has_ref) {
        const ref_address = Address.parse(await ui.input('Provide referral address: '));
        payload_cell = payload_cell.storeAddress(ref_address);
    }

    await jetton_wallet.sendTransfer( 
        provider.sender(),
        toNano('0.25'),
        toNano(amount_to_send),
        router_address,
        router_address,
        Cell.EMPTY,
        toNano('0.2'),
        payload_cell.endCell()
    )

    ui.write('Waiting for swap tx...');

    let amountAfter = await jetton_wallet1.getJettonBalance();

    let attempt = 1;
    while (amountAfter === amountBefore || attempt < 20) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        amountAfter = await jetton_wallet1.getJettonBalance();
        attempt++;
    }

    ui.clearActionPrompt();
    ui.write('swap done');
}
