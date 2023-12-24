import { NS } from '@ns'


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
            / ((this.money?.growthTimeMs ?? Infinity) + this.security.weakenTimeMs)
            / this.security.minSecurity
    }
}

export type SecurityData = {
    minSecurity: number
    securityLevel: number
    maxThreads: number
    weakenTimeMs: number
}

export type MoneyData = {
    currentMoney: number
    maxMoney: number
    maxGrowThreads: number
    growthRate: number
    growthTimeMs: number
    maxHackThreads: number
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
        maxThreads: Math.ceil(Math.max(0, (currentLevel - minLevel)/weakenPerThread)),
        weakenTimeMs: ns.getWeakenTime(hostname)
    }
}


function newMoneyData(ns: NS, hostname: string): MoneyData | undefined{
    const maxMoney = ns.getServerMaxMoney(hostname)
    if (maxMoney === 0) {
        return undefined
    }
    const currentMoney = ns.getServerMoneyAvailable(hostname)
    const growThreads = Math.ceil(ns.growthAnalyze(hostname, maxMoney / currentMoney))
    const hackThreads = Math.ceil(100.0/ns.hackAnalyze(hostname))

    return {
        currentMoney: currentMoney,
        maxMoney: maxMoney,
        maxGrowThreads: growThreads,
        growthRate: ns.getServerGrowth(hostname),
        growthTimeMs: ns.getGrowTime(hostname),
        maxHackThreads: hackThreads,
    }
}
