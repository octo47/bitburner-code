import { NS } from '@ns'
import { Scanner } from "/lib/scanner";
import { ServerData } from '/v2/util/serverdata';
import { ttabulate } from '/lib/tabulate';


class Simulator {

    private ns: NS

    constructor(ns: NS) {
        this.ns = ns
    }

    simulate() {
        const scanner = new Scanner()

        const expectedThreads = 130

        const targets: ServerData[] = scanner.scan(this.ns).hosts
        .map((hd) => new ServerData(this.ns, hd))
        .filter((sd) => !sd.hostData.owned)
        .filter((sd) => sd.money !== undefined)

        type WeakenRow = {
            hostname: string
            securityDiff: number
            securityThreads: number
            weakenTime: string
            score: number
        }

        type MoneyRow = {
            hostname: string
            growth: number
            growthTime: string
            score: number
        }

        const weakenTargets: WeakenRow[] = targets
            .map((sd => { return {
                hostname: sd.hostData.hostname,
                securityDiff: Math.ceil(sd.security.securityLevel - sd.security.minSecurity),
                securityThreads: sd.security.maxThreads,
                weakenTime: this.ns.tFormat(sd.security.weakenTimeMs),
                score: this.score(sd)
            }}))
            .filter((wr) => wr.securityDiff > 0)
        weakenTargets.sort((a, b) => b.score - a.score)

        ttabulate(this.ns, weakenTargets)

        const moneyTargets: MoneyRow[] = targets
            .filter((sd) => sd.security.securityLevel - sd.security.minSecurity < 5)
            .map((sd) => { return {
                hostname: sd.hostData.hostname,
                growth: sd.money?.growthRate ?? 0,
                growthTime: this.ns.tFormat(sd.money?.growthTimeMs ?? 0),
                score: this.score(sd)
            }})
        moneyTargets.sort((a, b) => b.score - a.score)

        ttabulate(this.ns, moneyTargets)
    }

    score(serverData: ServerData): number {
        return (serverData.money?.maxMoney ?? 0) 
            * (serverData.money?.growthRate ?? Infinity)
            / ((serverData.money?.growthTimeMs ?? Infinity) + serverData.security.weakenTimeMs)
            / serverData.security.minSecurity
    }
}



export async function main(ns : NS) : Promise<void> {
    new Simulator(ns).simulate()
}