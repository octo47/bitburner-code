import { NS } from '@ns'

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
            * (this.money?.growthRate ?? Infinity)
            / ((this.money?.growTimeMs ?? Infinity) + this.security.weakenTimeMs)
            / this.security.minSecurity
    }

    isPrepared(): boolean {
        return !(this.needsGrowing() || this.needsWeakining())
    }

    needsWeakining(): boolean {
        return this.security.securityLevel > Math.floor(this.security.minSecurity * 1.05)
    }

    needsGrowing(): boolean {
        return  this.money.currentMoney < this.money.maxMoney * 0.99
    }
}

export type SecurityData = {
    minSecurity: number
    securityLevel: number
    weakenThreads: number
    weakenTimeMs: number
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
        weakenTimeMs: ns.getWeakenTime(hostname)
    }
}


function newMoneyData(ns: NS, hostname: string): MoneyData | undefined{
    const maxMoney = ns.getServerMaxMoney(hostname)
    if (maxMoney === 0) {
        return undefined
    }
    const currentMoney = ns.getServerMoneyAvailable(hostname)
    const growThreads = Math.ceil(ns.growthAnalyze(hostname, maxMoney / (currentMoney + 1)))
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
