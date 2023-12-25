import { NS } from "@ns"
import { batchAllocations } from "/batcher/batch"
import { Botnet } from "/lib/botnet"
import { error } from "/lib/log"
import { Scanner } from "/lib/scanner"
import { TargetServer } from "/lib/serverdata"

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

        const activeTargets = await this.botnet.activeTargets()

        let targets: TargetServer[] = (await this.scanner.findTargets(this.ns))
            .filter((target) => target.hacked)
            .filter((target) => !activeTargets.has(target.hostname))
        targets.sort((a, b) => b.targetScore() - a.targetScore())

        const allocated = new Set<string>()

        while (targets.length > 0 && this.botnet.hasCapacity()) {
            const target = targets[0]
            targets = targets.slice(1)
            const allocations = await batchAllocations(this.ns, target.hostname)
            for (const allocation of allocations) {
                if (allocated.has(allocation.target)) {
                    error(this.ns, `Duplicate target in allocated: ${allocation.target}`)
                    continue
                }
                if (activeTargets.has(target.hostname)) {
                    error(this.ns, `Botnet already running target: ${allocation.target}`)
                    continue
                }
                allocated.add(allocation.target)
            }
            await this.botnet.startAllocations(allocations)
        }
    }

    async report() {
        this.ns.clearLog()
        this.ns.print("Batcher running.")
        await this.botnet.report() 
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
