import { NS } from '@ns'
import { allWorkTypes, workTypeName, workTypeScriptName } from '/lib/worktype';
import { Scanner } from "/lib/scanner";
import { TargetServer } from '/lib/serverdata';
import { ttabulate } from '/lib/tabulate';
import { WorkType } from '/lib/worktype';

class Simulator {

    private ns: NS

    constructor(ns: NS) {
        this.ns = ns
    }

    async simulate() {
        const scanner = new Scanner()

        type ScriptRow = {
            path: string
            sizeMb: number
        }

        const scripts: ScriptRow[] = []
        for( const wt of allWorkTypes) {
            const scriptPath = workTypeScriptName(wt)
            scripts.push({
                path: scriptPath,
                sizeMb: this.ns.getScriptRam(scriptPath)
             })
        }

        ttabulate(this.ns, scripts)

        const targets: TargetServer[] = (await scanner.findTargets(this.ns))
            .filter((tgt) => tgt.hacked)
        targets.sort((a, b) => b.targetScore() - a.targetScore())

        const byWorkType = new Map<WorkType, TargetServer[]>()

        targets.forEach((tgt) => {
            let array = byWorkType.get(tgt.proposedAction())
            if (array == undefined) {
                array = [tgt]
                byWorkType.set(tgt.proposedAction(), array)
            } else {
                array.push(tgt)
            }
        })

        type WeakenRow = {
            hostname: string
            securityDiff: number
            securityThreads: number
            weakenTime: string
            score: number
        }

        const weakenTargets: WeakenRow[] = (byWorkType.get(WorkType.weaking) ?? [])
            .map((sd => { return {
                hostname: sd.hostname,
                securityDiff: Math.ceil(sd.security.securityLevel - sd.security.minSecurity),
                securityThreads: sd.security.weakenThreads,
                weakenTime: this.ns.tFormat(sd.security.weakenTimeMs),
                score: sd.targetScore()
            }}))
        weakenTargets.sort((a, b) => b.score - a.score)


        type GrowingRow = {
            hostname: string
            growth: number
            growthTime: string
            money: string,
            moneyMax: string,
            score: number
        }

        const growTargets: GrowingRow[] = (byWorkType.get(WorkType.growing) ?? [])
            .map((sd) => { return {
                hostname: sd.hostname,
                growth: sd.money?.growthRate ?? 0,
                growthTime: this.ns.tFormat(sd.money.growTimeMs ?? 0),
                money: this.ns.formatNumber(sd.money.currentMoney),
                moneyMax: this.ns.formatNumber(sd.money.maxMoney),
                score: sd.targetScore()
            }})
        growTargets.sort((a, b) => b.score - a.score)


        type HackingRow = {
            hostname: string
            growth: number
            growthTime: string
            hackThreads: number
            money: string,
            moneyMax: string,
            action: string
            score: number
        }

        const hackRows: HackingRow[] = (byWorkType.get(WorkType.hacking) ?? [])
            .map((sd) => { return {
                hostname: sd.hostname,
                growth: sd.money?.growthRate ?? 0,
                growthTime: this.ns.tFormat(sd.money.growTimeMs ?? 0),
                hackThreads: sd.money.hackThreads,
                money: this.ns.formatNumber(sd.money.currentMoney),
                moneyMax: this.ns.formatNumber(sd.money.maxMoney),
                action: workTypeName(sd.proposedAction()),
                score: sd.targetScore()
            }})
        hackRows.sort((a, b) => b.score - a.score)

        this.ns.tprint("Hack targets:")
        ttabulate(this.ns, hackRows)

        this.ns.tprint("Grow targets:")
        ttabulate(this.ns, growTargets)

        this.ns.tprint("Weaken targets:")
        ttabulate(this.ns, weakenTargets)
    }
}



export async function main(ns : NS) : Promise<void> {
    await new Simulator(ns).simulate()
}