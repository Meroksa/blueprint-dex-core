import 'dotenv/config';
import { address, toNano, } from '@ton/core';
import { Router, RouterConfigToCell } from '../wrappers/Router';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const isLocked =  process.env.isLocked ? Number(process.env.isLocked).valueOf() : 0;
    const admin = address(process.env.DEX_ADMIN ? process.env.DEX_ADMIN : "");
    const pool_code = await compile('Pool');
    const lpAccount_code = await compile('lp_account');
    const lpWallet_code = await compile('lp_wallet');

    const minter = provider.open(
        Router.createFromConfig(
            {
                isLocked: isLocked,
                admin: admin,
                poolCode: pool_code,
                lpAccountCode: lpAccount_code,
                lpWalletCode: lpWallet_code
            },
            await compile('Router')
        )
    );

    await minter.sendDeploy(provider.sender(), toNano('0.05'));
}