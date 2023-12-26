import { NS } from "@ns"

import { Batcher } from "/batcher/batcher"

export async function main(ns: NS): Promise<void> {
    ns.disableLog("getServerMoneyAvailable")
    ns.disableLog("sleep")
    ns.disableLog("asleep")

    const batcher = new Batcher(ns)

    // eslint-disable-next-line no-constant-condition
    while(true) {
        await batcher.loop()
        await batcher.report()
        await ns.sleep(1000)
    }
}
