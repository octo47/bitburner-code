import { NS } from '@ns'
import { WorkType } from '/lib/worktype'

export const hackShare = 0.7

export class ServerData {
    public hostname: string
    public path: string[]
    public hacked: boolean
    public owned: boolean
    public backdoor: boolean
    public security: SecurityData

    public constructor(ns: NS, hostname: string, path: string[] = []) {
        const server = ns.getServer(hostname)

        this.hostname = hostname
        this.path = path
        this.owned = server.purchasedByPlayer,
        this.hacked = server.hasAdminRights,
        this.backdoor = server.backdoorInstalled ?? false,
        this.security = newSecurityData(ns, hostname)
    }

}

export class TargetServer extends ServerData {
    public money: MoneyData

    constructor(ns: NS, hostname: string, path: string[] = []) {
        super(ns, hostname, path)
        const maybeMoney = newMoneyData(ns, hostname)
        if (maybeMoney === undefined) {
            throw "Server has no money"
        }
        this.money = maybeMoney
    }

    targetScore(): number {
        return (this.money?.maxMoney ?? 0) 
            / ((this.money?.growTimeMs ?? Infinity) + this.security.weakenTimeMs)
            / this.money?.growThreads ?? Infinity
            / this.security.minSecurity
    }

    isPrepared(): boolean {
        return !(this.needsGrowing() || this.needsWeakining())
    }

    needsWeakining(): boolean {
        return this.security.securityLevel -  this.security.minSecurity > 1
    }

    needsGrowing(): boolean {
        return  this.money.currentMoney < this.money.maxMoney * 0.95
    }

    proposedAction(): WorkType {
        if (this.needsWeakining()) {
            return WorkType.weaking
        } else if (this.needsGrowing()) {
            return WorkType.growing
        } else {
            return WorkType.hacking
        }
    }
}

export type SecurityData = {
    minSecurity: number
    securityLevel: number
    weakenThreads: number
    weakenTimeMs: number
    requiredHackingLevel: number
}

export type MoneyData = {
    currentMoney: number
    maxMoney: number
    growthRate: number
    growThreads: number
    growTimeMs: number
    hackThreads: number
    hackTimeMs: number
}

export type WorkEffect = {
    securityLevel: number
    money: number
}

function newSecurityData(ns: NS, hostname: string): SecurityData {
    const weakenPerThread = ns.weakenAnalyze(1)
    const minLevel = ns.getServerMinSecurityLevel(hostname)
    const currentLevel = ns.getServerSecurityLevel(hostname)
    return {
        minSecurity: ns.getServerMinSecurityLevel(hostname),
        securityLevel: ns.getServerSecurityLevel(hostname),
        weakenThreads: Math.ceil(Math.max(0, (currentLevel - minLevel)/weakenPerThread)),
        weakenTimeMs: ns.getWeakenTime(hostname),
        requiredHackingLevel: ns.getServerRequiredHackingLevel(hostname)
    }
}


function newMoneyData(ns: NS, hostname: string): MoneyData | undefined{
    const maxMoney = ns.getServerMaxMoney(hostname)
    if (maxMoney === 0) {
        return undefined
    }
    const currentMoney = ns.getServerMoneyAvailable(hostname)
    const ratio =  maxMoney / currentMoney
    const growThreads = Math.ceil(ns.growthAnalyze(hostname, ratio === Infinity ? 2.0 : ratio))
    const optimalHackThreads = Math.ceil(hackShare/ns.hackAnalyze(hostname))

    return {
        currentMoney: currentMoney,
        maxMoney: maxMoney,
        growThreads: growThreads,
        growthRate: ns.getServerGrowth(hostname),
        growTimeMs: ns.getGrowTime(hostname),
        hackThreads: optimalHackThreads,
        hackTimeMs: ns.getHackTime(hostname),
    }
}
