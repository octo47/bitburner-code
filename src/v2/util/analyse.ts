import { NS } from '@ns'
import { Scanner } from "/lib/scanner";
import { TargetServer } from '/lib/serverdata';
import { ttabulate } from '/lib/tabulate';
import { allWorkTypes, workTypeScriptName } from '/v2/lib/worktype';

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

        const targets: TargetServer[] = await scanner.findTargets(this.ns)
        targets.sort((a, b) => b.targetScore() - a.targetScore())

        type WeakenRow = {
            hostname: string
            securityDiff: number
            securityThreads: number
            weakenTime: string
            score: number
        }

        const weakenTargets: WeakenRow[] = targets
            .map((sd => { return {
                hostname: sd.hostname,
                securityDiff: Math.ceil(sd.security.securityLevel - sd.security.minSecurity),
                securityThreads: sd.security.weakenThreads,
                weakenTime: this.ns.tFormat(sd.security.weakenTimeMs),
                score: sd.targetScore()
            }}))
            .filter((wr) => wr.securityDiff > 0)
        weakenTargets.sort((a, b) => b.score - a.score)

        ttabulate(this.ns, weakenTargets)

        type MoneyRow = {
            hostname: string
            growth: number
            growthTime: string
            hackThreads: number
            score: number
        }

        const moneyTargets: MoneyRow[] = targets
            .filter((sd) => sd.security.securityLevel - sd.security.minSecurity < 5)
            .map((sd) => { return {
                hostname: sd.hostname,
                growth: sd.money?.growthRate ?? 0,
                growthTime: this.ns.tFormat(sd.money.growTimeMs ?? 0),
                hackThreads: sd.money.hackThreads,
                score: sd.targetScore()
            }})
        moneyTargets.sort((a, b) => b.score - a.score)

        ttabulate(this.ns, moneyTargets)
    }
}



export async function main(ns : NS) : Promise<void> {
    await new Simulator(ns).simulate()
}