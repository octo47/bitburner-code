import { NS } from "@ns"
import { Botnet } from "/v2/lib/botnet"

class Batcher {
    private ns: NS
    private botnet: Botnet

    constructor(ns: NS) {
        this.ns = ns
        this.botnet = new Botnet(ns)
    }

    startBatches() {
        
    }

    report() {
        this.ns.clearLog()
        this.ns.print("Batcher running.")
        this.botnet.report() 
    }
}


export async function main(ns: NS): Promise<void> {
    ns.disableLog("getServerMoneyAvailable")
    ns.disableLog("sleep")
    ns.disableLog("asleep")

    const batcher = new Batcher(ns)

    // eslint-disable-next-line no-constant-condition
    while(true) {
        batcher.startBatches()
        batcher.report()
        await ns.sleep(1000)
    }
}
