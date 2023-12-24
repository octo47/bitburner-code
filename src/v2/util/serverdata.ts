import { NS } from '@ns'
import { HostData } from '/lib/hostdata';


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

export class ServerData {
    public hostData: HostData
    public security: SecurityData
    public money: MoneyData | undefined

    public constructor(ns: NS, hostData: HostData) {
        this.hostData = hostData
        this.security = newSecurityData(ns, hostData)
        this.money = newMoneyData(ns, hostData)
    }
}

function newSecurityData(ns: NS, hostData: HostData): SecurityData {
    const weakenPerThread = ns.weakenAnalyze(1)
    const minLevel = ns.getServerMinSecurityLevel(hostData.hostname)
    const currentLevel = ns.getServerSecurityLevel(hostData.hostname)
    return {
        minSecurity: ns.getServerMinSecurityLevel(hostData.hostname),
        securityLevel: ns.getServerSecurityLevel(hostData.hostname),
        maxThreads: Math.ceil(Math.max(0, (currentLevel - minLevel)/weakenPerThread)),
        weakenTimeMs: ns.getWeakenTime(hostData.hostname)
    }
}

function newMoneyData(ns: NS, hostData: HostData): MoneyData | undefined{
    const maxMoney = ns.getServerMaxMoney(hostData.hostname)
    if (maxMoney === 0) {
        return undefined
    }
    const currentMoney = ns.getServerMoneyAvailable(hostData.hostname)
    const growThreads = Math.ceil(ns.growthAnalyze(hostData.hostname, maxMoney / currentMoney))
    const hackThreads = Math.ceil(100.0/ns.hackAnalyze(hostData.hostname))

    return {
        currentMoney: currentMoney,
        maxMoney: maxMoney,
        maxGrowThreads: growThreads,
        growthRate: ns.getServerGrowth(hostData.hostname),
        growthTimeMs: ns.getGrowTime(hostData.hostname),
        maxHackThreads: hackThreads,
    }
}
