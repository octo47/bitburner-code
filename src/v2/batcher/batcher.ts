import { NS } from "@ns"
import { Botnet } from "/v2/lib/botnet"
import { batchAllocations } from "/v2/batcher/batch"
import { TargetServer } from "/lib/serverdata"
import { Scanner } from "/lib/scanner"

const defaultTarget = "rho-construction"

class Batcher {
    private ns: NS
    private botnet: Botnet
    private scanner: Scanner

    constructor(ns: NS) {
        this.ns = ns
        this.botnet = new Botnet(ns)
        this.scanner = new Scanner()
    }

    async loop() {

        let targets: TargetServer[] = (await this.scanner.findTargets(this.ns))
            .filter((target) => target.hacked)
            .filter((target) => !this.botnet.targets.has(target.hostname))
        targets.sort((a, b) => b.targetScore() - a.targetScore())

        while (targets.length > 0 && this.botnet.hasCapacity()) {
            const target = targets[0]
            targets = targets.splice(1)
            const allocations = await batchAllocations(this.ns, target.hostname)
            await this.botnet.startAllocations(allocations)
        }
    }

    async report() {
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
        await batcher.loop()
        await batcher.report()
        await ns.sleep(1000)
    }
}
